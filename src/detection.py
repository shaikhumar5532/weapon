import threading
import time
from pathlib import Path
from PIL import Image, ImageTk
import cv2

from ultralytics import YOLO

from . import context
from . import utils
from . import config


# Load model once
def _load_model():
    if context.model is None:
        try:
            context.model = YOLO(str(config.MODEL_PATH))
        except Exception as e:
            utils.log(f"ERROR loading model -> {e}")


def detect_image():
    _load_model()

    file_path = context.root.tk.call('tk_getOpenFile', '-title', 'Select Image', '-filetypes', '{{Images} {.jpg .jpeg .png}}')
    if not file_path:
        return

    utils.log(f"Image selected: {file_path}")

    context.status_label.config(text="STATUS: IMAGE SCAN ACTIVE")
    context.detail_label.config(text="DETAIL: Running model...")
    utils.start_loader()
    context.root.update_idletasks()

    try:
        results = context.model.predict(file_path, save=True)

        r = results[0]
        saved_dir = Path(r.save_dir)
        stem = Path(file_path).stem

        candidates = list(saved_dir.glob(f"{stem}.*"))
        output = candidates[0] if candidates else sorted(saved_dir.glob("*"))[-1]

        utils.show_image(output)

        detected_class = None
        conf_val = 0

        for box in r.boxes:
            cls = int(box.cls[0])
            conf_val = float(box.conf[0]) * 100
            detected_class = config.CLASS_NAMES[cls]

        if detected_class:
            context.status_label.config(text=f"STATUS: {detected_class} DETECTED")
            context.detail_label.config(text=f"CONFIDENCE: {conf_val:.2f}%")
            utils.log(f"Detected: {detected_class} ({conf_val:.2f}%)")

            pil_img = Image.open(output).convert("RGB")
            timestamp = time.strftime("%H:%M:%S")
            utils.add_thumbnail_to_log(pil_img, f"{timestamp} — {detected_class}")

            utils.play_beep()

        else:
            context.status_label.config(text="STATUS: NO DETECTION")
            context.detail_label.config(text="DETAIL: No weapon found.")
            utils.log("No weapon detected.")

    except Exception as e:
        utils.log(f"ERROR: {e}")

    finally:
        utils.stop_loader()


def detect_video():
    file_path = context.root.tk.call('tk_getOpenFile', '-title', 'Select Video', '-filetypes', '{{Videos} {.mp4 .avi .mkv .mov}}')
    if not file_path:
        return

    t = threading.Thread(target=process_video, args=(file_path,))
    t.daemon = True
    t.start()


def process_video(file_path: str):
    _load_model()
    context.stop_all = False

    utils.log(f"Video selected: {file_path}")
    context.status_label.config(text="STATUS: VIDEO SCAN ACTIVE")
    context.detail_label.config(text="DETAIL: Processing video frames...")

    utils.start_loader()
    context.root.update_idletasks()
    time.sleep(0.5)
    utils.stop_loader()

    cap = cv2.VideoCapture(file_path)
    if not cap.isOpened():
        context.status_label.config(text="STATUS: ERROR")
        context.detail_label.config(text="DETAIL: Cannot open video file.")
        utils.log("ERROR: Cannot open video file.")
        return

    utils.log("Video detection started.")

    try:
        while not context.stop_all:
            ret, frame = cap.read()
            if not ret:
                break

            try:
                result = context.model(frame)[0]
            except Exception as e:
                utils.log(f"Model inference error: {e}")
                break

            plotted = result.plot()
            rgb = cv2.cvtColor(plotted, cv2.COLOR_BGR2RGB)

            img = Image.fromarray(rgb).resize((800, 500))
            imgtk = ImageTk.PhotoImage(img)

            if context.panel:
                context.panel.config(image=imgtk)
                context.panel.image = imgtk

            if len(result.boxes) > 0:
                try:
                    cls = int(result.boxes[0].cls[0])
                    conf = float(result.boxes[0].conf[0]) * 100
                    det_name = config.CLASS_NAMES[cls]
                except Exception:
                    det_name = "Unknown"
                    conf = 0.0

                context.status_label.config(text=f"STATUS: {det_name} DETECTED")
                context.detail_label.config(text=f"CONFIDENCE: {conf:.2f}%")
                utils.log(f"Video detected: {det_name} ({conf:.2f}%)")

                pil_frame = Image.fromarray(rgb)
                timestamp = time.strftime("%H:%M:%S")
                utils.add_thumbnail_to_log(pil_frame, f"{timestamp} — {det_name}")

                utils.play_beep()
            else:
                context.status_label.config(text="STATUS: VIDEO SCAN ACTIVE")
                context.detail_label.config(text="DETAIL: Scanning frames...")

            context.root.update_idletasks()
            time.sleep(0.01)

        if context.stop_all:
            context.status_label.config(text="STATUS: VIDEO STOPPED")
            context.detail_label.config(text="DETAIL: Feed stopped by user.")
            utils.log("Video stopped by user.")
        else:
            context.status_label.config(text="STATUS: VIDEO COMPLETED")
            context.detail_label.config(text="DETAIL: All frames processed.")
            utils.log("Video processing finished.")

    except Exception as e:
        utils.log(f"ERROR video detection -> {e}")

    finally:
        cap.release()


def run_webcam():
    _load_model()
    context.stop_all = False

    utils.log("Starting webcam...")
    context.status_label.config(text="STATUS: LIVE MATRIX FEED")
    context.detail_label.config(text="DETAIL: Camera connected.")

    utils.start_loader()
    time.sleep(0.5)
    utils.stop_loader()

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        utils.log("ERROR: Webcam not found.")
        context.status_label.config(text="STATUS: ERROR")
        context.detail_label.config(text="DETAIL: Webcam not found.")
        return

    utils.log("Webcam Online.")

    try:
        while not context.stop_all:
            ret, frame = cap.read()
            if not ret:
                break

            try:
                result = context.model(frame)[0]
            except Exception as e:
                utils.log(f"Model inference error (webcam): {e}")
                break

            plotted = result.plot()
            rgb = cv2.cvtColor(plotted, cv2.COLOR_BGR2RGB)

            img = Image.fromarray(rgb).resize((800, 500))
            imgtk = ImageTk.PhotoImage(img)
            if context.panel:
                context.panel.config(image=imgtk)
                context.panel.image = imgtk

            if len(result.boxes) > 0:
                try:
                    cls = int(result.boxes[0].cls[0])
                    conf = float(result.boxes[0].conf[0]) * 100
                    current_class = config.CLASS_NAMES[cls]
                except Exception:
                    current_class = "Unknown"
                    conf = 0.0

                context.status_label.config(text=f"STATUS: {current_class} DETECTED")
                context.detail_label.config(text=f"CONFIDENCE: {conf:.2f}%")
                utils.log(f"Webcam detected: {current_class} ({conf:.2f}%)")

                pil_frame = Image.fromarray(rgb)
                timestamp = time.strftime("%H:%M:%S")
                utils.add_thumbnail_to_log(pil_frame, f"{timestamp} — {current_class}")

                utils.play_beep()
            else:
                context.status_label.config(text="STATUS: LIVE MATRIX FEED")
                context.detail_label.config(text="DETAIL: Scanning...")

            context.root.update_idletasks()
            time.sleep(0.01)

    finally:
        cap.release()
        context.status_label.config(text="STATUS: FEED TERMINATED")
        context.detail_label.config(text="DETAIL: Connection closed.")
        utils.log("Webcam stopped.")


def start_webcam():
    t = threading.Thread(target=run_webcam)
    t.daemon = True
    t.start()


def stop_all_func():
    context.stop_all = True
    utils.log("STOP command received: Stopping all feeds.")
