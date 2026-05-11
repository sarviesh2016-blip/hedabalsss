"""Public endpoints: contact form + site config (analytics/SEO)."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter

from db import contact_col, get_setting
from models import ContactMessageRequest
from runtime_config import get_integration_keys

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


@router.get("/site-config")
async def site_config():
    """Public site configuration: returns analytics/SEO/Webmaster IDs and the public Google Client ID.
    Secrets are NEVER returned here."""
    cfg = await get_setting("site_config", {}) or {}
    keys = await get_integration_keys()
    return {
        "google_client_id": keys.get("google_client_id", ""),  # public
        "ga_measurement_id": cfg.get("ga_measurement_id", ""),
        "gtm_id": cfg.get("gtm_id", ""),
        "fb_pixel_id": cfg.get("fb_pixel_id", ""),
        "google_site_verification": cfg.get("google_site_verification", ""),
        "bing_site_verification": cfg.get("bing_site_verification", ""),
        "seo_default_title": cfg.get("seo_default_title", ""),
        "seo_default_description": cfg.get("seo_default_description", ""),
        "og_image_url": cfg.get("og_image_url", ""),
    }
