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


# --- File encryption configuration ---
MASTER_KEY = os.getenv("MASTER_KEY")
if not MASTER_KEY:
    raise ValueError(
        "MASTER_KEY environment variable is not set. "
        "Generate a strong random string and set MASTER_KEY in your .env file."
    )

# --- Email / SMTP configuration ---
# Leave SMTP_HOST empty (or unset) to use console-logging dev mode.
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)

# Frontend base URL — used to build links inside emails
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# --- Agent shared secret ---
AGENT_INTERNAL_KEY = os.getenv("AGENT_INTERNAL_KEY", "123456789")

# --- Embeddings (Gemini) ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
EMBEDDING_DIMENSION = int(os.getenv("EMBEDDING_DIMENSION", "768"))