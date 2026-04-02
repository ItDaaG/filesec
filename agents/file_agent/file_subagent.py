from google.adk.agents.llm_agent import Agent

from .shared_tools import (
    delete_file,
    file_by_name,
    list_all_files,
    list_files_in_folder,
    patch_file,
)

file_subagent = Agent(
    model="gemini-2.5-flash",
    name="file_subagent",
    description="The subagent responsible for file management.",
    instruction="""You are a helpful assistant for file management.
     You are responsible for creating, deleting, and searching for files.""",
    tools=[file_by_name, list_all_files, list_files_in_folder, delete_file, patch_file],
)
