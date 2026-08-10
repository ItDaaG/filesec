"""Shared HTTP-backed tool implementations for file_agent subagents."""

from __future__ import annotations

import requests
from google.adk.tools import ToolContext

from .config import API_BASE_URL, AGENT_INTERNAL_KEY


def agent_headers(tc: ToolContext) -> dict[str, str]:
    return {"X-Agent-Key": AGENT_INTERNAL_KEY, "user_id": str(tc.user_id)}


def _error_message(r: requests.Response) -> str:
    try:
        return r.json().get("detail", r.text)
    except Exception:
        return r.text or r.reason


# --- Folder Tools ---
def folder_by_name(folder_name: str, tool_context: ToolContext):
    """Get a folder by its name.
    Requires user_id in the tool context.
    Do not share the ID of the folder directly with the user.
    This tool is to be used when the user wants to do something with a folder and
    provides the name of the folder. You will get the ID of the folder using this tool.
    Then you can use it in other tools. If you cant find the folder by its name its likely
    that the user didnt write it 100% correctly. In this case you should call the tool list_all_folders. Match the most similar folder name to the one the user provided
    and ask them if it is the correct folder. One potential issue is that you may not find similar folders,
    in that case it is likely that the user is mistaken and then you could ask if they want to create the folder.
    """
    r = requests.get(
        f"{API_BASE_URL}/agent/folder_by_name",
        headers=agent_headers(tool_context),
        timeout=10,
        params={"folder_name": folder_name},
    )
    if r.status_code == 200:
        return r.json()
    return {"status": "error", "message": _error_message(r)}


def get_folders(tool_context: ToolContext, parent_id: str | None = None):
    """This is used when user needs top level folders or children of a folder.
    Get the folders for a given parent id. If parent id is None provided get the top level folders."""
    r = requests.get(
        f"{API_BASE_URL}/folders/",
        headers=agent_headers(tool_context),
        timeout=10,
        params={"parent_id": parent_id},
    )
    if r.status_code == 200:
        return r.json()
    return {"status": "error", "message": _error_message(r)}


def list_all_folders(tool_context: ToolContext):
    """List all folders owned by the current user. Use this internally when you cant find a folder by name. Also
    use this when user asks for all of their folders."""
    r = requests.get(
        f"{API_BASE_URL}/agent/list_all_folders",
        headers=agent_headers(tool_context),
        timeout=10,
    )
    if r.status_code == 200:
        return r.json()
    return {"status": "error", "message": _error_message(r)}


def create_folder(name: str, tool_context: ToolContext, parent_id: str | None = None):
    """Create a new folder. If the parent id is provided, create the folder inside the parent folder.
     If no parent id is provided, create the folder at the root level.
     User may likely provide the name of the folder rather than the id.
     If they do, you should first search for the folder by name and ask them to
     confirm the folder they want to create. If they confirm, then create it.
     If they do not confirm, then aid them in finding the folder by name using the folder_by_name tool."""
    r = requests.post(
        f"{API_BASE_URL}/folders/",
        headers=agent_headers(tool_context),
        timeout=10,
        json={"name": name, "parent_id": parent_id},
    )
    if r.status_code == 201:
        return r.json()
    return {"status": "error", "message": _error_message(r)}


def delete_folder(folder_id: str, tool_context: ToolContext):
    """Delete a folder. User may likely provide the name of the folder rather than the id.
    If the user provides the name of the folder, you should first search for the folder by name and ask them to
    confirm the folder they want to delete. If they confirm, then delete it. If they do not confirm, then aid them
    in finding the folder by name using the folder_by_name tool.
    """
    r = requests.delete(
        f"{API_BASE_URL}/folders/{folder_id}",
        headers=agent_headers(tool_context),
        timeout=10,
    )
    if r.status_code == 204:
        return {"status": "deleted"}
    return {"status": "error", "message": _error_message(r)}


def patch_folder(folder_id: str, name: str, tool_context: ToolContext):
    """Update the name of a folder. User may likely provide the name of the folder rather than the id.
    If the user provides the name of the folder, you should first search for the folder by name and ask them to
    confirm the folder they want to update. If they confirm, then update it. If they do not confirm, then aid them
    in finding the folder by name using the folder_by_name tool.
    """
    r = requests.patch(
        f"{API_BASE_URL}/folders/{folder_id}",
        headers=agent_headers(tool_context),
        timeout=10,
        json={"name": name},
    )
    if r.status_code == 200:
        return {"status": "updated"}
    return {"status": "error", "message": _error_message(r)}


# --- File Tools ---

def file_by_name(file_name: str, tool_context: ToolContext):
    """Get a file by its name.
    Requires user_id in the tool context.
    Do not share the ID of the file directly with the user.
    This tool is to be used when the user wants to do something with a file and
    provides the name of the file. You will get the ID of the file using this tool.
    Then you can use it in other tools. If you cant find the file, let the user know
    and then ask them what type of file it is. Then using this information you can try to call the tool again
    but this time adding the file type extension to the file name.
    For example:
    User: I have a file called "coolcar"
    You: I cant find the file called "coolcar". What type of file is it?
    User: It's a png
    You then do the call again with the file name "coolcar.png"
    You: I have found the file.
    """
    r = requests.get(
        f"{API_BASE_URL}/agent/file_by_name",
        params={"file_name": file_name},
        headers=agent_headers(tool_context),
        timeout=10,
    )
    if r.status_code == 200:
        return r.json()
    return {"status": "error", "message": _error_message(r)}


def list_all_files(tool_context: ToolContext):
    """Fetch files from the backend API."""
    r = requests.get(
        f"{API_BASE_URL}/files/",
        headers=agent_headers(tool_context),
        timeout=10,
        params={"root_only": False},
    )
    if r.status_code == 200:
        return r.json()
    return {"status": "error", "message": _error_message(r)}


def patch_file(file_id: str, file: dict, tool_context: ToolContext):
    """Patch a file in the backend API. You can patch the filename, visibility, or parent folder of the file
    (useful when organising files into folders with the organiser subagent).
    If the user provides the name of the file, you should first search for the file by name and ask them to
    confirm the file they want to patch. If they confirm, then patch it. If they do not confirm, then aid them
    in finding the file by name using list_all_files tool.
    """
    r = requests.patch(
        f"{API_BASE_URL}/files/{file_id}",
        headers=agent_headers(tool_context),
        timeout=10,
        params={"file_id": file_id},
        json=file,
    )
    if r.status_code == 200:
        return {"status": "patched"}
    return {"status": "error", "message": _error_message(r)}

# --- User Tools ---

def user_by_email(email: str, tool_context: ToolContext):
    """Get a user by their email. Make sure you input the email in lowercase (this is how all emails are stored). 
    If you cannot find the user by email then let the requesting user know and ask them to double check."""
    r = requests.get(
        f"{API_BASE_URL}/agent/user_by_email",
        headers=agent_headers(tool_context),
        timeout=10,
        params={"email": email},
    )
    if r.status_code == 200: return r.json()
    else: return {"status": "error", "message": r.json()["detail"]}
