"""Auth helpers: Emergent Google session_token validation."""
import os
import logging
from datetime import datetime, timezone
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
    return user


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
