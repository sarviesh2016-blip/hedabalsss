"""Auth helpers: Emergent Google session_token validation + daily credit refresh + first-user-admin bootstrap."""
import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import Header, Cookie, HTTPException, Depends, Request
import requests

from db import users_col, sessions_col, PROJ

logger = logging.getLogger(__name__)

ADMIN_EMAILS = {
    e.strip().lower()
    for e in os.environ.get("ADMIN_EMAILS", "").split(",")
    if e.strip()
}

EMERGENT_SESSION_ENDPOINT = (
    "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
)

FREE_DAILY_CREDITS = 2          # Free-plan refill target
REFRESH_INTERVAL_SECONDS = 86400  # 24h


def emergent_get_session_data(session_id: str) -> dict:
    resp = requests.get(
        EMERGENT_SESSION_ENDPOINT,
        headers={"X-Session-ID": session_id},
        timeout=20,
    )
    resp.raise_for_status()
    return resp.json()


async def _resolve_session_token(request: Request,
                                  authorization: Optional[str],
                                  session_token_cookie: Optional[str]) -> Optional[str]:
    if session_token_cookie:
        return session_token_cookie
    if authorization and authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1].strip()
    return None


async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    token = await _resolve_session_token(request, authorization, session_token)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    sess = await sessions_col.find_one({"session_token": token}, PROJ)
    if not sess:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = sess.get("expires_at")
    if isinstance(expires_at, str):
        try:
            expires_at = datetime.fromisoformat(expires_at)
        except Exception:
            expires_at = None
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    user = await users_col.find_one({"user_id": sess["user_id"]}, PROJ)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Lazy daily-credit refresh for free-plan users
    user = await refresh_free_credits_if_due(user)
    return user


async def refresh_free_credits_if_due(user: dict) -> dict:
    """Top free-plan users back up to FREE_DAILY_CREDITS once every 24h."""
    try:
        if user.get("plan") != "free":
            return user
        now = datetime.now(timezone.utc)
        last_str = user.get("last_credit_refresh") or user.get("created_at")
        if not last_str:
            last = now - timedelta(days=2)
        else:
            try:
                last = datetime.fromisoformat(last_str)
            except Exception:
                last = now - timedelta(days=2)
            if last.tzinfo is None:
                last = last.replace(tzinfo=timezone.utc)
        if (now - last).total_seconds() < REFRESH_INTERVAL_SECONDS:
            return user
        # Refill only if below target
        current = int(user.get("credits", 0))
        new_credits = max(current, FREE_DAILY_CREDITS)
        await users_col.update_one(
            {"user_id": user["user_id"]},
            {"$set": {
                "credits": new_credits,
                "last_credit_refresh": now.isoformat(),
                "updated_at": now.isoformat(),
            }},
        )
        user["credits"] = new_credits
        user["last_credit_refresh"] = now.isoformat()
        return user
    except Exception as e:
        logger.warning(f"daily refresh skipped: {e}")
        return user


async def should_promote_to_admin(email: str) -> bool:
    """Email is in the ADMIN_EMAILS allow-list OR no admin exists yet (bootstrap)."""
    if email.lower() in ADMIN_EMAILS:
        return True
    has_admin = await users_col.find_one({"role": "admin"}, PROJ)
    return has_admin is None


async def get_optional_user(
    request: Request,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    try:
        return await get_current_user(request, authorization, session_token)
    except HTTPException:
        return None


async def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


def is_admin_email(email: str) -> bool:
    return email.lower() in ADMIN_EMAILS
