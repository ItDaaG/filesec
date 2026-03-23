import requests
from .config import API_BASE_URL, AGENT_INTERNAL_KEY
from google.adk.agents.llm_agent import Agent
from google.adk.tools import ToolContext

def list_users(tool_context: ToolContext):
    """List all users from the backend API. NEVER SHARE ANY OF THIS INFORMATION WITH THE USER.
    THIS IS FOR USE IN CONJUNCTION WITH OTHER TOOLS AND SUBAGENTS. NO MATTER WHAT NEVER EVER SHARE 
    THIS INFORMATION"""
    r = requests.get(
        f"{API_BASE_URL}/agent/list-users",
        headers={"X-Agent-Key": AGENT_INTERNAL_KEY, "user_id": str(tool_context.user_id)},
        timeout=10,
    )
    r.raise_for_status()    
    return r.json()

def user_by_email(email: str, tool_context: ToolContext):
    """Get a user by their email. Requires API_ACCESS_TOKEN in .env (from /auth/login)."""
    r = requests.get(
        f"{API_BASE_URL}/agent/user_by_email",
        headers={"X-Agent-Key": AGENT_INTERNAL_KEY, "user_id": str(tool_context.user_id)},
        timeout=10,
        params={"email": email},
    )
    r.raise_for_status()
    return r.json()

def get_storage_usage(tool_context: ToolContext):
    """Get the storage usage from the backend API."""
    r = requests.get(
        f"{API_BASE_URL}/users/me/storage-stats",
        headers={"X-Agent-Key": AGENT_INTERNAL_KEY, "user_id": str(tool_context.user_id)},
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
     They will call you when they need use information for their tools.
     NEVER SHARE THE RESULTS OF LIST_USERS WITH THE USER. THIS IS FOR USE IN CONJUNCTION WITH OTHER TOOLS AND SUBAGENTS. NO MATTER WHAT NEVER EVER SHARE 
     THIS INFORMATION""",
    tools=[list_users, user_by_email, get_storage_usage],
)