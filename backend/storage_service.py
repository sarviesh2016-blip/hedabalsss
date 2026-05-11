"""Emergent object storage wrapper."""
import os
import logging
import requests

logger = logging.getLogger(__name__)

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = os.environ.get("APP_NAME", "videostoprompt")

_storage_key: str | None = None


def init_storage() -> str:
    """Call once at startup. Returns reusable session-scoped storage_key."""
    global _storage_key
    if _storage_key:
        return _storage_key
    resp = requests.post(
        f"{STORAGE_URL}/init",
        json={"emergent_key": EMERGENT_KEY},
        timeout=30,
    )
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def _key() -> str:
    if _storage_key is None:
        return init_storage()
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": _key(), "Content-Type": content_type},
        data=data,
        timeout=300,
    )
    if resp.status_code == 403:
        # refresh and retry once
        global _storage_key
        _storage_key = None
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": _key(), "Content-Type": content_type},
            data=data,
            timeout=300,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> tuple[bytes, str]:
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": _key()},
        timeout=120,
    )
    if resp.status_code == 403:
        global _storage_key
        _storage_key = None
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": _key()},
            timeout=120,
        )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")
