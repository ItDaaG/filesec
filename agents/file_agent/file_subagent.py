import requests
from .config import API_BASE_URL, API_ACCESS_TOKEN
from google.adk.agents.llm_agent import Agent

def file_by_name(file_name: str):
    """Get a file by its name. Requires API_ACCESS_TOKEN in .env (from /auth/login)."""
    if not API_ACCESS_TOKEN:
        raise ValueError("API_ACCESS_TOKEN not set. Log in via POST /auth/login and set it in .env")
    r = requests.get(
        f"{API_BASE_URL}/agent/file_by_name",
        headers={"Authorization": f"Bearer {API_ACCESS_TOKEN}"},
        timeout=10,
        params={"file_name": file_name},
    )
    r.raise_for_status()
    return r.json()

def list_files():
    """Fetch files from the backend API. Requires API_ACCESS_TOKEN in .env (from /auth/login)."""
    if not API_ACCESS_TOKEN:
        raise ValueError("API_ACCESS_TOKEN not set. Log in via POST /auth/login and set it in .env")
    r = requests.get(
        f"{API_BASE_URL}/files/",
        headers={"Authorization": f"Bearer {API_ACCESS_TOKEN}"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()


def delete_file(file_id: str):
    """Delete a file from the backend API. User may likely provide the name of the file rather than the id. 
    If the user provides the name of the file, you should first search for the file by name and ask them to
    confirm the file they want to delete. If they confirm, then delete it. If they do not confirm, then aid them
    in finding the file by name using list_files tool.
    Requires API_ACCESS_TOKEN in .env (from /auth/login)."""
    if not API_ACCESS_TOKEN:
        raise ValueError("API_ACCESS_TOKEN not set. Log in via POST /auth/login and set it in .env")
    r = requests.delete(
        f"{API_BASE_URL}/files/{file_id}",
        headers={"Authorization": f"Bearer {API_ACCESS_TOKEN}"},
        timeout=10,
        params={"file_id": file_id},
    )
    r.raise_for_status()
    return r.json()

def patch_file(file_id: str, file: dict):
    """Patch a file in the backend API. You can patch the filename or the visibility of the file.
    If the user provides the name of the file, you should first search for the file by name and ask them to
    confirm the file they want to patch. If they confirm, then patch it. If they do not confirm, then aid them
    in finding the file by name using list_files tool.
    Requires API_ACCESS_TOKEN in .env (from /auth/login)."""
    if not API_ACCESS_TOKEN:
        raise ValueError("API_ACCESS_TOKEN not set. Log in via POST /auth/login and set it in .env")
    r = requests.patch(
        f"{API_BASE_URL}/files/{file_id}",
        headers={"Authorization": f"Bearer {API_ACCESS_TOKEN}"},
        timeout=10,
        json=file,
    )
    r.raise_for_status()
    return r.json()


file_subagent = Agent(
    model='gemini-2.5-flash',
    name='file_subagent',
    description='The subagent responsible for file management.',
    instruction="""You are a helpful assistant for file management.
     You are responsible for creating, deleting, and searching for files.""",
    tools=[file_by_name, list_files, delete_file, patch_file],
)