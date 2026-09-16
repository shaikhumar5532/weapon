/**
 * LiveCamera — Real-time webcam weapon detection.
 * Replaces run_webcam() / cv2.VideoCapture(0) from src/detection.py.
 * Uses getUserMedia() + WebSocket to stream frames to FastAPI backend.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, CameraOff, Square, Activity, AlertTriangle } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import BoundingBoxCanvas from '../components/BoundingBoxCanvas';
import AlertBanner from '../components/AlertBanner';

const FRAME_INTERVAL_MS = 150; // ~7fps to backend — balanced for performance

export default function LiveCamera({ log, addDetection }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);    // hidden capture canvas
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState(null);
  const [detections, setDetections] = useState([]);
  const [fps, setFps] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [totalDetections, setTotalDetections] = useState(0);
  const [annotatedSrc, setAnnotatedSrc] = useState(null);
  const [threatDetected, setThreatDetected] = useState(false);

  // Stable callback refs — prevents useWebSocket from re-initializing on every render
  const onDetectionRef = useRef(null);
  const onConnectedRef = useRef(null);
  const onErrorRef = useRef(null);
  const onDisconnectedRef = useRef(null);

  // Keep refs in sync with the latest closures (updated on every render — this is intentional)
  onDetectionRef.current = (data) => {
    setDetections(data.detections || []);
    setFps(data.fps || 0);
    setFrameCount(data.frame_number || 0);
    setTotalDetections(data.total_detections || 0);

    if (data.annotated_frame) {
      setAnnotatedSrc(`data:image/jpeg;base64,${data.annotated_frame}`);
    }

    if (data.threat_detected && data.detections?.length) {
      setThreatDetected(true);
      const det = data.detections[0];
      log?.(`WEBCAM: ${det.class_name} DETECTED — ${(det.confidence * 100).toFixed(1)}%`, 'threat');
      addDetection?.({
        weapon: det.class_name,
        confidence: det.confidence,
        source: 'webcam',
        thumbnail: data.annotated_frame,
        detections: data.detections,
      });
    } else {
      setThreatDetected(false);
    }
  };

  onConnectedRef.current = () => {
    log?.('MATRIX NODE CONNECTED. SCANNING...', 'info');
    // ✅ FIX Bug 1: Start frame capture ONLY after WebSocket is confirmed open
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        if (blob && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(blob);
        }
      }, 'image/jpeg', 0.7);
    }, FRAME_INTERVAL_MS);
  };

  onErrorRef.current = (msg) => log?.(`WebSocket error: ${msg}`, 'error');
  onDisconnectedRef.current = () => log?.('Webcam stopped.', 'info');

  // WebSocket hook — stable callbacks via refs
  const { connect, disconnect, wsRef, connected } = useWebSocket({
    onConnected: useCallback((...args) => onConnectedRef.current?.(...args), []),
    onDetection: useCallback((...args) => onDetectionRef.current?.(...args), []),
    onError: useCallback((...args) => onErrorRef.current?.(...args), []),
    onDisconnected: useCallback((...args) => onDisconnectedRef.current?.(...args), []),
  });

  // captureAndSend is now inlined inside onConnectedRef for correct timing
  // Kept as a no-op stub to avoid breaking other refs
  const captureAndSend = useCallback(() => {}, []);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setActive(true);
      log?.('Starting webcam...', 'info');
      // ✅ FIX Bug 1: connect() triggers onConnected, which starts the interval
      connect();
      log?.('Camera connected. Feed active.', 'info');
      // NOTE: DO NOT start setInterval here — it starts in onConnectedRef after WS opens
    } catch (err) {
      const msg = err.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera access.'
        : err.name === 'NotFoundError'
        ? 'No camera device found.'
        : `Camera error: ${err.message}`;
      setError(msg);
      log?.(`ERROR: ${msg}`, 'error');
    }
  };

  const stopFeed = useCallback(() => {
    // Stop frame interval
    clearInterval(intervalRef.current);
    intervalRef.current = null;

    // Stop WebSocket
    disconnect();

    // Stop camera tracks
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    if (videoRef.current) videoRef.current.srcObject = null;

    setActive(false);
    setDetections([]);
    setAnnotatedSrc(null);
    setThreatDetected(false);
    setFps(0);
    setFrameCount(0);
    log?.('STOP FEED: Camera disconnected.', 'info');
  }, [disconnect, log]);

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 h-full">
      <div>
        <h1 className="font-mono text-lg font-bold text-matrix-accent tracking-widest">LIVE CAMERA</h1>
        <p className="font-mono text-xs text-matrix-muted mt-1">Real-time weapon detection via browser webcam</p>
      </div>

      {/* Alert */}
      <AlertBanner detections={detections} show={threatDetected} />

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 border border-red-500 rounded bg-red-500/10 font-mono text-xs text-red-400">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 flex-1 min-h-0">
        {/* Camera feed */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Video container */}
          <div className="relative rounded border border-matrix-border overflow-hidden bg-black flex-1 min-h-[300px]">
            {/* ✅ FIX Bug 2: Show annotated frame (from backend) as primary display when available.
                 The raw video element is always rendered (hidden) for capture — never shown directly. */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ display: 'none' }}  // always hidden — used only for frame capture
            />

            {/* Annotated frame from backend (has bounding boxes drawn) */}
            {active && annotatedSrc ? (
              <img
                src={annotatedSrc}
                alt="Annotated webcam feed"
                className="w-full h-full object-cover"
              />
            ) : active ? (
              /* Fallback: raw mirrored video while waiting for first backend frame */
              <video
                autoPlay
                playsInline
                muted
                ref={(el) => { if (el && streamRef.current) el.srcObject = streamRef.current; }}
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
            ) : null}

            {/* Hidden capture canvas */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Idle state */}
            {!active && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-2 border-matrix-border flex items-center justify-center">
                    <CameraOff size={32} className="text-matrix-muted opacity-40" />
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-sm text-matrix-muted tracking-widest">CAMERA OFFLINE</div>
                  <div className="font-mono text-xs text-matrix-muted opacity-50 mt-1">Click START CAMERA to begin</div>
                </div>
              </div>
            )}

            {/* HUD overlays */}
            {active && (
              <>
                {/* Top-left status */}
                <div className="absolute top-3 left-3 flex items-center gap-2 px-2 py-1 bg-black/60 border border-matrix-border rounded">
                  <div className="w-2 h-2 rounded-full bg-matrix-accent animate-pulse" />
                  <span className="font-mono text-xs text-matrix-accent">LIVE</span>
                </div>
                {/* Top-right FPS */}
                <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 border border-matrix-border rounded font-mono text-xs text-matrix-muted">
                  {fps.toFixed(1)} FPS
                </div>
                {/* Bottom stats */}
                <div className="absolute bottom-3 left-3 right-3 flex justify-between">
                  <span className="px-2 py-1 bg-black/60 border border-matrix-border rounded font-mono text-xs text-matrix-muted">
                    FRAME {frameCount}
                  </span>
                  <span className="px-2 py-1 bg-black/60 border border-matrix-border rounded font-mono text-xs text-matrix-muted">
                    OBJECTS: {detections.length}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            {!active ? (
              <button
                onClick={startCamera}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded border border-matrix-accent bg-matrix-btn hover:bg-matrix-btn-hover font-mono text-sm text-matrix-accent tracking-wider transition-all"
              >
                <Camera size={15} />
                START CAMERA
              </button>
            ) : (
              <button
                onClick={stopFeed}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded border border-red-500 bg-red-500/10 hover:bg-red-500/20 font-mono text-sm text-red-400 tracking-wider transition-all"
              >
                <Square size={15} />
                STOP FEED
              </button>
            )}
          </div>
        </div>

        {/* Right panel: detections + stats */}
        <div className="sm:w-64 lg:w-72 flex flex-col gap-3">
          {/* Stats */}
          <div className="p-3 rounded border border-matrix-border bg-matrix-panel space-y-2">
            <div className="font-mono text-xs text-matrix-accent tracking-widest mb-2">&gt; LIVE STATS</div>
            {[
              ['STATUS', active ? 'SCANNING' : 'OFFLINE'],
              ['FPS', fps.toFixed(1)],
              ['FRAME', frameCount],
              ['TOTAL DETECTIONS', totalDetections],
              ['WS', connected ? 'CONNECTED' : 'DISCONNECTED'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between font-mono text-xs border-b border-matrix-border border-opacity-30 pb-1">
                <span className="text-matrix-muted">{k}</span>
                <span className={`font-bold ${
                  k === 'STATUS' && active ? 'text-matrix-accent' :
                  k === 'WS' && connected ? 'text-matrix-accent' :
                  'text-matrix-muted'
                }`}>{String(v)}</span>
              </div>
            ))}
          </div>

          {/* Current detections */}
          <div className="p-3 rounded border border-matrix-border bg-matrix-panel flex-1">
            <div className="font-mono text-xs text-matrix-accent tracking-widest mb-3">&gt; CURRENT DETECTIONS</div>
            {detections.length > 0 ? (
              <div className="space-y-2">
                {detections.map((det, i) => {
                  const color = det.color_hex || '#00ff41';
                  return (
                    <div key={i} className="p-2 rounded border border-matrix-border">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
                        <span className="font-mono text-xs font-bold" style={{ color }}>{det.class_name.toUpperCase()}</span>
                      </div>
                      <div className="w-full h-1 bg-matrix-border rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${det.confidence * 100}%`, background: color }} />
                      </div>
                      <div className="font-mono text-xs text-matrix-muted mt-1 text-right">{(det.confidence * 100).toFixed(1)}%</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-24 gap-2 text-matrix-muted opacity-40">
                <Activity size={20} />
                <span className="font-mono text-xs">
                  {active ? 'SCANNING...' : 'NO FEED'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
