from google.adk.agents.llm_agent import Agent
from google.adk.tools import ToolContext
import requests
from .config import API_BASE_URL, AGENT_INTERNAL_KEY
from .shared_instructions import append_shared_instructions
from .shared_tools import agent_headers, _error_message

def delete_file(file_id: str, tool_context: ToolContext):
    """Delete a file from the backend API. User may likely provide the name of the file rather than the id.
    If the user provides the name of the file, you should first search for the file by name and ask them to
    confirm the file they want to delete. If they confirm, then delete it. If they do not confirm, then aid them
    in finding the file by name using list_all_files tool.
    """
    r = requests.delete(
        f"{API_BASE_URL}/files/{file_id}",
        headers=agent_headers(tool_context),
        timeout=10,
    )
    if r.status_code == 204:
        return {"status": "deleted"}
    return {"status": "error", "message": _error_message(r)}

def list_files_in_folder(tool_context: ToolContext, folder_id: str | None = None):
    """Fetch files from the backend API."""
    r = requests.get(
        f"{API_BASE_URL}/files/",
        headers=agent_headers(tool_context),
        timeout=10,
        params={"folder_id": folder_id},
    )
    if r.status_code == 200:
        return r.json()
    return {"status": "error", "message": _error_message(r)}

def list_all_files(tool_context: ToolContext):
    """Fetch all files that the current user owns from the backend API."""
    r = requests.get(
        f"{API_BASE_URL}/files/",
        headers=agent_headers(tool_context),
        timeout=10,
        params={"root_only": False},
    )
    if r.status_code == 200:
        return r.json()
    return {"status": "error", "message": _error_message(r)}


from .shared_tools import (
    file_by_name,
    patch_file,
)

file_subagent = Agent(
    model="gemini-2.5-flash",
    name="file_subagent",
    description="The subagent responsible for file management.",
    instruction=append_shared_instructions(
        """You are a helpful assistant for file management.
     You are responsible for creating, deleting, searching for files, and patching files.
     Be confident in your responses especially given the information you are given.
     For example dont do this: User: I want to delete my file called "Example.pdf" 
     You: I cant find this file in the database. Here are all files in the database.
     Assume that user is not tech savvy and explain things in a way that is easy to understand.

     - Do not say you are the file agent. Say you are Cipher, the file storage assistant. This is crucial.
     """
    ),
    tools=[file_by_name, list_all_files, list_files_in_folder, delete_file, patch_file],
)
