/**
 * ImageDetection — Upload image → run YOLO → show annotated result.
 * Mirrors detect_image() from src/detection.py.
 */

import { useState, useRef, useCallback } from 'react';
import { Upload, Image as ImageIcon, Crosshair, AlertTriangle } from 'lucide-react';
import { detectImage, resolveImageUrl } from '../services/api';
import AlertBanner from '../components/AlertBanner';

const WEAPON_COLORS = {
  Grenade: '#ff5000', Knife: '#00ffb4', Missile: '#ff0000', Pistol: '#00ff50', Rifle: '#00c8ff',
};

export default function ImageDetection({ log, addDetection }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFile = useCallback((f) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
    log?.(`Image selected: ${f.name}`);
  }, [log]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const runDetection = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    log?.('Running image detection...', 'info');

    try {
      const data = await detectImage(file);
      setResult(data);

      if (data.threat_detected) {
        data.detections.forEach(det => {
          log?.(`THREAT DETECTED: ${det.class_name} (${det.confidence_pct?.toFixed(1)}%)`, 'threat');
          addDetection?.({
            weapon: det.class_name,
            confidence: det.confidence,
            source: 'image',
            thumbnail: null,
            detections: [det],
          });
        });
      } else {
        log?.('No weapon detected in image.', 'info');
      }
    } catch (err) {
      setError(err.message);
      log?.(`ERROR: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div>
        <h1 className="font-mono text-lg font-bold text-matrix-accent tracking-widest">IMAGE SCAN</h1>
        <p className="font-mono text-xs text-matrix-muted mt-1">Upload an image to detect weapons using YOLOv8</p>
      </div>

      {/* Alert banner */}
      {result && (
        <AlertBanner detections={result.detections} show={result.threat_detected} />
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 border border-red-500 rounded bg-red-500/10 font-mono text-xs text-red-400">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 flex-1 min-h-0">
        {/* Upload panel */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="font-mono text-xs text-matrix-muted tracking-widest">&gt; INPUT</div>

          {!preview ? (
            /* Drop zone */
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => inputRef.current?.click()}
              className={`flex-1 min-h-[280px] border-2 border-dashed rounded cursor-pointer flex flex-col items-center justify-center gap-4 transition-all duration-200 ${
                dragOver
                  ? 'border-matrix-accent bg-matrix-accent/10'
                  : 'border-matrix-border hover:border-matrix-accent/60 hover:bg-matrix-btn'
              }`}
            >
              <div className="w-16 h-16 rounded-full border-2 border-matrix-border flex items-center justify-center">
                <Upload size={28} className="text-matrix-muted" />
              </div>
              <div className="text-center">
                <div className="font-mono text-sm text-matrix-accent tracking-widest">DROP IMAGE HERE</div>
                <div className="font-mono text-xs text-matrix-muted mt-1">or click to browse</div>
                <div className="font-mono text-xs text-matrix-muted opacity-50 mt-2">JPG · PNG · WEBP · BMP · max 10MB</div>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.bmp"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          ) : (
            /* Preview */
            <div className="flex-1 flex flex-col gap-3">
              <div className="relative rounded border border-matrix-border overflow-hidden bg-black">
                <img src={preview} alt="Upload preview" className="w-full object-contain max-h-72" />
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 border border-matrix-border rounded font-mono text-xs text-matrix-muted">
                  ORIGINAL
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={runDetection}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded border border-matrix-accent bg-matrix-btn hover:bg-matrix-btn-hover font-mono text-sm text-matrix-accent tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-matrix-accent border-t-transparent rounded-full animate-spin" />
                      SCANNING...
                    </>
                  ) : (
                    <>
                      <Crosshair size={15} />
                      RUN DETECTION
                    </>
                  )}
                </button>
                <button
                  onClick={reset}
                  className="px-4 py-3 rounded border border-matrix-border text-matrix-muted hover:text-matrix-accent hover:border-matrix-accent font-mono text-sm transition-all"
                >
                  RESET
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Result panel */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="font-mono text-xs text-matrix-muted tracking-widest">&gt; DETECTION RESULT</div>

          {result ? (
            <div className="flex flex-col gap-3">
              {/* Annotated image */}
              <div className="relative rounded border border-matrix-border overflow-hidden bg-black">
                <img
                  src={resolveImageUrl(result.image_url)}
                  alt="Detection result"
                  className="w-full object-contain max-h-72"
                />
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 border border-matrix-accent/50 rounded font-mono text-xs text-matrix-accent">
                  PROCESSED
                </div>
                {result.threat_detected && (
                  <div className="absolute top-2 right-2 px-2 py-1 bg-red-500/80 rounded font-mono text-xs text-white animate-pulse">
                    THREAT DETECTED
                  </div>
                )}
              </div>

              {/* Detection list */}
              {result.detections.length > 0 ? (
                <div className="space-y-2">
                  {result.detections.map((det, i) => {
                    const color = WEAPON_COLORS[det.class_name] || '#00ff41';
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 rounded border border-matrix-border bg-matrix-panel">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                        <div className="flex-1">
                          <div className="font-mono text-sm font-bold" style={{ color }}>
                            {det.class_name.toUpperCase()}
                          </div>
                          <div className="font-mono text-xs text-matrix-muted">
                            CONFIDENCE: {det.confidence_pct?.toFixed(2)}%
                          </div>
                        </div>
                        {/* Confidence bar */}
                        <div className="w-24 h-1.5 bg-matrix-border rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${det.confidence_pct}%`, background: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded border border-matrix-border bg-matrix-panel font-mono text-sm text-matrix-muted">
                  <ImageIcon size={16} />
                  NO WEAPON DETECTED
                </div>
              )}

              <div className="font-mono text-xs text-matrix-muted px-1">
                {result.count} detection(s) · {result.detections.map(d => d.class_name).join(', ') || 'clear'}
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-[280px] flex flex-col items-center justify-center gap-3 border border-dashed border-matrix-border rounded text-matrix-muted">
              <Crosshair size={32} className="opacity-30" />
              <span className="font-mono text-xs tracking-widest opacity-50">AWAITING SCAN</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
