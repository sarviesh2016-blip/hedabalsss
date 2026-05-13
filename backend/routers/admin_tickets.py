"""Admin ticket management — list, view, reply, update status."""
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from db import tickets_col, PROJ
from auth_utils import require_admin
from models import AdminTicketReplyRequest, TicketStatusUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/tickets", tags=["admin-tickets"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("")
async def list_tickets(admin=Depends(require_admin), status: str = "", limit: int = 200):
    q = {}
    if status:
        q["status"] = status
    return await tickets_col.find(q, PROJ).sort("updated_at", -1).to_list(limit)


@router.get("/{ticket_id}")
async def get_ticket(ticket_id: str, admin=Depends(require_admin)):
    t = await tickets_col.find_one({"ticket_id": ticket_id}, PROJ)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return t


@router.post("/{ticket_id}/reply")
async def admin_reply(ticket_id: str, req: AdminTicketReplyRequest, admin=Depends(require_admin)):
    t = await tickets_col.find_one({"ticket_id": ticket_id}, PROJ)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    body = (req.body or "").strip()
    if not body:
        raise HTTPException(status_code=400, detail="Empty reply")
    now = _now()
    reply = {
        "reply_id": f"r_{uuid.uuid4().hex[:10]}",
        "author_role": "admin",
        "author_id": admin["user_id"],
        "author_name": admin.get("name", "Support"),
        "body": body[:8000],
        "created_at": now,
    }
    new_status = req.set_status or "answered"
    await tickets_col.update_one(
        {"ticket_id": ticket_id},
        {"$push": {"replies": reply},
         "$set": {"updated_at": now, "status": new_status, "last_actor": "admin"}},
    )
    return await tickets_col.find_one({"ticket_id": ticket_id}, PROJ)


@router.put("/{ticket_id}/status")
async def update_status(ticket_id: str, req: TicketStatusUpdate, admin=Depends(require_admin)):
    update = {"status": req.status, "updated_at": _now()}
    if req.priority:
        update["priority"] = req.priority
    res = await tickets_col.update_one({"ticket_id": ticket_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return await tickets_col.find_one({"ticket_id": ticket_id}, PROJ)
