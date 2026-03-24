import requests
from .config import API_BASE_URL, API_ACCESS_TOKEN, AGENT_INTERNAL_KEY
from google.adk.agents.llm_agent import Agent
from google.adk.tools import ToolContext


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
        headers={"X-Agent-Key": AGENT_INTERNAL_KEY, "user_id": str(tool_context.user_id)},
        timeout=10,
    )
    if r.status_code == 200: return r.json()
    else: return {"status": "error", "message":r.json()["detail"]}

def list_files(tool_context: ToolContext):
    """Fetch files from the backend API."""
    r = requests.get(
        f"{API_BASE_URL}/agent/list-files",
        headers={"X-Agent-Key": AGENT_INTERNAL_KEY, "user_id": str(tool_context.user_id)},
        timeout=10,
    )
    if r.status_code == 200: return r.json()
    else: return {"status": "error", "message": r.json()["detail"]}


def delete_file(file_id: str, tool_context: ToolContext):
    """Delete a file from the backend API. User may likely provide the name of the file rather than the id. 
    If the user provides the name of the file, you should first search for the file by name and ask them to
    confirm the file they want to delete. If they confirm, then delete it. If they do not confirm, then aid them
    in finding the file by name using list_files tool.
    """
    r = requests.delete(
        f"{API_BASE_URL}/files/{file_id}",
        headers={"X-Agent-Key": AGENT_INTERNAL_KEY, "user_id": str(tool_context.user_id)},
        timeout=10,
    )
    if r.status_code == 204: return {"status": "deleted"}
    else: return {"status": "error", "message": r.json()["detail"]}

def patch_file(file_id: str, file: dict, tool_context: ToolContext):
    """Patch a file in the backend API. You can patch the filename or the visibility of the file.
    If the user provides the name of the file, you should first search for the file by name and ask them to
    confirm the file they want to patch. If they confirm, then patch it. If they do not confirm, then aid them
    in finding the file by name using list_files tool.
    """
    r = requests.patch(
        f"{API_BASE_URL}/files/{file_id}",
        headers={"X-Agent-Key": AGENT_INTERNAL_KEY, "user_id": str(tool_context.user_id)},
        timeout=10,
        params={"file_id": file_id},
        json=file,
    )
    if r.status_code == 200: return {"status": "patched"}
    else: return {"status": "error", "message": r.json()["detail"]}


file_subagent = Agent(
    model='gemini-2.5-flash',
    name='file_subagent',
    description='The subagent responsible for file management.',
    instruction="""You are a helpful assistant for file management.
     You are responsible for creating, deleting, and searching for files.""",
    tools=[file_by_name, list_files, delete_file, patch_file],
)