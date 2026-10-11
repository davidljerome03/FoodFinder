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

# Curated High-Resolution Cuisine Themed Images for 100% reliable rendering
CUISINE_IMAGE_MAP: Dict[str, str] = {
    "mexican": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&q=80&w=1000",
    "tacos": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&q=80&w=1000",
    "burrito": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80&w=1000",
    "italian": "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=1000",
    "pasta": "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=1000",
    "pizza": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=1000",
    "sushi": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=1000",
    "japanese": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=1000",
    "burgers": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=1000",
    "burger": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=1000",
    "american": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=1000",
    "fast food": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=1000",
    "thai": "https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&q=80&w=1000",
    "vietnamese": "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&q=80&w=1000",
    "asian": "https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&q=80&w=1000",
    "chinese": "https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&q=80&w=1000",
    "seafood": "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&q=80&w=1000",
    "fish": "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&q=80&w=1000",
    "steak": "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=1000",
    "steakhouse": "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=1000",
    "bbq": "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&q=80&w=1000",
    "barbecue": "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&q=80&w=1000",
    "ramen": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&q=80&w=1000",
    "mediterranean": "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=1000",
    "greek": "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=1000",
    "bakery": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=1000",
    "dessert": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&q=80&w=1000",
    "ice cream": "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&q=80&w=1000",
    "cafe": "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=1000",
    "coffee": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=1000",
}


def get_cuisine_image(cuisines: List[str]) -> str:
    """Returns a rich food image matching the restaurant's primary cuisine."""
    for c in cuisines:
        c_clean = str(c).strip().lower()
        for key, img_url in CUISINE_IMAGE_MAP.items():
            if key in c_clean or c_clean in key:
                return img_url
    return DEFAULT_IMAGE


def resolve_photo_url(photo_resource: str, api_key: str, cuisines: List[str]) -> str:
    """
    Resolves the direct public Google CDN photoUri using the backend's API key.
    If resolution succeeds, returns the public https://lh3.googleusercontent.com/... CDN link.
    If resolution fails or no photo is available, returns the backend proxy URL or themed cuisine fallback.
    """
    cuisine_fallback = get_cuisine_image(cuisines)
    if not photo_resource or not api_key:
        return cuisine_fallback

    clean_name = photo_resource.strip("/")
    url = f"https://places.googleapis.com/v1/{clean_name}/media?skipHttpRedirect=true&maxWidthPx=1000&maxHeightPx=1000&key={api_key}"
    headers = {"X-Goog-Api-Key": api_key, "Accept": "application/json"}
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            photo_uri = data.get("photoUri")
            if photo_uri:
                return photo_uri
    except Exception as exc:
        logger.debug("Could not resolve direct CDN photoUri for %s: %s", photo_resource, exc)

    return f"/api/photos?name={urllib.parse.quote(clean_name)}"

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


# Google Places API (New) Price Level Mapping
PRICE_MAP: Dict[str, str] = {
    "PRICE_LEVEL_FREE": "$",
    "PRICE_LEVEL_INEXPENSIVE": "$",
    "PRICE_LEVEL_MODERATE": "$$",
    "PRICE_LEVEL_EXPENSIVE": "$$$",
    "PRICE_LEVEL_VERY_EXPENSIVE": "$$$$",
    "$": "$",
    "$$": "$$",
    "$$$": "$$$",
    "$$$$": "$$$$",
}

IGNORED_PLACE_TYPES = {
    "point_of_interest",
    "establishment",
    "food",
    "restaurant",
    "store",
}


# Comprehensive Cuisine and Dish Synonyms for Semantic Overlap
CUISINE_SYNONYMS: Dict[str, set[str]] = {
    "mexican": {"mexican", "taco", "tacos", "burrito", "burritos", "taqueria", "cantina", "tex_mex", "tex-mex", "latin_american", "quesadilla", "fajita", "tortilla"},
    "italian": {"italian", "pasta", "trattoria", "osteria", "pizzeria", "gelato", "risotto"},
    "pizza": {"pizza", "pizzeria", "slice", "pies", "italian"},
    "sushi": {"sushi", "sashimi", "nigiri", "maki", "roll", "japanese", "raw_fish"},
    "japanese": {"japanese", "sushi", "ramen", "izakaya", "hibachi", "teriyaki", "udon"},
    "burgers": {"burger", "burgers", "hamburger", "cheeseburger", "shake", "patty", "fast_food", "american"},
    "burger": {"burger", "burgers", "hamburger", "cheeseburger", "shake", "patty", "fast_food", "american"},
    "thai": {"thai", "pad_thai", "pad thai", "curry", "siamese", "southeast_asian"},
    "seafood": {"seafood", "fish", "crab", "lobster", "oyster", "shrimp", "clam"},
    "chinese": {"chinese", "dim_sum", "dim sum", "dumpling", "wok", "cantonese", "szechuan", "asian"},
    "vietnamese": {"vietnamese", "pho", "banh_mi", "banh mi"},
    "bbq": {"bbq", "barbecue", "smokehouse", "ribs", "brisket"},
    "steak": {"steak", "steakhouse", "chophouse", "grill"},
    "steakhouse": {"steakhouse", "steak", "chophouse", "grill"},
    "mediterranean": {"mediterranean", "greek", "gyro", "falafel", "shawarma", "hummus", "kebab", "middle_eastern"},
    "bakery": {"bakery", "bake", "pastry", "bagel", "donut", "doughnut"},
    "dessert": {"dessert", "ice_cream", "ice cream", "sweet", "crepe"},
    "cafe": {"cafe", "coffee", "espresso", "bistro"},
    "american": {"american", "diner", "wings", "sports_bar", "burger"},
}


def traits_overlap(cuisine_a: str, cuisine_b: str) -> bool:
    """
    Checks if two cuisine or dish tags overlap directly, as substrings,
    or via known cuisine synonym groups (e.g. 'Tacos' matches 'Mexican', 'Burger' matches 'Burgers').
    """
    a = str(cuisine_a).strip().lower().replace("-", "_")
    b = str(cuisine_b).strip().lower().replace("-", "_")
    if not a or not b:
        return False
    if a == b:
        return True
    if a in b or b in a:
        return True
    for key, syns in CUISINE_SYNONYMS.items():
        all_syns = syns | {key}
        if any(s in a or a in s for s in all_syns) and any(s in b or b in s for s in all_syns):
            return True
    return False


def format_cuisine_type(place_type: str) -> str:
    """Formats raw Places API type string (e.g. 'mexican_restaurant' -> 'Mexican')."""
    name = str(place_type).lower()
    for suffix in ["_restaurant", "_food", "_store"]:
        if name.endswith(suffix):
            name = name[:-len(suffix)]
    words = name.replace("_", " ").split()
    return " ".join(w.capitalize() for w in words)


def extract_cuisines(types: List[str], name: str = "", hint_cuisine: str = "") -> List[str]:
    """
    Filters generic place types and extracts readable cuisine names from:
    1. Google Places types (e.g. mexican_restaurant -> Mexican)
    2. Restaurant display name keywords (e.g. 'Poblano Mexican Grill' -> Mexican)
    3. Targeted search query hint
    """
    cuisines: List[str] = []
    for t in types:
        t_clean = str(t).strip().lower()
        if t_clean not in IGNORED_PLACE_TYPES:
            formatted = format_cuisine_type(t_clean)
            if formatted and formatted not in cuisines:
                cuisines.append(formatted)

    name_lower = name.lower()
    for cat, syns in CUISINE_SYNONYMS.items():
        if any(s in name_lower for s in syns):
            formatted_cat = format_cuisine_type(cat)
            if formatted_cat and formatted_cat not in cuisines:
                cuisines.append(formatted_cat)

    if hint_cuisine:
        formatted_hint = format_cuisine_type(hint_cuisine)
        if formatted_hint and formatted_hint not in cuisines:
            cuisines.append(formatted_hint)

    return cuisines if cuisines else ["Restaurant"]


def _parse_place_item(p: Dict[str, Any], location: Dict[str, float], hint_cuisine: str = "") -> Optional[Dict[str, Any]]:
    """Helper to parse a single Google Places (New) place object into our API contract."""
    place_id = str(p.get("id") or "")
    if not place_id:
        return None

    display_name_obj = p.get("displayName") or {}
    name = str(display_name_obj.get("text") or "Unknown Restaurant")

    raw_price = p.get("priceLevel") or "PRICE_LEVEL_MODERATE"
    price = PRICE_MAP.get(str(raw_price), "$$")

    raw_types = p.get("types") or []
    cuisines = extract_cuisines(raw_types, name=name, hint_cuisine=hint_cuisine)

    loc = p.get("location") or {}
    coords = {
        "lat": float(loc.get("latitude") or location.get("lat", 28.5383)),
        "lng": float(loc.get("longitude") or location.get("lng", -81.3792)),
    }

    address = str(p.get("formattedAddress") or "Address unavailable")

    photos = p.get("photos") or []
    photo_resource = ""
    if isinstance(photos, list) and photos:
        first_photo = photos[0]
        if isinstance(first_photo, dict) and first_photo.get("name"):
            photo_resource = str(first_photo["name"]).strip("/")

    initial_image = (
        f"/api/photos?name={urllib.parse.quote(photo_resource)}"
        if photo_resource
        else get_cuisine_image(cuisines)
    )

    return {
        "id": place_id,
        "name": name,
        "price": price,
        "cuisines": cuisines,
        "coordinates": coords,
        "image_url": initial_image,
        "_photo_resource": photo_resource,
        "address": address,
        "is_open": True,
    }


def search_places_by_text(query: str, location: Dict[str, float], radius_meters: int = 15000) -> List[Dict[str, Any]]:
    """
    Searches for restaurants matching a specific cuisine or craving using Google Places API (New) Text Search
    (POST https://places.googleapis.com/v1/places:searchText).
    Guarantees discovery of genuine matching restaurants even if nearby pool is saturated with generic chains.
    """
    api_key = (
        os.getenv("GOOGLE_PLACES_API_KEY", "").strip()
        or os.getenv("GOOGLE_API_KEY", "").strip()
        or os.getenv("PLACES_API_KEY", "").strip()
    )
    if not api_key:
        return []

    url = "https://places.googleapis.com/v1/places:searchText"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.priceLevel,places.types,places.location,places.photos,places.formattedAddress",
    }
    body = {
        "textQuery": f"{query} restaurant",
        "locationBias": {
            "circle": {
                "center": {
                    "latitude": float(location.get("lat", 28.5383)),
                    "longitude": float(location.get("lng", -81.3792)),
                },
                "radius": min(float(radius_meters), 50000.0),
            }
        },
        "maxResultCount": 20,
    }
    req_data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=req_data, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))
            places = payload.get("places", [])
            results: List[Dict[str, Any]] = []
            for p in places:
                item = _parse_place_item(p, location, hint_cuisine=query)
                if item:
                    results.append(item)
            return results
    except Exception as exc:
        logger.warning("Google Places API Text Search failed for '%s': %s", query, exc)
        return []


def fetch_live_restaurants(location: Dict[str, float], radius_meters: int = 8000) -> List[Dict[str, Any]]:
    """
    Fetches real-time restaurant data using the Google Places API (New) Nearby Search
    (POST to https://places.googleapis.com/v1/places:searchNearby).
    Includes mandatory X-Goog-FieldMask and X-Goog-Api-Key headers.
    Maps response strictly to the system API contract:
    id, name, price, cuisines, coordinates, image_url, address.
    """
    api_key = (
        os.getenv("GOOGLE_PLACES_API_KEY", "").strip()
        or os.getenv("GOOGLE_API_KEY", "").strip()
        or os.getenv("PLACES_API_KEY", "").strip()
    )
    if not api_key:
        raise RuntimeError("GOOGLE_PLACES_API_KEY is not set in backend/.env. Please configure your Google Places API key.")

    url = "https://places.googleapis.com/v1/places:searchNearby"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.priceLevel,places.types,places.location,places.photos,places.formattedAddress",
    }

    body = {
        "includedTypes": ["restaurant"],
        "maxResultCount": 20,
        "locationRestriction": {
            "circle": {
                "center": {
                    "latitude": float(location.get("lat", 28.5383)),
                    "longitude": float(location.get("lng", -81.3792)),
                },
                "radius": min(float(radius_meters), 50000.0),
            }
        },
    }

    req_data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=req_data, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
            places = payload.get("places", [])
            live_results: List[Dict[str, Any]] = []

            for p in places:
                item = _parse_place_item(p, location)
                if item:
                    live_results.append(item)

            if not live_results:
                logger.warning("Google Places API returned 0 restaurants for coordinates %s", location)
            return live_results

    except urllib.error.HTTPError as err:
        err_body = ""
        try:
            err_body = err.read().decode("utf-8")
        except Exception:
            pass
        logger.error("Google Places API HTTP error %d: %s (%s)", err.code, err.reason, err_body)
        err_detail = err.reason
        if err_body:
            try:
                parsed = json.loads(err_body)
                if "error" in parsed and "message" in parsed["error"]:
                    err_detail = parsed["error"]["message"]
            except Exception:
                pass
        raise RuntimeError(f"Google Places API returned error {err.code}: {err_detail}") from err
    except Exception as exc:
        logger.error("Failed to connect to Google Places API: %s", exc)
        raise RuntimeError(f"Failed to query Google Places API: {exc}") from exc


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
    Scores restaurants using the Vector Dot Product with Semantic Overlap.
    STRICT ALGORITHM ANTI-HALLUCINATION:
    Any restaurant with a 0% consensus score (0 matching traits with group cravings)
    is strictly filtered out so unpicked cuisines are NEVER recommended.
    """
    price_levels = {"$": 1, "$$": 2, "$$$": 3, "$$$$": 4}
    max_level = price_levels.get(group_max_price, 4)

    if group_location is None:
        group_location = {"lat": 28.5383, "lng": -81.3792}

    positive_traits = {k: v for k, v in consensus_vector.items() if v > 0}
    negative_traits = {k: v for k, v in consensus_vector.items() if v < 0}

    scored_restaurants: List[Dict[str, Any]] = []

    for rest in restaurants:
        rest_price_level = price_levels.get(rest.get("price", "$"), 1)
        if rest_price_level > max_level:
            continue

        cuisines = [str(c).strip().lower() for c in rest.get("cuisines", [])]

        # Check for any strict veto or allergy hit
        has_veto = False
        for c in cuisines:
            for neg_tag, neg_wt in negative_traits.items():
                if neg_wt <= -50.0 and traits_overlap(c, neg_tag):
                    has_veto = True
                    break
            if has_veto:
                break
        if has_veto:
            continue

        # 1. Base Score: Vector Dot Product with Semantic Overlap
        dot_product_score = 0.0
        matching_traits = []
        matched_pos_keys = set()

        for c in cuisines:
            for pos_tag, pos_wt in positive_traits.items():
                if pos_tag not in matched_pos_keys and traits_overlap(c, pos_tag):
                    dot_product_score += pos_wt
                    matching_traits.append({"trait": format_cuisine_type(c), "weight": round(pos_wt, 2)})
                    matched_pos_keys.add(pos_tag)

        # STRICT ANTI-HALLUCINATION ENFORCEMENT:
        # If no wildcard is active, this restaurant MUST have at least one matching trait and dot_product_score > 0!
        # Restaurants with 0% match / 0 matching traits are STRICTLY FILTERED OUT!
        if not is_wildcard and (len(matching_traits) == 0 or dot_product_score <= 0.0):
            continue

        # If it's a pure wildcard round, assign baseline score of 1.0
        if is_wildcard and dot_product_score == 0.0:
            dot_product_score = 1.0
            matching_traits.append({"trait": "Wildcard (Open Choice)", "weight": 1.0})

        # 2. Distance Penalty (0.25 points per mile away)
        coords = rest.get("coordinates", {})
        rest_lat = coords.get("lat", group_location["lat"])
        rest_lng = coords.get("lng", group_location["lng"])
        distance = haversine_distance(group_location["lat"], group_location["lng"], rest_lat, rest_lng)
        distance_penalty = distance * 0.25
        final_score = dot_product_score - distance_penalty
        formula = f"+{dot_product_score:.2f} (Match) - {distance_penalty:.2f} ({distance:.1f} mi) = {final_score:.2f} pts"

        scored_restaurants.append({
            "restaurant": rest,
            "final_score": final_score,
            "distance": distance,
            "price_level": rest_price_level,
            "match_score": dot_product_score,
            "distance_penalty": distance_penalty,
            "matched_traits": matching_traits,
            "formula": formula,
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
                "matched_traits": item["matched_traits"],
                "formula": item["formula"],
            }
        top_3.append(rest_data)

    return top_3


def recommend_restaurants(
    mood_requests: List[Dict[str, Any]], group_location: Dict[str, float]
) -> tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Executes live Google Places API (New) restaurant discovery at the geographic midpoint,
    applies group constraints (price, vetoes, allergies), scores candidates using
    the anti-hallucination consensus algorithm, and resolves CDN image URLs.
    Returns (results, consensus_data).
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

    # Calculate consensus vector
    vector = calculate_consensus_vector(mood_requests)

    # Collect desired cuisines with positive votes
    positive_desired = [
        str(k).strip() for k, v in vector.items() if v > 0
    ]

    # Fetch live Google Places API (New) restaurants (Nearby Search)
    raw_restaurants = fetch_live_restaurants(location=midpoint)

    # If the group has specific cravings, check if raw_restaurants contains enough matching places.
    # If not, perform targeted search_places_by_text for the requested cuisines!
    if not is_wildcard and positive_desired:
        for craving in positive_desired[:3]:
            match_count = sum(
                1 for r in raw_restaurants
                if any(traits_overlap(c, craving) for c in r.get("cuisines", []))
            )
            if match_count < 3:
                targeted_places = search_places_by_text(craving, midpoint)
                existing_ids = {r["id"] for r in raw_restaurants}
                for tp in targeted_places:
                    if tp["id"] not in existing_ids:
                        raw_restaurants.append(tp)
                        existing_ids.add(tp["id"])

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
        and not any(
            any(traits_overlap(c, v) for c in r.get("cuisines", []))
            for v in vetoes
        )
        and not has_allergy_conflict(r)
    ]

    results = score_restaurants(
        consensus_vector=vector,
        restaurants=eligible,
        group_max_price="$" * max_price,
        group_location=midpoint,
        include_debug=True,
        is_wildcard=is_wildcard,
    )

    # STRICT RULE: NEVER fall back to zero-weight places!
    # If no restaurants match what the users put in, results strictly remains empty.

    # Resolve direct Google CDN photoUri for the winning voting options using server credentials
    api_key = (
        os.getenv("GOOGLE_PLACES_API_KEY", "").strip()
        or os.getenv("GOOGLE_API_KEY", "").strip()
        or os.getenv("PLACES_API_KEY", "").strip()
    )

    for r in results:
        photo_res = r.get("_photo_resource", "")
        if photo_res and api_key:
            r["image_url"] = resolve_photo_url(photo_res, api_key, r.get("cuisines", []))
        elif not r.get("image_url") or r["image_url"] == DEFAULT_IMAGE:
            r["image_url"] = get_cuisine_image(r.get("cuisines", []))

    # Build consensus metadata dictionary for testing and weights transparency
    positive_weights = [
        {"trait": format_cuisine_type(k), "weight": round(v, 2)}
        for k, v in sorted(vector.items(), key=lambda x: x[1], reverse=True)
        if v > 0
    ]

    vetoes_and_allergies = [
        {
            "trait": format_cuisine_type(k),
            "weight": round(v, 2),
            "is_allergy": any(a in k or k in a for a in allergies),
        }
        for k, v in sorted(vector.items(), key=lambda x: x[1])
        if v < 0
    ]

    incoming_summary = [
        {
            "member_name": str(req.get("name") or f"Player {idx}"),
            "desired": req.get("desired_cuisines", []),
            "vetoed": req.get("vetoed_cuisines", []),
            "allergies": req.get("allergies", []),
            "max_price": req.get("max_price", "$$"),
        }
        for idx, req in enumerate(mood_requests, 1)
    ]

    consensus_data = {
        "vector": {k: round(v, 2) for k, v in vector.items()},
        "positive_weights": positive_weights,
        "vetoes_and_allergies": vetoes_and_allergies,
        "incoming_summary": incoming_summary,
        "midpoint": midpoint,
        "max_price": "$" * max_price,
        "is_wildcard": is_wildcard,
        "candidates_math": [
            {
                "id": r["id"],
                "name": r["name"],
                "price": r.get("price", "$$"),
                "cuisines": r.get("cuisines", []),
                "final_score": r.get("_debug_stats", {}).get("final_score", 0),
                "match_score": r.get("_debug_stats", {}).get("match_score", 0),
                "distance_miles": r.get("_debug_stats", {}).get("distance_miles", 0),
                "distance_penalty": r.get("_debug_stats", {}).get("distance_penalty", 0),
                "matched_traits": r.get("_debug_stats", {}).get("matched_traits", []),
                "formula": r.get("_debug_stats", {}).get("formula", ""),
            }
            for r in results
        ],
    }

    # Attach consensus_data directly to each candidate result
    for r in results:
        r["_consensus_data"] = consensus_data

    print("\n" + "=" * 50)
    print(f"[ALGORITHM] Group Consensus Vector: {vector}")
    print(f"[ALGORITHM] Midpoint Coordinates: {midpoint}")
    for idx, r in enumerate(results, 1):
        stats = r.get("_debug_stats", {})
        print(f"  Candidate #{idx} {r['name']}: Score={stats.get('final_score')} ({stats.get('formula')})")
    print("=" * 50 + "\n")

    return results, consensus_data
