import asyncio
import os
from contextlib import asynccontextmanager
from typing import Annotated, Any

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError, field_validator

import engine
from lobbies import LobbyError, LobbyManager, parse_message

DEFAULT_LOCATION = {"lat": 28.5383, "lng": -81.3792}
PRICE_VALUES = {"$", "$$", "$$$", "$$$$"}
SUPPORTED_CUISINES = {"american", "asian", "bbq", "breakfast", "burgers", "chinese", "curry", "dim sum", "european", "french", "greek", "healthy", "indian", "italian", "japanese", "mediterranean", "mexican", "pho", "pizza", "ramen", "seafood", "soup", "steak", "sushi", "tacos", "thai", "vegan", "vietnamese"}
LOCAL_ORIGINS = {"http://localhost:5173", "http://127.0.0.1:5173"}
ALLOWED_ORIGINS = LOCAL_ORIGINS | {item.strip().rstrip("/") for item in os.getenv("ALLOWED_ORIGINS", "https://foodfinder.davidjerome.dev").split(",") if item.strip()}


class Location(BaseModel):
    lat: Annotated[float, Field(ge=-90, le=90)]
    lng: Annotated[float, Field(ge=-180, le=180)]


class NameRequest(BaseModel):
    name: Annotated[str, Field(min_length=1, max_length=30)]

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be blank.")
        return value


class CreateLobbyRequest(NameRequest):
    group_location: Location = Location(**DEFAULT_LOCATION)

class UserPreference(BaseModel):
    desired_cuisines: list[str] = Field(default_factory=list, max_length=20)
    vetoed_cuisines: list[str] = Field(default_factory=list, max_length=20)
    max_price: str = "$$"

    @field_validator("desired_cuisines", "vetoed_cuisines")
    @classmethod
    def validate_cuisines(cls, cuisines: list[str]) -> list[str]:
        cleaned: list[str] = []
        for cuisine in cuisines:
            normalized = cuisine.strip().lower()
            if not normalized or len(normalized) > 30:
                raise ValueError("Cuisine names must be between 1 and 30 characters.")
            if normalized not in SUPPORTED_CUISINES:
                raise ValueError(f"Unsupported cuisine: {cuisine}")
            if normalized not in cleaned:
                cleaned.append(normalized)
        return cleaned

    @field_validator("max_price")
    @classmethod
    def validate_price(cls, value: str) -> str:
        if value not in PRICE_VALUES:
            raise ValueError("max_price must be $, $$, $$$, or $$$$.")
        return value


class GroupRequest(BaseModel):
    group_location: Location
    mood_requests: list[UserPreference] = Field(min_length=1, max_length=12)


class VotePayload(BaseModel):
    restaurant_id: Annotated[str, Field(min_length=1, max_length=100)]


class RemoveMemberPayload(BaseModel):
    member_id: Annotated[str, Field(min_length=1, max_length=100)]


def recommend(preferences: list[dict[str, Any]], location: dict[str, float]) -> list[dict[str, Any]]:
    return engine.recommend_restaurants(preferences, location)


manager = LobbyManager(recommend)


async def lobby_cleanup_loop() -> None:
    while True:
        await asyncio.sleep(60)
        await manager.cleanup_expired()


@asynccontextmanager
async def lifespan(_: FastAPI):
    cleanup_task = asyncio.create_task(lobby_cleanup_loop())
    try:
        yield
    finally:
        cleanup_task.cancel()
        try:
            await cleanup_task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="Food Finder API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=sorted(ALLOWED_ORIGINS), allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.get("/")
@app.get("/api/health")
def health_check():
    return {"status": "Backend Active"}


@app.post("/api/recommend")
def get_recommendations(payload: GroupRequest):
    requests = [request.model_dump() for request in payload.mood_requests]
    return {"status": "success", "consensus_vector": engine.calculate_consensus_vector(requests), "winners": recommend(requests, payload.group_location.model_dump())}


@app.post("/api/lobbies")
async def create_lobby(payload: CreateLobbyRequest):
    lobby, member = await manager.create_lobby(payload.name, payload.group_location.model_dump())
    return {"lobby_code": lobby.code, "member_id": member.id, "member_token": member.token}


@app.post("/api/lobbies/{code}/join")
async def join_lobby(code: str, payload: NameRequest):
    try:
        lobby, member = await manager.join_lobby(code.upper(), payload.name)
    except LobbyError as error:
        raise HTTPException(error.status_code, detail={"code": error.code, "message": error.message}) from error
    return {"lobby_code": lobby.code, "member_id": member.id, "member_token": member.token}


async def send_error(socket: WebSocket, error: LobbyError) -> None:
    await socket.send_json({"type": "error", "payload": {"code": error.code, "message": error.message}})


def origin_is_allowed(socket: WebSocket) -> bool:
    origin = socket.headers.get("origin")
    return origin is None or origin.rstrip("/") in ALLOWED_ORIGINS


@app.websocket("/ws/lobbies/{code}")
async def lobby_socket(socket: WebSocket, code: str):
    if not origin_is_allowed(socket):
        await socket.close(code=1008, reason="Origin is not allowed")
        return
    await socket.accept()
    lobby = None
    member_id = None
    try:
        try:
            first_type, first_payload = parse_message(await asyncio.wait_for(socket.receive_text(), timeout=5))
        except TimeoutError:
            await socket.close(code=1008, reason="Authentication timed out")
            return
        except LobbyError as error:
            await send_error(socket, error)
            await socket.close(code=1008, reason="Invalid authentication message")
            return
        if first_type != "authenticate" or not isinstance(first_payload.get("member_token"), str):
            await send_error(socket, LobbyError("AUTH_REQUIRED", "Authenticate before sending other actions."))
            await socket.close(code=1008, reason="Authentication required")
            return
        try:
            lobby, member_id, old_socket, state = await manager.authenticate(code.upper(), first_payload["member_token"], socket)
        except LobbyError as error:
            await send_error(socket, error)
            await socket.close(code=1008, reason="Authentication failed")
            return
        if old_socket is not None and old_socket is not socket:
            await manager._close_socket(old_socket, 4001, "Connected from another tab")
        await manager.broadcast(lobby, state)
        while True:
            try:
                event_type, event_payload = parse_message(await socket.receive_text())
                if event_type == "ping":
                    await socket.send_json({"type": "pong", "payload": {}})
                    continue
                if event_type == "submit_preferences":
                    state = await manager.submit_preferences(lobby, member_id, UserPreference.model_validate(event_payload).model_dump())
                elif event_type == "start_voting":
                    state = await manager.start_voting(lobby, member_id)
                elif event_type == "cast_vote":
                    state = await manager.cast_vote(lobby, member_id, VotePayload.model_validate(event_payload).restaurant_id)
                elif event_type == "finish_voting":
                    state = await manager.finish_voting(lobby, member_id)
                elif event_type == "remove_member":
                    state = await manager.remove_member(lobby, member_id, RemoveMemberPayload.model_validate(event_payload).member_id)
                else:
                    raise LobbyError("UNKNOWN_EVENT", "Unsupported lobby event.")
                await manager.broadcast(lobby, state)
            except ValidationError as error:
                await send_error(socket, LobbyError("INVALID_PAYLOAD", error.errors()[0]["msg"]))
            except LobbyError as error:
                await send_error(socket, error)
    except WebSocketDisconnect:
        pass
    finally:
        if lobby is not None and member_id is not None:
            changed, state = await manager.disconnect(lobby, member_id, socket)
            if changed and state is not None:
                await manager.broadcast(lobby, state)
