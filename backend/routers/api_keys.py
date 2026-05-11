"""API key management."""
import uuid
import hashlib
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from db import api_keys_col, PROJ
from auth_utils import get_current_user
from models import CreateAPIKeyRequest, APIKeyCreated

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


def _hash(k: str) -> str:
    return hashlib.sha256(k.encode()).hexdigest()


@router.post("/create", response_model=APIKeyCreated)
async def create_key(req: CreateAPIKeyRequest, user=Depends(get_current_user)):
    raw = "vtp_" + secrets.token_urlsafe(32)
    key_prefix = raw[:10]
    api_key_id = f"key_{uuid.uuid4().hex[:14]}"
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "api_key_id": api_key_id,
        "user_id": user["user_id"],
        "name": req.name,
        "key_prefix": key_prefix,
        "key_hash": _hash(raw),
        "last_used": None,
        "is_active": True,
        "created_at": now,
    }
    await api_keys_col.insert_one(doc.copy())
    return APIKeyCreated(
        api_key_id=api_key_id,
        name=req.name,
        key=raw,
        key_prefix=key_prefix,
        created_at=now,
    )


@router.get("")
async def list_keys(user=Depends(get_current_user)):
    items = await api_keys_col.find(
        {"user_id": user["user_id"]},
        {"_id": 0, "key_hash": 0},
    ).sort("created_at", -1).to_list(100)
    return items


@router.delete("/{api_key_id}")
async def delete_key(api_key_id: str, user=Depends(get_current_user)):
    res = await api_keys_col.delete_one(
        {"api_key_id": api_key_id, "user_id": user["user_id"]}
    )
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="API key not found")
    return {"ok": True}
