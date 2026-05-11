"""Own-managed Google OAuth (separate from Emergent Auth).

Frontend gets an ID token from Google Identity Services and POSTs it here.
We verify the JWT against Google's certs using the admin-configured Client ID.
"""
import secrets
import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Response, Body
from pydantic import BaseModel

from db import users_col, sessions_col, PROJ
from runtime_config import get_google_oauth
from auth_utils import should_promote_to_admin
from models import UserPublic

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth/google-own", tags=["google-auth"])


class GoogleIdTokenIn(BaseModel):
    credential: str  # The id_token JWT


@router.post("/verify")
async def verify_google_id_token(payload: GoogleIdTokenIn, response: Response):
    client_id, _ = await get_google_oauth()
    if not client_id:
        raise HTTPException(status_code=503, detail="Google OAuth not configured. Ask admin to set Google Client ID.")

    try:
        # Lazy import so the import error surfaces clearly if package is missing
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests

        idinfo = google_id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            client_id,
        )
    except Exception as e:
        logger.warning(f"Google id_token verify failed: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {e}")

    email = idinfo.get("email")
    if not email or not idinfo.get("email_verified", True):
        raise HTTPException(status_code=401, detail="Email not verified by Google")
    name = idinfo.get("name") or email.split("@")[0]
    picture = idinfo.get("picture")

    now = datetime.now(timezone.utc)
    role = "admin" if await should_promote_to_admin(email) else "user"

    user = await users_col.find_one({"email": email}, PROJ)
    if user:
        await users_col.update_one(
            {"user_id": user["user_id"]},
            {"$set": {
                "name": name, "picture": picture,
                "role": role if role == "admin" else user.get("role", "user"),
                "updated_at": now.isoformat(),
            }},
        )
        user = await users_col.find_one({"user_id": user["user_id"]}, PROJ)
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await users_col.insert_one({
            "user_id": user_id,
            "email": email, "name": name, "picture": picture,
            "role": role,
            "credits": 2, "plan": "free",
            "last_credit_refresh": now.isoformat(),
            "created_at": now.isoformat(), "updated_at": now.isoformat(),
        })
        user = await users_col.find_one({"user_id": user_id}, PROJ)

    session_token = "vtp_" + secrets.token_urlsafe(40)
    expires_at = now + timedelta(days=7)
    await sessions_col.insert_one({
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": now,
    })

    response.set_cookie(
        key="session_token", value=session_token,
        max_age=7 * 24 * 3600, path="/",
        httponly=True, secure=True, samesite="none",
    )
    return {"user": UserPublic(**user).model_dump(), "session_token": session_token}
