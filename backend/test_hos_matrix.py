"""
test_hos_matrix.py — Automated Test Matrix for HOS Rule Engine & API
"""
import sys
import os

# Configure Django settings environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eld_project.settings')
import django
django.setup()

from django.contrib.auth.models import User
from trips.services.routing import plan_route, geocode
from trips.services.hos_engine import compute_trip, HOSEngine
from trips.serializers import TripInputSerializer
from rest_framework.test import APIClient

def run_tests():
    print("=" * 70)
    print("      ELD TRIP PLANNER — SYSTEMATIC TEST MATRIX REPORT")
    print("=" * 70)

    results = []

    def record(category, name, expected, actual, passed, details=""):
        status = "[PASSED]" if passed else "[FAILED]"
        results.append({
            "category": category,
            "name": name,
            "expected": expected,
            "actual": actual,
            "passed": passed,
            "status": status,
            "details": details
        })
        print(f"\n[{category}] {name} => {status}")
        print(f"  Expected: {expected}")
        print(f"  Actual:   {actual}")
        if details:
            print(f"  Details:  {details}")

    # ──────────────────────────────────────────────────────────────────────────
    # CATEGORY 1: HOS Rule Engine Logic
    # ──────────────────────────────────────────────────────────────────────────

    # 1.1 Short Trip (~2 hrs driving) e.g., Dallas, TX -> Fort Worth, TX (~35 mi)
    try:
        logs, stops = compute_trip(total_distance_miles=35.0, current_cycle_used=0.0, route_geometry=[[32.77, -96.79], [32.75, -97.33]])
        passed = len(logs) == 1 and len(stops) == 0 and logs[0]['total_driving_hours'] > 0
        record(
            "1. HOS Engine",
            "Short Trip (~2 hrs driving / 35 miles)",
            "1 Day, 0 rest stops, 1 daily log sheet",
            f"{len(logs)} Day(s), {len(stops)} stop(s), driving={logs[0]['total_driving_hours']}h",
            passed
        )
    except Exception as e:
        record("1. HOS Engine", "Short Trip", "1 Day", f"Error: {e}", False)

    # 1.2 Medium Trip (~12 hrs driving, e.g. 660 miles) -> exceeds 11h daily driving limit
    try:
        logs, stops = compute_trip(total_distance_miles=660.0, current_cycle_used=0.0, route_geometry=[[32.77, -96.79]] * 10)
        rest_stops = [s for s in stops if s['type'] == 'rest']
        passed = len(logs) == 2 and len(rest_stops) == 1
        record(
            "1. HOS Engine",
            "Medium Trip (~660 miles / 12h driving)",
            "2 Days, 1 mandatory 10-hr rest stop",
            f"{len(logs)} Day(s), {len(rest_stops)} rest stop(s)",
            passed,
            f"Day 1 driving: {logs[0]['total_driving_hours']}h, Day 2 driving: {logs[1]['total_driving_hours']}h"
        )
    except Exception as e:
        record("1. HOS Engine", "Medium Trip", "2 Days", f"Error: {e}", False)

    # 1.3 Long Trip (>1,200 miles, ~30+ hrs driving) e.g. 1,400 miles
    try:
        logs, stops = compute_trip(total_distance_miles=1400.0, current_cycle_used=10.0, route_geometry=[[32.77, -96.79]] * 20)
        fuel_stops = [s for s in stops if s['type'] == 'fuel']
        rest_stops = [s for s in stops if s['type'] == 'rest']
        passed = len(logs) >= 3 and len(fuel_stops) >= 1 and len(rest_stops) >= 2
        record(
            "1. HOS Engine",
            "Long Trip (1,400 miles / >30h driving)",
            "Multi-day (>=3 days), >=2 rest stops, >=1 fuel stop",
            f"{len(logs)} Day(s), {len(rest_stops)} rest stop(s), {len(fuel_stops)} fuel stop(s)",
            passed,
            f"Total stops scheduled: {len(stops)}"
        )
    except Exception as e:
        record("1. HOS Engine", "Long Trip", "Multi-day", f"Error: {e}", False)

    # 1.4 Cycle near 70 (e.g. current_cycle_used = 68.0h) -> 34h reset trigger
    try:
        logs, stops = compute_trip(total_distance_miles=300.0, current_cycle_used=68.0, route_geometry=[[32.77, -96.79]] * 10)
        cycle_resets = [s for s in stops if s['type'] == 'cycle_reset']
        passed = len(cycle_resets) >= 1
        record(
            "1. HOS Engine",
            "70-Hour Cycle Limit Near Max (68h used)",
            "Triggers a 34-hour cycle reset stop",
            f"{len(cycle_resets)} 34-hr cycle reset stop(s) found",
            passed,
            f"Stops breakdown: {[s['label'] for s in stops]}"
        )
    except Exception as e:
        record("1. HOS Engine", "Cycle Limit Trigger", "34-hr reset stop", f"Error: {e}", False)

    # 1.5 Fuel stop boundary (<1,000 miles vs >1,000 miles)
    try:
        logs_under, stops_under = compute_trip(total_distance_miles=950.0, current_cycle_used=0.0, route_geometry=[[32.77, -96.79]] * 5)
        logs_over, stops_over = compute_trip(total_distance_miles=1050.0, current_cycle_used=0.0, route_geometry=[[32.77, -96.79]] * 5)
        fuel_under = len([s for s in stops_under if s['type'] == 'fuel'])
        fuel_over = len([s for s in stops_over if s['type'] == 'fuel'])
        passed = fuel_under == 0 and fuel_over == 1
        record(
            "1. HOS Engine",
            "Fuel Stop Boundary (950 mi vs 1,050 mi)",
            "0 fuel stops for 950 mi, 1 fuel stop for 1,050 mi",
            f"950 mi -> {fuel_under} fuel stops; 1,050 mi -> {fuel_over} fuel stops",
            passed
        )
    except Exception as e:
        record("1. HOS Engine", "Fuel Stop Boundary", "0 vs 1 fuel stop", f"Error: {e}", False)

    # ──────────────────────────────────────────────────────────────────────────
    # CATEGORY 2: API Validation & Error Handling (HTTP status codes)
    # ──────────────────────────────────────────────────────────────────────────
    client = APIClient()
    user, _ = User.objects.get_or_create(username='test_matrix_user', defaults={'email': 'matrix@test.com'})
    client.force_authenticate(user=user)

    # 2.1 Invalid cycle hours (>70 or negative)
    res_neg = client.post('/api/plan-trip/', {'current_location': 'Chicago, IL', 'pickup_location': 'Dallas, TX', 'dropoff_location': 'Houston, TX', 'current_cycle_used': -5})
    res_over = client.post('/api/plan-trip/', {'current_location': 'Chicago, IL', 'pickup_location': 'Dallas, TX', 'dropoff_location': 'Houston, TX', 'current_cycle_used': 75})
    passed_cycle = res_neg.status_code == 400 and res_over.status_code == 400
    record(
        "2. API Validation",
        "Invalid Cycle Hours (-5 and 75)",
        "HTTP 400 Bad Request with field errors",
        f"-5 => {res_neg.status_code}, 75 => {res_over.status_code}",
        passed_cycle
    )

    # 2.2 Empty / Missing Location Fields
    res_empty = client.post('/api/plan-trip/', {'current_location': '', 'pickup_location': 'Dallas, TX', 'dropoff_location': 'Houston, TX', 'current_cycle_used': 10})
    passed_empty = res_empty.status_code == 400
    record(
        "2. API Validation",
        "Empty Location Field",
        "HTTP 400 Bad Request",
        f"Status Code: {res_empty.status_code}",
        passed_empty,
        f"Response body: {res_empty.data}"
    )

    # 2.3 Invalid / Nonsense Location Text
    res_nonsense = client.post('/api/plan-trip/', {'current_location': 'xyzqwe123999nonexistentplace', 'pickup_location': 'Dallas, TX', 'dropoff_location': 'Houston, TX', 'current_cycle_used': 10})
    passed_nonsense = res_nonsense.status_code == 400
    record(
        "3. Geocoding",
        "Nonsense Location Geocoding Error Handling",
        "HTTP 400 Bad Request (Graceful error message, no 500 crash)",
        f"Status Code: {res_nonsense.status_code}",
        passed_nonsense,
        f"Response error: {res_nonsense.data}"
    )

    # 2.4 Valid End-to-End API JSON Payload Shape
    res_valid = client.post('/api/plan-trip/', {'current_location': 'Chicago, IL', 'pickup_location': 'Dallas, TX', 'dropoff_location': 'Houston, TX', 'current_cycle_used': 15})
    has_keys = 'route' in res_valid.data and 'daily_logs' in res_valid.data and 'trip_id' in res_valid.data
    record(
        "2. API Validation",
        "Valid Trip Plan Endpoint Response Structure",
        "HTTP 201 Created with JSON containing trip_id, route, daily_logs",
        f"Status Code: {res_valid.status_code}, Has Keys: {has_keys}",
        res_valid.status_code == 201 and has_keys,
        f"Distance returned: {res_valid.data.get('route', {}).get('distance_miles')} mi"
    )

    print("\n" + "=" * 70)
    total = len(results)
    passed_cnt = len([r for r in results if r['passed']])
    print(f"SUMMARY: {passed_cnt}/{total} TESTS PASSED ({passed_cnt/total*100:.1f}%)")
    print("=" * 70)

if __name__ == '__main__':
    run_tests()
