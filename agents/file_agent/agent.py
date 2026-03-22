import os
import requests
from dotenv import load_dotenv

from google.adk.agents.llm_agent import Agent

load_dotenv()

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
API_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwidmVyaWZpZWQiOnRydWUsImV4cCI6MTc3NDIwMDQ3NX0.Kh2a0Cgz3-qokamlx0mDsnopI4eJc-YY8T3WLQxMgsk'


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
    in finding the file by name.
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
    tools=[list_files, delete_file, get_storage_usage],
)
