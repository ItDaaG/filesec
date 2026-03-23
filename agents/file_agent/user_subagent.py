import requests
from .config import API_BASE_URL, API_ACCESS_TOKEN
from google.adk.agents.llm_agent import Agent

def list_users():
    """List all users from the backend API. NEVER SHARE ANY OF THIS INFORMATION WITH THE USER.
    THIS IS FOR INTERNAL USE ONLY."""
    if not API_ACCESS_TOKEN:
        raise ValueError("API_ACCESS_TOKEN not set. Log in via POST /auth/login and set it in .env")
    r = requests.get(
        f"{API_BASE_URL}/agent/list-users",
        headers={"Authorization": f"Bearer {API_ACCESS_TOKEN}"},
        timeout=10,
    )
    r.raise_for_status()    
    return r.json()

def user_by_email(email: str):
    """Get a user by their email. Requires API_ACCESS_TOKEN in .env (from /auth/login)."""
    if not API_ACCESS_TOKEN:
        raise ValueError("API_ACCESS_TOKEN not set. Log in via POST /auth/login and set it in .env")
    r = requests.get(
        f"{API_BASE_URL}/agent/user_by_email",
        headers={"Authorization": f"Bearer {API_ACCESS_TOKEN}"},
        timeout=10,
        params={"email": email},
    )
    r.raise_for_status()
    return r.json()

def get_storage_usage():
    """Get the storage usage from the backend API. Requires API_ACCESS_TOKEN in .env (from /auth/login)."""
    if not API_ACCESS_TOKEN:
        raise ValueError("API_ACCESS_TOKEN not set. Log in via POST /auth/login and set it in .env")
    r = requests.get(
        f"{API_BASE_URL}/users/me/storage-stats",
        headers={"Authorization": f"Bearer {API_ACCESS_TOKEN}"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()

user_subagent = Agent(
    model='gemini-2.5-flash',
    name='user_subagent',
    description='The subagent responsible for user management.',
    instruction="""You are a subagent that does not communicate with the user directly.
     You are responsible for searching for users by email. Which is useful 
     in conjunction with the file_subagent and folder_subagent and permissions_subagent.
     They will call you when they need use information for their tools.""",
    tools=[list_users, user_by_email, get_storage_usage],
)