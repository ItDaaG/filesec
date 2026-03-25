import os

from dotenv import load_dotenv

load_dotenv()

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
API_ACCESS_TOKEN = os.getenv("API_ACCESS_TOKEN")
AGENT_INTERNAL_KEY = os.getenv("AGENT_INTERNAL_KEY")