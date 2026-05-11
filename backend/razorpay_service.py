"""Razorpay integration with safe placeholder handling."""
import os
import hmac
import hashlib
import logging
from typing import Optional

logger = logging.getLogger(__name__)


# Plan catalog (amounts in paise)
PLANS = {
    "starter": {"name": "Starter", "amount": 49900, "credits": 100, "type": "subscription"},
    "pro": {"name": "Pro", "amount": 149900, "credits": 500, "type": "subscription"},
    "studio": {"name": "Studio", "amount": 499900, "credits": 2500, "type": "subscription"},
    "pack_50": {"name": "50 Credits", "amount": 19900, "credits": 50, "type": "credits"},
    "pack_150": {"name": "150 Credits", "amount": 49900, "credits": 150, "type": "credits"},
    "pack_500": {"name": "500 Credits", "amount": 129900, "credits": 500, "type": "credits"},
}


def _get_credentials(override_key_id: Optional[str] = None, override_secret: Optional[str] = None):
    key_id = override_key_id or os.environ.get("RAZORPAY_KEY_ID", "")
    secret = override_secret or os.environ.get("RAZORPAY_KEY_SECRET", "")
    return key_id, secret


def is_configured(override_key_id: Optional[str] = None, override_secret: Optional[str] = None) -> bool:
    kid, sec = _get_credentials(override_key_id, override_secret)
    return bool(kid) and not kid.endswith("placeholder") and bool(sec) and "placeholder" not in sec


def create_order(amount_paise: int, currency: str = "INR",
                 override_key_id: Optional[str] = None,
                 override_secret: Optional[str] = None) -> dict:
    """Create Razorpay order. Falls back to mock order if not configured."""
    import uuid
    if not is_configured(override_key_id, override_secret):
        return {
            "id": f"order_mock_{uuid.uuid4().hex[:14]}",
            "amount": amount_paise,
            "currency": currency,
            "status": "created",
            "mock": True,
        }
    try:
        import razorpay
        kid, sec = _get_credentials(override_key_id, override_secret)
        client = razorpay.Client(auth=(kid, sec))
        order = client.order.create({
            "amount": amount_paise,
            "currency": currency,
            "payment_capture": 1,
        })
        order["mock"] = False
        return order
    except Exception as e:
        logger.error(f"Razorpay order error: {e}")
        return {
            "id": f"order_mock_{uuid.uuid4().hex[:14]}",
            "amount": amount_paise,
            "currency": currency,
            "status": "created",
            "mock": True,
            "error": str(e),
        }


def verify_signature(order_id: str, payment_id: str, signature: str,
                     override_secret: Optional[str] = None) -> bool:
    _, secret = _get_credentials(None, override_secret)
    if not secret or "placeholder" in secret:
        # In placeholder mode, treat any non-empty signature as test-valid
        return bool(order_id and payment_id and signature)
    body = f"{order_id}|{payment_id}".encode()
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def verify_webhook(payload_bytes: bytes, signature: str,
                   webhook_secret: Optional[str] = None) -> bool:
    secret = webhook_secret or os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")
    if not secret or "placeholder" in secret:
        return True  # placeholder mode allows simulation
    expected = hmac.new(secret.encode(), payload_bytes, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
