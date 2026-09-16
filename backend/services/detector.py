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
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from PIL import Image
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
