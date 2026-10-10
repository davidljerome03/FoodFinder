# Food Finder

A Jackbox-style real-time web application to solve group dining debates using voting lobbies and a consensus algorithm.

## Running Locally

### Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   
   # On Mac/Linux:
   source venv/bin/activate
   
   # On Windows (Command Prompt):
   venv\Scripts\activate
   
   # On Windows (PowerShell):
   .\venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

The Vite development server forwards `/api/*` and `/ws/*` requests to the local
backend on port 8000. Keep both servers running while testing a lobby from two
browser tabs. For a second device, use the Docker stack behind the configured
host proxy or expose Vite deliberately with `npm run dev -- --host`.

## WebSocket Lobby Demo

1. Open the frontend URL printed by Vite and create a lobby with a display name.
2. Copy the six-character lobby code into another browser tab or device and join
   with a different name.
3. Each member submits their food preferences. The host starts voting once every
   current member has submitted.
4. Each member votes for a restaurant. The server publishes the final result when
   every participant has voted; the host can finish early after at least one vote.

Lobbies live in the single FastAPI process. They support independent simultaneous
lobbies, but all active lobby state is cleared when the backend restarts, reloads,
or is redeployed. Refreshing a browser reconnects that tab as the same member
while the backend remains running.

## Production Deployment (DigitalOcean Droplet)

The application is containerized with Docker Compose for easy deployment. It should be hosted at `/var/www/foodfinder` on your Ubuntu Droplet.

### 1. Initial Setup
SSH into your droplet and install Docker if you haven't already:
```bash
sudo apt update
sudo apt install docker.io docker-compose-v2 git -y
```

### 2. Clone the Repository
Create the directory and clone the repository:
```bash
sudo mkdir -p /var/www/foodfinder
sudo chown -R $USER:$USER /var/www/foodfinder
git clone https://github.com/davidljerome03/FoodFinder.git /var/www/foodfinder
cd /var/www/foodfinder
```

### 3. Launch the Stack
Run Docker Compose to build the React frontend, start the FastAPI backend, and provision the PostgreSQL+PostGIS database:
```bash
docker compose up -d --build
```

The application is available to the Droplet's host reverse proxy at
`http://127.0.0.1:8080`. Nginx inside the frontend container serves the React app
and forwards `/api/` and `/ws/` requests to FastAPI. Configure the public HTTPS
proxy for `foodfinder.davidjerome.dev` to forward WebSocket Upgrade and Connection
headers as well, so browser clients use `wss://` on the public site.
