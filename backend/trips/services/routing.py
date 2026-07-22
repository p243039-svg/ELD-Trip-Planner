"""
routing.py  —  Geocoding (Nominatim) + Route planning (OSRM)

All HTTP calls use a descriptive User-Agent to comply with Nominatim's
usage policy: https://operations.osmfoundation.org/policies/nominatim/
"""
import requests
import math

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OSRM_URL = "https://router.project-osrm.org/route/v1/driving"

HEADERS = {
    "User-Agent": "ELDTripPlanner/1.0 (educational project; https://github.com/eld-planner)",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://eld-planner.vercel.app/",
}

METERS_PER_MILE = 1609.344
SECONDS_PER_HOUR = 3600.0


def geocode(place_name: str) -> tuple[float, float]:
    """Convert a place name to (lat, lng) using Nominatim."""
    resp = requests.get(
        NOMINATIM_URL,
        params={"q": place_name, "format": "json", "limit": 1},
        headers=HEADERS,
        timeout=10,
    )
    resp.raise_for_status()
    results = resp.json()
    if not results:
        raise ValueError(f"Could not geocode location: '{place_name}'")
    lat = float(results[0]["lat"])
    lon = float(results[0]["lon"])
    return lat, lon


def haversine_miles(lat1, lon1, lat2, lon2) -> float:
    """Great-circle distance between two points in miles."""
    R = 3958.8  # Earth radius in miles
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def decode_polyline(encoded: str) -> list[list[float]]:
    """Decode a Google-style encoded polyline string to list of [lat, lng]."""
    coords = []
    index = 0
    lat = 0
    lng = 0
    while index < len(encoded):
        for is_lng in (False, True):
            shift = result = 0
            while True:
                b = ord(encoded[index]) - 63
                index += 1
                result |= (b & 0x1F) << shift
                shift += 5
                if b < 0x20:
                    break
            value = ~(result >> 1) if (result & 1) else (result >> 1)
            if is_lng:
                lng += value
            else:
                lat += value
        coords.append([lat / 1e5, lng / 1e5])
    return coords


def get_route(waypoints: list[tuple[float, float]]) -> dict:
    """
    Call OSRM with the given waypoints and return:
      {
        distance_miles, duration_hours, geometry: [[lat,lng],...],
        leg_distances: [miles_per_leg, ...]
      }
    """
    # OSRM expects coordinates as lng,lat
    coords_str = ";".join(f"{lon},{lat}" for lat, lon in waypoints)
    url = f"{OSRM_URL}/{coords_str}"
    params = {
        "overview": "full",
        "geometries": "polyline",
        "steps": "false",
        "annotations": "false",
    }
    resp = requests.get(url, params=params, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    if data.get("code") != "Ok":
        raise ValueError(f"OSRM error: {data.get('message', 'unknown')}")

    route = data["routes"][0]
    distance_miles = route["distance"] / METERS_PER_MILE
    duration_hours = route["duration"] / SECONDS_PER_HOUR
    geometry = decode_polyline(route["geometry"])

    # Per-leg distances (current→pickup, pickup→dropoff)
    leg_distances = [leg["distance"] / METERS_PER_MILE for leg in route["legs"]]

    return {
        "distance_miles": round(distance_miles, 2),
        "duration_hours": round(duration_hours, 2),
        "geometry": geometry,
        "leg_distances": leg_distances,
    }


def interpolate_stop_location(geometry: list, target_miles: float, total_miles: float) -> list[float]:
    """
    Find the approximate [lat, lng] along the route geometry at a given mile marker.
    Uses linear interpolation between geometry points.
    """
    if not geometry or total_miles <= 0:
        return geometry[len(geometry) // 2] if geometry else [0, 0]

    target_frac = min(target_miles / total_miles, 1.0)
    target_index = int(target_frac * (len(geometry) - 1))
    return geometry[min(target_index, len(geometry) - 1)]


def plan_route(current_location: str, pickup_location: str, dropoff_location: str) -> dict:
    """
    Full pipeline: geocode all 3 locations, call OSRM, return enriched route dict.
    """
    current_coords = geocode(current_location)
    pickup_coords = geocode(pickup_location)
    dropoff_coords = geocode(dropoff_location)

    route = get_route([current_coords, pickup_coords, dropoff_coords])
    route["waypoints"] = {
        "current": {"name": current_location, "coords": list(current_coords)},
        "pickup": {"name": pickup_location, "coords": list(pickup_coords)},
        "dropoff": {"name": dropoff_location, "coords": list(dropoff_coords)},
    }
    return route
