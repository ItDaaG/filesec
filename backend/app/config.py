import os
from dotenv import load_dotenv

load_dotenv()

# --- Database configuration ---
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL environment variable is not set. "
        "Please create a .env file with: DATABASE_URL=postgresql://user:password@host:port/dbname"
    )

# Basic URL format validation
if "@" not in DATABASE_URL or "://" not in DATABASE_URL:
    raise ValueError(
        "Invalid DATABASE_URL format. Expected: postgresql://user:password@host:port/dbname\n"
        f"Got: {DATABASE_URL[:50]}..."
    )

# --- Auth / JWT configuration ---
SECRET_KEY = os.getenv("SECRET_KEY", "change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

