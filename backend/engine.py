from __future__ import annotations

import json
import logging
import math
import os
import re
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
    "fast food": "https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&q=80&w=1000",
    "fast_food": "https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&q=80&w=1000",
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

# Dietary and Allergy Conflict Map (Soft-penalty conflict tags for dietary restrictions)
ALLERGY_CONFLICTS: Dict[str, set[str]] = {
    "gluten": {"bakery", "bagel", "donut", "pastry", "pizza", "pizzeria", "pasta", "italian", "ramen", "noodle", "sandwich", "sandwiches", "bread"},
    "celiac": {"bakery", "bagel", "donut", "pastry", "pizza", "pizzeria", "pasta", "italian", "ramen", "noodle", "sandwich", "sandwiches", "bread"},
    "dairy": {"ice_cream", "ice cream", "gelato", "dessert", "pizza", "pizzeria", "cheese"},
    "lactose": {"ice_cream", "ice cream", "gelato", "dessert", "pizza", "pizzeria", "cheese"},
    "peanuts": {"thai", "vietnamese", "asian", "peanut", "peanuts", "satay"},
    "peanut": {"thai", "vietnamese", "asian", "peanut", "peanuts", "satay"},
    "nuts": {"thai", "vietnamese", "asian", "bakery", "pastry", "nuts", "tree_nuts"},
    "tree nuts": {"thai", "vietnamese", "asian", "bakery", "pastry", "nuts", "tree_nuts"},
    "shellfish": {"shellfish", "crab", "lobster", "shrimp", "oyster", "clam", "cajun", "seafood"},
    "seafood": {"seafood", "fish", "sushi", "raw_fish", "shellfish", "crab", "lobster", "shrimp", "oyster", "clam"},
    "fish": {"fish", "sushi", "raw_fish", "seafood"},
    "vegetarian": {"steak", "steakhouse", "chophouse", "bbq", "barbecue", "smokehouse", "ribs"},
    "vegan": {"steak", "steakhouse", "chophouse", "bbq", "barbecue", "smokehouse", "ribs"},
    "pork": {"bbq", "barbecue", "smokehouse", "ribs", "pork", "bacon"},
}


def extract_coords(loc_obj: Any, fallback: Dict[str, float]) -> Dict[str, float]:
    """Safely extracts lat/lng floats from any location or coordinates dictionary structure."""
    if not isinstance(loc_obj, dict):
        return {"lat": float(fallback.get("lat", 28.5383)), "lng": float(fallback.get("lng", -81.3792))}
    lat = loc_obj.get("latitude") if loc_obj.get("latitude") is not None else loc_obj.get("lat")
    lng = loc_obj.get("longitude") if loc_obj.get("longitude") is not None else loc_obj.get("lng")
    try:
        lat_f = float(lat) if lat is not None else float(fallback.get("lat", 28.5383))
        lng_f = float(lng) if lng is not None else float(fallback.get("lng", -81.3792))
        return {"lat": round(lat_f, 6), "lng": round(lng_f, 6)}
    except (ValueError, TypeError):
        return {"lat": float(fallback.get("lat", 28.5383)), "lng": float(fallback.get("lng", -81.3792))}


def calculate_geographic_midpoint(locations: List[Dict[str, float]], fallback: Optional[Dict[str, float]] = None) -> Dict[str, float]:
    """
    Calculates the geographic midpoint (center of mass) of all group members' locations.
    """
    valid = [extract_coords(loc, fallback or {"lat": 28.5383, "lng": -81.3792}) for loc in locations if isinstance(loc, dict)]
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

TIER_TO_GOOGLE_PRICE: Dict[str, List[str]] = {
    "$": ["PRICE_LEVEL_INEXPENSIVE", "PRICE_LEVEL_FREE"],
    "$$": ["PRICE_LEVEL_MODERATE"],
    "$$$": ["PRICE_LEVEL_EXPENSIVE"],
    "$$$$": ["PRICE_LEVEL_VERY_EXPENSIVE"],
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
    "mexican": {"mexican", "taco", "tacos", "burrito", "burritos", "taqueria", "cantina", "tex_mex", "texmex", "quesadilla", "fajita", "tortilla"},
    "italian": {"italian", "pasta", "trattoria", "osteria", "pizzeria", "gelato", "risotto"},
    "pizza": {"pizza", "pizzeria", "slice", "pies"},
    "sushi": {"sushi", "sashimi", "nigiri", "maki", "roll", "japanese", "raw_fish"},
    "japanese": {"japanese", "sushi", "ramen", "izakaya", "hibachi", "teriyaki", "udon"},
    "burgers": {"burger", "burgers", "hamburger", "cheeseburger", "patty", "smashburger", "slider", "sliders"},
    "burger": {"burger", "burgers", "hamburger", "cheeseburger", "patty", "smashburger", "slider", "sliders"},
    "fast_food": {
        "fast_food", "fastfood", "fast_food_restaurant", "quick_service", "drive_thru", "drive_through", "value_meal",
    },
    "thai": {"thai", "pad_thai", "pad thai", "curry", "siamese"},
    "seafood": {"seafood", "fish", "crab", "lobster", "oyster", "shrimp", "clam"},
    "chinese": {"chinese", "dim_sum", "dim sum", "dumpling", "wok", "cantonese", "szechuan"},
    "vietnamese": {"vietnamese", "pho", "banh_mi", "banh mi"},
    "bbq": {"bbq", "barbecue", "smokehouse", "ribs", "brisket"},
    "steak": {"steak", "steakhouse", "chophouse", "grill"},
    "steakhouse": {"steakhouse", "steak", "chophouse", "grill"},
    "mediterranean": {"mediterranean", "greek", "gyro", "falafel", "shawarma", "hummus", "kebab"},
    "bakery": {"bakery", "bake", "pastry", "bagel", "donut", "doughnut"},
    "dessert": {"dessert", "ice_cream", "ice cream", "sweet", "crepe"},
    "cafe": {"cafe", "coffee", "espresso", "bistro"},
    "american": {"american", "diner", "traditional_american", "new_american", "wings", "sports_bar"},
    "latin_american": {"latin_american", "hispanic", "arepas", "empanadas"},
}


def normalize_tag(tag: str) -> str:
    """Normalizes a cuisine/dish tag into standard lower snake_case."""
    s = str(tag).strip().lower().replace("-", "_").replace(" ", "_")
    while "__" in s:
        s = s.replace("__", "_")
    return s


def tag_matches_synset(tag_norm: str, synset: set[str]) -> bool:
    """Checks if a normalized tag matches a synonym set using exact token and word-boundary semantics."""
    if tag_norm in synset:
        return True

    tag_stem = tag_norm.rstrip("s") if len(tag_norm) > 3 else tag_norm
    for s in synset:
        s_norm = normalize_tag(s)
        s_stem = s_norm.rstrip("s") if len(s_norm) > 3 else s_norm
        if tag_norm == s_norm or tag_stem == s_stem:
            return True

        # Word boundary token matching (e.g. 'mexican_restaurant' matches 'mexican')
        words = tag_norm.split("_")
        s_words = s_norm.split("_")

        # Explicit guard: prevent 'american' from ever matching compound words containing 'latin'
        if s_norm == "american" and "latin" in words:
            continue
        if tag_norm == "american" and "latin" in s_words:
            continue

        if s_norm in words or tag_norm in s_words:
            return True

    return False


def is_fast_food_tag(tag: str) -> bool:
    """Returns True if the normalized tag refers to fast food."""
    t = normalize_tag(tag)
    return t in {"fast_food", "fastfood", "fast_food_restaurant"} or t.startswith("fast_food")


def traits_overlap(cuisine_a: str, cuisine_b: str) -> bool:
    """
    Checks if two cuisine or dish tags overlap directly, via plural stems,
    or via known cuisine synonym groups (e.g. 'Tacos' matches 'Mexican').
    Strictly prevents cross-matching between distinct categories (e.g. 'Mexican' vs 'American').
    """
    a = normalize_tag(cuisine_a)
    b = normalize_tag(cuisine_b)
    if not a or not b:
        return False
    if a == b:
        return True

    # Explicit guard: Never match 'american' with 'latin_american'
    if ("latin" in a and b == "american") or ("latin" in b and a == "american"):
        return False

    # Explicit isolation guard: Never cross-match 'fast_food' with specific food genres
    # (e.g. 'burgers', 'pizza', 'mexican', 'italian', 'sushi', 'chinese', 'thai', 'seafood', etc.)
    # A craving for Burgers must find genuine burger spots, NOT be replaced with generic Fast Food.
    is_a_fast_food = is_fast_food_tag(a)
    is_b_fast_food = is_fast_food_tag(b)
    if is_a_fast_food != is_b_fast_food:
        return False

    # Plural / singular direct check
    if len(a) > 3 and len(b) > 3 and a.rstrip("s") == b.rstrip("s"):
        return True

    # Strip standard descriptor suffixes (e.g. 'mexican_restaurant' -> 'mexican')
    for suffix in ["_restaurant", "_food", "_store", "_place", "_bar", "_house", "_grill"]:
        if suffix == "_food" and (is_fast_food_tag(a) or is_fast_food_tag(b)):
            continue
        a_base = a[:-len(suffix)] if a.endswith(suffix) else a
        b_base = b[:-len(suffix)] if b.endswith(suffix) else b
        if a_base == b_base:
            return True
        if len(a_base) > 3 and len(b_base) > 3 and a_base.rstrip("s") == b_base.rstrip("s"):
            return True

    # Check known cuisine clusters
    for cluster_name, synset in CUISINE_SYNONYMS.items():
        all_syns = synset | {cluster_name}
        if tag_matches_synset(a, all_syns) and tag_matches_synset(b, all_syns):
            return True

    return False


# Specific Cuisine Brand Dictionaries:
# Accurately maps brand names to their specific cuisines when Google Places API
# only provides generic types (e.g., 'fast_food_restaurant' or 'restaurant').
BRAND_CUISINE_MAP: Dict[str, str] = {
    # Burgers
    "mcdonald": "Burgers",
    "wendy": "Burgers",
    "burger king": "Burgers",
    "five guys": "Burgers",
    "shake shack": "Burgers",
    "in-n-out": "Burgers",
    "culver": "Burgers",
    "whataburger": "Burgers",
    "jack in the box": "Burgers",
    "white castle": "Burgers",
    "smashburger": "Burgers",
    "habit burger": "Burgers",
    "red robin": "Burgers",
    "hardee": "Burgers",
    "carls jr": "Burgers",
    "carl's jr": "Burgers",
    "fuddrucker": "Burgers",
    "steak n shake": "Burgers",
    "steak 'n shake": "Burgers",
    "freddy": "Burgers",
    "hopdoddy": "Burgers",
    "bad daddy": "Burgers",
    "burgerfi": "Burgers",
    "wayback burger": "Burgers",
    "fatburger": "Burgers",
    "checkers": "Burgers",
    "rally's": "Burgers",
    "krystal": "Burgers",

    # Pizza
    "domino": "Pizza",
    "pizza hut": "Pizza",
    "little caesar": "Pizza",
    "papa john": "Pizza",
    "marco's pizza": "Pizza",
    "papa murphy": "Pizza",
    "blaze pizza": "Pizza",
    "mod pizza": "Pizza",
    "mellow mushroom": "Pizza",
    "jet's pizza": "Pizza",
    "round table pizza": "Pizza",
    "cici": "Pizza",
    "sbarro": "Pizza",
    "hungry howie": "Pizza",

    # Mexican
    "taco bell": "Mexican",
    "del taco": "Mexican",
    "chipotle": "Mexican",
    "qdoba": "Mexican",
    "moe's southwest": "Mexican",
    "moes southwest": "Mexican",
    "rubio": "Mexican",
    "el pollo loco": "Mexican",
    "baja fresh": "Mexican",
    "torchy": "Mexican",
    "taco cabana": "Mexican",
    "chuy": "Mexican",

    # Chicken
    "chick-fil-a": "Chicken",
    "popeye": "Chicken",
    "kfc": "Chicken",
    "kentucky fried chicken": "Chicken",
    "raising cane": "Chicken",
    "zaxby": "Chicken",
    "church's chicken": "Chicken",
    "church's texas chicken": "Chicken",
    "wingstop": "Chicken",
    "buffalo wild wings": "Chicken",
    "bojangles": "Chicken",
    "boston market": "Chicken",
    "jollibee": "Chicken",

    # Sandwiches & Subs
    "subway": "Sandwiches",
    "jimmy john": "Sandwiches",
    "jersey mike": "Sandwiches",
    "firehouse sub": "Sandwiches",
    "panera": "Sandwiches",
    "arby": "Sandwiches",
    "potbelly": "Sandwiches",
    "schlotzsky": "Sandwiches",
    "jason's deli": "Sandwiches",
    "mcalister": "Sandwiches",
    "charleys philly": "Sandwiches",

    # Chinese / Asian
    "panda express": "Chinese",
    "pei wei": "Chinese",
    "p.f. chang": "Chinese",

    # Dessert & Cafe
    "dairy queen": "Dessert",
    "baskin-robbins": "Dessert",
    "baskin robbins": "Dessert",
    "cold stone": "Dessert",
    "krispy kreme": "Bakery",
    "dunkin": "Cafe",
    "starbucks": "Cafe",
    "dutch bros": "Cafe",
    "crumbl": "Dessert",
}

FAST_FOOD_CHAINS = {
    "mcdonald", "wendy", "burger king", "five guys", "shake shack", "in-n-out", "culver",
    "whataburger", "jack in the box", "white castle", "smashburger", "habit burger",
    "hardee", "carls jr", "carl's jr", "checkers", "rally's", "krystal", "sonic",
    "taco bell", "del taco", "chipotle", "qdoba", "moe's southwest", "el pollo loco",
    "chick-fil-a", "popeye", "kfc", "kentucky fried chicken", "raising cane", "zaxby",
    "church's chicken", "wingstop", "bojangles", "jollibee",
    "subway", "jimmy john", "jersey mike", "firehouse sub", "arby", "charleys philly",
    "panda express", "dairy queen", "little caesar", "domino", "pizza hut", "papa john",
}

# Explicit Exclusion Filters: Gas Stations & Convenience Stores
# Food Finder is strictly for dining restaurants; gas stations and convenience stores are never recommended.
NON_RESTAURANT_TYPES = {
    "gas_station",
    "convenience_store",
    "car_wash",
    "car_repair",
    "auto_repair",
    "parking",
    "electric_vehicle_charging_station",
    "supermarket",
    "grocery_store",
    "department_store",
    "liquor_store",
    "pharmacy",
    "drugstore",
    "atm",
    "bank",
}

GAS_STATION_BRANDS = {
    "shell", "chevron", "exxon", "mobil", "bp", "texaco", "citgo", "marathon",
    "valero", "speedway", "circle k", "7-eleven", "7 eleven", "7eleven", "racetrac",
    "sunoco", "wawa", "casey's", "caseys", "quiktrip", "kum & go", "kum and go",
    "cumberland farms", "sheetz", "love's travel", "pilot travel", "flying j",
    "buc-ee", "bucees", "royal farms", "quickchek", "murphy usa", "murphy express",
    "phillips 66", "conoco", "sinclair", "kroger fuel", "gas station", "fuel station",
    "car wash", "auto spa", "kwik trip", "kwik star", "maverik", "getgo",
}


def format_cuisine_type(place_type: str) -> str:
    """Formats raw Places API type string (e.g. 'mexican_restaurant' -> 'Mexican', 'hamburger_restaurant' -> 'Burgers')."""
    raw = str(place_type).lower().strip()
    if raw in {"fast_food", "fast_food_restaurant", "fastfood"}:
        return "Fast Food"
    if raw in {"hamburger_restaurant", "hamburger", "burger_restaurant", "burger", "burgers"}:
        return "Burgers"
    if raw in {"pizza_restaurant", "pizzeria", "pizza"}:
        return "Pizza"
    if raw in {"mexican_restaurant", "mexican"}:
        return "Mexican"
    if raw in {"italian_restaurant", "italian"}:
        return "Italian"
    if raw in {"japanese_restaurant", "sushi_restaurant", "sushi", "japanese"}:
        return "Sushi"
    if raw in {"chinese_restaurant", "chinese"}:
        return "Chinese"
    if raw in {"thai_restaurant", "thai"}:
        return "Thai"
    if raw in {"seafood_restaurant", "seafood"}:
        return "Seafood"
    if raw in {"sandwich_shop", "deli", "sandwiches", "sandwich"}:
        return "Sandwiches"
    if raw in {"chicken_restaurant", "chicken"}:
        return "Chicken"
    if raw in {"barbecue_restaurant", "bbq"}:
        return "BBQ"
    if raw in {"steak_house", "steakhouse", "steak"}:
        return "Steakhouse"
    name = raw
    for suffix in ["_restaurant", "_store", "_place", "_bar", "_house", "_grill"]:
        if name.endswith(suffix):
            name = name[:-len(suffix)]
            break
    if name != "fast" and name.endswith("_food"):
        name = name[:-len("_food")]
    words = name.replace("_", " ").split()
    return " ".join(w.capitalize() for w in words)


def extract_cuisines(types: List[str], name: str = "", hint_cuisine: str = "") -> List[str]:
    """
    Filters generic place types and extracts readable cuisine names from:
    1. Known brand cuisine mapping (e.g. 'Five Guys' -> 'Burgers', 'Domino's' -> 'Pizza')
    2. Google Places types (e.g. hamburger_restaurant -> Burgers, mexican_restaurant -> Mexican)
    3. Restaurant display name keywords (e.g. 'Poblano Mexican Grill' -> Mexican)
    4. Targeted search query hint
    Guarantees that specific cuisines (Burgers, Pizza, Mexican, etc.) always precede generic categories (Fast Food, Restaurant).
    """
    cuisines: List[str] = []
    name_lower = name.lower()
    name_words = set(re.findall(r"\b[a-z0-9]+\b", name_lower))

    # 1. Brand-specific authentic cuisine mapping
    brand_matched_cuisine = None
    for brand, brand_cuisine in BRAND_CUISINE_MAP.items():
        if brand in name_lower:
            brand_matched_cuisine = brand_cuisine
            if brand_cuisine not in cuisines:
                cuisines.append(brand_cuisine)
            break

    # 2. Extract from Google Places types
    for t in types:
        t_clean = str(t).strip().lower()
        if t_clean not in IGNORED_PLACE_TYPES:
            formatted = format_cuisine_type(t_clean)
            if formatted:
                # If a brand has an established specialty (e.g. Chicken for Jollibee/KFC),
                # prevent misleading Google secondary types (like 'hamburger_restaurant') from misclassifying it.
                if brand_matched_cuisine and brand_matched_cuisine != "Burgers" and formatted == "Burgers":
                    continue
                if brand_matched_cuisine and brand_matched_cuisine != "Pizza" and formatted == "Pizza":
                    continue
                if brand_matched_cuisine and brand_matched_cuisine != "Mexican" and formatted == "Mexican":
                    continue
                if formatted not in cuisines:
                    cuisines.append(formatted)

    # 3. Extract from name words matching CUISINE_SYNONYMS
    for cat, syns in CUISINE_SYNONYMS.items():
        matched_name = False
        for s in syns:
            s_clean = s.lower().replace("-", " ").replace("_", " ")
            if " " in s_clean:
                if s_clean in name_lower:
                    matched_name = True
                    break
            else:
                if s_clean in name_words:
                    if s_clean == "american" and "latin" in name_words:
                        continue
                    matched_name = True
                    break
        if matched_name:
            formatted_cat = format_cuisine_type(cat)
            if brand_matched_cuisine and brand_matched_cuisine != "Burgers" and formatted_cat == "Burgers":
                continue
            if formatted_cat and formatted_cat not in cuisines:
                cuisines.append(formatted_cat)

    # 4. Hint cuisine from targeted query
    if hint_cuisine:
        formatted_hint = format_cuisine_type(hint_cuisine)
        # Only adopt hint cuisine if it doesn't conflict with a known distinct brand specialty
        if formatted_hint and not (brand_matched_cuisine and brand_matched_cuisine != formatted_hint and brand_matched_cuisine not in {"Fast Food", "Restaurant"}):
            hint_norm = normalize_tag(hint_cuisine)
            has_relevance = (
                any(traits_overlap(c, hint_cuisine) for c in cuisines)
                or any(traits_overlap(t, hint_cuisine) for t in types)
                or any(w in name_words for w in [hint_norm, hint_norm.rstrip("s")])
            )
            if has_relevance and formatted_hint not in cuisines:
                cuisines.append(formatted_hint)

    # Fallback if empty
    if not cuisines:
        return ["Restaurant"]

    # 5. PRIORITIZATION & ORDERING:
    # Specific food cuisines MUST ALWAYS come before generic categories ('Fast Food', 'Restaurant', 'Food').
    # If a hint_cuisine was provided, the hint cuisine should be at the very front.
    generic_tags = {"Fast Food", "Restaurant", "Food"}
    specific = [c for c in cuisines if c not in generic_tags]
    generic = [c for c in cuisines if c in generic_tags]

    if hint_cuisine:
        hint_formatted = format_cuisine_type(hint_cuisine)
        if hint_formatted in specific:
            specific.remove(hint_formatted)
            specific.insert(0, hint_formatted)
        elif hint_formatted in generic:
            generic.remove(hint_formatted)
            generic.insert(0, hint_formatted)

    ordered = specific + generic
    return ordered if ordered else ["Restaurant"]


def _parse_place_item(
    p: Dict[str, Any],
    location: Dict[str, float],
    hint_cuisine: str = "",
    default_price: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Helper to parse a single Google Places (New) place object into our API contract."""
    place_id = str(p.get("id") or "")
    if not place_id:
        return None

    display_name_obj = p.get("displayName") or {}
    name = str(display_name_obj.get("text") or "Unknown Restaurant")
    name_clean = name.lower().strip()
    name_words = set(re.findall(r"\b[a-z0-9]+\b", name_clean))

    raw_types = p.get("types") or []
    raw_types_lower = {str(t).lower().strip() for t in raw_types}

    # 1. STRICT EXCLUSION: Never allow gas stations, convenience stores, or non-restaurant businesses
    if any(nrt in raw_types_lower for nrt in NON_RESTAURANT_TYPES):
        return None

    for g_brand in GAS_STATION_BRANDS:
        if " " in g_brand:
            if g_brand in name_clean:
                return None
        else:
            if g_brand in name_words:
                return None

    if any(w in name_words for w in {"gas", "fuel", "petroleum", "oil"}):
        return None

    is_fast_food = any("fast_food" in str(t).lower() for t in raw_types) or any(
        chain in name_clean for chain in FAST_FOOD_CHAINS
    )

    raw_price = p.get("priceLevel")
    # Major fast food chains are universally budget ($) tier regardless of Google's inflation-skewed data
    if any(chain in name_clean for chain in FAST_FOOD_CHAINS):
        price = "$"
    elif raw_price:
        price = PRICE_MAP.get(str(raw_price), default_price or ("$" if is_fast_food else "$$"))
    elif default_price:
        price = default_price
    elif is_fast_food:
        price = "$"
    else:
        price = "$$"

    cuisines = extract_cuisines(raw_types, name=name, hint_cuisine=hint_cuisine)
    if is_fast_food and "Fast Food" not in cuisines:
        cuisines.append("Fast Food")

    # Re-verify ordering: specific cuisines always come first
    generic_tags = {"Fast Food", "Restaurant", "Food"}
    specific = [c for c in cuisines if c not in generic_tags]
    generic = [c for c in cuisines if c in generic_tags]
    cuisines = (specific + generic) if (specific or generic) else ["Restaurant"]

    coords = extract_coords(p.get("location"), location)

    address = str(p.get("formattedAddress") or "Address unavailable")

    raw_rating = p.get("rating")
    rating = round(float(raw_rating), 1) if raw_rating is not None else None

    raw_user_rating_count = p.get("userRatingCount")
    user_rating_count = int(raw_user_rating_count) if raw_user_rating_count is not None else None

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
        "rating": rating,
        "user_rating_count": user_rating_count,
        "reviews_count": user_rating_count,
        "is_open": True,
    }


def search_places_by_text(
    query: str,
    location: Dict[str, float],
    radius_meters: int = 15000,
    price_levels: Optional[List[str]] = None,
    default_price: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Searches for restaurants matching a specific cuisine or craving using Google Places API (New) Text Search
    (POST https://places.googleapis.com/v1/places:searchText).
    Guarantees discovery of genuine matching restaurants even if nearby pool is saturated with generic chains.
    Supports strict price level filtering via Google Places API 'priceLevels' parameter.
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
        "X-Goog-FieldMask": "places.id,places.displayName,places.priceLevel,places.types,places.location,places.photos,places.formattedAddress,places.rating,places.userRatingCount",
    }
    clean_q = query.strip()
    q_lower = clean_q.lower()
    if q_lower in {"burgers", "burger", "pizza", "sushi", "fast food", "fast_food", "tacos", "mexican"}:
        text_query = clean_q
    elif any(term in q_lower for term in ["restaurant", "food", "place", "bar", "grill", "cafe", "drive", "burger", "pizza", "taco"]):
        text_query = clean_q
    else:
        text_query = f"{clean_q} restaurant"
    body: Dict[str, Any] = {
        "textQuery": text_query,
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
    if price_levels:
        body["priceLevels"] = price_levels

    req_data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=req_data, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))
            places = payload.get("places", [])
            results: List[Dict[str, Any]] = []
            for p in places:
                item = _parse_place_item(p, location, hint_cuisine=query, default_price=default_price)
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
        "X-Goog-FieldMask": "places.id,places.displayName,places.priceLevel,places.types,places.location,places.photos,places.formattedAddress,places.rating,places.userRatingCount",
    }

    body = {
        "includedTypes": ["restaurant", "fast_food_restaurant"],
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


def parse_allergy_tokens(allergy: str) -> List[str]:
    """Splits composite allergy labels (e.g. 'Gluten / Celiac', 'Peanuts / Nuts') into distinct tags."""
    raw_tokens = re.split(r"[/,;&+]|\bor\b", str(allergy).lower())
    tokens = []
    for raw in raw_tokens:
        clean = normalize_tag(raw)
        if clean:
            tokens.append(clean)
    return tokens


def get_allergy_conflict_tags(allergy: str) -> set[str]:
    """Returns the normalized conflict tags for a specific allergy, handling composite strings."""
    tokens = parse_allergy_tokens(allergy)
    conflict_tags = set(tokens)
    for token in tokens:
        for key, confs in ALLERGY_CONFLICTS.items():
            k_clean = normalize_tag(key)
            if token == k_clean or (len(k_clean) > 3 and token.rstrip("s") == k_clean.rstrip("s")):
                conflict_tags.update(confs)
    return conflict_tags


def restaurant_conflicts_with_allergy(cuisines: List[str], allergy: str) -> bool:
    """Checks if a restaurant's cuisines conflict with an allergy or dietary restriction."""
    conflict_tags = get_allergy_conflict_tags(allergy)
    for c in cuisines:
        for tag in conflict_tags:
            if traits_overlap(c, tag):
                return True
    return False


def calculate_consensus_vector(mood_requests: List[Dict[str, Any]]) -> Dict[str, float]:
    """
    Calculates a mathematical Consensus Vector. Adds positive magnitude (+1.0) for desired 
    cuisines, applies a strict veto (-100.0) for explicitly rejected cuisines, and applies a
    balanced deprioritization penalty (-2.5) for dietary/allergy restrictions (nerfed so
    they guide consensus without nuclear-vetoing viable group dining options).
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
            if c_clean and c_clean != "anything":
                vector[c_clean] = vector.get(c_clean, 0.0) + 1.0

        # The Veto System: Explicit rejection (-100.0)
        for cuisine in vetoed:
            c_clean = str(cuisine).strip().lower()
            if c_clean:
                vector[c_clean] = vector.get(c_clean, 0.0) - 100.0

        # Nerfed Allergy System: Soft deprioritization (-2.5) instead of nuclear exclusion
        for allergy in allergies:
            a_clean = str(allergy).strip().lower()
            if not a_clean:
                continue
            vector[a_clean] = vector.get(a_clean, 0.0) - 2.5

    return vector


def calculate_distance_penalty(distance_miles: float) -> float:
    """
    Calculates a balanced distance penalty that gives closer places a strong,
    noticeable advantage while not trumping high-consensus or unique recommended places
    farther out.
    - 0 to 2 miles: 0.45 points / mile (nearby options get strong priority)
    - 2 to 5 miles: 0.30 points / mile (moderate penalty for reasonable driving distance)
    - 5+ miles: 0.20 points / mile (gentle plateau so strong recommendations aren't eliminated)
    """
    d = max(0.0, float(distance_miles))
    if d <= 2.0:
        return d * 0.45
    elif d <= 5.0:
        return 0.90 + (d - 2.0) * 0.30
    else:
        return 1.80 + (d - 5.0) * 0.20


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates the distance in miles between two coordinates."""
    R = 3958.8  # Radius of earth in miles
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return R * c


def estimate_drive_time_minutes(distance_miles: float) -> int:
    """
    Estimates realistic driving time in minutes based on distance.
    Assumes ~25 mph average driving speed (2.4 min/mi) plus a 1-2 min buffer for starting/parking.
    """
    d = max(0.0, float(distance_miles))
    if d <= 0.2:
        return 1
    return max(1, round(d * 2.4 + 1.5))


def score_restaurants(
    consensus_vector: Dict[str, float],
    restaurants: List[Dict[str, Any]],
    group_max_price: str = "$$$$",
    group_location: Optional[Dict[str, float]] = None,
    include_debug: bool = True,
    is_wildcard: bool = False,
    group_allergies: Optional[List[str]] = None,
    allowed_prices: Optional[Any] = None,
) -> List[Dict[str, Any]]:
    """
    Scores restaurants using the Vector Dot Product with Semantic Overlap.
    STRICT ALGORITHM ANTI-HALLUCINATION:
    1. Any restaurant with a 0% consensus score (0 matching traits with group cravings)
       is strictly filtered out so unpicked cuisines are NEVER recommended.
    2. STRICT PRICE FILTER: Restaurants MUST match one of the group's selected price tiers
       (e.g., if users selected $$$$, ONLY $$$$ places are scored/recommended).
    """
    if allowed_prices:
        if isinstance(allowed_prices, (set, list, tuple)):
            allowed_set = {str(p).strip() for p in allowed_prices if str(p).strip() in PRICE_MAP}
        else:
            allowed_set = {str(allowed_prices).strip()} if str(allowed_prices).strip() in PRICE_MAP else {"$", "$$", "$$$", "$$$$"}
    elif group_max_price and group_max_price in PRICE_MAP:
        allowed_set = {group_max_price}
    else:
        allowed_set = {"$", "$$", "$$$", "$$$$"}

    if group_location is None:
        group_location = {"lat": 28.5383, "lng": -81.3792}

    positive_traits = {k: v for k, v in consensus_vector.items() if v > 0}
    negative_traits = {k: v for k, v in consensus_vector.items() if v < 0}

    price_levels = {"$": 1, "$$": 2, "$$$": 3, "$$$$": 4}
    scored_restaurants: List[Dict[str, Any]] = []

    for rest in restaurants:
        rest_price = rest.get("price", "$$")
        if rest_price not in allowed_set:
            continue
        rest_price_level = price_levels.get(rest_price, 2)

        cuisines = [str(c).strip().lower() for c in rest.get("cuisines", [])]

        # Check for strict vetoes (weight <= -50.0)
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

        # 2. Allergy Penalty (Soft deprioritization: 2.5 points per conflicting group allergy)
        allergy_penalty = 0.0
        conflicted_allergies = []
        if group_allergies:
            for allergy in group_allergies:
                a_clean = str(allergy).strip().lower()
                if not a_clean:
                    continue
                if restaurant_conflicts_with_allergy(cuisines, a_clean):
                    allergy_penalty += 2.5
                    conflicted_allergies.append(format_cuisine_type(a_clean))

        # 3. Distance Penalty (Balanced weighting: gives closer places a strong edge without trumping distant recommendations)
        coords = extract_coords(rest.get("coordinates"), group_location)
        rest_lat = coords["lat"]
        rest_lng = coords["lng"]
        distance = haversine_distance(group_location["lat"], group_location["lng"], rest_lat, rest_lng)
        distance_penalty = calculate_distance_penalty(distance)
        drive_mins = estimate_drive_time_minutes(distance)
        final_score = dot_product_score - allergy_penalty - distance_penalty

        formula_parts = [f"+{dot_product_score:.2f} (Match)"]
        if allergy_penalty > 0:
            conflict_str = ", ".join(conflicted_allergies)
            formula_parts.append(f"- {allergy_penalty:.2f} (Allergy: {conflict_str})")
        formula_parts.append(f"- {distance_penalty:.2f} ({distance:.1f} mi, ~{drive_mins}m drive)")
        formula = f"{' '.join(formula_parts)} = {final_score:.2f} pts"

        scored_restaurants.append({
            "restaurant": rest,
            "final_score": final_score,
            "distance": distance,
            "drive_minutes": drive_mins,
            "price_level": rest_price_level,
            "match_score": dot_product_score,
            "allergy_penalty": allergy_penalty,
            "conflicted_allergies": conflicted_allergies,
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
        dist_rounded = round(item["distance"], 1)
        drive_mins = item["drive_minutes"]
        rest_data["distance_miles"] = dist_rounded
        rest_data["drive_minutes"] = drive_mins
        rest_data["drive_time_text"] = f"{drive_mins} min drive"
        if "rating" not in rest_data:
            rest_data["rating"] = None
        if "user_rating_count" not in rest_data:
            rest_data["user_rating_count"] = None
        if "reviews_count" not in rest_data:
            rest_data["reviews_count"] = rest_data.get("user_rating_count")

        if include_debug:
            rest_data["_debug_stats"] = {
                "match_score": round(item["match_score"], 2),
                "allergy_penalty": round(item["allergy_penalty"], 2),
                "conflicted_allergies": item["conflicted_allergies"],
                "distance_penalty": round(item["distance_penalty"], 2),
                "distance_miles": dist_rounded,
                "drive_minutes": drive_mins,
                "drive_time_text": f"{drive_mins} min drive",
                "rating": rest_data.get("rating"),
                "user_rating_count": rest_data.get("user_rating_count"),
                "reviews_count": rest_data.get("reviews_count"),
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
    applies group constraints (strict price match, vetoes, allergies), scores candidates using
    the anti-hallucination consensus algorithm, and resolves CDN image URLs.
    Returns (results, consensus_data).
    """
    # STRICT PRICE FILTERING:
    # Collect all strictly requested price tiers across all group members.
    # If everyone put four dollars ($$$$), only $$$$ restaurants will show up as recommendations.
    allowed_prices: set[str] = set()
    for request in mood_requests:
        req_prices = request.get("prices")
        if isinstance(req_prices, list) and req_prices:
            for p in req_prices:
                p_clean = str(p).strip()
                if p_clean in PRICE_MAP:
                    allowed_prices.add(p_clean)
        elif request.get("max_price"):
            p_clean = str(request["max_price"]).strip()
            if p_clean in PRICE_MAP:
                allowed_prices.add(p_clean)

    if not allowed_prices:
        allowed_prices = {"$", "$$", "$$$", "$$$$"}  # Default fallback if unspecified

    # Map to Google Places API (New) priceLevel filter enums
    target_google_prices = [
        gp
        for tier in allowed_prices
        for gp in TIER_TO_GOOGLE_PRICE.get(tier, [])
    ]

    # Calculate geographic midpoint of connected members
    member_locations = [req.get("location") for req in mood_requests if req.get("location")]
    midpoint = calculate_geographic_midpoint(member_locations, fallback=group_location)

    # Collect all desired cuisines across group requests
    all_desired = [
        str(cuisine).strip().lower()
        for request in mood_requests
        for cuisine in request.get("desired_cuisines", [])
        if str(cuisine).strip()
    ]

    # Determine if the group voted for 'anything' wildcard
    is_wildcard = (len(all_desired) == 0) or all(c == "anything" for c in all_desired)

    # Calculate consensus vector
    vector = calculate_consensus_vector(mood_requests)

    # Collect desired cuisines with positive votes
    positive_desired = [
        str(k).strip() for k, v in vector.items() if v > 0
    ]

    # Fetch live Google Places API (New) restaurants (Nearby Search)
    raw_restaurants = fetch_live_restaurants(location=midpoint)
    existing_ids = {r["id"] for r in raw_restaurants}

    # If the group has specific cravings, check if raw_restaurants contains enough matching places
    # that ALSO match allowed_prices!
    # If not, perform targeted search_places_by_text for the requested cuisines!
    if not is_wildcard and positive_desired:
        for craving in positive_desired[:3]:
            match_count = sum(
                1 for r in raw_restaurants
                if r.get("price") in allowed_prices
                and any(traits_overlap(c, craving) for c in r.get("cuisines", []))
            )
            if match_count < 3:
                craving_is_fast_food = "fast" in craving.lower() or "quick" in craving.lower()
                c_default_price = "$" if craving_is_fast_food else (next(iter(allowed_prices)) if len(allowed_prices) == 1 else None)
                # In Google Places API, budget ($) and moderate ($$) restaurants/chains rarely have priceLevel
                # populated in Google's database. Sending priceLevels to Google causes Google's server to omit them.
                # We only send priceLevels to Google for high-end ($$$, $$$$) dining queries, and enforce
                # allowed_prices strictly in Python.
                api_price_levels = target_google_prices if allowed_prices.issubset({"$$$", "$$$$"}) else None
                targeted_places = search_places_by_text(
                    craving,
                    midpoint,
                    price_levels=api_price_levels,
                    default_price=c_default_price,
                )
                for tp in targeted_places:
                    if tp["id"] not in existing_ids:
                        raw_restaurants.append(tp)
                        existing_ids.add(tp["id"])

                # If user selected $ and craving is burgers, guarantee discovery of budget burger joints (McDonald's, Wendy's, etc.)
                if "$" in allowed_prices and craving.lower() in {"burgers", "burger"}:
                    cheap_burger_count = sum(
                        1 for r in raw_restaurants
                        if r.get("price") == "$" and any(traits_overlap(c, "burgers") for c in r.get("cuisines", []))
                    )
                    if cheap_burger_count < 3:
                        cheap_burger_places = search_places_by_text(
                            "burger fast food",
                            midpoint,
                            default_price="$",
                        )
                        for tp in cheap_burger_places:
                            if tp["id"] not in existing_ids:
                                raw_restaurants.append(tp)
                                existing_ids.add(tp["id"])

                # If user craves fast food, ensure genuine fast food restaurants are discovered
                if craving_is_fast_food:
                    ff_count = sum(
                        1 for r in raw_restaurants
                        if any(traits_overlap(c, "fast_food") for c in r.get("cuisines", []))
                    )
                    if ff_count < 3:
                        ff_places = search_places_by_text(
                            "fast food restaurant",
                            midpoint,
                            default_price="$" if "$" in allowed_prices else None,
                        )
                        for tp in ff_places:
                            if tp["id"] not in existing_ids:
                                raw_restaurants.append(tp)
                                existing_ids.add(tp["id"])
    else:
        # Wildcard / open craving mode: check if enough restaurants match allowed_prices
        price_match_count = sum(1 for r in raw_restaurants if r.get("price") in allowed_prices)
        if price_match_count < 3:
            price_query = "restaurant"
            if allowed_prices == {"$$$$"}:
                price_query = "fine dining restaurant"
            elif allowed_prices == {"$$$"}:
                price_query = "upscale restaurant"
            elif allowed_prices == {"$"}:
                price_query = "fast food restaurant"

            api_price_levels = target_google_prices if allowed_prices.issubset({"$$$", "$$$$"}) else None
            targeted_places = search_places_by_text(
                price_query,
                midpoint,
                price_levels=api_price_levels,
                default_price=next(iter(allowed_prices)) if len(allowed_prices) == 1 else None,
            )
            for tp in targeted_places:
                if tp["id"] not in existing_ids:
                    raw_restaurants.append(tp)
                    existing_ids.add(tp["id"])

    vetoes = {
        str(cuisine).strip().lower()
        for request in mood_requests
        for cuisine in request.get("vetoed_cuisines", [])
    }

    # Collect all group allergies for metadata reporting
    allergies = {
        str(a).strip().lower()
        for request in mood_requests
        for a in request.get("allergies", [])
        if str(a).strip()
    }

    # Filter out closed restaurants, price violations, and explicit group vetoes.
    # STRICT PRICE FILTER: Candidate restaurant price must be in allowed_prices!
    eligible = [
        r for r in raw_restaurants
        if r.get("is_open", True)
        and r.get("price") in allowed_prices
        and not any(
            any(traits_overlap(c, v) for c in r.get("cuisines", []))
            for v in vetoes
        )
    ]

    results = score_restaurants(
        consensus_vector=vector,
        restaurants=eligible,
        allowed_prices=allowed_prices,
        group_max_price=max(allowed_prices, key=lambda x: len(x)),
        group_location=midpoint,
        include_debug=True,
        is_wildcard=is_wildcard,
        group_allergies=list(allergies),
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
            "is_allergy": any(a in k.lower() or k.lower() in a for a in allergies) or (v > -50.0),
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
            "prices": req.get("prices") or [req.get("max_price", "$$")],
        }
        for idx, req in enumerate(mood_requests, 1)
    ]

    consensus_data = {
        "vector": {k: round(v, 2) for k, v in vector.items()},
        "positive_weights": positive_weights,
        "vetoes_and_allergies": vetoes_and_allergies,
        "incoming_summary": incoming_summary,
        "midpoint": midpoint,
        "allowed_prices": sorted(list(allowed_prices)),
        "max_price": ", ".join(sorted(list(allowed_prices))),
        "is_wildcard": is_wildcard,
        "candidates_math": [
            {
                "id": r["id"],
                "name": r["name"],
                "price": r.get("price", "$$"),
                "cuisines": r.get("cuisines", []),
                "final_score": r.get("_debug_stats", {}).get("final_score", 0),
                "match_score": r.get("_debug_stats", {}).get("match_score", 0),
                "allergy_penalty": r.get("_debug_stats", {}).get("allergy_penalty", 0),
                "conflicted_allergies": r.get("_debug_stats", {}).get("conflicted_allergies", []),
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
