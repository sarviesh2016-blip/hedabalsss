"""Public endpoints: contact form."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter

from db import contact_col
from models import ContactMessageRequest

router = APIRouter(tags=["public"])


@router.post("/contact")
async def submit_contact(req: ContactMessageRequest):
    doc = {
        "contact_id": f"ct_{uuid.uuid4().hex[:14]}",
        "name": req.name,
        "email": req.email,
        "subject": req.subject,
        "message": req.message,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await contact_col.insert_one(doc.copy())
    return {"ok": True}
