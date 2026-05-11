"""AI prompt generation service.

Two paths:
  • Real Gemini API key (`AIza…`) → call Google's `google-genai` SDK directly.
  • Anything else (Emergent universal key)    → route via emergentintegrations.
"""
import os
import json
import logging
import tempfile
import asyncio
from typing import Optional

from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType

logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

GEMINI_MODEL_DIRECT = "gemini-2.5-pro"  # current latest on the standard Gemini API
GEMINI_MODEL_EMERGENT = "gemini-3.1-pro-preview"


SYSTEM_PROMPT = """You are VideosToPrompt's elite cinematic AI prompt engineer.
Given a video, produce a single JSON object (no markdown, no prose outside JSON) with this exact schema:

{
  "summary": "1-3 sentence overall description of the video",
  "shortPrompt": "concise 1-2 sentence AI image/video prompt capturing the essence",
  "detailedPrompt": "long cinematic, richly detailed prompt with camera, lens, lighting, mood, color, composition, subject, atmosphere",
  "sceneBreakdown": [
    {
      "timecode": "00:00-00:03",
      "scene": "what is happening in this scene",
      "cameraMove": "e.g. slow dolly-in / handheld whip-pan / static / crane up",
      "lighting": "e.g. golden hour rim light, neon cyan key, soft overcast",
      "actions": "concise action verbs",
      "prompt": "a self-contained AI prompt for this scene"
    }
  ],
  "modelPrompts": {
    "veo": "prompt optimized for Google Veo (cinematic, camera moves, duration cues)",
    "sora": "prompt optimized for OpenAI Sora (descriptive, motion-rich, photo-real)",
    "kling": "prompt optimized for Kling (vivid action, motion physics)",
    "runway": "prompt optimized for Runway Gen-3 (cinematic shot description)",
    "midjourney": "prompt optimized for Midjourney (subject, style, --ar 16:9 --v 6)",
    "flux": "prompt optimized for Flux (photorealistic, lens & lighting)"
  },
  "cameraDetails": "summary of camera angles & movements used",
  "lightingDetails": "summary of dominant lighting style",
  "mood": "the overall emotional mood / tone",
  "characters": "characters / subjects present",
  "objects": "key objects / props in frame",
  "transcription": "any spoken dialogue or relevant text on screen (if detectable, else empty)"
}

Use the provided STYLE_PRESET to bias the cinematic feel (e.g. cinematic, anime, hyperrealistic, documentary, luxury, cyberpunk).
Make scene timecodes accurate to the video duration. Include 3-8 scenes depending on length.
Return ONLY valid JSON. No backticks, no commentary."""


def _empty_output() -> dict:
    return {
        "summary": "", "shortPrompt": "", "detailedPrompt": "",
        "sceneBreakdown": [],
        "modelPrompts": {"veo":"","sora":"","kling":"","runway":"","midjourney":"","flux":""},
        "cameraDetails": "", "lightingDetails": "", "mood": "",
        "characters": "", "objects": "", "transcription": "",
    }


def _coerce_json(text: str) -> dict:
    text = (text or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
        text = text.strip()
    start = text.find("{"); end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        text = text[start:end + 1]
    return json.loads(text)


def _normalise(data: dict) -> dict:
    out = _empty_output()
    out.update({k: v for k, v in data.items() if k in out})
    mp = out.get("modelPrompts") or {}
    defaults = {"veo":"","sora":"","kling":"","runway":"","midjourney":"","flux":""}
    defaults.update({k: v for k, v in mp.items() if k in defaults and isinstance(v, str)})
    out["modelPrompts"] = defaults
    cleaned = []
    for s in out.get("sceneBreakdown") or []:
        if not isinstance(s, dict): continue
        cleaned.append({
            "timecode": str(s.get("timecode","")),
            "scene": str(s.get("scene","")),
            "cameraMove": str(s.get("cameraMove","")),
            "lighting": str(s.get("lighting","")),
            "actions": str(s.get("actions","")),
            "prompt": str(s.get("prompt","")),
        })
    out["sceneBreakdown"] = cleaned
    return out


# ---------- Direct Google Gemini path (real AIza... key) ----------

def _run_direct_gemini(video_bytes: bytes, content_type: str, file_ext: str,
                       selected_model: str, style_preset: str, api_key: str) -> dict:
    """Use google-genai SDK directly with the user's real Gemini API key."""
    from google import genai
    from google.genai import types as gtypes

    client = genai.Client(api_key=api_key)

    suffix = f".{file_ext}" if file_ext else ".mp4"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    user_text = (
        f"Analyze this video and produce the JSON prompt object.\n"
        f"STYLE_PRESET: {style_preset}\n"
        f"PRIMARY_TARGET_MODEL: {selected_model}\n"
        f"Return ONLY the JSON object."
    )

    try:
        # 1) Upload video as a managed file
        uploaded = client.files.upload(file=tmp_path)
        # 2) Poll until ACTIVE (videos need a moment to be processed)
        import time
        deadline = time.time() + 45
        while getattr(uploaded.state, "name", str(uploaded.state)) in ("PROCESSING", "STATE_PROCESSING") and time.time() < deadline:
            time.sleep(2)
            uploaded = client.files.get(name=uploaded.name)
        # 3) Generate
        response = client.models.generate_content(
            model=GEMINI_MODEL_DIRECT,
            contents=[uploaded, user_text],
            config=gtypes.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                temperature=0.6,
            ),
        )
        raw = getattr(response, "text", None) or ""
        if not raw:
            # Sometimes text is on a candidate
            try:
                raw = response.candidates[0].content.parts[0].text or ""
            except Exception:
                raw = ""
        data = _coerce_json(raw)
        return _normalise(data)
    finally:
        try: os.unlink(tmp_path)
        except Exception: pass


# ---------- Emergent universal key path ----------

def _run_emergent(video_bytes: bytes, content_type: str, file_ext: str,
                  selected_model: str, style_preset: str, session_id: str, api_key: str) -> dict:
    suffix = f".{file_ext}" if file_ext else ".mp4"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=SYSTEM_PROMPT,
        ).with_model("gemini", GEMINI_MODEL_EMERGENT)

        video_file = FileContentWithMimeType(
            file_path=tmp_path,
            mime_type=content_type or "video/mp4",
        )
        user_text = (
            f"Analyze this video and produce the JSON prompt object.\n"
            f"STYLE_PRESET: {style_preset}\n"
            f"PRIMARY_TARGET_MODEL: {selected_model}\n"
            f"Return ONLY the JSON object."
        )
        msg = UserMessage(text=user_text, file_contents=[video_file])
        response = asyncio.new_event_loop().run_until_complete(chat.send_message(msg))
        raw = response.text if hasattr(response, "text") else str(response)
        data = _coerce_json(raw)
        return _normalise(data)
    finally:
        try: os.unlink(tmp_path)
        except Exception: pass


# ---------- Public coroutine ----------

async def generate_prompt_from_video(
    video_bytes: bytes,
    content_type: str,
    file_ext: str,
    selected_model: str,
    style_preset: str,
    session_id: str,
    api_key: Optional[str] = None,
) -> dict:
    """Run Gemini on the video and return structured prompt JSON.

    Routes to the official Google SDK if a real AIza... key is supplied,
    otherwise to emergentintegrations. Whole pipeline runs in a worker thread."""
    key = api_key or EMERGENT_LLM_KEY or ""
    use_direct = key.startswith("AIza")
    if use_direct:
        logger.info("AI: using DIRECT Gemini SDK (real key)")
        return await asyncio.to_thread(
            _run_direct_gemini,
            video_bytes, content_type, file_ext,
            selected_model, style_preset, key,
        )
    logger.info("AI: using Emergent universal-key path")
    return await asyncio.to_thread(
        _run_emergent,
        video_bytes, content_type, file_ext,
        selected_model, style_preset, session_id, key,
    )


def fallback_mock_output(file_name: str, style_preset: str, selected_model: str) -> dict:
    out = _empty_output()
    out["summary"] = (
        f"A {style_preset} short clip titled '{file_name}'. The footage features dynamic "
        "visuals with controlled camera movement and dramatic lighting."
    )
    out["shortPrompt"] = (
        f"{style_preset} cinematic shot, professional camera work, dramatic lighting, "
        "filmic color grade, 4k, ultra detailed"
    )
    out["detailedPrompt"] = (
        f"A {style_preset} cinematic sequence — slow dolly-in on the subject, anamorphic "
        "35mm lens, shallow depth of field, neon rim light and soft key, atmospheric haze, "
        "rich teal and orange grade, motion blur on background, hyper-detailed textures, "
        "cinematic composition, shot on ARRI Alexa, 24fps"
    )
    out["sceneBreakdown"] = [
        {"timecode":"00:00-00:03","scene":"Establishing wide shot",
         "cameraMove":"slow dolly-in","lighting":"soft rim light, cool ambient",
         "actions":"subject enters frame",
         "prompt": f"{style_preset} establishing shot, slow dolly-in"},
        {"timecode":"00:03-00:08","scene":"Mid close-up of subject",
         "cameraMove":"handheld follow","lighting":"warm key, cyan fill",
         "actions":"subject moves through environment",
         "prompt": f"{style_preset} mid close-up, handheld follow"},
        {"timecode":"00:08-00:12","scene":"Detail insert shot",
         "cameraMove":"macro static","lighting":"hard practical light",
         "actions":"focus pull on object",
         "prompt": f"{style_preset} macro insert with focus pull"},
    ]
    base = out["detailedPrompt"]
    out["modelPrompts"] = {
        "veo": f"{base} — Veo: 8 seconds, 24fps, cinematic motion",
        "sora": f"{base} — Sora: photoreal, smooth camera motion",
        "kling": f"{base} — Kling: vivid motion physics",
        "runway": f"{base} — Runway Gen-3: cinematic shot",
        "midjourney": f"{base} --ar 16:9 --v 6 --style raw",
        "flux": f"{base} — Flux: photoreal, 35mm, f/1.8",
    }
    out["cameraDetails"] = "Slow dolly-in, handheld follow, macro insert with focus pull"
    out["lightingDetails"] = "Mixed practical and cinematic key/rim, teal-orange grade"
    out["mood"] = "cinematic, atmospheric, premium"
    out["characters"] = "primary subject"
    out["objects"] = "ambient props, practical lights"
    out["transcription"] = ""
    return out
