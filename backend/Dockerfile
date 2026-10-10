FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (needed for some database drivers)
RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose the port Uvicorn runs on
EXPOSE 8000

# Run FastAPI with Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
