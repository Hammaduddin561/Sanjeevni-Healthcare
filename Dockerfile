# Use Python 3.9-slim for compatibility and size
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies (required for some ML libraries)
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements from backend directory
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code into /app/backend to maintain package structure
COPY backend ./backend

# CRITICAL: Copy data directory (Required for Cohort Engine)
COPY data ./data

# Create a writable directory for the model (Hugging Face Spaces requirement)
RUN mkdir -p /app/backend/models/weights && chmod -R 777 /app/backend/models/weights

# Expose the port
EXPOSE 7860

# Run with Gunicorn for production-grade concurrency
# Workers: 2 (Fit in 16GB/vCPU limits usually)
# Timeout: 120s (For LLM)
CMD ["gunicorn", "backend.api:app", "--workers", "2", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:7860", "--timeout", "120"]
