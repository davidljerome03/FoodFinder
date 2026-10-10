import json
import uuid
import math
from pathlib import Path
from typing import List, Dict, Any

def generate_mock_data(filepath: str = "dummy_restaurants.json"):
    """
    Generates a mock JSON file containing 16 restaurants that perfectly match 
    the API contract defined in AGENTS.md.
    """
    restaurants = [
        {"id": str(uuid.uuid4()), "name": "The Burger Joint", "price": "$$", "cuisines": ["American", "Burgers"], "coordinates": {"lat": 28.5383, "lng": -81.3792}},
        {"id": str(uuid.uuid4()), "name": "Taco Fiesta", "price": "$", "cuisines": ["Mexican", "Tacos"], "coordinates": {"lat": 28.5390, "lng": -81.3800}},
        {"id": str(uuid.uuid4()), "name": "Sushi Central", "price": "$$$", "cuisines": ["Japanese", "Sushi"], "coordinates": {"lat": 28.5400, "lng": -81.3750}},
        {"id": str(uuid.uuid4()), "name": "Pizza Haven", "price": "$$", "cuisines": ["Italian", "Pizza"], "coordinates": {"lat": 28.5375, "lng": -81.3810}},
        {"id": str(uuid.uuid4()), "name": "Spicy Thai", "price": "$$", "cuisines": ["Thai", "Asian"], "coordinates": {"lat": 28.5410, "lng": -81.3780}},
        {"id": str(uuid.uuid4()), "name": "Vegan Delights", "price": "$$", "cuisines": ["Vegan", "Healthy"], "coordinates": {"lat": 28.5360, "lng": -81.3770}},
        {"id": str(uuid.uuid4()), "name": "Steakhouse Prime", "price": "$$$$", "cuisines": ["American", "Steak"], "coordinates": {"lat": 28.5420, "lng": -81.3740}},
        {"id": str(uuid.uuid4()), "name": "Pho King", "price": "$", "cuisines": ["Vietnamese", "Soup"], "coordinates": {"lat": 28.5350, "lng": -81.3795}},
        {"id": str(uuid.uuid4()), "name": "Mediterranean Grill", "price": "$$", "cuisines": ["Mediterranean", "Greek"], "coordinates": {"lat": 28.5388, "lng": -81.3820}},
        {"id": str(uuid.uuid4()), "name": "The Breakfast Club", "price": "$", "cuisines": ["Breakfast", "American"], "coordinates": {"lat": 28.5405, "lng": -81.3805}},
        {"id": str(uuid.uuid4()), "name": "Curry House", "price": "$$", "cuisines": ["Indian", "Curry"], "coordinates": {"lat": 28.5395, "lng": -81.3760}},
        {"id": str(uuid.uuid4()), "name": "Noodle Bar", "price": "$", "cuisines": ["Japanese", "Ramen"], "coordinates": {"lat": 28.5370, "lng": -81.3800}},
        {"id": str(uuid.uuid4()), "name": "BBQ Pit", "price": "$$", "cuisines": ["American", "BBQ"], "coordinates": {"lat": 28.5365, "lng": -81.3785}},
        {"id": str(uuid.uuid4()), "name": "Seafood Shack", "price": "$$$", "cuisines": ["Seafood", "American"], "coordinates": {"lat": 28.5415, "lng": -81.3790}},
        {"id": str(uuid.uuid4()), "name": "French Bistro", "price": "$$$", "cuisines": ["French", "European"], "coordinates": {"lat": 28.5380, "lng": -81.3745}},
        {"id": str(uuid.uuid4()), "name": "Dim Sum Place", "price": "$$", "cuisines": ["Chinese", "Dim Sum"], "coordinates": {"lat": 28.5392, "lng": -81.3815}},
    ]
    with open(filepath, 'w') as f:
        json.dump(restaurants, f, indent=2)
    return filepath

def calculate_consensus_vector(mood_requests: List[Dict[str, Any]]) -> Dict[str, float]:
    """
    Calculates a mathematical Consensus Vector. Adds positive magnitude for desired 
    cuisines and applies a massive penalty (veto) for explicitly rejected cuisines.
    """
    vector = {}
    for req in mood_requests:
        # Positive votes
        for cuisine in req.get("desired_cuisines", []):
            cuisine_lower = cuisine.lower()
            vector[cuisine_lower] = vector.get(cuisine_lower, 0) + 1.0
            
        # The Veto System: Massive negative weights
        for cuisine in req.get("vetoed_cuisines", []):
            cuisine_lower = cuisine.lower()
            vector[cuisine_lower] = vector.get(cuisine_lower, 0) - 100.0
            
    return vector

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculates the distance in miles between two coordinates."""
    R = 3958.8 # Radius of earth in miles
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2) * math.sin(dlat/2) + math.cos(math.radians(lat1)) \
        * math.cos(math.radians(lat2)) * math.sin(dlon/2) * math.sin(dlon/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def score_restaurants(
    consensus_vector: Dict[str, float], 
    dummy_json_path: str = None,
    group_max_price: str = "$$$$",
    group_location: Dict[str, float] = None,
    restaurants: List[Dict[str, Any]] = None,
    include_debug: bool = True,
) -> List[Dict[str, Any]]:
    if restaurants is None:
        data_path = Path(dummy_json_path) if dummy_json_path else Path(__file__).with_name("dummy_restaurants.json")
        if not data_path.is_absolute():
            data_path = Path(__file__).parent / data_path
        with data_path.open("r", encoding="utf-8") as f:
            restaurants = json.load(f)
        
    price_levels = {"$": 1, "$$": 2, "$$$": 3, "$$$$": 4}
    max_level = price_levels.get(group_max_price, 4)
    
    # Default group location if none provided (Centered near our mock data)
    if group_location is None:
        group_location = {"lat": 28.5383, "lng": -81.3792}
        
    scored_restaurants = []
    
    for rest in restaurants:
        rest_price_level = price_levels.get(rest.get("price", "$"), 1)
        
        # 1. Base Score: Vector Dot Product
        dot_product_score = 0.0
        for cuisine in rest.get("cuisines", []):
            cuisine_lower = cuisine.lower()
            if cuisine_lower in consensus_vector:
                dot_product_score += consensus_vector[cuisine_lower] 
                
        # 2. Hard Price Penalty
        if rest_price_level > max_level:
            dot_product_score -= 50.0 
            
        # 3. Distance Penalty (decay the score based on how far away it is)
        coords = rest.get("coordinates", {})
        distance = haversine_distance(
            group_location["lat"], group_location["lng"],
            coords.get("lat", group_location["lat"]), coords.get("lng", group_location["lng"])
        )
        
        # Subtract a portion of the score for every mile away
        distance_penalty = distance * 0.5
        final_score = dot_product_score - distance_penalty
        
        scored_restaurants.append({
            "restaurant": rest,
            "final_score": final_score,
            "distance": distance,
            "price_level": rest_price_level
        })
        
    # 4. Tie-Breaking Logic
    # Primary: Highest Score. Secondary (tie): Lowest Distance. Tertiary (tie): Lowest Price.
    scored_restaurants.sort(key=lambda x: (x["final_score"], -x["distance"], -x["price_level"]), reverse=True)
    
    # Return the top 3, appending debug stats so you can verify the math
    top_3 = []
    for item in scored_restaurants[:3]:
        rest_data = item["restaurant"].copy()
        if include_debug:
            rest_data["_debug_stats"] = {
                "final_score": round(item["final_score"], 2),
                "distance_miles": round(item["distance"], 2)
            }
        top_3.append(rest_data)
        
    return top_3


def recommend_restaurants(
    mood_requests: List[Dict[str, Any]], group_location: Dict[str, float]
) -> List[Dict[str, Any]]:
    """Return public restaurant payloads after applying group-wide hard limits."""
    price_levels = {"$": 1, "$$": 2, "$$$": 3, "$$$$": 4}
    max_price = min(
        (price_levels.get(request.get("max_price", "$$$$"), 4) for request in mood_requests),
        default=4,
    )
    vetoes = {
        cuisine.lower()
        for request in mood_requests
        for cuisine in request.get("vetoed_cuisines", [])
    }
    data_path = Path(__file__).with_name("dummy_restaurants.json")
    with data_path.open("r", encoding="utf-8") as file:
        restaurants = json.load(file)
    eligible = [
        restaurant
        for restaurant in restaurants
        if price_levels.get(restaurant.get("price"), 1) <= max_price
        and not vetoes.intersection(cuisine.lower() for cuisine in restaurant.get("cuisines", []))
    ]
    vector = calculate_consensus_vector(mood_requests)
    return score_restaurants(
        consensus_vector=vector,
        restaurants=eligible,
        group_max_price="$" * max_price,
        group_location=group_location,
        include_debug=False,
    )

if __name__ == "__main__":
    filepath = "dummy_restaurants.json"
    generate_mock_data(filepath)
    
    # Test Scenario: 
    # - Two people want Seafood or American.
    # - One person is violently allergic to Seafood and VETOES it!
    mock_requests = [
        {"desired_cuisines": ["American", "Seafood"], "vetoed_cuisines": [], "max_price": "$$"},
        {"desired_cuisines": ["Seafood"], "vetoed_cuisines": [], "max_price": "$$"},
        {"desired_cuisines": ["American", "Burgers"], "vetoed_cuisines": ["Seafood"], "max_price": "$$"}
    ]
    
    print("--- RUNNING ADVANCED ALGORITHM ---")
    vector = calculate_consensus_vector(mock_requests)
    print(f"Group Consensus Vector: {vector}\n")
    
    top_3 = score_restaurants(vector, filepath, group_max_price="$$")
    print("Top 3 Recommendations:")
    print(json.dumps(top_3, indent=2))
