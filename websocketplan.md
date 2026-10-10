# Food Finder WebSocket implementation plan

## Goal and scope

Build a working Jackbox-style demonstration: a host creates a lobby, people join
with a code, everyone submits dining preferences, the consensus engine produces
up to three restaurants, and the group votes for a final choice. Every screen
updates live without refreshing.

Use React/Vite, native browser WebSockets, FastAPI, and one Uvicorn process.
Keep multiple independent lobbies in server memory. A backend restart, deployment,
crash, or development auto-reload clears all lobbies. Browser refreshes and brief
disconnects should preserve membership through reconnection.

Do not introduce Redis, Socket.IO, accounts, multiple workers, distributed state,
or persistent lobby history. PostgreSQL/PostGIS remains the project's restaurant
data architecture; database integration is separate from this socket milestone.
Use the existing mock restaurants for the first complete demonstration and clearly
identify them as sample data. Real nearby restaurant search is not completed by
this plan.

## Current code and integration gaps

- `backend/main.py` contains health, preference models, and `POST /api/recommend`.
- `backend/engine.py` already calculates consensus and ranks mock restaurants.
- There are no lobby routes, WebSocket routes, or connection manager.
- `frontend/src/App.jsx` only displays backend health.
- `frontend/nginx.conf` strips `/api/` before forwarding, so public
  `/api/recommend` currently reaches backend `/recommend`, which does not exist.
- `uvicorn` is installed without explicit WebSocket support dependencies.
- The recommendation endpoint accepts each participant's budget but does not pass
  an aggregate budget to the engine. Restaurant results include `_debug_stats`.

## Agreed MVP behavior

1. Host creates a lobby with a display name and group location. The host also
   participates. Default to the mock data's Orlando location; display that default
   and allow manual location entry. Location permission must not block the demo.
2. Server returns a unique six-character lobby code and a private member token.
3. Other people enter the code and a display name. Limit a lobby to 12 members.
4. Everyone sees the member list, connection status, and preference submission
   status. Submitted preferences can be edited until voting starts.
5. Host starts voting once all current members are connected and have submitted.
   Allow a one-person lobby for a solo demonstration.
6. Server freezes the participating member IDs, calls the shared recommendation
   service, and broadcasts up to three candidates.
7. Each participating member votes for one candidate. Changing a vote replaces
   the previous vote; it never increases the number of submitted votes.
8. When everyone has voted, server finalizes automatically. Host may finish early
   after at least one vote if someone disconnects or stops participating.
9. Most votes wins. Break ties using the original consensus ranking. Broadcast
   the winner, candidates, and vote totals to every member.
10. Results remain stable. A new round means creating a new lobby for this MVP.

Phases: `preferences` -> `voting` -> `results`. Invalid actions must not change
state. No new members after voting starts; existing members can still reconnect.
Host can remove another member only during preferences, including a disconnected
member who would otherwise block starting. If the host disconnects, preserve host
ownership so they can return; automatic host transfer is outside this milestone.

## HTTP contract

Use HTTP for initial membership, WebSockets for the live session.

| Route | Request | Response |
| --- | --- | --- |
| `POST /api/lobbies` | `{ "name": "Alex", "group_location": { "lat": 28.5383, "lng": -81.3792 } }` | `{ "lobby_code": "AB12CD", "member_id": "...", "member_token": "..." }` |
| `POST /api/lobbies/{code}/join` | `{ "name": "Sam" }` | Same membership response |
| `GET /api/health` | None | Existing health response |
| `POST /api/recommend` | Existing `GroupRequest` | Existing recommendation response envelope |

Keep `GET /` for compatibility. Normalize codes to uppercase. Validate names as
trimmed, nonempty strings of at most 30 characters. Handle missing/full lobbies and
closed joining with clear HTTP errors. Use random member IDs and unguessable member
tokens; lobby codes identify rooms, while tokens identify members and host authority.
Never include tokens in public state, logs, or share links.

## WebSocket contract

Endpoint: `/ws/lobbies/{code}`. Every message uses
`{ "type": "event_name", "payload": { ... } }`.

After opening, send `authenticate` with `{ "member_token": "..." }` as the first
message. Accept no other action until it succeeds; close unauthenticated sockets
after five seconds. The server binds this socket to the matching member, then
sends the latest complete state. Do not trust client-supplied member or host IDs.

| Client event | Payload | Rule |
| --- | --- | --- |
| `authenticate` | `{ "member_token": "..." }` | Required first message; also used on reconnect |
| `submit_preferences` | `{ "desired_cuisines": ["Italian"], "vetoed_cuisines": [], "max_price": "$$" }` | Preferences phase; replaces this member's previous submission |
| `start_voting` | `{}` | Host only; all members connected and submitted |
| `cast_vote` | `{ "restaurant_id": "..." }` | Voting phase; member and candidate must belong to this round |
| `finish_voting` | `{}` | Host only; voting phase; at least one vote |
| `remove_member` | `{ "member_id": "..." }` | Host only; preferences phase; cannot remove self |
| `ping` | `{}` | Keep connection active |

Only three server events are necessary:

- `lobby_state`: complete public state on authentication and after each mutation
  or connection change. Broadcast only to that lobby.
- `error`: `{ "code": "INVALID_PHASE", "message": "Voting has already started." }`.
  Send to the affected client; ordinary invalid actions should not close the socket.
- `pong`: `{}` in response to `ping`.

Recommended `lobby_state.payload`:

```json
{
  "lobby_code": "AB12CD",
  "phase": "preferences",
  "host_id": "member-1",
  "group_location": { "lat": 28.5383, "lng": -81.3792 },
  "members": [
    {
      "id": "member-1",
      "name": "Alex",
      "connected": true,
      "has_submitted": true,
      "has_voted": false
    }
  ],
  "candidates": [],
  "votes_submitted": 0,
  "votes_expected": 0,
  "vote_totals": {},
  "winner": null
}
```

Keep individual preferences and votes private. Publish per-restaurant totals only
in results; use `votes_submitted` for live progress. Candidates and winner must
follow the exact restaurant payload in `AGENTS.md`: `id`, `name`, `price`,
`cuisines`, `coordinates`. Keep engine diagnostics outside restaurant payloads.

## Backend implementation

- [ ] Add `backend/lobbies.py` for lobby/member state and connection management.
      Keep routes in `main.py` initially; extract shared Pydantic models into
      `models.py` if needed to avoid circular imports and duplicate validation.
- [ ] Store lobbies by code, and sockets by member ID within each lobby. Check code
      collisions before inserting a new lobby. Store preferences and votes by
      member ID, rather than appending submissions to lists.
- [ ] Use a per-lobby async lock for state transitions. Capture consistent state
      snapshots and send them in order; do not hold the state lock during network
      sends. A failed or slow client must not stop other members receiving updates.
- [ ] Use bounded send timeouts, remove failed sockets, and broadcast updated
      presence. Catch `WebSocketDisconnect` and clean up in `finally`.
- [ ] Allow one current socket per member. A replacement socket supersedes the old
      one; cleanup from the old socket must not disconnect the replacement.
- [ ] Keep disconnected members, preferences, and votes for reconnection. Mark them
      offline. Do not delete a lobby immediately when its last socket closes.
- [ ] Expire lobbies after 30 minutes with no connected sockets. A small periodic
      cleanup task started/stopped with FastAPI is enough; clean up its resources.
- [ ] Validate event envelopes and payloads with Pydantic, including coordinate
      ranges, legal price values, bounded cuisine lists, and supported cuisines.
      Reject oversized messages and unknown events without crashing the handler.
- [ ] Validate browser origins against configured local and production origins.
      HTTP CORS middleware alone does not authorize WebSocket connections.
- [ ] Add explicit WebSocket support, such as `uvicorn[standard]`, to requirements.
      Keep one worker in Docker and production; do not use reload in production.

## Reuse the recommendation engine

- [ ] Extract one recommendation service used by both `/api/recommend` and lobby
      round start. Call that service directly from the socket handler; do not make
      an HTTP request back to the same application.
- [ ] Build requests from the lobby's stored preferences and location. Use the
      lowest submitted maximum price as the group's budget, with legal price
      values required on submission.
- [ ] Resolve the mock JSON path relative to the backend file, not the shell's
      working directory. Preserve stable restaurant IDs; never regenerate data
      during a running lobby.
- [ ] If vetoes and maximum price are presented as hard exclusions, filter those
      restaurants out before ranking. The current negative penalties can still
      return excluded options when every candidate scores poorly. Cuisine vetoes
      must not be presented as verified allergy safety.
- [ ] Handle fewer than three eligible restaurants. If none qualify, keep the
      lobby in preferences and show a useful message so people can adjust choices.
- [ ] Store the generated candidates once. Vote changes and reconnects must not
      rerun scoring or change the candidates. Serialize restaurants to the agreed
      public contract without `_debug_stats`.

## React integration

- [ ] Add one reusable lobby socket hook (for example `useLobbySocket.js`). Manage
      open/message/error/close handlers, state snapshots, authentication, heartbeat,
      and reconnect there rather than duplicating socket logic in screens.
- [ ] Save code, member ID, and token in `sessionStorage` for that tab before
      connecting. Refresh should reconnect as the same member. Clear the session
      when its lobby expires or the backend restarts, with a route back to joining.
- [ ] Reconnect while mounted using capped delays of 1, 2, 4, then 8 seconds.
      Authenticate again and accept the server snapshot. Do not silently replay
      old votes or commands; the snapshot is authoritative.
- [ ] Send `ping` roughly every 25 seconds and reconnect if the server stops
      responding. Dispose timers and close sockets on unmount; React StrictMode
      must not leave duplicate live connections.
- [ ] Build simple create/join, lobby/preferences, voting, and results views.
      Include a visible lobby code/share link and connection/submission progress.
      Keep controls disabled while disconnected and display action errors.
- [ ] Keep pending preference form edits locally until submitted. Clear pending
      button states on acknowledgments represented by snapshots or errors.
- [ ] Include manual submission retry when disconnected and appropriate host
      controls for removal, starting, and early finish.
- [ ] Use `ws://localhost:8000/ws/lobbies/{code}` locally, or a Vite development
      proxy with WebSocket forwarding. In production derive the socket origin
      from the page and use `wss://` under HTTPS; never hardcode localhost there.

## Routing and deployment

- [ ] Preserve `/api/` when proxying canonical `/api/...` backend routes: use an
      upstream `proxy_pass http://backend:8000` without a trailing URI slash.
      Switch the frontend health check to `/api/health` accordingly.
- [ ] Add a separate `/ws/` Nginx location that forwards the same path to the
      backend, uses HTTP/1.1, and forwards Upgrade/Connection headers. Set socket
      read timeout to at least 120 seconds, longer than the heartbeat interval.
- [ ] Inspect the Droplet's host reverse proxy as well. Both proxy layers must
      forward socket upgrades, and the public HTTPS site must permit WSS.
- [ ] Keep the existing loopback container bindings. Document localhost frontend
      port 8080 and the host proxy instead of assuming public container port 80.
- [ ] Rebuild the containers and verify the browser uses the expected public API
      and socket paths. Add short running/demo instructions to README.

## Implementation order

1. Models, membership HTTP routes, and in-memory lobby manager.
2. Socket authentication, lobby snapshots, disconnects, and reconnects.
3. Preference submission, shared recommendations, voting, and finalization.
4. Minimal React screens and reusable socket hook.
5. Proxy fixes, Docker run, and public HTTPS demonstration.

Complete one browser-to-backend lobby flow before adding visual polish.

## Acceptance checks before the demo

- [ ] Two tabs/devices join one lobby and see live membership and progress.
- [ ] A second lobby runs simultaneously without receiving the first lobby's
      members, candidates, votes, or results.
- [ ] Everyone's preferences affect candidates; budget and veto behavior match
      what the UI promises. Returned restaurants follow `AGENTS.md`.
- [ ] Non-host users cannot start, remove members, or finish voting early.
- [ ] Duplicate preference submissions replace prior values; changing a vote
      does not count twice. Invalid candidates and malformed messages fail safely.
- [ ] Refresh/reconnect restores the same member without duplicating them.
      An old socket disconnect cannot remove the replacement connection.
- [ ] Disconnect before voting can be resolved by host removal; disconnect during
      voting can be resolved by reconnect or host early finish.
- [ ] All votes complete the round; early finish requires a vote; ties are
      deterministic and every client sees the same final result.
- [ ] Empty restaurant matches leave preferences editable with an explanation.
- [ ] Backend restart clears lobbies and clients can recover through create/join.
- [ ] Expiration removes abandoned lobbies without affecting active ones.
- [ ] Run focused backend checks for lobby isolation, host permissions, vote
      replacement, phase transitions, and reconnect cleanup. Run frontend build
      and lint. Then demonstrate the full flow through the deployed HTTPS proxy,
      including an idle connection long enough to check heartbeat behavior.

Ready means the public site supports one complete round across multiple browsers,
two simultaneous isolated lobbies, and recovery from a refresh. Persistent lobbies,
automatic host transfer, and additional rounds are optional future work.
