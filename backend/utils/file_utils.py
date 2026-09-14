"""
File utilities: validation, sanitization, and cleanup.
"""

import os
import uuid
import time
from pathlib import Path
from typing import Optional

# Allowed file types
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".avi", ".mkv", ".mov"}


def sanitize_filename(filename: str) -> str:
    """Strip directory traversal and keep only safe characters."""
    name = Path(filename).name
    safe = "".join(c for c in name if c.isalnum() or c in "._- ")
    return safe or "upload"


def validate_image(filename: str, size_bytes: int, max_mb: int = 10) -> Optional[str]:
    """Return error string if invalid, else None."""
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        return f"Invalid file type '{ext}'. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
    max_bytes = max_mb * 1024 * 1024
    if size_bytes > max_bytes:
        return f"File too large ({size_bytes // (1024*1024)}MB). Max: {max_mb}MB"
    return None


def validate_video(filename: str, size_bytes: int, max_mb: int = 500) -> Optional[str]:
    """Return error string if invalid, else None."""
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        return f"Invalid file type '{ext}'. Allowed: {', '.join(ALLOWED_VIDEO_EXTENSIONS)}"
    max_bytes = max_mb * 1024 * 1024
    if size_bytes > max_bytes:
        return f"File too large ({size_bytes // (1024*1024)}MB). Max: {max_mb}MB"
    return None


def generate_unique_name(original: str, prefix: str = "") -> str:
    """Generate a unique filename preserving extension."""
    ext = Path(original).suffix.lower()
    uid = uuid.uuid4().hex[:10]
    ts = str(int(time.time()))
    return f"{prefix}{ts}_{uid}{ext}"


def cleanup_old_files(directory: Path, max_age_seconds: int = 3600):
    """Delete files older than max_age_seconds from directory."""
    now = time.time()
    if not directory.exists():
        return
    for f in directory.iterdir():
        if f.is_file():
            try:
                age = now - f.stat().st_mtime
                if age > max_age_seconds:
                    f.unlink()
            except Exception:
                pass
