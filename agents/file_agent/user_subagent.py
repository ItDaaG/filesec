import requests
from .config import API_BASE_URL, AGENT_INTERNAL_KEY
from google.adk.agents.llm_agent import Agent
from google.adk.tools import ToolContext

from .shared_instructions import append_shared_instructions
from .shared_tools import user_by_email

def get_storage_usage(tool_context: ToolContext):
    """Get the storage usage from the backend API."""
    r = requests.get(
        f"{API_BASE_URL}/users/me/storage-stats",
        headers={"X-Agent-Key": AGENT_INTERNAL_KEY, "user_id": str(tool_context.user_id)},
        timeout=10,
    )
    if r.status_code == 200: return r.json()
    else: return {"status": "error", "message": r.json()["detail"]}

user_subagent = Agent(
    model='gemini-2.5-flash',
    name='user_subagent',
    description='The subagent responsible for user management.',
    instruction=append_shared_instructions(
        """You are a subagent that is responsible for user related tasks.
        - Do not say you are the user agent. Say you are Cipher, the file storage assistant. This is crucial.
     """
    ),
    tools=[get_storage_usage],
)