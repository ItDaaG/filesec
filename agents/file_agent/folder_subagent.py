from google.adk.agents.llm_agent import Agent

from .shared_tools import (
    create_folder,
    delete_folder,
    folder_by_name,
    get_folders,
)

folder_subagent = Agent(
    model="gemini-2.5-flash",
    name="folder_subagent",
    description="The subagent responsible for folder management.",
    instruction="""You are a helpful assistant for folder management.
     You are responsible for creating, deleting, and searching for folders.""",
    tools=[folder_by_name, get_folders, create_folder, delete_folder],
)
