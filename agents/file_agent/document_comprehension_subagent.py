import io

import pdfplumber
import requests
from google.adk.agents.llm_agent import Agent
from google.adk.tools import ToolContext

from .config import API_BASE_URL, AGENT_INTERNAL_KEY
from .shared_instructions import append_shared_instructions
from .shared_tools import agent_headers, _error_message

def read_pdf(file_id: str, tool_context: ToolContext) -> str:
    """Read a PDF and return its full extracted text. Useful for summarisation."""
    
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

def query_to_file(query: str, tool_context: ToolContext) -> str:
    """Query the backend for PDFs semantically similar to the query.

    Returns JSON: query string plus results, where each result is one file with
    min_distance (best matching chunk distance), filename, file_id, and chunks:
    a list of {chunk_index, distance, content} for that file's matching excerpts.
    """
    r = requests.get(
        f"{API_BASE_URL}/agent/query-to-file",
        headers=agent_headers(tool_context),
        timeout=10,
        params={"query": query},
    )
    if r.status_code == 200: return r.json()
    else: return {"status": "error", "message": _error_message(r)}

def query_to_top_files(query: str, limit: int, tool_context: ToolContext) -> dict:
    """Return the top ``limit`` PDFs by semantic match: one best chunk per file, ranked by distance.

    Use when the user wants which files are most relevant, not full multi-chunk excerpts per file.
    """
    r = requests.get(
        f"{API_BASE_URL}/agent/query-to-top-files",
        headers=agent_headers(tool_context),
        timeout=15,
        params={"query": query, "limit": limit},
    )
    if r.status_code == 200:
        return r.json()
    return {"status": "error", "message": _error_message(r)}

document_comprehension_subagent = Agent(
    model='gemini-2.5-flash',
    name='document_comprehension_subagent',
    description='The subagent responsible for understanding files.',
    instruction=append_shared_instructions(
        """You are a helpful assistant for understanding files.
    You are responsible for understanding a file via reading it directly or via semantic embeddings from backend.
    Only read directly if you have to, otherwise use the semantic embeddings from backend as its more efficient.
    You are responsible for returning the understanding of a file."""
    ),
    tools=[read_pdf, query_to_file, query_to_top_files],
)