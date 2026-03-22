import os
import requests
from dotenv import load_dotenv

from google.adk.agents.llm_agent import Agent

load_dotenv()

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
API_ACCESS_TOKEN = os.getenv("API_ACCESS_TOKEN")  # this is just for dev lol


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

def file_by_name(file_name: str):
    """Get a file by its name. Requires API_ACCESS_TOKEN in .env (from /auth/login)."""
    if not API_ACCESS_TOKEN:
        raise ValueError("API_ACCESS_TOKEN not set. Log in via POST /auth/login and set it in .env")
    r = requests.get(
        f"{API_BASE_URL}/agent/file_by_name",
        headers={"Authorization": f"Bearer {API_ACCESS_TOKEN}"},
        timeout=10,
        json={"file_name": file_name},
    )
    r.raise_for_status()
    return r.json()

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
    )

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

SystemPrompt = """
Context:
You are a helpful assistant for a file storage system. that can help with the following tasks:
- List all files in the database
- Get a file by its id
- Get a file by its name

Guardrails:
- Never return update or delete any information that the requesting user is not allowed to see.
- Never return any information that is not related to the file storage system.

Success Criteria:
- The user should feel like the asssitant can actually do tasks for them rathe than just providing information.
- The user should feel like the asssitant is a helpful assistant and not a robot.
"""

root_agent = Agent(
    model='gemini-2.5-flash',
    name='root_agent',
    description='A helpful assistant for file storage system.',
    instruction=SystemPrompt,
    tools=[list_files, delete_file, get_storage_usage, patch_file, get_folders, create_folder, get_file_permissions, share_file_with_users, revoke_file_share, list_users, user_by_email, file_by_name, folder_by_name],
)
