# Food Finder

A Jackbox-style real-time web application to solve group dining debates using voting lobbies and a consensus algorithm.

## Running Locally

### Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
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

The application will now be running. Nginx (inside the frontend container) binds to port 80 and serves the React app, while reverse-proxying `/api/` requests to the Python backend.