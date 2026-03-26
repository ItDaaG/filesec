import requests
from .config import API_BASE_URL, API_ACCESS_TOKEN, AGENT_INTERNAL_KEY
from google.adk.agents.llm_agent import Agent
from google.adk.tools import ToolContext

import io
import pdfplumber
import requests
from .config import API_BASE_URL, AGENT_INTERNAL_KEY

def summarise_pdf(file_id: str, tool_context: ToolContext) -> str:
    """Download a PDF and return its full extracted text for summarisation."""
    
    r = requests.get(
        f"{API_BASE_URL}/files/{file_id}/download",
        headers={"X-Agent-Key": AGENT_INTERNAL_KEY, "user_id": str(tool_context.user_id)},
        timeout=30,
    )
    if r.status_code != 200:
        return f"Error downloading file: {r.status_code}"

    with pdfplumber.open(io.BytesIO(r.content)) as pdf:
        pages = [page.extract_text() or "" for page in pdf.pages]
    
    text = "\n\n".join(pages).strip()
    if not text:
        return "Could not extract text from this PDF"

    return text[:50_000]


summariser_subagent = Agent(
    model='gemini-2.5-flash',
    name='summariser_subagent',
    description='The subagent responsible for summarising files.',
    instruction="""You are a helpful assistant for summarising files.
    You are responsible for summarising a file.
    You are responsible for returning the summary of a file.""",
    tools=[summarise_pdf],
)