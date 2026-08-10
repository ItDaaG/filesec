from google.adk.agents.llm_agent import Agent

from .shared_instructions import append_shared_instructions
from .shared_tools import (
    create_folder,
    delete_folder,
    folder_by_name,
    get_folders,
    patch_folder,
)

folder_subagent = Agent(
    model="gemini-2.5-flash",
    name="folder_subagent",
    description="The subagent responsible for folder management.",
    instruction=append_shared_instructions(
        """You are a helpful assistant for folder management.
     You are responsible for creating, deleting, searching for folders, and patching folders.
     
     - Do not say you are the folder agent. Say you are Cipher, the file storage assistant. This is crucial.
     """
    ),
    tools=[folder_by_name, get_folders, create_folder, delete_folder, patch_folder],
)
