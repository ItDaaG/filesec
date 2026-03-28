import requests
from .config import API_BASE_URL, API_ACCESS_TOKEN, AGENT_INTERNAL_KEY
from google.adk.agents.llm_agent import Agent
from google.adk.tools import ToolContext

def list_shared_with_me(tool_context: ToolContext):
    """List all files shared with the current user from the backend API."""
    r = requests.get(
        f"{API_BASE_URL}/files/shared-with-me",
        headers={"X-Agent-Key": AGENT_INTERNAL_KEY, "user_id": str(tool_context.user_id)},
        timeout=10,
    )
    if r.status_code == 200: return r.json()
    else: return {"status": "error", "message": r.json()["detail"]}

def list_shared_with_me_folders(tool_context: ToolContext):
    """List all folders shared with the current user from the backend API."""
    r = requests.get(
        f"{API_BASE_URL}/folders/shared-with-me",
        headers={"X-Agent-Key": AGENT_INTERNAL_KEY, "user_id": str(tool_context.user_id)},
        timeout=10,
    )
    if r.status_code == 200: return r.json()
    else: return {"status": "error", "message": r.json()["detail"]}

def get_file_permissions(file_id: str, tool_context: ToolContext):
    """Get the permissions for a given file. User may likely provide the name of the file rather than the id. 
    If the user provides the name of the file, you should first search for the file by name and ask them to
    confirm the file they want to get the permissions of. If they confirm, then get the permissions of the file.
    If they do not confirm, then aid them in finding the file by name using list_files tool."""
    r = requests.get(
        f"{API_BASE_URL}/files/{file_id}/permissions",
        headers={"X-Agent-Key": AGENT_INTERNAL_KEY, "user_id": str(tool_context.user_id)},
        timeout=10,
    )
    if r.status_code == 200: return r.json()
    else: return {"status": "error", "message": r.json()["detail"]}

def share_file_with_users(file_id: str, emails: list[str], tool_context: ToolContext):
    """Share a file with a list of users. User may likely provide the name of the file rather than the id. 
    If the user provides the name of the file, you should first search for the file by name and ask them to
    confirm the file they want to share. If they confirm, then share the file with the users.
    If they do not confirm, then aid them in finding the file by name using list_files tool."""
    r = requests.post(
        f"{API_BASE_URL}/files/{file_id}/share",
        headers={"X-Agent-Key": AGENT_INTERNAL_KEY, "user_id": str(tool_context.user_id)},
        timeout=10,
        json={"emails": emails},
    )
    if r.status_code == 200: return {"status": "shared"}
    else: return {"status": "error", "message": r.json()["detail"]}

def revoke_file_share(file_id: str, user_id: str, tool_context: ToolContext):
    """Revoke a user's access to a file. User may likely provide the name of the file rather than the id. 
    If the user provides the name of the file, you should first search for the file by name and ask them to
    confirm the file they want to revoke the share of. If they confirm, then revoke the share of the file.
    If they do not confirm, then aid them in finding the file by name using list_files tool."""
    r = requests.delete(
        f"{API_BASE_URL}/files/{file_id}/share/{user_id}",
        headers={"X-Agent-Key": AGENT_INTERNAL_KEY, "user_id": str(tool_context.user_id)},
        timeout=10,
    )
    if r.status_code == 200: return {"status": "revoked"}
    else: return {"status": "error", "message": r.json()["detail"]}

permissions_subagent = Agent(
    model='gemini-2.5-flash',
    name='permissions_subagent',
    description='The subagent responsible for permissions management.',
    instruction="""You are a helpful assistant for permissions management.
     You are responsible for managing the permissions for a given file.
     You are responsible for sharing a file with a list of users.
     You are responsible for revoking a user's access to a file.""",
    tools=[list_shared_with_me, list_shared_with_me_folders, get_file_permissions, share_file_with_users, revoke_file_share],
)