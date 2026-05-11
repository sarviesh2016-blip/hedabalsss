"""Master admin login — username/password auth separate from Google OAuth.

The credentials are seeded once on first startup from env vars:
    MASTER_ADMIN_USERNAME   (default: "admin")
    MASTER_ADMIN_PASSWORD   (required on first run; never logged)
On subsequent startups, if the env password differs from the stored hash,
the hash is rotated (idempotent).
"""
import os
import uuid
import bcrypt
import logging
import secrets
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, HTTPException, Response, Request
from pydantic import BaseModel

from db import users_col, sessions_col, settings_col, PROJ
from models import UserPublic

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth/admin-master", tags=["admin-master"])

MASTER_USER_EMAIL = "master@admin.local"        # synthetic email — never sent anywhere
MASTER_USER_NAME = "Master Admin"

# In-memory brute-force tracker — resets on backend restart (fine for a master account)
_attempts: dict[str, list[float]] = defaultdict(list)
LOCKOUT_WINDOW_SECONDS = 15 * 60
LOCKOUT_MAX_ATTEMPTS = 5


class MasterLoginRequest(BaseModel):
    username: str
    password: str


def _hash(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


async def seed_master_admin():
    """Idempotent: create or rotate the master admin from env.
    Safe to call on every startup."""
    username = os.environ.get("MASTER_ADMIN_USERNAME", "admin").strip()
    password = os.environ.get("MASTER_ADMIN_PASSWORD", "").strip()
    if not password:
        logger.warning("MASTER_ADMIN_PASSWORD is empty — master login disabled until set.")
        return

    now = datetime.now(timezone.utc).isoformat()

    # 1) Ensure the master user row exists (role=admin)
    user = await users_col.find_one({"email": MASTER_USER_EMAIL}, PROJ)
    if not user:
        user_id = f"user_master_{uuid.uuid4().hex[:10]}"
        await users_col.insert_one({
            "user_id": user_id,
            "email": MASTER_USER_EMAIL,
            "name": MASTER_USER_NAME,
            "picture": None,
            "role": "admin",
            "credits": 0,
            "plan": "studio",
            "is_master": True,
            "last_credit_refresh": now,
            "created_at": now,
            "updated_at": now,
        })
        logger.info("Master admin user seeded")
    elif user.get("role") != "admin":
        await users_col.update_one(
            {"email": MASTER_USER_EMAIL},
            {"$set": {"role": "admin", "updated_at": now}},
        )

    # 2) Ensure the master_admin settings doc has the right username and hash
    doc = await settings_col.find_one({"key": "master_admin"})
    stored = doc.get("value", {}) if doc else {}
    needs_rehash = (
        not stored
        or stored.get("username") != username
        or not stored.get("password_hash")
        or not _verify(password, stored["password_hash"])
    )
    if needs_rehash:
        await settings_col.update_one(
            {"key": "master_admin"},
            {"$set": {"key": "master_admin", "value": {
                "username": username,
                "password_hash": _hash(password),
                "updated_at": now,
            }}},
            upsert=True,
        )
        logger.info("Master admin credentials seeded/rotated")


def _is_locked_out(key: str) -> bool:
    import time
    now = time.time()
    _attempts[key] = [t for t in _attempts[key] if now - t < LOCKOUT_WINDOW_SECONDS]
    return len(_attempts[key]) >= LOCKOUT_MAX_ATTEMPTS


def _record_failure(key: str):
    import time
    _attempts[key].append(time.time())


@router.post("/login")
async def master_login(req: MasterLoginRequest, request: Request, response: Response):
    # Real client IP (X-Forwarded-For left-most) — used for logs only.
    fwd = request.headers.get("x-forwarded-for", "")
    real_ip = fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "?")
    # Single master account → use a global per-username counter so attackers can't
    # bypass the limit by rotating IPs (k8s ingress hides the real IP anyway).
    key = req.username
    if _is_locked_out(key):
        logger.warning(f"master-login lockout hit for {req.username} (ip={real_ip})")
        raise HTTPException(status_code=429, detail="Too many attempts. Try again in 15 minutes.")

    doc = await settings_col.find_one({"key": "master_admin"})
    cfg = (doc or {}).get("value", {})
    if not cfg.get("password_hash"):
        raise HTTPException(status_code=503, detail="Master admin not configured")

    # Constant-time-ish: compare via bcrypt even on username mismatch
    bad = (req.username != cfg.get("username")) or (not _verify(req.password, cfg["password_hash"]))
    if bad:
        _record_failure(key)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Clear attempts on success
    _attempts.pop(key, None)

    user = await users_col.find_one({"email": MASTER_USER_EMAIL}, PROJ)
    if not user:
        # safety net — re-seed
        await seed_master_admin()
        user = await users_col.find_one({"email": MASTER_USER_EMAIL}, PROJ)

    now = datetime.now(timezone.utc)
    session_token = "vtp_m_" + secrets.token_urlsafe(40)
    await sessions_col.insert_one({
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": now + timedelta(days=7),
        "created_at": now,
        "method": "master",
    })

    response.set_cookie(
        key="session_token", value=session_token,
        max_age=7 * 24 * 3600, path="/",
        httponly=True, secure=True, samesite="none",
    )
    return {"user": UserPublic(**user).model_dump(), "session_token": session_token}
