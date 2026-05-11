"""Prompt generation endpoints with credit-refund-on-failure + async background processing."""
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
from runtime_config import get_gemini_key

logger = logging.getLogger(__name__)
router = APIRouter(tags=["generations"])

AI_TIMEOUT_SECONDS = 50  # leave room before client gives up at ~60s polling


async def _process_generation(gen_id: str, video: dict, selected_model: str, style_preset: str, user_id: str):
    """Run the AI in the background; refund credit on failure."""
    try:
        gemini_key = await get_gemini_key()
        data, ct = get_object(video["storage_path"])
        ext = video["file_name"].rsplit(".", 1)[-1].lower() if "." in video["file_name"] else "mp4"
        output = await asyncio.wait_for(
            generate_prompt_from_video(
                video_bytes=data,
                content_type=video.get("content_type") or ct or "video/mp4",
                file_ext=ext,
                selected_model=selected_model,
                style_preset=style_preset,
                session_id=gen_id,
                api_key=gemini_key,
            ),
            timeout=AI_TIMEOUT_SECONDS,
        )
        status = "completed"
        error = None
        used_fallback = False
    except asyncio.TimeoutError:
        logger.warning(f"AI timeout for {gen_id}; using fallback")
        output = fallback_mock_output(video["file_name"], style_preset, selected_model)
        status = "completed"
        error = "AI timed out — using cinematic mock. Try a shorter clip."
        used_fallback = True
    except Exception as e:
        logger.exception(f"AI failed for {gen_id}; using fallback")
        output = fallback_mock_output(video["file_name"], style_preset, selected_model)
        status = "completed"
        msg = str(e)
        if "RESOURCE_EXHAUSTED" in msg or "429" in msg or "quota" in msg.lower():
            error = ("Gemini quota exceeded on this key — using cinematic mock. "
                     "Enable billing for your Gemini API project at https://ai.google.dev "
                     "or paste a different key in Admin → Integrations.")
        elif "API_KEY_INVALID" in msg or "401" in msg or "permission" in msg.lower():
            error = ("Gemini key is invalid or lacks permission — using cinematic mock. "
                     "Check the key in Admin → Integrations.")
        else:
            error = f"AI failed ({type(e).__name__}); using cinematic mock."
        used_fallback = True

    completed_at = datetime.now(timezone.utc).isoformat()
    await generations_col.update_one(
        {"generation_id": gen_id},
        {"$set": {
            "output": output,
            "status": status,
            "error": error,
            "completed_at": completed_at,
            "used_fallback": used_fallback,
            "credits_used": 0 if used_fallback else 1,
        }},
    )
    await videos_col.update_one(
        {"video_id": video["video_id"]},
        {"$set": {"status": "completed"}},
    )

    # Refund credit if we fell back to mock
    if used_fallback:
        await users_col.update_one(
            {"user_id": user_id},
            {"$inc": {"credits": 1}, "$set": {"updated_at": completed_at}},
        )
        logger.info(f"Refunded 1 credit to {user_id} for fallback generation {gen_id}")


@router.post("/generate-prompt")
async def generate_prompt(req: GenerateRequest, user=Depends(get_current_user)):
    if user.get("credits", 0) <= 0:
        raise HTTPException(status_code=402, detail="Insufficient credits. Please upgrade or purchase a credit pack.")

    video = await videos_col.find_one({"video_id": req.video_id, "user_id": user["user_id"]}, PROJ)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    gen_id = f"gen_{uuid.uuid4().hex[:14]}"
    now = datetime.now(timezone.utc).isoformat()

    # Reserve credit atomically
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
        "used_fallback": False,
        "error": None,
        "created_at": now,
        "completed_at": None,
    }
    await generations_col.insert_one(gen_doc.copy())
    await videos_col.update_one({"video_id": req.video_id}, {"$set": {"status": "processing"}})

    # Run AI in background — client polls /generations/{id} until status=='completed'
    asyncio.create_task(_process_generation(
        gen_id, video, req.selected_model, req.style_preset, user["user_id"]
    ))

    gen_doc.pop("_id", None)
    return gen_doc


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
    fresh = await users_col.find_one({"user_id": user["user_id"]}, PROJ)
    return {
        "credits": fresh.get("credits", 0) if fresh else 0,
        "plan": fresh.get("plan", "free") if fresh else "free",
    }
