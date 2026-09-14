# MATRIX WEAPON DETECTION SYSTEM v2.0
### AI-Powered Real-Time Weapon Detection — React + FastAPI + YOLOv8

A futuristic Matrix-themed full-stack web application for real-time weapon detection using a trained YOLOv8 model. Converted from a Tkinter desktop app to a modern React + FastAPI architecture.

---

## Detected Weapon Classes

| Class ID | Weapon  |
|----------|---------|
| 0        | Grenade |
| 1        | Knife   |
| 2        | Missile |
| 3        | Pistol  |
| 4        | Rifle   |

---

## Tech Stack

**Frontend:** React · Vite · Tailwind CSS · React Router · Lucide Icons  
**Backend:** FastAPI · Uvicorn · Ultralytics YOLOv8 · OpenCV · Pillow  
**Model:** `models/best.pt` — custom-trained YOLOv8n

---

## Project Structure

```
weapon_detection_ai/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── api/
│   │   ├── detect.py        # Image & Video endpoints
│   │   └── websocket.py     # WebSocket webcam endpoint
│   ├── services/
│   │   └── detector.py      # YOLOv8 inference service
│   ├── utils/
│   │   └── file_utils.py    # Validation & cleanup
│   ├── uploads/             # Temporary uploaded files
│   ├── outputs/             # Annotated result images
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route pages
│   │   ├── hooks/           # React hooks
│   │   ├── services/api.js  # Centralized API calls
│   │   ├── App.jsx
│   │   └── index.css        # Matrix theme
│   ├── .env.example
│   └── vite.config.js
│
├── models/
│   └── best.pt              # Trained YOLOv8 model
└── README.md
```

---

## Installation & Setup

### Prerequisites
- Python 3.9+
- Node.js 18+
- npm

### 1. Backend Setup

```bash
cd backend

# Copy and configure environment
# On macOS/Linux:
cp .env.example .env
# On Windows PowerShell/CMD:
# copy .env.example .env

# Install dependencies
pip install -r requirements.txt

# Start the server (use python -m to avoid PATH issues on Windows)
python -m uvicorn main:app --reload --port 8000
```

> If `uvicorn` is not recognized, use `python -m uvicorn ...` instead of `uvicorn ...`.

Backend will be available at: `http://localhost:8000`  
API docs: `http://localhost:8000/docs`

### 2. Frontend Setup

```bash
cd frontend

# Copy and configure environment
cp .env.example .env

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend will be available at: `http://localhost:5173`

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | System & model status |
| POST | `/api/detect/image` | Upload image → detections |
| POST | `/api/detect/video` | Upload video → background job |
| GET | `/api/detect/video/{id}/status` | Poll video job progress |
| GET | `/api/detect/video/{id}/result` | Get final video results |
| POST | `/api/detect/video/{id}/stop` | Stop video processing |
| WS | `/ws/detect/webcam` | Real-time webcam detection |

---

## Features

### Image Detection
- Drag & drop or browse to upload
- YOLOv8 inference with bounding boxes
- Annotated result image
- Confidence scores per detection
- Weapon-colored indicators

### Video Detection
- MP4, AVI, MKV, MOV support
- Background processing (non-blocking)
- Live progress bar
- Real-time detection log
- STOP FEED button

### Live Camera
- Browser webcam via `getUserMedia()`
- WebSocket frame streaming to FastAPI
- Real-time YOLO inference
- Bounding box overlay
- FPS counter & detection stats
- STOP FEED cleans up all resources

### System Log
- Matrix-themed terminal log
- Prefixes: [MATRIX], [CORE], [NODE-01], [SYS], [SCAN]
- Threat / info / error coloring
- Timestamps

### Detection History
- All detection events with thumbnails
- Weapon type, confidence, source, time
- Persistent per session

---

## Production Deployment

### Frontend → Netlify

```bash
cd frontend
npm run build
# Deploy dist/ to Netlify
# Set: VITE_API_URL=https://your-backend.onrender.com
```

### Backend → Render

1. Create a new Web Service on Render
2. Point to the `backend/` directory
3. Build command: `pip install -r requirements.txt`
4. Start command: `python -m uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables from `.env.example`
6. Upload `models/best.pt` or set `MODEL_PATH` to an accessible path

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `MODEL_PATH` | `../models/best.pt` | Path to trained YOLOv8 model |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed frontend origins (comma-separated) |
| `MAX_IMAGE_SIZE_MB` | `10` | Max image upload size |
| `MAX_VIDEO_SIZE_MB` | `500` | Max video upload size |
| `OUTPUT_DIR` | `outputs` | Annotated image output directory |
| `UPLOAD_DIR` | `uploads` | Temporary upload directory |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | Backend API base URL |

---

Made with ❤️ by Umar Team
