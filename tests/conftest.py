import os

# Test harness runs in development mode unless a test explicitly tests startup failure
os.environ.setdefault("APP_ENV", "development")
