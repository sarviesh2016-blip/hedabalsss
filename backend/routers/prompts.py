"""Saved prompts endpoints."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from db import saved_prompts_col, generations_col, PROJ
from auth_utils import get_current_user
from models import SavePromptRequest

router = APIRouter(tags=["prompts"])


@router.post("/save-prompt")
async def save_prompt(req: SavePromptRequest, user=Depends(get_current_user)):
    gen = await generations_col.find_one(
        {"generation_id": req.generation_id, "user_id": user["user_id"]}, PROJ
    )
    if not gen:
        raise HTTPException(status_code=404, detail="Generation not found")

    saved_id = f"sav_{uuid.uuid4().hex[:14]}"
    snippet = (gen.get("output", {}).get("shortPrompt") or "")[:240]
    doc = {
        "saved_id": saved_id,
        "user_id": user["user_id"],
        "generation_id": req.generation_id,
        "title": req.title or "Untitled prompt",
        "snippet": snippet,
        "output": gen.get("output", {}),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await saved_prompts_col.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@router.get("/saved-prompts")
async def list_saved(user=Depends(get_current_user), limit: int = 100):
    items = await saved_prompts_col.find(
        {"user_id": user["user_id"]}, PROJ
    ).sort("created_at", -1).to_list(limit)
    return items


@router.delete("/saved-prompts/{saved_id}")
async def delete_saved(saved_id: str, user=Depends(get_current_user)):
    res = await saved_prompts_col.delete_one(
        {"saved_id": saved_id, "user_id": user["user_id"]}
    )
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Saved prompt not found")
    return {"ok": True}
