"""Shared MongoDB client and helpers."""
import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Collections
users_col = db.users
sessions_col = db.user_sessions
videos_col = db.videos
generations_col = db.generations
saved_prompts_col = db.saved_prompts
payments_col = db.payments
api_keys_col = db.api_keys
admin_logs_col = db.admin_logs
settings_col = db.settings  # for integration keys overrides
contact_col = db.contact_messages
tickets_col = db.tickets
blogs_col = db.blogs


PROJ = {"_id": 0}


async def get_setting(key: str, default=None):
    doc = await settings_col.find_one({"key": key}, PROJ)
    return doc["value"] if doc else default


async def set_setting(key: str, value):
    await settings_col.update_one(
        {"key": key},
        {"$set": {"key": key, "value": value}},
        upsert=True,
    )
