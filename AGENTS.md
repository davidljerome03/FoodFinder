# Food Finder - Project Master Rules & Context
This file is the authoritative source for development guidelines and system architecture. The AI assistant MUST read and adhere to these rules before executing any code generation or modification.

## 1. Project Identity & Architecture
*   **Project Name:** Food Finder
*   **Purpose:** A Jackbox-style real-time web application to solve group dining debates using voting lobbies and a consensus algorithm.
*   **Architecture:** Decoupled Monorepo (React Frontend + Python Backend).
*   **Deployment:** Ubuntu Droplet (DigitalOcean) at foodfinder.davidjerome.dev.

## 2. Tech Stack (MUST STRICTLY ADHERE TO)
*   **Frontend:** React.js, Vite
*   **Backend:** Python 3, FastAPI, Uvicorn
*   **Real-time:** WebSockets (FastAPI native)
*   **Database:** PostgreSQL with PostGIS extension (for geographic radius queries)

## 3. Universal Development Rules (The Doctrine)
*   **Research First:** Never act on assumption. Understand the current state of the codebase before making changes.
*   **Extreme Ownership:** You own the end-to-end health of the system. Fix root causes, not just symptoms. If a change in the backend breaks the frontend API contract, you must address both.
*   **Absolute Paths:** Eliminate directory confusion. Never assume `.` is the root. Detect the project root before placing configuration files.
*   **DRY by Default:** Never duplicate code or logic. Search the repository for existing implementations (e.g., existing WebSocket connection managers or UI components) before creating new ones.
*   **Professional Output:** Responses must be direct, actionable, and free of conversational filler. 

## 4. The Core API Contract (JSON Structures)
The frontend and backend communicate via this agreed-upon structure. Do not deviate from these formats.

**Restaurant Payload Example:**
```json
{
  "id": "123",
  "name": "Burger Joint",
  "price": "$$",
  "cuisines": ["American", "Burgers"],
  "coordinates": {"lat": 28.5383, "lng": -81.3792}
}
```
