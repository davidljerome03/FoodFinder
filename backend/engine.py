import json
import logging
import math
import os
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

DEFAULT_IMAGE = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1000"

def generate_mock_data(filepath: str = "dummy_restaurants.json") -> str:
    """
    Generates a mock JSON file containing restaurants that strictly conform
    to the updated API contract (including image_url and human-readable address).
    """
    restaurants = [
        {
            "id": str(uuid.uuid4()),
            "name": "The Burger Joint",
            "price": "$$",
            "cuisines": ["American", "Burgers"],
            "coordinates": {"lat": 28.5383, "lng": -81.3792},
            "image_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=1000",
            "address": "123 N Orange Ave, Orlando, FL 32801",
            "is_open": True,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Taco Fiesta",
            "price": "$",
            "cuisines": ["Mexican", "Tacos"],
            "coordinates": {"lat": 28.5390, "lng": -81.3800},
            "image_url": "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&q=80&w=1000",
            "address": "456 S Magnolia Ave, Orlando, FL 32801",
            "is_open": True,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Sushi Central",
            "price": "$$$",
            "cuisines": ["Japanese", "Sushi"],
            "coordinates": {"lat": 28.5400, "lng": -81.3750},
            "image_url": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=1000",
            "address": "789 E Central Blvd, Orlando, FL 32801",
            "is_open": True,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Pizza Haven",
            "price": "$$",
            "cuisines": ["Italian", "Pizza"],
            "coordinates": {"lat": 28.5375, "lng": -81.3810},
            "image_url": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=1000",
            "address": "321 W Church St, Orlando, FL 32805",
            "is_open": True,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Spicy Thai",
            "price": "$$",
            "cuisines": ["Thai", "Asian"],
            "coordinates": {"lat": 28.5410, "lng": -81.3780},
            "image_url": "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&q=80&w=1000",
            "address": "654 N Garland Ave, Orlando, FL 32801",
            "is_open": True,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Vegan Delights",
            "price": "$$",
            "cuisines": ["Vegan", "Healthy"],
            "coordinates": {"lat": 28.5360, "lng": -81.3770},
            "image_url": "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=1000",
            "address": "987 S Rosalind Ave, Orlando, FL 32801",
            "is_open": True,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Steakhouse Prime",
            "price": "$$$$",
            "cuisines": ["American", "Steak"],
            "coordinates": {"lat": 28.5420, "lng": -81.3740},
            "image_url": "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=1000",
            "address": "150 E Pine St, Orlando, FL 32801",
            "is_open": True,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Pho King",
            "price": "$",
            "cuisines": ["Vietnamese", "Soup"],
            "coordinates": {"lat": 28.5350, "lng": -81.3795},
            "image_url": "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&q=80&w=1000",
            "address": "1100 Colonial Dr, Orlando, FL 32803",
            "is_open": True,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Mediterranean Grill",
            "price": "$$",
            "cuisines": ["Mediterranean", "Greek"],
            "coordinates": {"lat": 28.5388, "lng": -81.3820},
            "image_url": "https://images.unsplash.com/photo-1544124499-58912cbddaad?auto=format&fit=crop&q=80&w=1000",
            "address": "250 S Orange Ave, Orlando, FL 32801",
            "is_open": True,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "The Breakfast Club",
            "price": "$",
            "cuisines": ["Breakfast", "American"],
            "coordinates": {"lat": 28.5405, "lng": -81.3805},
            "image_url": "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&q=80&w=1000",
            "address": "400 W Central Blvd, Orlando, FL 32801",
            "is_open": True,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Curry House",
            "price": "$$",
            "cuisines": ["Indian", "Curry"],
            "coordinates": {"lat": 28.5395, "lng": -81.3760},
            "image_url": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&q=80&w=1000",
            "address": "550 E Washington St, Orlando, FL 32801",
            "is_open": True,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Noodle Bar",
            "price": "$",
            "cuisines": ["Japanese", "Ramen"],
            "coordinates": {"lat": 28.5370, "lng": -81.3800},
            "image_url": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&q=80&w=1000",
            "address": "120 W Pine St, Orlando, FL 32801",
            "is_open": True,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "BBQ Pit",
            "price": "$$",
            "cuisines": ["American", "BBQ"],
            "coordinates": {"lat": 28.5365, "lng": -81.3785},
            "image_url": "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&q=80&w=1000",
            "address": "300 S Orange Ave, Orlando, FL 32801",
            "is_open": True,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Seafood Shack",
            "price": "$$$",
            "cuisines": ["Seafood", "American"],
            "coordinates": {"lat": 28.5415, "lng": -81.3790},
            "image_url": "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&q=80&w=1000",
            "address": "500 N Orange Ave, Orlando, FL 32801",
            "is_open": True,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "French Bistro",
            "price": "$$$",
            "cuisines": ["French", "European"],
            "coordinates": {"lat": 28.5380, "lng": -81.3745},
            "image_url": "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&q=80&w=1000",
            "address": "200 Lake Ave, Orlando, FL 32801",
            "is_open": True,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Dim Sum Palace",
            "price": "$$",
            "cuisines": ["Chinese", "Dim Sum"],
            "coordinates": {"lat": 28.5392, "lng": -81.3815},
            "image_url": "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&q=80&w=1000",
            "address": "180 N Garland Ave, Orlando, FL 32801",
            "is_open": True,
        },
    ]
    data_path = Path(__file__).parent / filepath
    with data_path.open("w", encoding="utf-8") as f:
        json.dump(restaurants, f, indent=2)
    return str(data_path)


def calculate_geographic_midpoint(locations: List[Dict[str, float]], fallback: Dict[str, float] = None) -> Dict[str, float]:
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
    Fetches live restaurant data from the Yelp Fusion API based on the group's geographic midpoint.
    Strictly filters for restaurants that are currently OPEN (open_now=true).
    Gracefully falls back to rich mock data if YELP_API_KEY is not configured or if the request fails.
    """
    api_key = os.getenv("YELP_API_KEY", "").strip()
    if not api_key:
        logger.info("YELP_API_KEY not configured. Falling back to local dataset.")
        return _load_local_restaurants()

    params = {
        "latitude": location.get("lat", 28.5383),
        "longitude": location.get("lng", -81.3792),
        "radius": min(radius_meters, 40000),
        "categories": "restaurants,food",
        "open_now": "true",  # Live API requirement: only currently open businesses
        "limit": 50,
        "sort_by": "best_match",
    }
    url = f"https://api.yelp.com/v3/businesses/search?{urllib.parse.urlencode(params)}"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "User-Agent": "FoodFinder/1.0",
    }

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=6) as response:
            payload = json.loads(response.read().decode("utf-8"))
            businesses = payload.get("businesses", [])
            live_results: List[Dict[str, Any]] = []

            for b in businesses:
                if b.get("is_closed", False):
                    continue
                price = b.get("price", "$$")
                cuisines = [cat.get("title", "") for cat in b.get("categories", []) if cat.get("title")]
                coords = {
                    "lat": b.get("coordinates", {}).get("latitude") or location["lat"],
                    "lng": b.get("coordinates", {}).get("longitude") or location["lng"],
                }
                address_parts = b.get("location", {}).get("display_address", [])
                address = ", ".join(address_parts) if address_parts else "Address unavailable"
                img = b.get("image_url") or DEFAULT_IMAGE

                live_results.append({
                    "id": str(b.get("id")),
                    "name": b.get("name", "Unknown Restaurant"),
                    "price": price,
                    "cuisines": cuisines,
                    "coordinates": coords,
                    "image_url": img,
                    "address": address,
                    "is_open": True,
                })

            if live_results:
                return live_results
            logger.warning("Yelp API returned 0 open restaurants. Falling back to local dataset.")
    except Exception as exc:
        logger.warning("Yelp API request failed (%s). Falling back to local dataset.", exc)

    return _load_local_restaurants()


def _load_local_restaurants() -> List[Dict[str, Any]]:
    """Loads the local dataset, generating it first if missing."""
    data_path = Path(__file__).parent / "dummy_restaurants.json"
    if not data_path.exists():
        generate_mock_data("dummy_restaurants.json")
    with data_path.open("r", encoding="utf-8") as f:
        return json.load(f)


def calculate_consensus_vector(mood_requests: List[Dict[str, Any]]) -> Dict[str, float]:
    """
    Calculates a mathematical Consensus Vector. Adds positive magnitude for desired 
    cuisines and applies a massive penalty (veto) for explicitly rejected cuisines.
    Supports 'anything' as a wildcard state.
    """
    vector: Dict[str, float] = {}
    for req in mood_requests:
        desired = req.get("desired_cuisines", [])
        vetoed = req.get("vetoed_cuisines", [])

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
    dummy_json_path: Optional[str] = None,
    group_max_price: str = "$$$$",
    group_location: Optional[Dict[str, float]] = None,
    restaurants: Optional[List[Dict[str, Any]]] = None,
    include_debug: bool = False,
    is_wildcard: bool = False,
) -> List[Dict[str, Any]]:
    """
    Scores restaurants using the Vector Dot Product.
    STRICT ALGORITHM ANTI-HALLUCINATION FIX:
    Any restaurant with a 0% consensus score (dot product <= 0 with desired cuisines)
    is strictly filtered out so unpicked cuisines (e.g. sushi) are NEVER hallucinated.
    """
    if restaurants is None:
        restaurants = _load_local_restaurants()

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
        })

    # 4. Tie-Breaking Logic
    # Highest final_score (desc), closest distance (asc), lowest price (asc)
    scored_restaurants.sort(key=lambda x: (x["final_score"], -x["distance"], -x["price_level"]), reverse=True)

    top_3: List[Dict[str, Any]] = []
    for item in scored_restaurants[:3]:
        rest_data = item["restaurant"].copy()
        if include_debug:
            rest_data["_debug_stats"] = {
                "match_score": round(item["final_score"] + (item["distance"] * 0.25), 2),
                "distance_penalty": round(item["distance"] * 0.25, 2),
                "distance_miles": round(item["distance"], 2),
                "final_score": round(item["final_score"], 2),
            }
        top_3.append(rest_data)

    return top_3


def recommend_restaurants(
    mood_requests: List[Dict[str, Any]], group_location: Dict[str, float]
) -> List[Dict[str, Any]]:
    """
    Executes live API restaurant discovery at the geographic midpoint, 
    applies group constraints, and scores candidates using the anti-hallucination algorithm.
    """
    price_levels = {"$": 1, "$$": 2, "$$$": 3, "$$$$": 4}
    max_price = min(
        (price_levels.get(request.get("max_price", "$$$$"), 4) for request in mood_requests),
        default=4,
    )

    # Calculate geographic midpoint if member locations are provided
    member_locations = [req.get("location") for req in mood_requests if req.get("location")]
    midpoint = calculate_geographic_midpoint(member_locations, fallback=group_location)

    # Determine if the group voted for 'anything' wildcard
    all_desired = [
        str(cuisine).strip().lower()
        for request in mood_requests
        for cuisine in request.get("desired_cuisines", [])
    ]
    is_wildcard = (len(all_desired) == 0) or all(c == "anything" for c in all_desired)

    # Fetch live restaurants filtered for currently OPEN status
    raw_restaurants = fetch_live_restaurants(location=midpoint)

    vetoes = {
        str(cuisine).strip().lower()
        for request in mood_requests
        for cuisine in request.get("vetoed_cuisines", [])
    }

    # Filter out vetoes and closed restaurants
    eligible = [
        r for r in raw_restaurants
        if r.get("is_open", True)
        and price_levels.get(r.get("price"), 1) <= max_price
        and not vetoes.intersection(str(c).strip().lower() for c in r.get("cuisines", []))
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

    # If the strict filter resulted in 0 candidates because the mock/live pool was too small,
    # fallback to top eligible open restaurants without hallucinated ties
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


if __name__ == "__main__":
    generate_mock_data()
    print("Generated mock data successfully.")
    
    # Test strict anti-hallucination: Only Burgers picked. Sushi MUST NOT appear!
    test_votes = [
        {"desired_cuisines": ["Burgers"], "vetoed_cuisines": [], "max_price": "$$"}
    ]
    recommendations = recommend_restaurants(test_votes, {"lat": 28.5383, "lng": -81.3792})
    print("\nRecommendations for ['Burgers'] vote (Verify no Sushi):")
    for r in recommendations:
        print(f" - {r['name']} ({r['cuisines']}) | {r.get('address')} | Image: {r.get('image_url')[:30]}...")
