from .file_subagent import file_subagent
from .folder_subagent import folder_subagent
from .user_subagent import user_subagent
from .permissions_subagent import permissions_subagent
from google.adk.agents.llm_agent import Agent


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
    sub_agents=[file_subagent, folder_subagent, user_subagent, permissions_subagent],
)
