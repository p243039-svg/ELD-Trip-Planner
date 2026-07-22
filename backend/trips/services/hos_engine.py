"""
hos_engine.py — Refactored HOS Rule Engine with Strict 24-Hour Day Alignment

Implements FMCSA property-carrying driver rules:
  - 11-hour driving limit per shift
  - 14-hour on-duty shift window
  - 10-hour mandatory rest between shifts (sleeper berth)
  - 30-minute off-duty break after 8 hours of continuous driving
  - 70-hour / 8-day rolling cycle limit with 34-hour restart
  - 1-hour pickup / dropoff (on-duty, not driving)
  - Fuel stop every 1,000 miles (1 hour on-duty)
  - Strict 00:00 to 24:00 daily log segmentation (no midnight bleed)
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Literal
from .routing import interpolate_stop_location

# ── HOS Constants ────────────────────────────────────────────────────────────
MAX_DRIVING_PER_SHIFT = 11.0      # hours
MAX_SHIFT_WINDOW      = 14.0      # hours elapsed from shift start
MIN_REST_HOURS        = 10.0      # consecutive off-duty/sleeper berth between shifts
BREAK_AFTER_DRIVING   = 8.0       # hours of continuous driving → 30-min break
BREAK_DURATION        = 0.5       # hours
CYCLE_LIMIT           = 70.0      # hours in 8-day cycle
CYCLE_RESET           = 34.0      # consecutive off-duty hours for cycle reset
FUEL_STOP_INTERVAL    = 1000.0    # miles
FUEL_STOP_DURATION    = 1.0       # hour (on-duty, not driving)
PICKUP_DURATION       = 1.0       # hour (on-duty, not driving)
DROPOFF_DURATION      = 1.0       # hour (on-duty, not driving)
DRIVING_SPEED_MPH     = 55.0      # average driving speed for time estimates

# Default shift start on Day 1 (minutes from midnight = 08:00 AM)
DAY_1_SHIFT_START_MIN = 8 * 60


@dataclass
class Segment:
    status: Literal['off_duty', 'sleeper_berth', 'driving', 'on_duty']
    start_min: float   # 0 to 1440 minutes within the day
    end_min: float     # 0 to 1440 minutes within the day
    label: str = ''

    @property
    def duration_hours(self) -> float:
        return (self.end_min - self.start_min) / 60.0

    def to_dict(self) -> dict:
        def fmt(m: float) -> str:
            m_clamped = min(max(m, 0), 1440)
            h = int(m_clamped) // 60
            mi = int(m_clamped) % 60
            if h >= 24:
                return "24:00"
            return f"{h:02d}:{mi:02d}"

        return {
            'status': self.status,
            'start': fmt(self.start_min),
            'end': fmt(self.end_min),
            'label': self.label,
            'duration_hours': round(self.duration_hours, 2),
        }


@dataclass
class DayLog:
    day: int
    segments: list[Segment] = field(default_factory=list)

    def total_driving(self) -> float:
        return sum(s.duration_hours for s in self.segments if s.status == 'driving')

    def total_on_duty(self) -> float:
        return sum(s.duration_hours for s in self.segments if s.status in ('driving', 'on_duty'))

    def to_dict(self) -> dict:
        return {
            'day': self.day,
            'date_label': f'Day {self.day}',
            'segments': [s.to_dict() for s in self.segments if s.duration_hours > 0.001],
            'total_driving_hours': round(self.total_driving(), 2),
            'total_on_duty_hours': round(self.total_on_duty(), 2),
        }


class HOSEngine:
    def __init__(
        self,
        total_distance_miles: float,
        current_cycle_used: float,
        route_geometry: list,
    ):
        self.total_distance = total_distance_miles
        self.current_cycle_used = current_cycle_used
        self.geometry = route_geometry

        # Simulation state
        self.miles_driven = 0.0
        self.cycle_hours = current_cycle_used

        # Current shift counters
        self.shift_driving = 0.0        # driving hours in current shift
        self.shift_start_abs_min = 0.0  # absolute minute when shift started
        self.continuous_driving = 0.0   # continuous driving hours since last break

        # Timeline cursor (absolute minutes from 00:00 of Day 1)
        self.abs_cursor = 0.0

        self.days: list[DayLog] = [DayLog(day=1)]
        self.stops: list[dict] = []

    def _current_day(self) -> DayLog:
        return self.days[-1]

    def _advance_to_new_day(self):
        """Start a new 24-hour day log."""
        new_day_num = len(self.days) + 1
        self.days.append(DayLog(day=new_day_num))

    def _append_raw_segment(self, status: str, start_min: float, end_min: float, label: str):
        """Append segment to current day log if duration > 0."""
        if end_min > start_min:
            self._current_day().segments.append(Segment(
                status=status,
                start_min=start_min,
                end_min=end_min,
                label=label,
            ))

    def _add_time(self, status: str, duration_hours: float, label: str = ''):
        """
        Add time in `status` for `duration_hours`.
        Automatically splits across midnight (1440 min boundaries) into separate DayLogs.
        """
        remaining_min = duration_hours * 60.0

        while remaining_min > 0.001:
            current_day_index = int(self.abs_cursor // 1440)
            day_num = current_day_index + 1

            # Ensure day log exists
            while len(self.days) < day_num:
                self.days.append(DayLog(day=len(self.days) + 1))

            time_in_current_day = self.abs_cursor % 1440
            time_left_in_day = 1440.0 - time_in_current_day

            chunk_min = min(remaining_min, time_left_in_day)

            self._append_raw_segment(
                status=status,
                start_min=time_in_current_day,
                end_min=time_in_current_day + chunk_min,
                label=label,
            )

            self.abs_cursor += chunk_min
            remaining_min -= chunk_min

    def _start_new_shift(self):
        """Reset shift counters after 10-hr rest or 34-hr reset."""
        self.shift_driving = 0.0
        self.shift_start_abs_min = self.abs_cursor
        self.continuous_driving = 0.0

    def _take_rest(self, hours: float, label: str = '10-hr Rest'):
        """Add mandatory rest period and start a new shift."""
        self._add_time('sleeper_berth', hours, label)
        self._start_new_shift()

    def _take_break(self):
        """Mandatory 30-min break after 8 hours of continuous driving."""
        self._add_time('off_duty', BREAK_DURATION, '30-min Break')
        self.continuous_driving = 0.0

    def _add_on_duty(self, hours: float, label: str):
        """Add on-duty (not driving) activity."""
        self._add_time('on_duty', hours, label)
        self.cycle_hours += hours

    def _drive(self, hours: float, miles: float, label: str = 'Driving'):
        """Drive for given hours/miles."""
        self._add_time('driving', hours, label)
        self.shift_driving += hours
        self.continuous_driving += hours
        self.cycle_hours += hours
        self.miles_driven += miles

    def _check_cycle_reset(self) -> bool:
        """Insert 34-hr cycle reset if near 70h cycle limit."""
        if self.cycle_hours >= CYCLE_LIMIT - 0.5:
            loc = interpolate_stop_location(self.geometry, self.miles_driven, self.total_distance)
            self.stops.append({
                'type': 'cycle_reset',
                'location': loc,
                'mile_marker': round(self.miles_driven, 1),
                'label': '34-hr Cycle Reset',
            })
            self._take_rest(CYCLE_RESET, '34-hr Cycle Reset')
            self.cycle_hours = 0.0
            return True
        return False

    def simulate(self) -> list[dict]:
        """Run full HOS simulation."""
        # ── Step 1: Pre-shift Off Duty (00:00 to 08:00 AM on Day 1) ──────────
        self._add_time('off_duty', DAY_1_SHIFT_START_MIN / 60.0, 'Off Duty')
        self._start_new_shift()

        # ── Step 2: Pickup (1 hour on-duty) ──────────────────────────────────
        self._add_on_duty(PICKUP_DURATION, 'Pickup')

        # ── Step 3: Main Driving Loop ────────────────────────────────────────
        next_fuel_at = FUEL_STOP_INTERVAL

        while self.total_distance - self.miles_driven > 0.01:

            # A) Cycle reset check
            self._check_cycle_reset()

            # B) Check shift window / driving limits
            shift_elapsed_hours = (self.abs_cursor - self.shift_start_abs_min) / 60.0
            window_remaining = max(MAX_SHIFT_WINDOW - shift_elapsed_hours, 0.0)
            driving_remaining = max(MAX_DRIVING_PER_SHIFT - self.shift_driving, 0.0)

            if window_remaining <= 0.001 or driving_remaining <= 0.001:
                loc = interpolate_stop_location(self.geometry, self.miles_driven, self.total_distance)
                self.stops.append({
                    'type': 'rest',
                    'location': loc,
                    'mile_marker': round(self.miles_driven, 1),
                    'label': '10-hr Rest',
                    'duration_hours': MIN_REST_HOURS,
                })
                self._take_rest(MIN_REST_HOURS)
                continue

            # C) 30-min break check
            if self.continuous_driving >= BREAK_AFTER_DRIVING:
                self._take_break()
                continue

            # D) Max driveable hours in current stretch
            break_remaining = max(BREAK_AFTER_DRIVING - self.continuous_driving, 0.0)
            cycle_remaining = max(CYCLE_LIMIT - self.cycle_hours, 0.0)

            available_hours = min(window_remaining, driving_remaining, break_remaining, cycle_remaining)
            if available_hours <= 0.001:
                self._take_rest(MIN_REST_HOURS)
                continue

            # E) Miles/hours to fuel stop
            miles_to_fuel = next_fuel_at - self.miles_driven
            hours_to_fuel = miles_to_fuel / DRIVING_SPEED_MPH

            # F) How far to drive?
            drive_hours = min(available_hours, hours_to_fuel)
            drive_miles = drive_hours * DRIVING_SPEED_MPH

            remaining_trip_miles = self.total_distance - self.miles_driven

            if drive_miles >= remaining_trip_miles:
                # Arrive at destination
                final_hours = remaining_trip_miles / DRIVING_SPEED_MPH
                self._drive(final_hours, remaining_trip_miles)
                break
            else:
                self._drive(drive_hours, drive_miles)

                # Fuel stop trigger
                if self.miles_driven >= next_fuel_at - 0.1:
                    loc = interpolate_stop_location(self.geometry, self.miles_driven, self.total_distance)
                    self.stops.append({
                        'type': 'fuel',
                        'location': loc,
                        'mile_marker': round(self.miles_driven, 1),
                        'label': f'Fuel Stop (~{int(self.miles_driven)} mi)',
                    })
                    self._add_on_duty(FUEL_STOP_DURATION, 'Fuel Stop')
                    next_fuel_at += FUEL_STOP_INTERVAL

        # ── Step 4: Drop-off (1 hour on-duty) ────────────────────────────────
        self._add_on_duty(DROPOFF_DURATION, 'Drop-off')

        # ── Step 5: Fill remaining time in final day to 24:00 ────────────────
        current_day_index = int(self.abs_cursor // 1440)
        time_in_day = self.abs_cursor % 1440
        if time_in_day < 1440.0:
            remaining_day_hours = (1440.0 - time_in_day) / 60.0
            self._add_time('off_duty', remaining_day_hours, 'Off Duty')

        return [d.to_dict() for d in self.days]


def compute_trip(
    total_distance_miles: float,
    current_cycle_used: float,
    route_geometry: list,
) -> tuple[list[dict], list[dict]]:
    """Entry point for HOS engine."""
    engine = HOSEngine(total_distance_miles, current_cycle_used, route_geometry)
    daily_logs = engine.simulate()
    return daily_logs, engine.stops
