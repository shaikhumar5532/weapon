"""
Image and Video detection API endpoints.
Ported logic from src/detection.py (detect_image, process_video).
"""

import asyncio
import time
import uuid
from pathlib import Path
from typing import Dict

import aiofiles
import cv2
from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from services.detector import detector
from utils.file_utils import (
    generate_unique_name,
    validate_image,
    validate_video,
    cleanup_old_files,
)

router = APIRouter(prefix="/api/detect", tags=["detection"])

# In-memory job store for video processing
# { job_id: { status, progress, total_frames, detections, summary } }
video_jobs: Dict[str, dict] = {}


# ──────────────────────────────────────────────
# Image Detection
# ──────────────────────────────────────────────
@router.post("/image")
async def detect_image(file: UploadFile = File(...)):
    """
    Upload an image → run YOLOv8 → return annotated image URL + detections.
    """
    from main import UPLOAD_DIR, OUTPUT_DIR

    # Read file content
    content = await file.read()
    size = len(content)

    # Validate
    err = validate_image(file.filename or "upload.jpg", size)
    if err:
        raise HTTPException(status_code=400, detail=err)

    # Save upload
    safe_name = generate_unique_name(file.filename or "image.jpg", prefix="img_")
    upload_path = UPLOAD_DIR / safe_name
    async with aiofiles.open(upload_path, "wb") as f:
        await f.write(content)

    # Run detection
    out_name = f"result_{safe_name}"
    output_path = OUTPUT_DIR / out_name

    try:
        # Keep CPU-bound YOLO inference from blocking other API requests.
        result = await asyncio.to_thread(
            detector.detect_image, upload_path, output_path
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Detection error: {str(e)}")
    finally:
        # Clean up upload after processing
        try:
            upload_path.unlink(missing_ok=True)
        except Exception:
            pass

    # Cleanup old outputs (older than 1 hour)
    cleanup_old_files(OUTPUT_DIR, max_age_seconds=3600)

    return JSONResponse(content=result)


# ──────────────────────────────────────────────
# Video Detection — Upload + Background Task
# ──────────────────────────────────────────────
@router.post("/video")
async def detect_video(
    background_tasks: BackgroundTasks, file: UploadFile = File(...)
):
    """
    Upload a video → start background processing → return job_id to poll.
    """
    from main import UPLOAD_DIR

    content = await file.read()
    size = len(content)

    err = validate_video(file.filename or "video.mp4", size)
    if err:
        raise HTTPException(status_code=400, detail=err)

    safe_name = generate_unique_name(file.filename or "video.mp4", prefix="vid_")
    upload_path = UPLOAD_DIR / safe_name

    async with aiofiles.open(upload_path, "wb") as f:
        await f.write(content)

    job_id = uuid.uuid4().hex
    video_jobs[job_id] = {
        "status": "queued",
        "progress": 0,
        "total_frames": 0,
        "processed_frames": 0,
        "detections": [],
        "summary": {},
        "started_at": time.strftime("%H:%M:%S"),
        "filename": file.filename,
        "stop_requested": False,
    }

    background_tasks.add_task(_process_video_job, job_id, upload_path)

    return JSONResponse(content={"job_id": job_id, "status": "queued"})


@router.get("/video/{job_id}/status")
async def video_status(job_id: str):
    """Poll video processing job status."""
    job = video_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JSONResponse(content={
        "job_id": job_id,
        "status": job["status"],
        "progress": job["progress"],
        "total_frames": job["total_frames"],
        "processed_frames": job["processed_frames"],
        "detections": job["detections"][-20:],  # last 20 detections
        "detection_count": len(job["detections"]),
        "started_at": job["started_at"],
        "filename": job["filename"],
    })


@router.get("/video/{job_id}/result")
async def video_result(job_id: str):
    """Get final result for a completed video job."""
    job = video_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] not in ("completed", "stopped", "error"):
        raise HTTPException(status_code=202, detail="Still processing")
    return JSONResponse(content={
        "job_id": job_id,
        "status": job["status"],
        "summary": job["summary"],
        "detections": job["detections"],
        "total_frames": job["total_frames"],
        "processed_frames": job["processed_frames"],
    })


@router.post("/video/{job_id}/stop")
async def stop_video(job_id: str):
    """Request stopping a running video job (mirrors stop_all_func in original app)."""
    job = video_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job["stop_requested"] = True
    return JSONResponse(content={"message": "Stop requested"})


# ──────────────────────────────────────────────
# Background Video Processing Worker
# ──────────────────────────────────────────────
async def _process_video_job(job_id: str, video_path: Path):
    """
    Background task: process video frame by frame using YOLO.
    Mirrors process_video() from src/detection.py.
    """
    job = video_jobs[job_id]
    job["status"] = "processing"

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        job["status"] = "error"
        job["summary"] = {"error": "Cannot open video file"}
        video_path.unlink(missing_ok=True)
        return

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    job["total_frames"] = total_frames

    processed = 0
    all_detections = []
    # Process every Nth frame to speed up (match original ~10ms sleep = ~100fps cap)
    # We process every 3rd frame for performance, same practical effect
    FRAME_SKIP = 3

    try:
        loop = asyncio.get_event_loop()

        while True:
            if job["stop_requested"]:
                job["status"] = "stopped"
                break

            ret, frame = cap.read()
            if not ret:
                job["status"] = "completed"
                break

            processed += 1
            job["processed_frames"] = processed
            job["progress"] = int((processed / max(total_frames, 1)) * 100)

            # Skip frames for performance
            if processed % FRAME_SKIP != 0:
                continue

            try:
                _, frame_detections = await loop.run_in_executor(
                    None, detector.detect_video_frame, frame
                )
            except Exception as e:
                continue

            if frame_detections:
                timestamp = f"{int(processed / fps):.0f}s"
                for det in frame_detections:
                    det["frame"] = processed
                    det["timestamp"] = timestamp
                all_detections.extend(frame_detections)
                job["detections"] = all_detections

            # Yield control to event loop
            await asyncio.sleep(0)

    except Exception as e:
        job["status"] = "error"
        job["summary"] = {"error": str(e)}
    finally:
        cap.release()
        video_path.unlink(missing_ok=True)

    # Build summary
    class_counts: dict = {}
    for det in all_detections:
        name = det["class_name"]
        class_counts[name] = class_counts.get(name, 0) + 1

    job["summary"] = {
        "total_frames": total_frames,
        "processed_frames": processed,
        "total_detections": len(all_detections),
        "class_counts": class_counts,
        "fps": round(fps, 1),
    }
