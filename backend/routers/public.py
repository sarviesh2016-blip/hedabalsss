"""Support tickets — used by both logged-in users and the public contact form."""
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from db import tickets_col, contact_col, PROJ
from auth_utils import get_current_user
from models import TicketCreateRequest, TicketReplyRequest, ContactMessageRequest

logger = logging.getLogger(__name__)
router = APIRouter(tags=["tickets"])


def _new_id() -> str:
    return f"tkt_{uuid.uuid4().hex[:14]}"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_ticket_doc(*, user_id: str | None, name: str, email: str, subject: str, message: str) -> dict:
    now = _now()
    return {
        "ticket_id": _new_id(),
        "user_id": user_id,
        "name": name,
        "email": email,
        "subject": (subject or "Support request")[:200],
        "status": "open",
        "priority": "normal",
        "last_actor": "user",
        "replies": [{
            "reply_id": f"r_{uuid.uuid4().hex[:10]}",
            "author_role": "user",
            "author_id": user_id,
            "author_name": name,
            "body": message,
            "created_at": now,
        }],
        "created_at": now,
        "updated_at": now,
    }


# ---------- Public: contact form ----------

@router.post("/contact")
async def submit_contact(req: ContactMessageRequest):
    """Public contact form. Always creates a ticket. Also writes a legacy
    contact_messages doc so any old admin tooling still sees it."""
    doc = _new_ticket_doc(
        user_id=None,
        name=req.name,
        email=req.email,
        subject=req.subject,
        message=req.message,
    )
    await tickets_col.insert_one(doc.copy())
    # back-compat
    await contact_col.insert_one({
        "contact_id": f"ct_{uuid.uuid4().hex[:14]}",
        "ticket_id": doc["ticket_id"],
        "name": req.name, "email": req.email,
        "subject": req.subject, "message": req.message,
        "created_at": doc["created_at"],
    })
    return {"ok": True, "ticket_id": doc["ticket_id"]}


# ---------- Authenticated: user inbox ----------

@router.post("/tickets")
async def create_ticket(req: TicketCreateRequest, user=Depends(get_current_user)):
    doc = _new_ticket_doc(
        user_id=user["user_id"],
        name=user["name"],
        email=user["email"],
        subject=req.subject,
        message=req.message,
    )
    await tickets_col.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@router.get("/tickets")
async def list_my_tickets(user=Depends(get_current_user), limit: int = 100):
    return await tickets_col.find(
        {"user_id": user["user_id"]}, PROJ
    ).sort("updated_at", -1).to_list(limit)


@router.get("/tickets/{ticket_id}")
async def get_my_ticket(ticket_id: str, user=Depends(get_current_user)):
    t = await tickets_col.find_one({"ticket_id": ticket_id}, PROJ)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if t.get("user_id") and t["user_id"] != user["user_id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    return t


@router.post("/tickets/{ticket_id}/reply")
async def reply_to_my_ticket(ticket_id: str, req: TicketReplyRequest, user=Depends(get_current_user)):
    t = await tickets_col.find_one({"ticket_id": ticket_id}, PROJ)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if t.get("user_id") and t["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    body = (req.body or "").strip()
    if not body:
        raise HTTPException(status_code=400, detail="Empty reply")
    now = _now()
    reply = {
        "reply_id": f"r_{uuid.uuid4().hex[:10]}",
        "author_role": "user",
        "author_id": user["user_id"],
        "author_name": user["name"],
        "body": body[:8000],
        "created_at": now,
    }
    await tickets_col.update_one(
        {"ticket_id": ticket_id},
        {"$push": {"replies": reply},
         "$set": {"updated_at": now, "status": "open", "last_actor": "user"}},
    )
    return await tickets_col.find_one({"ticket_id": ticket_id}, PROJ)
