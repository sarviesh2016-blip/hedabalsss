"""Blog CRUD — public read endpoints + admin write endpoints + thumbnail upload."""
import os
import re
import uuid
import logging
import base64
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from db import blogs_col, PROJ
from auth_utils import require_admin
from models import BlogCreate, BlogUpdate
from storage_service import put_object, APP_NAME

logger = logging.getLogger(__name__)
public_router = APIRouter(tags=["blogs"])
admin_router = APIRouter(prefix="/admin/blogs", tags=["admin-blogs"])


def _slugify(s: str) -> str:
    s = (s or "").lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s or f"post-{uuid.uuid4().hex[:6]}"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- Public ----------

@public_router.get("/blogs")
async def list_published_blogs(limit: int = 50):
    return await blogs_col.find(
        {"published": True}, PROJ
    ).sort("created_at", -1).to_list(limit)


@public_router.get("/blogs/{slug}")
async def get_blog_by_slug(slug: str):
    doc = await blogs_col.find_one({"slug": slug, "published": True}, PROJ)
    if not doc:
        raise HTTPException(status_code=404, detail="Blog post not found")
    return doc


# ---------- Admin ----------

@admin_router.get("")
async def admin_list_blogs(admin=Depends(require_admin), limit: int = 200):
    return await blogs_col.find({}, PROJ).sort("created_at", -1).to_list(limit)


@admin_router.post("")
async def admin_create_blog(req: BlogCreate, admin=Depends(require_admin)):
    slug = _slugify(req.slug or req.title)
    # ensure unique
    if await blogs_col.find_one({"slug": slug}):
        slug = f"{slug}-{uuid.uuid4().hex[:4]}"
    now = _now()
    doc = {
        "blog_id": f"blog_{uuid.uuid4().hex[:12]}",
        "slug": slug,
        "title": req.title.strip(),
        "excerpt": (req.excerpt or "").strip(),
        "body": req.body,
        "tag": (req.tag or "Post").strip(),
        "thumbnail_url": req.thumbnail_url or "",
        "published": bool(req.published),
        "author_id": admin["user_id"],
        "author_name": admin.get("name", "Admin"),
        "created_at": now,
        "updated_at": now,
    }
    await blogs_col.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@admin_router.put("/{blog_id}")
async def admin_update_blog(blog_id: str, req: BlogUpdate, admin=Depends(require_admin)):
    existing = await blogs_col.find_one({"blog_id": blog_id}, PROJ)
    if not existing:
        raise HTTPException(status_code=404, detail="Blog post not found")
    payload = req.model_dump(exclude_none=True)
    if "slug" in payload:
        payload["slug"] = _slugify(payload["slug"])
        # ensure unique (allow same)
        clash = await blogs_col.find_one({"slug": payload["slug"], "blog_id": {"$ne": blog_id}})
        if clash:
            payload["slug"] = f"{payload['slug']}-{uuid.uuid4().hex[:4]}"
    if "title" in payload:
        payload["title"] = payload["title"].strip()
    payload["updated_at"] = _now()
    await blogs_col.update_one({"blog_id": blog_id}, {"$set": payload})
    return await blogs_col.find_one({"blog_id": blog_id}, PROJ)


@admin_router.delete("/{blog_id}")
async def admin_delete_blog(blog_id: str, admin=Depends(require_admin)):
    res = await blogs_col.delete_one({"blog_id": blog_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blog post not found")
    return {"ok": True, "deleted": blog_id}


@admin_router.post("/upload-thumbnail")
async def admin_upload_thumbnail(file: UploadFile = File(...), admin=Depends(require_admin)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    if ext not in {"jpg", "jpeg", "png", "webp", "gif"}:
        raise HTTPException(status_code=400, detail="Unsupported image type")
    data = await file.read()
    if not data or len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Empty or > 5MB image")
    key = f"{APP_NAME}/blog-thumbs/{uuid.uuid4().hex[:14]}.{ext}"
    content_type = f"image/{'jpeg' if ext == 'jpg' else ext}"
    try:
        put_object(key, data, content_type)
    except Exception as e:
        logger.exception("thumb upload failed")
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")
    # Return a data URL fallback if storage doesn't expose public URLs;
    # otherwise serve via a streaming endpoint.
    return {
        "ok": True,
        "thumbnail_url": f"/api/blogs/thumb/{os.path.basename(key)}",
        "storage_path": key,
    }


@public_router.get("/blogs/thumb/{filename}")
async def stream_blog_thumbnail(filename: str):
    """Stream a thumbnail by filename — used by both list and detail views."""
    from fastapi import Response
    from storage_service import get_object
    key = f"{APP_NAME}/blog-thumbs/{filename}"
    try:
        data, ct = get_object(key)
    except Exception:
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    return Response(content=data, media_type=ct, headers={"Cache-Control": "public, max-age=86400"})
