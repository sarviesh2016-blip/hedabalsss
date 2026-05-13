"""Admin endpoints."""
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from db import (
    users_col, payments_col, generations_col,
    admin_logs_col, contact_col,
    get_setting, set_setting, PROJ,
)
from auth_utils import require_admin
from models import AdminCreditAdjustRequest, IntegrationKeysUpdate, SiteConfigUpdate, LegalPageUpdate

router = APIRouter(prefix="/admin", tags=["admin"])
logger = logging.getLogger(__name__)


def _mask(v: str | None) -> str:
    if not v:
        return ""
    return v[:4] + "•••" + v[-4:] if len(v) > 10 else "•••"


@router.get("/stats")
async def stats(admin=Depends(require_admin)):
    total_users = await users_col.count_documents({})
    total_generations = await generations_col.count_documents({})
    failed_jobs = await generations_col.count_documents({"status": "failed"})
    paid = await payments_col.find({"status": "paid"}, PROJ).to_list(1000)
    total_revenue = sum(p.get("amount", 0) for p in paid) / 100
    return {
        "total_users": total_users,
        "total_generations": total_generations,
        "failed_jobs": failed_jobs,
        "total_revenue_inr": total_revenue,
        "paid_payments": len(paid),
    }


@router.get("/users")
async def list_users(admin=Depends(require_admin), limit: int = 200):
    return await users_col.find({}, PROJ).sort("created_at", -1).to_list(limit)


@router.get("/payments")
async def list_payments(admin=Depends(require_admin), limit: int = 200):
    return await payments_col.find({}, PROJ).sort("created_at", -1).to_list(limit)


@router.get("/generations")
async def list_generations(admin=Depends(require_admin), limit: int = 200):
    return await generations_col.find({}, PROJ).sort("created_at", -1).to_list(limit)


@router.get("/contact-messages")
async def list_contact(admin=Depends(require_admin), limit: int = 200):
    return await contact_col.find({}, PROJ).sort("created_at", -1).to_list(limit)


@router.post("/credits/adjust")
async def adjust_credits(req: AdminCreditAdjustRequest, admin=Depends(require_admin)):
    u = await users_col.find_one({"user_id": req.user_id}, PROJ)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    now = datetime.now(timezone.utc).isoformat()
    await users_col.update_one(
        {"user_id": req.user_id},
        {"$inc": {"credits": req.delta}, "$set": {"updated_at": now}},
    )
    await admin_logs_col.insert_one({
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "admin_id": admin["user_id"],
        "action": "credit_adjust",
        "target_user_id": req.user_id,
        "metadata": {"delta": req.delta, "reason": req.reason},
        "created_at": now,
    })
    return await users_col.find_one({"user_id": req.user_id}, PROJ)


@router.get("/integration-keys")
async def get_integration_keys_route(admin=Depends(require_admin)):
    keys = await get_setting("integration_keys", {}) or {}
    return {
        "razorpay_key_id": keys.get("razorpay_key_id", ""),
        "razorpay_key_secret_masked": _mask(keys.get("razorpay_key_secret")),
        "google_client_id": keys.get("google_client_id", ""),
        "google_client_secret_masked": _mask(keys.get("google_client_secret")),
        "gemini_api_key_masked": _mask(keys.get("gemini_api_key")),
        "groq_api_key_masked": _mask(keys.get("groq_api_key")),
    }


@router.put("/integration-keys")
async def update_integration_keys(req: IntegrationKeysUpdate, admin=Depends(require_admin)):
    current = await get_setting("integration_keys", {}) or {}
    payload = req.model_dump(exclude_none=True)
    # Treat empty strings as "do not change"
    payload = {k: v for k, v in payload.items() if v != ""}
    current.update(payload)
    await set_setting("integration_keys", current)
    await admin_logs_col.insert_one({
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "admin_id": admin["user_id"],
        "action": "update_integration_keys",
        "target_user_id": None,
        "metadata": {"keys_updated": list(payload.keys())},
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True, "updated": list(payload.keys())}


@router.get("/site-config")
async def get_site_config_route(admin=Depends(require_admin)):
    cfg = await get_setting("site_config", {}) or {}
    return cfg


@router.put("/site-config")
async def update_site_config(req: SiteConfigUpdate, admin=Depends(require_admin)):
    current = await get_setting("site_config", {}) or {}
    payload = req.model_dump(exclude_unset=True)
    # Empty string explicitly clears the value. Anything not in payload stays untouched.
    cleared = []
    for k, v in payload.items():
        if v == "":
            current.pop(k, None)
            cleared.append(k)
        else:
            current[k] = v
    await set_setting("site_config", current)
    await admin_logs_col.insert_one({
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "admin_id": admin["user_id"],
        "action": "update_site_config",
        "target_user_id": None,
        "metadata": {"keys_updated": list(payload.keys()), "keys_cleared": cleared},
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True, "updated": list(payload.keys()), "cleared": cleared}


@router.get("/logs")
async def list_logs(admin=Depends(require_admin), limit: int = 200):
    return await admin_logs_col.find({}, PROJ).sort("created_at", -1).to_list(limit)


# ---------- Legal pages (admin-editable) ----------

@router.get("/legal/{kind}")
async def admin_get_legal(kind: str, admin=Depends(require_admin)):
    from routers.public import LEGAL_KINDS, _LEGAL_DEFAULTS
    if kind not in LEGAL_KINDS:
        raise HTTPException(status_code=404, detail="Unknown legal page")
    doc = await get_setting(f"legal_{kind}", None)
    if not doc:
        return {**_LEGAL_DEFAULTS[kind], "kind": kind, "is_default": True}
    return {**_LEGAL_DEFAULTS[kind], **doc, "kind": kind, "is_default": False}


@router.put("/legal/{kind}")
async def admin_put_legal(kind: str, req: LegalPageUpdate, admin=Depends(require_admin)):
    from routers.public import LEGAL_KINDS
    if kind not in LEGAL_KINDS:
        raise HTTPException(status_code=404, detail="Unknown legal page")
    payload = req.model_dump(exclude_none=True)
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    payload["updated_by"] = admin["user_id"]
    current = await get_setting(f"legal_{kind}", {}) or {}
    current.update(payload)
    await set_setting(f"legal_{kind}", current)
    await admin_logs_col.insert_one({
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "admin_id": admin["user_id"],
        "action": f"update_legal_{kind}",
        "target_user_id": None,
        "metadata": {"fields": list(payload.keys())},
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True, "kind": kind, "updated": list(payload.keys())}
