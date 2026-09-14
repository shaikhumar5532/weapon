"""
WebSocket endpoint for real-time webcam detection.
Replaces run_webcam() / cv2.VideoCapture(0) from src/detection.py.

Browser captures frames via getUserMedia() and sends JPEG bytes.
Server runs YOLO inference and returns JSON with annotated frame.
"""

import asyncio
import time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from services.detector import detector

router = APIRouter(tags=["websocket"])

# Frame throttle: min ms between inferences (avoid overload)
FRAME_THROTTLE_MS = 100  # ~10 fps max inference


@router.websocket("/ws/detect/webcam")
async def webcam_detection(websocket: WebSocket):
    """
    WebSocket endpoint for live webcam detection.

    Protocol:
      Client → binary JPEG frame bytes
      Server → JSON { detections, count, threat_detected, annotated_frame, timestamp, fps }
    """
    await websocket.accept()

    # Log connection (mirrors "Webcam Online." in original app)
    await websocket.send_json({
        "type": "connected",
        "message": "MATRIX NODE CONNECTED. SCANNING...",
        "timestamp": time.strftime("%H:%M:%S"),
    })

    last_inference_time = 0.0
    frame_count = 0
    detection_count = 0
    start_time = time.time()

    try:
        loop = asyncio.get_event_loop()

        while True:
            # Receive frame bytes from browser
            try:
                data = await asyncio.wait_for(websocket.receive_bytes(), timeout=10.0)
            except asyncio.TimeoutError:
                # Send keepalive
                await websocket.send_json({"type": "keepalive"})
                continue

            frame_count += 1
            now = time.time()
            elapsed_ms = (now - last_inference_time) * 1000

            # Throttle: skip inference if called too fast
            if elapsed_ms < FRAME_THROTTLE_MS and last_inference_time > 0:
                # Still send a lightweight "skip" ack so client knows we're alive
                await websocket.send_json({
                    "type": "skip",
                    "frame": frame_count,
                })
                continue

            last_inference_time = now

            # Run YOLO inference in thread pool (non-blocking)
            result = await loop.run_in_executor(
                None, detector.detect_webcam_frame, data
            )

            if "error" in result and result["error"]:
                await websocket.send_json({
                    "type": "error",
                    "message": result["error"],
                    "timestamp": time.strftime("%H:%M:%S"),
                })
                continue

            if result.get("threat_detected"):
                detection_count += 1

            # Calculate live FPS
            elapsed_total = time.time() - start_time
            live_fps = round(frame_count / max(elapsed_total, 0.001), 1)

            payload = {
                "type": "detection",
                "detections": result["detections"],
                "count": result["count"],
                "threat_detected": result["threat_detected"],
                "annotated_frame": result["annotated_frame"],
                "timestamp": result["timestamp"],
                "frame_number": frame_count,
                "fps": live_fps,
                "total_detections": detection_count,
            }

            await websocket.send_json(payload)

    except WebSocketDisconnect:
        # Client disconnected — mirrors "Webcam stopped." log in original app
        print(f"[MATRIX] WebSocket disconnected after {frame_count} frames.")

    except Exception as e:
        print(f"[MATRIX] WebSocket error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e),
                "timestamp": time.strftime("%H:%M:%S"),
            })
        except Exception:
            pass

    finally:
        print(f"[MATRIX] Webcam session ended. Frames: {frame_count}, Detections: {detection_count}")
