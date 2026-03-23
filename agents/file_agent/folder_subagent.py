import requests
from .config import API_BASE_URL, API_ACCESS_TOKEN
from google.adk.agents.llm_agent import Agent

def folder_by_name(folder_name: str):
    """Get a folder by its name. Requires API_ACCESS_TOKEN in .env (from /auth/login)."""
    if not API_ACCESS_TOKEN:
        raise ValueError("API_ACCESS_TOKEN not set. Log in via POST /auth/login and set it in .env")
    r = requests.get(
        f"{API_BASE_URL}/agent/folder_by_name",
        headers={"Authorization": f"Bearer {API_ACCESS_TOKEN}"},
        timeout=10,
        json={"folder_name": folder_name},
    )
    r.raise_for_status()
    return r.json()

def get_folders(parent_id: str = None):
    """Get the folders for a given parent id. If no parent id is provided, get the top level folders."""
    if not API_ACCESS_TOKEN:
        raise ValueError("API_ACCESS_TOKEN not set. Log in via POST /auth/login and set it in .env")
    r = requests.get(
        f"{API_BASE_URL}/folders/",
        headers={"Authorization": f"Bearer {API_ACCESS_TOKEN}"},
        timeout=10,
        params={"parent_id": parent_id},
    )
    r.raise_for_status()
    return r.json()

def create_folder(name: str, parent_id: str = None):
    """Create a new folder. If the parent id is provided, create the folder inside the parent folder.
     If no parent id is provided, create the folder at the root level.
     User may likely provide the name of the folder rather than the id.
     If they do, you should first search for the folder by name and ask them to
     confirm the folder they want to create. If they confirm, then create it. 
     If they do not confirm, then aid them in finding the folder by name using get_folders tool."""
    if not API_ACCESS_TOKEN:
        raise ValueError("API_ACCESS_TOKEN not set. Log in via POST /auth/login and set it in .env")
    r = requests.post(
        f"{API_BASE_URL}/folders/",
        headers={"Authorization": f"Bearer {API_ACCESS_TOKEN}"},
        timeout=10,
        json={"name": name, "parent_id": parent_id},
    )
    r.raise_for_status()
    return r.json()

def delete_folder(folder_id: str):
    """Delete a folder. User may likely provide the name of the folder rather than the id. 
    If the user provides the name of the folder, you should first search for the folder by name and ask them to
    confirm the folder they want to delete. If they confirm, then delete it. If they do not confirm, then aid them
    in finding the folder by name using get_folders tool.
    Requires API_ACCESS_TOKEN in .env (from /auth/login)."""
    if not API_ACCESS_TOKEN:
        raise ValueError("API_ACCESS_TOKEN not set. Log in via POST /auth/login and set it in .env")
    r = requests.delete(
        f"{API_BASE_URL}/folders/{folder_id}",
        headers={"Authorization": f"Bearer {API_ACCESS_TOKEN}"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()

folder_subagent = Agent(
    model='gemini-2.5-flash',
    name='folder_subagent',
    description='The subagent responsible for folder management.',
    instruction="""You are a helpful assistant for folder management.
     You are responsible for creating, deleting, and searching for folders.""",
    tools=[folder_by_name, get_folders, create_folder, delete_folder],
)