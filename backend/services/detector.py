"""
MATRIX WEAPON DETECTION SYSTEM — Detection Service
Ported from src/detection.py (original Tkinter app)

Handles all YOLOv8 inference:
  - Image detection
  - Video frame-by-frame detection
  - Single-frame detection (for WebSocket webcam)
"""

import io
import time
import base64
import torch
import functools
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from PIL import Image

# ──────────────────────────────────────────────────────────────────────────────
# PyTorch 2.6+ Compatibility Patch
# torch.load() changed its default from weights_only=False to weights_only=True
# in PyTorch 2.6, which breaks loading of Ultralytics .pt model checkpoints
# that contain DetectionModel and other custom classes.
#
# Fix strategy (belt + suspenders + duct tape):
#   1. Monkey-patch torch.load to force weights_only=False for trusted .pt files
#   2. Also call add_safe_globals() to whitelist Ultralytics classes (done in load())
# ──────────────────────────────────────────────────────────────────────────────
_original_torch_load = torch.load

@functools.wraps(_original_torch_load)
def _patched_torch_load(f, *args, **kwargs):
    """Force weights_only=False so Ultralytics .pt models always load."""
    kwargs["weights_only"] = False
    return _original_torch_load(f, *args, **kwargs)

torch.load = _patched_torch_load
print("[MATRIX] torch.load patched: weights_only=False enforced for model loading.")

from ultralytics import YOLO

# ──────────────────────────────────────────────
# CLASS NAMES (from original config.py)
# ──────────────────────────────────────────────
CLASS_NAMES = ["Grenade", "Knife", "Missile", "Pistol", "Rifle"]

# Threat colors per class (BGR for OpenCV, also exposed as hex for frontend)
CLASS_COLORS_BGR = {
    "Grenade": (0, 80, 255),
    "Knife":   (0, 255, 180),
    "Missile": (0, 0, 255),
    "Pistol":  (0, 255, 80),
    "Rifle":   (0, 200, 255),
}
CLASS_COLORS_HEX = {
    "Grenade": "#ff5000",
    "Knife":   "#00ffb4",
    "Missile": "#ff0000",
    "Pistol":  "#00ff50",
    "Rifle":   "#00c8ff",
}


class DetectorService:
    """Singleton YOLOv8 detection service."""

    _instance: Optional["DetectorService"] = None
    model: Optional[YOLO] = None
    model_path: Optional[Path] = None
    loaded: bool = False
    load_error: Optional[str] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    # ──────────────────────────────────────────
    # Model Loading
    # ──────────────────────────────────────────
    def load(self, model_path: Path) -> bool:
        """Load the YOLO model. Returns True on success."""
        self.model_path = model_path
        try:
            print(f"[MATRIX] Loading model from: {model_path}")

            # ── PyTorch 2.6+ Fix ──────────────────────────────────────────────
            # PyTorch 2.6 changed torch.load() default to weights_only=True,
            # which blocks Ultralytics' DetectionModel and related classes.
            # We explicitly add them to safe globals so security stays enabled
            # while our trusted model checkpoint can load correctly.
            try:
                import ultralytics.nn.tasks as _tasks
                import ultralytics.nn.modules as _modules

                _safe_classes = [
                    _tasks.DetectionModel,
                    _tasks.SegmentationModel,
                    _tasks.PoseModel,
                    _tasks.ClassificationModel,
                ]
                # Add any additional nn.Module subclasses Ultralytics uses
                for _attr in dir(_modules):
                    _obj = getattr(_modules, _attr, None)
                    if isinstance(_obj, type) and issubclass(_obj, torch.nn.Module):
                        _safe_classes.append(_obj)

                torch.serialization.add_safe_globals(_safe_classes)
                print("[MATRIX] Registered Ultralytics classes as torch safe globals.")
            except Exception as _safe_err:
                # If add_safe_globals is unavailable (PyTorch < 2.4), that's fine
                print(f"[MATRIX] safe_globals registration skipped: {_safe_err}")

            self.model = YOLO(str(model_path))
            self.loaded = True
            self.load_error = None
            print("[MATRIX] Model loaded successfully.")
            return True
        except Exception as e:
            self.loaded = False
            self.load_error = str(e)
            print(f"[MATRIX] ERROR loading model: {e}")
            return False

    # ──────────────────────────────────────────
    # Image Detection
    # ──────────────────────────────────────────
    def detect_image(self, image_path: Path, output_path: Path) -> dict:
        """
        Run YOLO on an image file.
        Returns detection results + saves annotated image to output_path.
        """
        if not self.loaded or self.model is None:
            raise RuntimeError("Model not loaded")

        results = self.model.predict(str(image_path), conf=0.25, save=False, verbose=False)
        r = results[0]

        # Draw bounding boxes manually for full control
        # Use PIL as fallback for cv2.imread (handles Windows path/encoding issues)
        img = cv2.imread(str(image_path))
        if img is None:
            try:
                pil_img = Image.open(str(image_path)).convert("RGB")
                img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            except Exception as e:
                raise RuntimeError(f"Cannot read image file: {e}")
        detections = []

        for box in r.boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            cls_name = CLASS_NAMES[cls_id] if cls_id < len(CLASS_NAMES) else "Unknown"
            x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]

            color = CLASS_COLORS_BGR.get(cls_name, (0, 255, 65))

            # Draw bounding box
            cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)

            # Draw label background
            label = f"{cls_name} {conf*100:.1f}%"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(img, (x1, y1 - th - 10), (x1 + tw + 8, y1), color, -1)
            cv2.putText(img, label, (x1 + 4, y1 - 5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)

            detections.append({
                "class_id": cls_id,
                "class_name": cls_name,
                "confidence": round(conf, 4),
                "confidence_pct": round(conf * 100, 2),
                "bbox": [x1, y1, x2, y2],
                "color_hex": CLASS_COLORS_HEX.get(cls_name, "#00ff41"),
            })

        # Add Matrix watermark
        cv2.putText(img, "MATRIX // WEAPON DETECTION", (10, 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 65), 1)

        cv2.imwrite(str(output_path), img)

        return {
            "success": True,
            "detections": detections,
            "count": len(detections),
            "threat_detected": len(detections) > 0,
            "image_url": f"/outputs/{output_path.name}",
        }

    # ──────────────────────────────────────────
    # Video Frame Detection
    # ──────────────────────────────────────────
    def detect_video_frame(self, frame: np.ndarray) -> tuple[np.ndarray, list]:
        """
        Run YOLO inference on a single video frame (numpy BGR array).
        Returns (annotated_frame_bgr, detections_list).
        Ported from process_video() in src/detection.py.
        """
        if not self.loaded or self.model is None:
            raise RuntimeError("Model not loaded")

        result = self.model(frame, conf=0.25, verbose=False)[0]
        detections = []

        annotated = frame.copy()
        for box in result.boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            cls_name = CLASS_NAMES[cls_id] if cls_id < len(CLASS_NAMES) else "Unknown"
            x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]

            color = CLASS_COLORS_BGR.get(cls_name, (0, 255, 65))
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)

            label = f"{cls_name} {conf*100:.1f}%"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
            cv2.rectangle(annotated, (x1, y1 - th - 8), (x1 + tw + 6, y1), color, -1)
            cv2.putText(annotated, label, (x1 + 3, y1 - 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 2)

            detections.append({
                "class_id": cls_id,
                "class_name": cls_name,
                "confidence": round(conf, 4),
                "confidence_pct": round(conf * 100, 2),
                "bbox": [x1, y1, x2, y2],
                "color_hex": CLASS_COLORS_HEX.get(cls_name, "#00ff41"),
            })

        return annotated, detections

    # ──────────────────────────────────────────
    # WebSocket Frame Detection
    # ──────────────────────────────────────────
    def detect_webcam_frame(self, frame_bytes: bytes) -> dict:
        """
        Decode JPEG bytes from browser, run YOLO, return JSON result.
        Used by the WebSocket endpoint.
        """
        if not self.loaded or self.model is None:
            return {"error": "Model not loaded", "detections": [], "annotated_frame": None}

        try:
            # Decode JPEG bytes → numpy BGR
            nparr = np.frombuffer(frame_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame is None:
                return {"error": "Could not decode frame", "detections": [], "annotated_frame": None}

            annotated, detections = self.detect_video_frame(frame)

            # Encode annotated frame back to JPEG → base64
            _, buffer = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 75])
            b64_frame = base64.b64encode(buffer).decode("utf-8")

            return {
                "detections": detections,
                "count": len(detections),
                "threat_detected": len(detections) > 0,
                "annotated_frame": b64_frame,
                "timestamp": time.strftime("%H:%M:%S"),
            }
        except Exception as e:
            return {"error": str(e), "detections": [], "annotated_frame": None}


# Global singleton instance
detector = DetectorService()
