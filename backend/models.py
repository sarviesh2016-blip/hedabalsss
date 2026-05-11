"""Pydantic models for VideosToPrompt.com"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Literal, Dict, Any
from datetime import datetime, timezone
import uuid


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:16]}" if prefix else uuid.uuid4().hex


# --- User ---
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: Literal["user", "admin"] = "user"
    credits: int = 2  # Free tier starting credits
    plan: Literal["free", "starter", "pro", "studio"] = "free"
    created_at: str
    updated_at: str


class UserPublic(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str
    credits: int
    plan: str
    created_at: str


# --- Video ---
class Video(BaseModel):
    video_id: str
    user_id: str
    file_name: str
    storage_path: str
    file_url: str
    thumbnail_url: Optional[str] = None
    duration: Optional[float] = None
    file_size: int
    content_type: str
    status: Literal["uploaded", "queued", "processing", "completed", "failed"] = "uploaded"
    created_at: str


# --- Generation ---
class SceneBreakdownItem(BaseModel):
    timecode: str
    scene: str
    cameraMove: str
    lighting: str
    actions: str
    prompt: str


class ModelPrompts(BaseModel):
    veo: str = ""
    sora: str = ""
    kling: str = ""
    runway: str = ""
    midjourney: str = ""
    flux: str = ""


class PromptOutput(BaseModel):
    summary: str = ""
    shortPrompt: str = ""
    detailedPrompt: str = ""
    sceneBreakdown: List[SceneBreakdownItem] = Field(default_factory=list)
    modelPrompts: ModelPrompts = Field(default_factory=ModelPrompts)
    cameraDetails: str = ""
    lightingDetails: str = ""
    mood: str = ""
    characters: str = ""
    objects: str = ""
    transcription: str = ""


class Generation(BaseModel):
    generation_id: str
    user_id: str
    video_id: str
    selected_model: str = "veo"
    style_preset: str = "cinematic"
    output: PromptOutput = Field(default_factory=PromptOutput)
    status: Literal["queued", "processing", "completed", "failed"] = "queued"
    credits_used: int = 1
    error: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None


# --- Saved Prompt ---
class SavedPrompt(BaseModel):
    saved_id: str
    user_id: str
    generation_id: str
    title: str
    snippet: str
    output: PromptOutput
    created_at: str


# --- Payment ---
class Payment(BaseModel):
    payment_id: str
    user_id: str
    razorpay_order_id: str
    razorpay_payment_id: Optional[str] = None
    amount: int  # in paise
    currency: str = "INR"
    status: Literal["created", "paid", "failed"] = "created"
    type: Literal["subscription", "credits"] = "credits"
    plan_or_pack: str
    credits_granted: int = 0
    created_at: str
    updated_at: str


# --- API Key ---
class APIKey(BaseModel):
    api_key_id: str
    user_id: str
    name: str
    key_prefix: str
    key_hash: str
    last_used: Optional[str] = None
    is_active: bool = True
    created_at: str


class APIKeyCreated(BaseModel):
    api_key_id: str
    name: str
    key: str  # Full key shown once
    key_prefix: str
    created_at: str


# --- Admin Log ---
class AdminLog(BaseModel):
    log_id: str
    admin_id: str
    action: str
    target_user_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: str


# --- Request bodies ---
class GenerateRequest(BaseModel):
    video_id: str
    selected_model: Literal["veo", "sora", "kling", "runway", "midjourney", "flux"] = "veo"
    style_preset: Literal["cinematic", "anime", "hyperrealistic", "documentary", "luxury", "cyberpunk"] = "cinematic"


class SavePromptRequest(BaseModel):
    generation_id: str
    title: str


class CreateOrderRequest(BaseModel):
    plan_or_pack: str  # 'starter' | 'pro' | 'studio' | 'pack_50' | 'pack_150' | 'pack_500'


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class AdminCreditAdjustRequest(BaseModel):
    user_id: str
    delta: int
    reason: Optional[str] = ""


class IntegrationKeysUpdate(BaseModel):
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    gemini_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None


class SiteConfigUpdate(BaseModel):
    ga_measurement_id: Optional[str] = None
    gtm_id: Optional[str] = None
    fb_pixel_id: Optional[str] = None
    google_site_verification: Optional[str] = None
    bing_site_verification: Optional[str] = None
    seo_default_title: Optional[str] = None
    seo_default_description: Optional[str] = None
    og_image_url: Optional[str] = None


class CreateAPIKeyRequest(BaseModel):
    name: str


class ContactMessageRequest(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str


class TicketCreateRequest(BaseModel):
    subject: str
    message: str


class TicketReplyRequest(BaseModel):
    body: str


class TicketStatusUpdate(BaseModel):
    status: Literal["open", "answered", "closed"]
    priority: Optional[Literal["low", "normal", "high", "urgent"]] = None
