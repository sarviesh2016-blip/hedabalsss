"""Video upload + listing endpoints."""
import os
import uuid
import tempfile
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Header, Query, Response

from db import videos_col, PROJ
from auth_utils import get_current_user
from storage_service import put_object, get_object, APP_NAME
from video_utils import probe_duration, extract_thumbnail

logger = logging.getLogger(__name__)
router = APIRouter(tags=["videos"])

ALLOWED_EXT = {"mp4", "mov", "webm", "m4v", "quicktime"}
MAX_SIZE_BYTES = 100 * 1024 * 1024  # 100MB
MAX_DURATION_SECONDS = 10.0  # hard cap — keeps Groq vision cost low and aligns with free tier

EXT_TO_MIME = {
    "mp4": "video/mp4",
    "m4v": "video/x-m4v",
    "mov": "video/quicktime",
    "webm": "video/webm",
}


def _resolve_content_type(file_content_type: str | None, ext: str) -> str:
    if file_content_type and file_content_type.startswith("video/"):
        return file_content_type
    return EXT_TO_MIME.get(ext, "video/mp4")


@router.post("/upload/video")
async def upload_video(file: UploadFile = File(...), user=Depends(get_current_user)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail=f"Unsupported video format: .{ext}")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    size = len(data)
    if size > MAX_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 100MB limit")

    video_id = f"vid_{uuid.uuid4().hex[:14]}"
    storage_path = f"{APP_NAME}/videos/{user['user_id']}/{video_id}.{ext}"
    content_type = _resolve_content_type(file.content_type, ext)

    # Probe duration + extract thumbnail from a temp copy
    duration = None
    thumb_url = None
    tmp_path = None
    try:
        fd, tmp_path = tempfile.mkstemp(suffix=f".{ext}")
        with os.fdopen(fd, "wb") as f:
            f.write(data)
        duration = probe_duration(tmp_path)
        # Enforce 10-second cap (small tolerance for container metadata jitter)
        if duration is not None and duration > MAX_DURATION_SECONDS + 0.5:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass
            raise HTTPException(
                status_code=400,
                detail=f"Video duration is {duration:.1f}s. Maximum allowed is {int(MAX_DURATION_SECONDS)} seconds. Please trim and re-upload.",
            )
        thumb_bytes = extract_thumbnail(tmp_path, at_seconds=min(1.0, (duration or 1.0) / 2))
        if thumb_bytes:
            thumb_path = f"{APP_NAME}/thumbs/{user['user_id']}/{video_id}.jpg"
            try:
                from storage_service import put_object as _put
                _put(thumb_path, thumb_bytes, "image/jpeg")
                thumb_url = f"/api/videos/{video_id}/thumbnail"
            except Exception as e:
                logger.warning(f"thumbnail upload failed: {e}")
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"video probe failed: {e}")
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

    try:
        result = put_object(storage_path, data, content_type)
    except Exception as e:
        logger.exception("Storage upload failed")
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {e}")

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "video_id": video_id,
        "user_id": user["user_id"],
        "file_name": file.filename,
        "storage_path": result.get("path", storage_path),
        "file_url": f"/api/videos/{video_id}/stream",
        "thumbnail_url": thumb_url,
        "thumbnail_path": f"{APP_NAME}/thumbs/{user['user_id']}/{video_id}.jpg" if thumb_url else None,
        "duration": duration,
        "file_size": size,
        "content_type": content_type,
        "status": "uploaded",
        "created_at": now,
    }
    await videos_col.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@router.get("/videos")
async def list_videos(user=Depends(get_current_user), limit: int = 50):
    items = await videos_col.find({"user_id": user["user_id"]}, PROJ).sort("created_at", -1).to_list(limit)
    return items


@router.get("/videos/{video_id}")
async def get_video(video_id: str, user=Depends(get_current_user)):
    v = await videos_col.find_one({"video_id": video_id, "user_id": user["user_id"]}, PROJ)
    if not v:
        raise HTTPException(status_code=404, detail="Video not found")
    return v


async def _check_token(authorization: str | None, auth: str | None):
    from auth_utils import sessions_col
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
    elif auth:
        token = auth
    if not token:
        raise HTTPException(status_code=401, detail="Auth required")
    sess = await sessions_col.find_one({"session_token": token}, PROJ)
    if not sess:
        raise HTTPException(status_code=401, detail="Invalid session")
    return sess


@router.get("/videos/{video_id}/stream")
async def stream_video(video_id: str, auth: str = Query(None),
                        authorization: str = Header(None)):
    sess = await _check_token(authorization, auth)
    v = await videos_col.find_one({"video_id": video_id}, PROJ)
    if not v:
        raise HTTPException(status_code=404, detail="Video not found")
    if v["user_id"] != sess["user_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        data, ct = get_object(v["storage_path"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage read failed: {e}")
    return Response(content=data, media_type=v.get("content_type", ct))


@router.get("/videos/{video_id}/thumbnail")
async def thumbnail(video_id: str, auth: str = Query(None),
                     authorization: str = Header(None)):
    sess = await _check_token(authorization, auth)
    v = await videos_col.find_one({"video_id": video_id}, PROJ)
    if not v or not v.get("thumbnail_path"):
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    if v["user_id"] != sess["user_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        data, ct = get_object(v["thumbnail_path"])
    except Exception:
        raise HTTPException(status_code=404, detail="Thumbnail not available")
    return Response(content=data, media_type="image/jpeg")
