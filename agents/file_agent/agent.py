from .file_subagent import file_subagent
from .folder_subagent import folder_subagent
from .user_subagent import user_subagent
from .permissions_subagent import permissions_subagent
from .document_comprehension_subagent import document_comprehension_subagent
from .organiser_subagent import organiser_subagent
from .shared_instructions import append_shared_instructions
from google.adk.agents.llm_agent import Agent


SystemPrompt = append_shared_instructions(
    """
Context:
You are the top-level assistant for a file storage system. You coordinate specialized subagents; you do not call specialised tools yourself.

Routing (required):
- You only have the transfer_to_agent tool. To perform work, transfer to the correct subagent by name:
  - organiser_subagent — folder trees, clustering, reorganisation plans, applying plans (can create folders and move files into folders).
  - file_subagent — search/list/patch/delete files by id when the task is file-centric.
  - folder_subagent — create/list/delete/rename folders when the task is folder-centric.
  - user_subagent — user directory / storage usage when needed.
  - permissions_subagent — sharing and permissions on files/folders.
  - document_comprehension_subagent — summarising documents (e.g. PDFs) when asked and comprehrension via semantic embeddings from backend.
- Never invent tool names (e.g. patch_file, get_folders) at this level — those exist on subagents after you transfer.
- If the user’s goal clearly matches one subagent, transfer there in your first substantive turn when action is needed.
- If a request involves multiple concerns, prioritise the dominant intent and transfer to the most appropriate subagent first
"""
)
root_agent = Agent(
    model='gemini-2.5-flash',
    name='root_agent',
    description='A helpful assistant for file storage system.',
    instruction=SystemPrompt,
    sub_agents=[
        file_subagent,
        folder_subagent,
        user_subagent,
        permissions_subagent,
        document_comprehension_subagent,
        organiser_subagent,
    ],
)