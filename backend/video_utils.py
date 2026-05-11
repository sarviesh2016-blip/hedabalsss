"""Video helpers: ffprobe duration + ffmpeg thumbnail extraction."""
import os
import json
import logging
import subprocess
import tempfile
from typing import Optional

logger = logging.getLogger(__name__)


def probe_duration(video_path: str) -> Optional[float]:
    """Return video duration in seconds (None if unavailable)."""
    try:
        out = subprocess.check_output(
            [
                "ffprobe", "-v", "error", "-print_format", "json",
                "-show_format", video_path,
            ],
            stderr=subprocess.DEVNULL,
            timeout=15,
        )
        data = json.loads(out)
        dur = data.get("format", {}).get("duration")
        return float(dur) if dur else None
    except Exception as e:
        logger.warning(f"ffprobe failed: {e}")
        return None


def extract_thumbnail(video_path: str, at_seconds: float = 1.0) -> Optional[bytes]:
    """Return JPEG bytes for a single frame at ~at_seconds. None on failure."""
    fd, out_path = tempfile.mkstemp(suffix=".jpg")
    os.close(fd)
    try:
        subprocess.check_call(
            [
                "ffmpeg", "-y", "-ss", str(at_seconds), "-i", video_path,
                "-frames:v", "1", "-q:v", "5", "-vf", "scale=640:-2",
                out_path,
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=20,
        )
        with open(out_path, "rb") as f:
            return f.read()
    except Exception as e:
        logger.warning(f"thumbnail extraction failed: {e}")
        return None
    finally:
        try:
            os.unlink(out_path)
        except Exception:
            pass
