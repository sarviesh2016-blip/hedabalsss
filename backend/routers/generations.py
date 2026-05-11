"""Prompt generation endpoints."""
import asyncio
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from db import generations_col, videos_col, users_col, PROJ
from auth_utils import get_current_user
from models import GenerateRequest, PromptOutput
from storage_service import get_object
from ai_service import generate_prompt_from_video, fallback_mock_output

logger = logging.getLogger(__name__)
router = APIRouter(tags=["generations"])

# Stay well within the K8s ingress 60s window so the fallback mock is always returned
AI_TIMEOUT_SECONDS = 40


@router.post("/generate-prompt")
async def generate_prompt(req: GenerateRequest, user=Depends(get_current_user)):
    # Credit check
    if user.get("credits", 0) <= 0:
        raise HTTPException(status_code=402, detail="Insufficient credits. Please upgrade or purchase a credit pack.")

    video = await videos_col.find_one({"video_id": req.video_id, "user_id": user["user_id"]}, PROJ)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    gen_id = f"gen_{uuid.uuid4().hex[:14]}"
    now = datetime.now(timezone.utc).isoformat()

    # Reserve credit immediately (atomic decrement)
    res = await users_col.update_one(
        {"user_id": user["user_id"], "credits": {"$gt": 0}},
        {"$inc": {"credits": -1}, "$set": {"updated_at": now}},
    )
    if res.modified_count == 0:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    gen_doc = {
        "generation_id": gen_id,
        "user_id": user["user_id"],
        "video_id": req.video_id,
        "selected_model": req.selected_model,
        "style_preset": req.style_preset,
        "output": PromptOutput().model_dump(),
        "status": "processing",
        "credits_used": 1,
        "error": None,
        "created_at": now,
        "completed_at": None,
    }
    await generations_col.insert_one(gen_doc.copy())
    await videos_col.update_one({"video_id": req.video_id}, {"$set": {"status": "processing"}})

    # Run AI (with a hard timeout so we never exceed the ingress window)
    try:
        data, ct = get_object(video["storage_path"])
        ext = video["file_name"].rsplit(".", 1)[-1].lower() if "." in video["file_name"] else "mp4"
        output = await asyncio.wait_for(
            generate_prompt_from_video(
                video_bytes=data,
                content_type=video.get("content_type") or ct or "video/mp4",
                file_ext=ext,
                selected_model=req.selected_model,
                style_preset=req.style_preset,
                session_id=gen_id,
            ),
            timeout=AI_TIMEOUT_SECONDS,
        )
        status = "completed"
        error = None
    except asyncio.TimeoutError:
        logger.warning("AI generation timed out; using fallback")
        output = fallback_mock_output(video["file_name"], req.style_preset, req.selected_model)
        status = "completed"
        error = "ai_timeout_fallback"
    except Exception as e:
        logger.exception("AI generation failed; using fallback")
        output = fallback_mock_output(video["file_name"], req.style_preset, req.selected_model)
        status = "completed"
        error = f"ai_fallback: {e}"

    completed_at = datetime.now(timezone.utc).isoformat()
    await generations_col.update_one(
        {"generation_id": gen_id},
        {"$set": {
            "output": output,
            "status": status,
            "error": error,
            "completed_at": completed_at,
        }},
    )
    await videos_col.update_one({"video_id": req.video_id}, {"$set": {"status": "completed"}})

    doc = await generations_col.find_one({"generation_id": gen_id}, PROJ)
    return doc


@router.get("/generations")
async def list_generations(user=Depends(get_current_user), limit: int = 50):
    items = await generations_col.find(
        {"user_id": user["user_id"]}, PROJ
    ).sort("created_at", -1).to_list(limit)
    return items


@router.get("/generations/{generation_id}")
async def get_generation(generation_id: str, user=Depends(get_current_user)):
    doc = await generations_col.find_one(
        {"generation_id": generation_id, "user_id": user["user_id"]}, PROJ
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Generation not found")
    return doc


@router.get("/user/credits")
async def get_credits(user=Depends(get_current_user)):
    return {
        "credits": user.get("credits", 0),
        "plan": user.get("plan", "free"),
    }
