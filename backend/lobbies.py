"""In-memory lobby state for the single-process hackathon demo."""
from __future__ import annotations

import asyncio
import json
import logging
import secrets
import string
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable

from fastapi import WebSocket

logger = logging.getLogger(__name__)


MAX_MEMBERS = 12
LOBBY_IDLE_SECONDS = 30 * 60


class LobbyError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


@dataclass
class Member:
    id: str
    name: str
    token: str
    is_host: bool = False
    preferences: dict[str, Any] | None = None
    vote: str | None = None


@dataclass
class Lobby:
    code: str
    location: dict[str, float]
    host_id: str
    members: dict[str, Member] = field(default_factory=dict)
    sockets: dict[str, WebSocket] = field(default_factory=dict)
    phase: str = "preferences"
    candidates: list[dict[str, Any]] = field(default_factory=list)
    votes_expected: set[str] = field(default_factory=set)
    winner: dict[str, Any] | None = None
    last_empty_at: float | None = None
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


class LobbyManager:
    def __init__(self, recommend: Callable[[list[dict[str, Any]], dict[str, float]], list[dict[str, Any]]]):
        self._lobbies: dict[str, Lobby] = {}
        self._lobbies_lock = asyncio.Lock()
        self._recommend = recommend

    @staticmethod
    def _code() -> str:
        alphabet = string.ascii_uppercase + string.digits
        return "".join(secrets.choice(alphabet) for _ in range(6))

    @staticmethod
    def _new_member(name: str, is_host: bool = False) -> Member:
        return Member(
            id=uuid.uuid4().hex,
            name=name,
            token=secrets.token_urlsafe(32),
            is_host=is_host,
        )

    async def create_lobby(self, name: str, location: dict[str, float]) -> tuple[Lobby, Member]:
        async with self._lobbies_lock:
            code = self._code()
            while code in self._lobbies:
                code = self._code()
            host = self._new_member(name, is_host=True)
            lobby = Lobby(code=code, location=location, host_id=host.id, members={host.id: host})
            lobby.last_empty_at = time.monotonic()
            self._lobbies[code] = lobby
            return lobby, host

    async def join_lobby(self, code: str, name: str) -> tuple[Lobby, Member]:
        lobby = await self.get_lobby(code)
        async with lobby.lock:
            if lobby.phase != "preferences":
                raise LobbyError("LOBBY_CLOSED", "Voting has already started.", 409)
            if len(lobby.members) >= MAX_MEMBERS:
                raise LobbyError("LOBBY_FULL", "This lobby already has 12 members.", 409)
            member = self._new_member(name)
            lobby.members[member.id] = member
            return lobby, member

    async def get_lobby(self, code: str) -> Lobby:
        normalized = code.upper()
        async with self._lobbies_lock:
            lobby = self._lobbies.get(normalized)
        if lobby is None:
            raise LobbyError("LOBBY_NOT_FOUND", "Lobby not found.", 404)
        return lobby

    async def authenticate(self, code: str, token: str, socket: WebSocket) -> tuple[Lobby, str, WebSocket | None, dict[str, Any]]:
        lobby = await self.get_lobby(code)
        async with lobby.lock:
            member = next((item for item in lobby.members.values() if secrets.compare_digest(item.token, token)), None)
            if member is None:
                raise LobbyError("INVALID_TOKEN", "The lobby membership token is invalid.", 403)
            old_socket = lobby.sockets.get(member.id)
            lobby.sockets[member.id] = socket
            lobby.last_empty_at = None
            return lobby, member.id, old_socket, self._state(lobby)

    async def disconnect(self, lobby: Lobby, member_id: str, socket: WebSocket) -> tuple[bool, dict[str, Any] | None]:
        async with lobby.lock:
            if lobby.sockets.get(member_id) is not socket:
                return False, None
            del lobby.sockets[member_id]

            # Ghost User Fix:
            # When someone closes their tab in preferences, remove them from the active roster
            # and immediately update host / broadcast headcount to remaining players.
            if lobby.phase == "preferences":
                if member_id in lobby.members:
                    del lobby.members[member_id]
                # Reassign host if the host left
                if lobby.host_id == member_id and lobby.members:
                    lobby.host_id = next(iter(lobby.members))
                    lobby.members[lobby.host_id].is_host = True

            elif lobby.phase == "voting":
                if member_id in lobby.votes_expected:
                    lobby.votes_expected.discard(member_id)
                if member_id in lobby.members:
                    del lobby.members[member_id]
                # If all remaining expected members have voted, advance to finish
                if lobby.votes_expected and all(lobby.members[mid].vote for mid in lobby.votes_expected if mid in lobby.members):
                    self._finish(lobby)

            elif lobby.phase == "results":
                # Post-Game Room Stability:
                # Do NOT clear or reset winner, candidates, or results phase!
                # Keep the completed results intact even if members leave.
                if member_id in lobby.members:
                    del lobby.members[member_id]

            if not lobby.sockets:
                lobby.last_empty_at = time.monotonic()
            return True, self._state(lobby)

    async def submit_preferences(self, lobby: Lobby, member_id: str, preferences: dict[str, Any]) -> dict[str, Any]:
        async with lobby.lock:
            self._member_for_action(lobby, member_id, "preferences")
            lobby.members[member_id].preferences = preferences
            return self._state(lobby)

    async def unlock_preferences(self, lobby: Lobby, member_id: str) -> dict[str, Any]:
        async with lobby.lock:
            self._member_for_action(lobby, member_id, "preferences")
            lobby.members[member_id].preferences = None
            return self._state(lobby)

    async def start_voting(self, lobby: Lobby, member_id: str) -> dict[str, Any]:
        async with lobby.lock:
            self._host_only(lobby, member_id, "preferences")
            if any(item.id not in lobby.sockets for item in lobby.members.values()):
                raise LobbyError("MEMBERS_OFFLINE", "All members must be connected before voting starts.")
            if any(item.preferences is None for item in lobby.members.values()):
                raise LobbyError("PREFERENCES_INCOMPLETE", "All members must submit preferences before voting starts.")
            preferences = [item.preferences for item in lobby.members.values() if item.preferences]
            try:
                candidates = self._recommend(preferences, lobby.location)
            except LobbyError:
                raise
            except Exception as exc:
                logger.error("Error during restaurant recommendation: %s", exc, exc_info=True)
                raise LobbyError("PLACES_API_ERROR", f"Could not find restaurants: {str(exc)}", 502) from exc

            if not candidates:
                raise LobbyError("NO_MATCHES", "No restaurants match the group's preferences. Adjust cravings or price and try again.")
            lobby.candidates = candidates
            lobby.phase = "voting"
            lobby.votes_expected = set(lobby.members)
            return self._state(lobby)

    async def cast_vote(self, lobby: Lobby, member_id: str, restaurant_id: str) -> dict[str, Any]:
        async with lobby.lock:
            self._member_for_action(lobby, member_id, "voting")
            if member_id not in lobby.votes_expected:
                raise LobbyError("NOT_PARTICIPATING", "You are not participating in this vote.")
            if restaurant_id not in {item["id"] for item in lobby.candidates}:
                raise LobbyError("INVALID_CANDIDATE", "Choose one of the current restaurant candidates.")
            # Dynamically replace/update vote
            lobby.members[member_id].vote = restaurant_id
            active_expected = [mid for mid in lobby.votes_expected if mid in lobby.members]
            if active_expected and all(lobby.members[mid].vote for mid in active_expected):
                self._finish(lobby)
            return self._state(lobby)

    async def finish_voting(self, lobby: Lobby, member_id: str) -> dict[str, Any]:
        async with lobby.lock:
            self._host_only(lobby, member_id, "voting")
            active_expected = [mid for mid in lobby.votes_expected if mid in lobby.members]
            if not any(lobby.members[mid].vote for mid in active_expected):
                raise LobbyError("NO_VOTES", "At least one vote is required before finishing.")
            self._finish(lobby)
            return self._state(lobby)

    async def remove_member(self, lobby: Lobby, member_id: str, target_id: str) -> dict[str, Any]:
        async with lobby.lock:
            self._host_only(lobby, member_id, "preferences")
            if target_id == member_id:
                raise LobbyError("CANNOT_REMOVE_SELF", "The host cannot remove themself.")
            if target_id not in lobby.members:
                raise LobbyError("MEMBER_NOT_FOUND", "Member not found.")
            socket = lobby.sockets.pop(target_id, None)
            del lobby.members[target_id]
            state = self._state(lobby)
        if socket is not None:
            await self._close_socket(socket, 4003, "Removed from lobby")
        return state

    async def broadcast(self, lobby: Lobby, state: dict[str, Any]) -> None:
        async with lobby.lock:
            destinations = list(lobby.sockets.items())
        failed: list[tuple[str, WebSocket]] = []
        for member_id, socket in destinations:
            try:
                await asyncio.wait_for(socket.send_json({"type": "lobby_state", "payload": state}), timeout=3)
            except Exception:
                failed.append((member_id, socket))
        for member_id, socket in failed:
            await self.disconnect(lobby, member_id, socket)

    async def broadcast_error(self, lobby: Lobby, error: LobbyError) -> None:
        """Broadcasts a user-friendly error payload to all connected lobby sockets without closing connections."""
        async with lobby.lock:
            destinations = list(lobby.sockets.items())
        failed: list[tuple[str, WebSocket]] = []
        for member_id, socket in destinations:
            try:
                await asyncio.wait_for(
                    socket.send_json({
                        "type": "error",
                        "payload": {"code": error.code, "message": error.message}
                    }),
                    timeout=3
                )
            except Exception:
                failed.append((member_id, socket))
        for member_id, socket in failed:
            await self.disconnect(lobby, member_id, socket)

    async def cleanup_expired(self) -> int:
        now = time.monotonic()
        async with self._lobbies_lock:
            candidates = list(self._lobbies.items())
        removed = 0
        for code, lobby in candidates:
            async with lobby.lock:
                expired = not lobby.sockets and lobby.last_empty_at is not None and now - lobby.last_empty_at >= LOBBY_IDLE_SECONDS
            if expired:
                async with self._lobbies_lock:
                    if self._lobbies.get(code) is lobby:
                        del self._lobbies[code]
                        removed += 1
        return removed

    async def _close_socket(self, socket: WebSocket, code: int, reason: str) -> None:
        try:
            await asyncio.wait_for(socket.close(code=code, reason=reason), timeout=1)
        except Exception:
            pass

    def _member_for_action(self, lobby: Lobby, member_id: str, phase: str) -> Member:
        if lobby.phase != phase:
            raise LobbyError("INVALID_PHASE", f"This action is only available during {phase}.")
        member = lobby.members.get(member_id)
        if member is None:
            raise LobbyError("MEMBER_NOT_FOUND", "Member not found.")
        return member

    def _host_only(self, lobby: Lobby, member_id: str, phase: str) -> None:
        self._member_for_action(lobby, member_id, phase)
        if lobby.host_id != member_id:
            raise LobbyError("HOST_ONLY", "Only the host can perform this action.", 403)

    def _finish(self, lobby: Lobby) -> None:
        totals = self._vote_totals(lobby)
        # Candidate order is consensus rank and therefore deterministically breaks ties.
        winner_id = max((item["id"] for item in lobby.candidates), key=lambda ident: (totals.get(ident, 0), -self._candidate_index(lobby, ident)))
        lobby.winner = next(item for item in lobby.candidates if item["id"] == winner_id)
        lobby.phase = "results"

    @staticmethod
    def _candidate_index(lobby: Lobby, restaurant_id: str) -> int:
        return next(index for index, item in enumerate(lobby.candidates) if item["id"] == restaurant_id)

    def _vote_totals(self, lobby: Lobby) -> dict[str, int]:
        totals = {item["id"]: 0 for item in lobby.candidates}
        for member_id in lobby.votes_expected:
            vote = lobby.members[member_id].vote
            if vote in totals:
                totals[vote] += 1
        return totals

    def _state(self, lobby: Lobby) -> dict[str, Any]:
        votes_submitted = sum(1 for member_id in lobby.votes_expected if lobby.members[member_id].vote)
        return {
            "lobby_code": lobby.code,
            "phase": lobby.phase,
            "host_id": lobby.host_id,
            "group_location": lobby.location,
            "members": [
                {
                    "id": item.id,
                    "name": item.name,
                    "connected": item.id in lobby.sockets,
                    "has_submitted": item.preferences is not None,
                    "has_voted": bool(item.vote),
                }
                for item in lobby.members.values()
            ],
            "candidates": lobby.candidates,
            "votes_submitted": votes_submitted,
            "votes_expected": len(lobby.votes_expected),
            "vote_totals": self._vote_totals(lobby) if lobby.phase == "results" else {},
            "winner": lobby.winner,
        }


def parse_message(raw: str) -> tuple[str, dict[str, Any]]:
    if len(raw) > 16_384:
        raise LobbyError("MESSAGE_TOO_LARGE", "Message is too large.")
    try:
        message = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise LobbyError("INVALID_MESSAGE", "Message must be valid JSON.") from exc
    if not isinstance(message, dict) or not isinstance(message.get("type"), str):
        raise LobbyError("INVALID_MESSAGE", "Message must include a string type.")
    payload = message.get("payload", {})
    if not isinstance(payload, dict):
        raise LobbyError("INVALID_MESSAGE", "Message payload must be an object.")
    return message["type"], payload
