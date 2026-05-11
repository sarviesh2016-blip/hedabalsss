"""Razorpay payments endpoints."""
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

from db import payments_col, users_col, get_setting, PROJ
from auth_utils import get_current_user
from models import CreateOrderRequest, VerifyPaymentRequest
import razorpay_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payments", tags=["payments"])


async def _get_overrides():
    keys = await get_setting("integration_keys", {}) or {}
    return keys.get("razorpay_key_id"), keys.get("razorpay_key_secret")


@router.get("/plans")
async def list_plans():
    return {
        "plans": [
            {"id": k, **v} for k, v in razorpay_service.PLANS.items()
        ],
        "razorpay_key_id_public": (await _get_overrides())[0] or "",
        "configured": razorpay_service.is_configured(*(await _get_overrides())),
    }


@router.post("/create-order")
async def create_order(req: CreateOrderRequest, user=Depends(get_current_user)):
    if req.plan_or_pack not in razorpay_service.PLANS:
        raise HTTPException(status_code=400, detail="Unknown plan/pack")
    plan = razorpay_service.PLANS[req.plan_or_pack]
    kid, sec = await _get_overrides()
    order = razorpay_service.create_order(plan["amount"], override_key_id=kid, override_secret=sec)

    now = datetime.now(timezone.utc).isoformat()
    pay_doc = {
        "payment_id": f"pay_{uuid.uuid4().hex[:14]}",
        "user_id": user["user_id"],
        "razorpay_order_id": order["id"],
        "razorpay_payment_id": None,
        "amount": plan["amount"],
        "currency": "INR",
        "status": "created",
        "type": plan["type"],
        "plan_or_pack": req.plan_or_pack,
        "credits_granted": plan["credits"],
        "created_at": now,
        "updated_at": now,
    }
    await payments_col.insert_one(pay_doc.copy())
    pay_doc.pop("_id", None)
    return {
        "order": order,
        "payment": pay_doc,
        "razorpay_key_id": kid or "",
        "mock": order.get("mock", False),
    }


@router.post("/verify")
async def verify_payment(req: VerifyPaymentRequest, user=Depends(get_current_user)):
    pay = await payments_col.find_one(
        {"razorpay_order_id": req.razorpay_order_id, "user_id": user["user_id"]}, PROJ
    )
    if not pay:
        raise HTTPException(status_code=404, detail="Payment not found")

    _, sec = await _get_overrides()
    valid = razorpay_service.verify_signature(
        req.razorpay_order_id, req.razorpay_payment_id, req.razorpay_signature,
        override_secret=sec,
    )
    if not valid:
        await payments_col.update_one(
            {"razorpay_order_id": req.razorpay_order_id},
            {"$set": {"status": "failed", "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        raise HTTPException(status_code=400, detail="Invalid signature")

    now = datetime.now(timezone.utc).isoformat()
    await payments_col.update_one(
        {"razorpay_order_id": req.razorpay_order_id},
        {"$set": {
            "status": "paid",
            "razorpay_payment_id": req.razorpay_payment_id,
            "updated_at": now,
        }},
    )

    # Grant credits / set plan
    update = {"$inc": {"credits": pay["credits_granted"]}, "$set": {"updated_at": now}}
    if pay["type"] == "subscription":
        update["$set"]["plan"] = pay["plan_or_pack"]
    await users_col.update_one({"user_id": user["user_id"]}, update)

    user_doc = await users_col.find_one({"user_id": user["user_id"]}, PROJ)
    return {"ok": True, "credits": user_doc["credits"], "plan": user_doc["plan"]}


@router.post("/webhooks/razorpay")
async def razorpay_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("X-Razorpay-Signature", "")
    if not razorpay_service.verify_webhook(payload, sig):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")
    try:
        import json
        evt = json.loads(payload.decode())
    except Exception:
        return {"ok": True}
    # Best-effort: mark payment paid on payment.captured
    try:
        if evt.get("event") in ("payment.captured", "order.paid"):
            order_id = (evt.get("payload", {}).get("payment", {}).get("entity", {}) or {}).get("order_id")
            if order_id:
                await payments_col.update_one(
                    {"razorpay_order_id": order_id},
                    {"$set": {"status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}},
                )
    except Exception:
        logger.exception("Webhook handler error")
    return {"ok": True}


@router.get("/history")
async def my_payments(user=Depends(get_current_user)):
    items = await payments_col.find(
        {"user_id": user["user_id"]}, PROJ
    ).sort("created_at", -1).to_list(200)
    return items
