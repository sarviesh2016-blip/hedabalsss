"""Helper for runtime configuration from the settings collection or env."""
import os
from db import get_setting

# Cache keys
_KEY_INT = "integration_keys"  # razorpay, google oauth, gemini override
_KEY_SITE = "site_config"      # analytics, seo, webmaster


async def get_integration_keys() -> dict:
    keys = await get_setting(_KEY_INT, {}) or {}
    return keys


async def get_site_config() -> dict:
    cfg = await get_setting(_KEY_SITE, {}) or {}
    return cfg


async def get_gemini_key() -> str:
    keys = await get_integration_keys()
    override = keys.get("gemini_api_key")
    if override:
        return override
    return os.environ.get("EMERGENT_LLM_KEY", "")


async def get_google_oauth() -> tuple[str, str]:
    keys = await get_integration_keys()
    return (
        keys.get("google_client_id") or os.environ.get("GOOGLE_CLIENT_ID", ""),
        keys.get("google_client_secret") or os.environ.get("GOOGLE_CLIENT_SECRET", ""),
    )


async def get_razorpay_keys() -> tuple[str, str]:
    keys = await get_integration_keys()
    return (
        keys.get("razorpay_key_id") or "",
        keys.get("razorpay_key_secret") or "",
    )
