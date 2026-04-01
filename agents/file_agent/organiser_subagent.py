import json
from collections import defaultdict
from uuid import UUID

import requests
from .config import API_BASE_URL, AGENT_INTERNAL_KEY
from google.adk.agents.llm_agent import Agent
from google.adk.tools import ToolContext


def _agent_headers(tc: ToolContext) -> dict[str, str]:
    return {"X-Agent-Key": AGENT_INTERNAL_KEY, "user_id": str(tc.user_id)}


def _list_folders(parent_id: str, tool_context: ToolContext) -> dict | list:
    """Same API as folder_subagent get_folders: children of parent_id."""
    r = requests.get(
        f"{API_BASE_URL}/folders/",
        headers=_agent_headers(tool_context),
        params={"parent_id": parent_id},
        timeout=60,
    )
    if r.status_code == 200:
        return r.json()
    return {"status": "error", "message": r.json().get("detail", r.text)}


def _find_or_create_folder(name: str, parent_id: str, tool_context: ToolContext) -> str | dict:
    """Return new folder id, or error dict. Mirrors folder_subagent create_folder + listing."""
    listed = _list_folders(parent_id, tool_context)
    if isinstance(listed, dict) and listed.get("status") == "error":
        return listed
    name_clean = name.strip()
    for f in listed:
        if f.get("name") == name_clean:
            return str(f["id"])
    r = requests.post(
        f"{API_BASE_URL}/folders/",
        headers=_agent_headers(tool_context),
        json={"name": name_clean, "parent_id": parent_id},
        timeout=60,
    )
    if r.status_code == 201:
        return str(r.json()["id"])
    return {"status": "error", "message": r.json().get("detail", r.text)}


def _ensure_folder_chain(scope_folder_id: str, segments: list[str], tool_context: ToolContext) -> str | dict:
    """Create/find nested folders under scope_folder_id. segments are path parts excluding filename."""
    current = scope_folder_id.strip()
    for seg in segments:
        if not seg.strip():
            continue
        nxt = _find_or_create_folder(seg, current, tool_context)
        if isinstance(nxt, dict):
            return nxt
        current = nxt
    return current


def _parse_destination_path(path: str) -> tuple[list[str], str | None]:
    """Split /A/B/file.ext into (['A','B'], 'file.ext'). Single segment => ([], 'file.ext') = file in scope root."""
    raw = (path or "").strip().replace("\\", "/")
    if raw.startswith("/"):
        raw = raw[1:]
    parts = [p for p in raw.split("/") if p]
    if not parts:
        return [], None
    if len(parts) == 1:
        return [], parts[0]
    return parts[:-1], parts[-1]


def get_folder_tree(folder_id: str, tool_context: ToolContext, depth_limit: str = ""):
    """Fetch the real folder hierarchy and file metadata from the database (source of truth).

    WHEN TO USE: Always call this first for any reorganisation or analysis task. You need accurate
    folder ids, file ids, filenames, mime types, and sizes before reasoning about clusters or moves.

    AFTER: You analyse the returned `tree` yourself. Collect every file
    `id` from `tree.files` and nested `subfolders` when you need the full inventory.

    depth_limit: empty string = recurse fully; otherwise a small integer string (e.g. "2") to cap
    depth and receive `truncated` stubs for deeper folders—then call again with that folder's id.
    Use this when user asks to limit the depth of the folder tree.

    Returns: `{ "tree": { "id", "name", "files": [...], "subfolders": [...] } }` or an error object.
    """
    params = {"folder_id": folder_id.strip()}
    if depth_limit and depth_limit.strip():
        params["depth_limit"] = int(depth_limit.strip())
    r = requests.get(
        f"{API_BASE_URL}/agent/organiser/folder_tree",
        headers=_agent_headers(tool_context),
        params=params,
        timeout=30,
    )
    if r.status_code == 200:
        return r.json()
    return {"status": "error", "message": r.json().get("detail", r.text)}


def propose_file_clusters(clusters_json: str, tool_context: ToolContext):
    """Submit YOUR clustering of files (LLM reasoning) as structured JSON for the next step.

    WHEN TO USE: After `get_folder_tree`, group files by theme, project, type, or purpose using only
    file ids that appear in that tree. Do not invent ids.

    INPUT (clusters_json): A JSON array. Each element must be an object, for example:
      `[{"cluster_id": "c1", "file_ids": ["<uuid>", "..."], "rationale": "optional short note"}]`

    This tool does not compute clusters on the server—it validates shape and echoes back so your
    plan is explicit before category labels and folder suggestions.

    Returns: `{ "status": "ok", "clusters": [...] }` or `{ "status": "error", "message": "..." }`.
    """
    _ = tool_context  # injected by ADK; no backend call for this step
    try:
        data = json.loads(clusters_json)
    except json.JSONDecodeError as e:
        return {"status": "error", "message": f"Invalid JSON: {e}"}
    if not isinstance(data, list):
        return {"status": "error", "message": "clusters_json must be a JSON array"}
    for i, item in enumerate(data):
        if not isinstance(item, dict):
            return {"status": "error", "message": f"clusters[{i}] must be an object"}
        if "cluster_id" not in item or "file_ids" not in item:
            return {
                "status": "error",
                "message": f"clusters[{i}] must include cluster_id and file_ids",
            }
        if not isinstance(item.get("file_ids"), list):
            return {"status": "error", "message": f"clusters[{i}].file_ids must be an array"}
    return {"status": "ok", "clusters": data, "cluster_count": len(data)}


def propose_category_labels(category_labels_json: str, tool_context: ToolContext):
    """Submit human-readable category names for each cluster id (LLM-generated labels).

    WHEN TO USE: After `propose_file_clusters`, assign a short folder-friendly label per
    `cluster_id` (e.g. "Finance", "University notes", "Screenshots").

    INPUT (category_labels_json): A JSON object mapping cluster_id to label, for example:
      `{"c1": "Finance", "c2": "Images"}`

    Keys must match the `cluster_id` values you used in the clusters array.

    Returns: `{ "status": "ok", "category_labels": {...} }` or an error.
    """
    _ = tool_context
    try:
        data = json.loads(category_labels_json)
    except json.JSONDecodeError as e:
        return {"status": "error", "message": f"Invalid JSON: {e}"}
    if not isinstance(data, dict):
        return {"status": "error", "message": "category_labels_json must be a JSON object"}
    for k, v in data.items():
        if not isinstance(k, str) or not isinstance(v, str):
            return {"status": "error", "message": "All keys and values must be strings"}
    return {"status": "ok", "category_labels": data}


def propose_folder_reorganisation(plan_json: str, tool_context: ToolContext):
    """Submit a proposed folder layout and file moves (planning only—does not change the database).

    WHEN TO USE: After clusters and category labels, describe where each file should live. Use
    paths that fit the user's goals; you may suggest new folder names under a logical root.

    INPUT (plan_json): JSON object, for example:
      `{
        "file_to_destination": { "<file_uuid>": "/CategoryName/filename.pdf", ... },
        "tree_preview": "optional: your own multi-line outline; if set, shown to the user as-is",
        "notes": "optional caveats or assumptions"
      }`

    Every key in `file_to_destination` should be a file id from `get_folder_tree`. Values are
    suggested paths (strings). Execution of moves is out of scope for this tool.

    Returns `{ "status": "ok", "plan": {...} }`.
    When you give this plan to the user, provide it in a readable clean intuitive format.
    Do not give the raw JSON to the user ever. The JSON is for internal use only.
    """
    _ = tool_context
    try:
        data = json.loads(plan_json)
    except json.JSONDecodeError as e:
        return {"status": "error", "message": f"Invalid JSON: {e}"}
    if not isinstance(data, dict):
        return {"status": "error", "message": "plan_json must be a JSON object"}
    if "file_to_destination" not in data:
        return {"status": "error", "message": "plan must include file_to_destination"}
    fmap = data.get("file_to_destination")
    if not isinstance(fmap, dict):
        return {"status": "error", "message": "file_to_destination must be an object"}
    for fid, path in fmap.items():
        if not isinstance(fid, str) or not isinstance(path, str):
            return {"status": "error", "message": "file_to_destination keys and values must be strings"}
    return {"status": "ok", "plan": data}


organiser_subagent = Agent(
    model="gemini-2.5-flash",
    name="organiser_subagent",
    description="Fetches real folder trees from the API, then plans clustering and layout via structured JSON tools.",
    instruction="""Workflow: (1) get_folder_tree. (2) propose_file_clusters (JSON array). (3)
propose_category_labels (JSON object). (4) propose_folder_reorganisation with file_to_destination and
optionally tree_preview if you want a custom outline.

When you finish step 4, the tool returns the plan. In your reply to the user, you MUST
provide the plan in a readable clean intuitive format. Do not give the raw JSON to the user ever.
The JSON is for internal use only.
If the user asks for the plan "as a string", provide the plan in a readable clean intuitive format.
Do not give the raw JSON to the user ever. The JSON is for internal use only.""",
    tools=[
        get_folder_tree,
        propose_file_clusters,
        propose_category_labels,
        propose_folder_reorganisation,
    ],
)
