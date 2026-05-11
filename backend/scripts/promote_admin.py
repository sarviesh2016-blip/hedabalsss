"""Admin CLI: promote (or demote) a user by email.

Usage:
    python /app/backend/scripts/promote_admin.py <email> [admin|user]
"""
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).parent.parent / ".env")

if len(sys.argv) < 2:
    print(__doc__)
    sys.exit(2)

email = sys.argv[1].strip().lower()
role = sys.argv[2] if len(sys.argv) > 2 else "admin"
if role not in ("admin", "user"):
    print("ERROR: role must be 'admin' or 'user'", file=sys.stderr)
    sys.exit(2)

client = MongoClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

user = db.users.find_one({"email": email}, {"_id": 0})
if not user:
    print(f"ERROR: no user with email {email}", file=sys.stderr)
    sys.exit(1)

now_iso = datetime.now(timezone.utc).isoformat()
db.users.update_one(
    {"user_id": user["user_id"]},
    {"$set": {"role": role, "updated_at": now_iso}},
)
db.admin_logs.insert_one({
    "log_id": f"log_{uuid.uuid4().hex[:12]}",
    "admin_id": "cli",
    "action": "role_change",
    "target_user_id": user["user_id"],
    "metadata": {"role": role, "via": "cli"},
    "created_at": now_iso,
})
print(f"OK · {email} · role -> {role}")
