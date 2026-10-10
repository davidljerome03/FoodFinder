from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional

# Import our new algorithm engine
import engine 

app = FastAPI(title="Food Finder API")

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# 1. DEFINE THE DATA STRUCTURES (Pydantic Models)
# This forces FastAPI to strictly validate any dynamic 
# JSON sent by the React frontend.
# ---------------------------------------------------------
class UserPreference(BaseModel):
    desired_cuisines: List[str] = []
    vetoed_cuisines: List[str] = []
    max_price: Optional[str] = "$$"

class GroupRequest(BaseModel):
    group_location: Dict[str, float]
    mood_requests: List[UserPreference]


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Food Finder Backend Active"}

# ---------------------------------------------------------
# 2. THE DYNAMIC ENDPOINT
# This catches the live HTTP POST request from the frontend!
# ---------------------------------------------------------
@app.post("/api/recommend")
def get_recommendations(payload: GroupRequest):
    """
    Takes in a dynamic list of user preferences, runs the engine math, 
    and returns the Top 3 restaurants.
    """
    # FastAPI automatically catches the dynamic JSON and converts it to our Pydantic classes.
    # We just need to convert them to standard Python dictionaries for our engine:
    requests_dict_list = [req.model_dump() for req in payload.mood_requests]
    
    # Run the dynamic data through our Algorithm!
    vector = engine.calculate_consensus_vector(requests_dict_list)
    
    # Score the restaurants based on this specific group's vector and location
    top_3 = engine.score_restaurants(
        consensus_vector=vector,
        dummy_json_path="dummy_restaurants.json",
        group_location=payload.group_location
    )
    
    # Send the winners back to the React frontend!
    return {
        "status": "success",
        "consensus_vector": vector,
        "winners": top_3
    }
