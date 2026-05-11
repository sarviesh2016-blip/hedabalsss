"""Auth router: Emergent Google session-id exchange + /auth/me + /logout."""
from fastapi import APIRouter, Request, Response, HTTPException, Depends
from datetime import datetime, timedelta, timezone
import uuid

from db import users_col, sessions_col, PROJ
from auth_utils import emergent_get_session_data, get_current_user, is_admin_email
from models import UserPublic

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/session")
async def auth_session(request: Request, response: Response):
    """Exchange Emergent session_id (X-Session-ID header) -> create/find user, set cookie."""
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing X-Session-ID header")

    try:
        data = emergent_get_session_data(session_id)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid session_id: {e}")

    email = data.get("email")
    name = data.get("name") or (email.split("@")[0] if email else "User")
    picture = data.get("picture")
    session_token = data.get("session_token")
    if not email or not session_token:
        raise HTTPException(status_code=401, detail="Incomplete session data")

    now = datetime.now(timezone.utc)
    role = "admin" if is_admin_email(email) else "user"

    user = await users_col.find_one({"email": email}, PROJ)
    if user:
        # Update name/picture/role if needed
        await users_col.update_one(
            {"user_id": user["user_id"]},
            {"$set": {
                "name": name,
                "picture": picture,
                "role": role if role == "admin" else user.get("role", "user"),
                "updated_at": now.isoformat(),
            }},
        )
        user = await users_col.find_one({"user_id": user["user_id"]}, PROJ)
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": role,
            "credits": 2,
            "plan": "free",
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }
        await users_col.insert_one(user_doc)
        user = await users_col.find_one({"user_id": user_id}, PROJ)

    expires_at = now + timedelta(days=7)
    await sessions_col.insert_one({
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": now,
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 3600,
        path="/",
        httponly=True,
        secure=True,
        samesite="none",
    )

    return {"user": UserPublic(**user).model_dump(), "session_token": session_token}


@router.get("/me", response_model=UserPublic)
async def auth_me(user=Depends(get_current_user)):
    return UserPublic(**user)


@router.post("/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    auth_header = request.headers.get("authorization")
    if not token and auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
    if token:
        await sessions_col.delete_many({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}
