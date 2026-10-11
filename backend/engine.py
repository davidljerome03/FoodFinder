from __future__ import annotations

import json
import logging
import math
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

logger = logging.getLogger(__name__)

DEFAULT_IMAGE = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1000"

# Dietary and Allergy Conflict Map
ALLERGY_CONFLICTS: Dict[str, set[str]] = {
    "seafood": {"seafood", "fish", "sushi", "shellfish"},
    "fish": {"seafood", "fish", "sushi"},
    "shellfish": {"seafood", "shellfish", "crab", "lobster", "shrimp"},
    "peanuts": {"thai", "vietnamese", "asian"},
    "peanut": {"thai", "vietnamese", "asian"},
    "nuts": {"thai", "vietnamese", "asian", "bakery"},
    "tree nuts": {"thai", "vietnamese", "asian", "bakery"},
    "gluten": {"pizza", "italian", "pasta", "ramen", "bakery"},
    "celiac": {"pizza", "italian", "pasta", "ramen", "bakery"},
    "dairy": {"ice cream", "pizza", "cheese"},
    "lactose": {"ice cream", "pizza", "cheese"},
    "vegetarian": {"steak", "bbq", "steakhouse"},
    "vegan": {"steak", "bbq", "steakhouse", "burgers"},
}


def calculate_geographic_midpoint(locations: List[Dict[str, float]], fallback: Optional[Dict[str, float]] = None) -> Dict[str, float]:
    """
    Calculates the geographic midpoint (center of mass) of all group members' locations.
    """
    valid = [loc for loc in locations if isinstance(loc, dict) and "lat" in loc and "lng" in loc]
    if not valid:
        return fallback or {"lat": 28.5383, "lng": -81.3792}
    avg_lat = sum(loc["lat"] for loc in valid) / len(valid)
    avg_lng = sum(loc["lng"] for loc in valid) / len(valid)
    return {"lat": round(avg_lat, 6), "lng": round(avg_lng, 6)}


def fetch_live_restaurants(location: Dict[str, float], radius_meters: int = 8000) -> List[Dict[str, Any]]:
    """
    Fetches real-time restaurant data using the Yelp Fusion API based on the group's geographic midpoint.
    Strictly filters for restaurants that are currently OPEN (open_now=true).
    Parses and maps the response strictly to the system API contract:
    id, name, price, cuisines, coordinates, image_url, address.
    """
    api_key = os.getenv("YELP_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("YELP_API_KEY is not set in backend/.env. Please configure your Yelp Fusion API key.")

    params = {
        "latitude": location.get("lat", 28.5383),
        "longitude": location.get("lng", -81.3792),
        "radius": min(radius_meters, 40000),
        "categories": "restaurants,food",
        "open_now": "true",  # Real-time requirement: only currently open businesses
        "limit": 50,
        "sort_by": "best_match",
    }
    url = f"https://api.yelp.com/v3/businesses/search?{urllib.parse.urlencode(params)}"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "User-Agent": "FoodFinder/1.0",
    }

    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))
            businesses = payload.get("businesses", [])
            live_results: List[Dict[str, Any]] = []

            for b in businesses:
                if b.get("is_closed", False):
                    continue

                # Map price string (defaulting to $$ if not provided by Yelp)
                price = str(b.get("price") or "$$")

                # Map cuisine category titles
                cuisines = [
                    str(cat.get("title", ""))
                    for cat in b.get("categories", [])
                    if cat.get("title")
                ]

                # Map coordinates
                b_coords = b.get("coordinates") or {}
                coords = {
                    "lat": float(b_coords.get("latitude") or location.get("lat", 28.5383)),
                    "lng": float(b_coords.get("longitude") or location.get("lng", -81.3792)),
                }

                # Human-readable display address
                address_parts = b.get("location", {}).get("display_address", [])
                address = ", ".join(address_parts) if address_parts else "Address unavailable"

                # Image URL
                image_url = str(b.get("image_url") or DEFAULT_IMAGE)

                live_results.append({
                    "id": str(b.get("id")),
                    "name": str(b.get("name", "Unknown Restaurant")),
                    "price": price,
                    "cuisines": cuisines,
                    "coordinates": coords,
                    "image_url": image_url,
                    "address": address,
                    "is_open": True,
                })

            if not live_results:
                logger.warning("Yelp API returned 0 open restaurants for coordinates %s", location)
            return live_results

    except urllib.error.HTTPError as err:
        logger.error("Yelp API HTTP error %d: %s", err.code, err.reason)
        raise RuntimeError(f"Yelp Fusion API returned error {err.code}: {err.reason}") from err
    except Exception as exc:
        logger.error("Failed to connect to Yelp Fusion API: %s", exc)
        raise RuntimeError(f"Failed to query Yelp Fusion API: {exc}") from exc


def calculate_consensus_vector(mood_requests: List[Dict[str, Any]]) -> Dict[str, float]:
    """
    Calculates a mathematical Consensus Vector. Adds positive magnitude for desired 
    cuisines and applies a massive penalty (veto) for explicitly rejected cuisines and allergies.
    Supports 'anything' as a wildcard state.
    """
    vector: Dict[str, float] = {}
    for req in mood_requests:
        desired = req.get("desired_cuisines", [])
        vetoed = req.get("vetoed_cuisines", [])
        allergies = req.get("allergies", [])

        # Positive votes
        for cuisine in desired:
            c_clean = str(cuisine).strip().lower()
            if c_clean:
                vector[c_clean] = vector.get(c_clean, 0.0) + 1.0

        # The Veto System: Massive negative weights
        for cuisine in vetoed:
            c_clean = str(cuisine).strip().lower()
            if c_clean:
                vector[c_clean] = vector.get(c_clean, 0.0) - 100.0

        # Strict Allergy Vetoes: Extreme negative weights that guarantee exclusion
        for allergy in allergies:
            a_clean = str(allergy).strip().lower()
            if not a_clean:
                continue
            vector[a_clean] = vector.get(a_clean, 0.0) - 500.0
            for key, conflicts in ALLERGY_CONFLICTS.items():
                if key in a_clean or a_clean in key:
                    for conf in conflicts:
                        vector[conf] = vector.get(conf, 0.0) - 500.0

    return vector


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates the distance in miles between two coordinates."""
    R = 3958.8  # Radius of earth in miles
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return R * c


def score_restaurants(
    consensus_vector: Dict[str, float],
    restaurants: List[Dict[str, Any]],
    group_max_price: str = "$$$$",
    group_location: Optional[Dict[str, float]] = None,
    include_debug: bool = True,
    is_wildcard: bool = False,
) -> List[Dict[str, Any]]:
    """
    Scores restaurants using the Vector Dot Product.
    STRICT ALGORITHM ANTI-HALLUCINATION:
    Any restaurant with a 0% consensus score (dot product <= 0 with desired cuisines)
    is strictly filtered out so unpicked cuisines (e.g. sushi) are NEVER hallucinated.
    """
    price_levels = {"$": 1, "$$": 2, "$$$": 3, "$$$$": 4}
    max_level = price_levels.get(group_max_price, 4)

    if group_location is None:
        group_location = {"lat": 28.5383, "lng": -81.3792}

    scored_restaurants: List[Dict[str, Any]] = []

    for rest in restaurants:
        rest_price_level = price_levels.get(rest.get("price", "$"), 1)
        if rest_price_level > max_level:
            continue

        cuisines = [str(c).strip().lower() for c in rest.get("cuisines", [])]

        # Check for any veto hit
        if any(consensus_vector.get(c, 0.0) < -50.0 for c in cuisines):
            continue

        # 1. Base Score: Vector Dot Product
        # Dot product = sum(consensus_vector[cuisine] * restaurant_vector[cuisine])
        dot_product_score = 0.0
        matching_traits = 0
        for c in cuisines:
            weight = consensus_vector.get(c, 0.0)
            if weight > 0:
                dot_product_score += weight
                matching_traits += 1

        # ANTI-HALLUCINATION ENFORCEMENT:
        # If no wildcard is active and this restaurant has 0 matching consensus traits (0% score),
        # strictly filter it out!
        if not is_wildcard and (matching_traits == 0 or dot_product_score <= 0.0):
            continue

        # If it's a pure wildcard round, assign baseline score of 1.0
        if is_wildcard and dot_product_score == 0.0:
            dot_product_score = 1.0

        # 2. Distance Penalty (0.25 points per mile away)
        coords = rest.get("coordinates", {})
        rest_lat = coords.get("lat", group_location["lat"])
        rest_lng = coords.get("lng", group_location["lng"])
        distance = haversine_distance(group_location["lat"], group_location["lng"], rest_lat, rest_lng)
        distance_penalty = distance * 0.25
        final_score = dot_product_score - distance_penalty

        scored_restaurants.append({
            "restaurant": rest,
            "final_score": final_score,
            "distance": distance,
            "price_level": rest_price_level,
            "match_score": dot_product_score,
            "distance_penalty": distance_penalty,
        })

    # 4. Tie-Breaking Logic
    # Highest final_score (desc), closest distance (asc), lowest price (asc)
    scored_restaurants.sort(key=lambda x: (x["final_score"], -x["distance"], -x["price_level"]), reverse=True)

    top_3: List[Dict[str, Any]] = []
    for item in scored_restaurants[:3]:
        rest_data = item["restaurant"].copy()
        if include_debug:
            rest_data["_debug_stats"] = {
                "match_score": round(item["match_score"], 2),
                "distance_penalty": round(item["distance_penalty"], 2),
                "distance_miles": round(item["distance"], 2),
                "final_score": round(item["final_score"], 2),
            }
        top_3.append(rest_data)

    return top_3


def recommend_restaurants(
    mood_requests: List[Dict[str, Any]], group_location: Dict[str, float]
) -> List[Dict[str, Any]]:
    """
    Executes live Yelp Fusion restaurant discovery at the geographic midpoint,
    applies group constraints (price, vetoes, allergies), and scores candidates using
    the anti-hallucination consensus algorithm.
    """
    price_levels = {"$": 1, "$$": 2, "$$$": 3, "$$$$": 4}
    max_price = min(
        (price_levels.get(request.get("max_price", "$$$$"), 4) for request in mood_requests),
        default=4,
    )

    # Calculate geographic midpoint of connected members
    member_locations = [req.get("location") for req in mood_requests if req.get("location")]
    midpoint = calculate_geographic_midpoint(member_locations, fallback=group_location)

    # Determine if the group voted for 'anything' wildcard
    all_desired = [
        str(cuisine).strip().lower()
        for request in mood_requests
        for cuisine in request.get("desired_cuisines", [])
    ]
    is_wildcard = (len(all_desired) == 0) or all(c == "anything" for c in all_desired)

    # Fetch live Yelp Fusion restaurants filtered for currently OPEN status
    raw_restaurants = fetch_live_restaurants(location=midpoint)

    vetoes = {
        str(cuisine).strip().lower()
        for request in mood_requests
        for cuisine in request.get("vetoed_cuisines", [])
    }

    # Collect all group allergies and their mapped conflicted tags
    allergies = {
        str(a).strip().lower()
        for request in mood_requests
        for a in request.get("allergies", [])
        if str(a).strip()
    }
    allergy_conflicted_tags = set(allergies)
    for allergy in allergies:
        for key, conflicts in ALLERGY_CONFLICTS.items():
            if key in allergy or allergy in key:
                allergy_conflicted_tags.update(conflicts)

    # Filter out vetoes, allergies, and closed restaurants
    def has_allergy_conflict(rest: Dict[str, Any]) -> bool:
        rest_tags = {str(c).strip().lower() for c in rest.get("cuisines", [])}
        for tag in rest_tags:
            for bad in allergy_conflicted_tags:
                if bad in tag or tag in bad:
                    return True
        return False

    eligible = [
        r for r in raw_restaurants
        if r.get("is_open", True)
        and price_levels.get(r.get("price"), 1) <= max_price
        and not vetoes.intersection(str(c).strip().lower() for c in r.get("cuisines", []))
        and not has_allergy_conflict(r)
    ]

    vector = calculate_consensus_vector(mood_requests)

    results = score_restaurants(
        consensus_vector=vector,
        restaurants=eligible,
        group_max_price="$" * max_price,
        group_location=midpoint,
        include_debug=True,
        is_wildcard=is_wildcard,
    )

    # Fallback to top eligible open restaurants if strict overlap is empty
    if not results and eligible:
        results = eligible[:3]

    print("\n" + "=" * 50)
    print(f"[ALGORITHM] Group Consensus Vector: {vector}")
    print(f"[ALGORITHM] Midpoint Coordinates: {midpoint}")
    for idx, r in enumerate(results, 1):
        stats = r.get("_debug_stats", {})
        print(f"  Candidate #{idx} {r['name']}: Score={stats.get('final_score')} (Match: +{stats.get('match_score')}, Dist: -{stats.get('distance_penalty')} pts / {stats.get('distance_miles')} mi)")
    print("=" * 50 + "\n")

    return results
