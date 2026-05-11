"""Admin CLI: add (or subtract) credits to a user by email.

Usage:
    python /app/backend/scripts/add_credits.py <email> <delta> [reason]

Examples:
    python /app/backend/scripts/add_credits.py user@example.com 500
    python /app/backend/scripts/add_credits.py user@example.com -10 "test refund"
"""
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).parent.parent / ".env")

if len(sys.argv) < 3:
    print(__doc__)
    sys.exit(2)

email = sys.argv[1].strip().lower()
try:
    delta = int(sys.argv[2])
except ValueError:
    print("ERROR: delta must be an integer", file=sys.stderr)
    sys.exit(2)
reason = sys.argv[3] if len(sys.argv) > 3 else "cli_add_credits"

client = MongoClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

user = db.users.find_one({"email": email}, {"_id": 0})
if not user:
    print(f"ERROR: no user with email {email}", file=sys.stderr)
    sys.exit(1)

before = int(user.get("credits", 0))
after = before + delta
now_iso = datetime.now(timezone.utc).isoformat()
db.users.update_one(
    {"user_id": user["user_id"]},
    {"$inc": {"credits": delta}, "$set": {"updated_at": now_iso}},
)
db.admin_logs.insert_one({
    "log_id": f"log_{uuid.uuid4().hex[:12]}",
    "admin_id": "cli",
    "action": "credit_adjust",
    "target_user_id": user["user_id"],
    "metadata": {"delta": delta, "reason": reason, "via": "cli"},
    "created_at": now_iso,
})
print(f"OK · {email} · credits {before} -> {after}")
