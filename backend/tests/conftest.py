"""Shared fixtures for VideosToPrompt backend tests."""
import os
import time
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load backend env so MONGO_URL/DB_NAME are available
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
if not BASE_URL:
    # fall back to frontend/.env
    fe = Path(__file__).resolve().parents[2] / "frontend" / ".env"
    for line in fe.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
            break

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]


@pytest.fixture(scope="session", autouse=True)
def _reset_settings_baseline():
    """Reset settings collection to a clean placeholder state at session start.
    Required because admin PUT /integration-keys treats empty strings as no-op,
    leaving any leaked test state in the DB across test runs."""
    from pymongo import MongoClient
    cli = MongoClient(MONGO_URL)
    db = cli[DB_NAME]
    db.settings.delete_many({"key": {"$in": ["integration_keys", "site_config"]}})
    cli.close()
    yield


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


def _seed_user_sync(role: str = "user", credits: int = 100, plan: str = "pro"):
    """Seed a user + session synchronously using pymongo for reliability."""
    from pymongo import MongoClient
    cli = MongoClient(MONGO_URL)
    db = cli[DB_NAME]
    ts = int(time.time() * 1000)
    user_id = f"user_test_{role}_{ts}_{uuid.uuid4().hex[:6]}"
    token = f"test_session_{role}_{ts}_{uuid.uuid4().hex[:8]}"
    email = f"test.{role}.{ts}@example.com"
    now = datetime.now(timezone.utc)
    db.users.insert_one({
        "user_id": user_id,
        "email": email,
        "name": f"Test {role.title()}",
        "picture": None,
        "role": role,
        "credits": credits,
        "plan": plan,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    })
    db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": token,
        "expires_at": now + timedelta(days=7),
        "created_at": now,
    })
    cli.close()
    return user_id, token, email


@pytest.fixture(scope="session")
def user_creds():
    user_id, token, email = _seed_user_sync(role="user", credits=100, plan="pro")
    return {"user_id": user_id, "token": token, "email": email}


@pytest.fixture(scope="session")
def admin_creds():
    user_id, token, email = _seed_user_sync(role="admin", credits=10, plan="studio")
    return {"user_id": user_id, "token": token, "email": email}


@pytest.fixture
def api():
    s = requests.Session()
    s.headers.update({"Accept": "application/json"})
    return s


@pytest.fixture
def user_client(api, user_creds):
    api.headers.update({"Authorization": f"Bearer {user_creds['token']}"})
    return api


@pytest.fixture
def admin_client(user_creds, admin_creds):
    s = requests.Session()
    s.headers.update({"Accept": "application/json", "Authorization": f"Bearer {admin_creds['token']}"})
    return s
