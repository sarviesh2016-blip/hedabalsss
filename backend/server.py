"""VideosToPrompt.com FastAPI backend."""
import os
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from storage_service import init_storage  # noqa: E402
from routers.auth import router as auth_router  # noqa: E402
from routers.google_auth import router as google_auth_router  # noqa: E402
from routers.videos import router as videos_router  # noqa: E402
from routers.generations import router as gen_router  # noqa: E402
from routers.prompts import router as prompts_router  # noqa: E402
from routers.payments import router as payments_router  # noqa: E402
from routers.admin import router as admin_router  # noqa: E402
from routers.api_keys import router as keys_router  # noqa: E402
from routers.public import router as public_router  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("videostoprompt")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed (will retry lazily): {e}")
    yield


app = FastAPI(title="VideosToPrompt API", lifespan=lifespan)

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"service": "videostoprompt", "ok": True}


@api_router.get("/health")
async def health():
    return {"ok": True}


# Mount feature routers under /api
api_router.include_router(auth_router)
api_router.include_router(google_auth_router)
api_router.include_router(videos_router)
api_router.include_router(gen_router)
api_router.include_router(prompts_router)
api_router.include_router(payments_router)
api_router.include_router(admin_router)
api_router.include_router(keys_router)
api_router.include_router(public_router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
