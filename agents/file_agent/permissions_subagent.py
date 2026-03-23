import requests
from .config import API_BASE_URL, API_ACCESS_TOKEN
from google.adk.agents.llm_agent import Agent


def list_shared_with_me():
    """List all files shared with the current user from the backend API. Requires API_ACCESS_TOKEN in .env (from /auth/login)."""
    if not API_ACCESS_TOKEN:
        raise ValueError("API_ACCESS_TOKEN not set. Log in via POST /auth/login and set it in .env")
    r = requests.get(
        f"{API_BASE_URL}/files/shared-with-me",
        headers={"Authorization": f"Bearer {API_ACCESS_TOKEN}"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()

def get_file_permissions(file_id: str):
    """Get the permissions for a given file. User may likely provide the name of the file rather than the id. 
    If the user provides the name of the file, you should first search for the file by name and ask them to
    confirm the file they want to get the permissions of. If they confirm, then get the permissions of the file.
    If they do not confirm, then aid them in finding the file by name using list_files tool."""
    if not API_ACCESS_TOKEN:
        raise ValueError("API_ACCESS_TOKEN not set. Log in via POST /auth/login and set it in .env")
    r = requests.get(
        f"{API_BASE_URL}/files/{file_id}/permissions",
        headers={"Authorization": f"Bearer {API_ACCESS_TOKEN}"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()

def share_file_with_users(file_id: str, emails: list[str]):
    """Share a file with a list of users. User may likely provide the name of the file rather than the id. 
    If the user provides the name of the file, you should first search for the file by name and ask them to
    confirm the file they want to share. If they confirm, then share the file with the users.
    If they do not confirm, then aid them in finding the file by name using list_files tool."""
    if not API_ACCESS_TOKEN:
        raise ValueError("API_ACCESS_TOKEN not set. Log in via POST /auth/login and set it in .env")
    r = requests.post(
        f"{API_BASE_URL}/files/{file_id}/share",
        headers={"Authorization": f"Bearer {API_ACCESS_TOKEN}"},
        timeout=10,
        json={"emails": emails},
    )
    r.raise_for_status()
    return r.json()

def revoke_file_share(file_id: str, user_id: str):
    """Revoke a user's access to a file. User may likely provide the name of the file rather than the id. 
    If the user provides the name of the file, you should first search for the file by name and ask them to
    confirm the file they want to revoke the share of. If they confirm, then revoke the share of the file.
    If they do not confirm, then aid them in finding the file by name using list_files tool."""
    if not API_ACCESS_TOKEN:
        raise ValueError("API_ACCESS_TOKEN not set. Log in via POST /auth/login and set it in .env")
    r = requests.delete(
        f"{API_BASE_URL}/files/{file_id}/share/{user_id}",
        headers={"Authorization": f"Bearer {API_ACCESS_TOKEN}"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()

permissions_subagent = Agent(
    model='gemini-2.5-flash',
    name='permissions_subagent',
    description='The subagent responsible for permissions management.',
    instruction="""You are a helpful assistant for permissions management.
     You are responsible for managing the permissions for a given file.
     You are responsible for sharing a file with a list of users.
     You are responsible for revoking a user's access to a file.""",
    tools=[list_shared_with_me, get_file_permissions, share_file_with_users, revoke_file_share],
)