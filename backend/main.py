"""
MATRIX WEAPON DETECTION SYSTEM — FastAPI Backend
Main application entry point.

Run with:  uvicorn main:app --reload --port 8000
"""

import os
import time
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

# ──────────────────────────────────────────────
# Environment Configuration
# ──────────────────────────────────────────────
load_dotenv()

# Model path — relative to this file (backend/) or absolute
MODEL_PATH = Path(os.getenv("MODEL_PATH", "../models/best.pt")).resolve()

# Directories
BASE_DIR = Path(__file__).parent
UPLOAD_DIR = BASE_DIR / os.getenv("UPLOAD_DIR", "uploads")
OUTPUT_DIR = BASE_DIR / os.getenv("OUTPUT_DIR", "outputs")

# CORS origins
_cors_env = os.getenv(
    "CORS_ORIGINS",
    # Default includes both local dev and the production Netlify frontend.
    # NOTE: backend/.env is gitignored so this default is what Render uses.
    "http://localhost:5173,http://localhost:3000,https://weapon-detection-ai.netlify.app"
)
CORS_ORIGINS = [o.strip() for o in _cors_env.split(",") if o.strip()]

# Ensure directories exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ──────────────────────────────────────────────
# Import services & routers AFTER env is loaded
# ──────────────────────────────────────────────
from services.detector import detector
from api.detect import router as detect_router
from api.websocket import router as ws_router

# ──────────────────────────────────────────────
# Application Lifespan
# ──────────────────────────────────────────────
_startup_time = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the YOLO model on startup (mirrors _load_model() in original app)."""
    print("[MATRIX] === MATRIX WEAPON DETECTION NODE STARTING ===")
    print(f"[MATRIX] Model path: {MODEL_PATH}")
    detector.load(MODEL_PATH)
    if detector.loaded:
        print("[MATRIX] YOLOv8 model loaded. System ONLINE.")
    else:
        print(f"[MATRIX] WARNING: Model failed to load: {detector.load_error}")
    yield
    print("[MATRIX] Shutting down.")


# ──────────────────────────────────────────────
# FastAPI Application
# ──────────────────────────────────────────────
app = FastAPI(
    title="MATRIX Weapon Detection API",
    description="YOLOv8-powered weapon detection backend.",
    version="2.0.0",
    lifespan=lifespan,
)

# ──────────────────────────────────────────────
# CORS Middleware
# ──────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.netlify\.app",  # allow all Netlify preview deploys
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# Static Files (annotated output images)
# ──────────────────────────────────────────────
app.mount("/outputs", StaticFiles(directory=str(OUTPUT_DIR)), name="outputs")

# ──────────────────────────────────────────────
# Routers
# ──────────────────────────────────────────────
app.include_router(detect_router)
app.include_router(ws_router)


# ──────────────────────────────────────────────
# Health Check
# ──────────────────────────────────────────────
@app.get("/api/health")
async def health():
    """System health check — mirrors STATUS: SYSTEM ONLINE in original UI."""
    uptime = round(time.time() - _startup_time, 1)
    return JSONResponse(content={
        "status": "online",
        "model": "loaded" if detector.loaded else "error",
        "model_path": str(detector.model_path) if detector.model_path else None,
        "model_error": detector.load_error,
        "uptime_seconds": uptime,
        "classes": ["Grenade", "Knife", "Missile", "Pistol", "Rifle"],
        "version": "2.0.0",
    })


@app.get("/")
async def root():
    return JSONResponse(content={
        "message": "MATRIX WEAPON DETECTION API — v2.0.0",
        "docs": "/docs",
        "health": "/api/health",
    })
