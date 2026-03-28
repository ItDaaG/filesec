import requests
from .config import API_BASE_URL, API_ACCESS_TOKEN, AGENT_INTERNAL_KEY
from google.adk.agents.llm_agent import Agent
from google.adk.tools import ToolContext

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
        headers={"X-Agent-Key": AGENT_INTERNAL_KEY, "user_id": str(tool_context.user_id)},
        timeout=10,
        params={"folder_name": folder_name},
    )
    if r.status_code == 200: return r.json()
    else: return {"status": "error", "message": r.json()["detail"]}

def get_folders(tool_context: ToolContext, parent_id:str = None):
    """This is used when user needs top level folders or children of a folder.
    Get the folders for a given parent id. If parent id is None provided get the top level folders."""
    r = requests.get(
        f"{API_BASE_URL}/folders/",
        headers={"X-Agent-Key": AGENT_INTERNAL_KEY, "user_id": str(tool_context.user_id)},
        timeout=10,
        params={"parent_id": parent_id},
    )
    if r.status_code == 200: return r.json()
    else: return {"status": "error", "message": r.json()["detail"]}

def list_all_folders(tool_context: ToolContext):
    """List all folders owned by the current user. Use this internally when you cant find a folder by name. Also
    use this when user asks for all of their folders."""
    r = requests.get(
        f"{API_BASE_URL}/agent/list_all_folders",
        headers={"X-Agent-Key": AGENT_INTERNAL_KEY, "user_id": str(tool_context.user_id)},
        timeout=10,
    )
    if r.status_code == 200: return r.json()
    else: return {"status": "error", "message": r.json()["detail"]}

def create_folder(name: str, tool_context: ToolContext, parent_id: str = None):
    """Create a new folder. If the parent id is provided, create the folder inside the parent folder.
     If no parent id is provided, create the folder at the root level.
     User may likely provide the name of the folder rather than the id.
     If they do, you should first search for the folder by name and ask them to
     confirm the folder they want to create. If they confirm, then create it. 
     If they do not confirm, then aid them in finding the folder by name using the folder_by_name tool."""
    r = requests.post(
        f"{API_BASE_URL}/folders/",
        headers={"X-Agent-Key": AGENT_INTERNAL_KEY, "user_id": str(tool_context.user_id)},
        timeout=10,
        json={"name": name, "parent_id": parent_id},
    )
    if r.status_code == 201: return r.json()
    else: return {"status": "error", "message": r.json()["detail"]}

def delete_folder(folder_id: str, tool_context: ToolContext):
    """Delete a folder. User may likely provide the name of the folder rather than the id. 
    If the user provides the name of the folder, you should first search for the folder by name and ask them to
    confirm the folder they want to delete. If they confirm, then delete it. If they do not confirm, then aid them
    in finding the folder by name using the folder_by_name tool.
    """
    r = requests.delete(
        f"{API_BASE_URL}/folders/{folder_id}",
        headers={"X-Agent-Key": AGENT_INTERNAL_KEY, "user_id": str(tool_context.user_id)},
        timeout=10,
    )
    if r.status_code == 204: return {"status": "deleted"}
    else: return {"status": "error", "message": r.json()["detail"]}

def update_folder(folder_id: str, name: str, tool_context: ToolContext):
    """Update the name of a folder. User may likely provide the name of the folder rather than the id. 
    If the user provides the name of the folder, you should first search for the folder by name and ask them to
    confirm the folder they want to update. If they confirm, then update it. If they do not confirm, then aid them
    in finding the folder by name using the folder_by_name tool.
    """
    r = requests.patch(
        f"{API_BASE_URL}/folders/{folder_id}",
        headers={"X-Agent-Key": AGENT_INTERNAL_KEY, "user_id": str(tool_context.user_id)},
        timeout=10,
        json={"name": name},
    )
    if r.status_code == 200: return {"status": "updated"}
    else: return {"status": "error", "message": r.json()["detail"]}

folder_subagent = Agent(
    model='gemini-2.5-flash',
    name='folder_subagent',
    description='The subagent responsible for folder management.',
    instruction="""You are a helpful assistant for folder management.
     You are responsible for creating, deleting, and searching for folders.""",
    tools=[folder_by_name, get_folders, create_folder, delete_folder],
)