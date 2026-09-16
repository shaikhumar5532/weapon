/**
 * VideoDetection — Upload video → background processing → live progress.
 * Mirrors process_video() from src/detection.py.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Video as VideoIcon, Square, Play, AlertTriangle } from 'lucide-react';
import { uploadVideo, getVideoStatus, stopVideo } from '../services/api';

const WEAPON_COLORS = {
  Grenade: '#ff5000', Knife: '#00ffb4', Missile: '#ff0000', Pistol: '#00ff50', Rifle: '#00c8ff',
};

export default function VideoDetection({ log, addDetection }) {
  const [file, setFile] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  const pollRef = useRef(null);

  const handleFile = useCallback((f) => {
    if (!f) return;
    setFile(f);
    setJobId(null);
    setJobStatus(null);
    setError(null);
    log?.(`Video selected: ${f.name}`);
  }, [log]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const startProcessing = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    log?.('Uploading video for processing...', 'info');

    try {
      const { job_id } = await uploadVideo(file);
      setJobId(job_id);
      log?.(`Video job started. ID: ${job_id}`, 'info');
      setUploading(false);
      startPolling(job_id);
    } catch (err) {
      setError(err.message);
      log?.(`ERROR: ${err.message}`, 'error');
      setUploading(false);
    }
  };

  const startPolling = (id) => {
    pollRef.current = setInterval(async () => {
      try {
        const status = await getVideoStatus(id);
        setJobStatus(status);

        // Log new detections
        if (status.detections?.length) {
          const latest = status.detections[status.detections.length - 1];
          if (latest) {
            const color = WEAPON_COLORS[latest.class_name];
            log?.(`VIDEO: ${latest.class_name} @ ${latest.timestamp} (${(latest.confidence * 100).toFixed(1)}%)`, 'threat');
          }
        }

        if (['completed', 'stopped', 'error'].includes(status.status)) {
          clearInterval(pollRef.current);
          log?.(`Video processing ${status.status}.`, status.status === 'error' ? 'error' : 'success');

          // Add unique detections to history
          const seen = new Set();
          status.detections?.forEach(det => {
            const key = det.class_name;
            if (!seen.has(key)) {
              seen.add(key);
              addDetection?.({
                weapon: det.class_name,
                confidence: det.confidence,
                source: 'video',
                thumbnail: null,
                detections: [det],
              });
            }
          });
        }
      } catch (err) {
        clearInterval(pollRef.current);
      }
    }, 1000);
  };

  const handleStop = async () => {
    if (!jobId) return;
    clearInterval(pollRef.current);
    try {
      await stopVideo(jobId);
      log?.('STOP FEED: Video processing stopped.', 'info');
      setJobStatus(prev => prev ? { ...prev, status: 'stopped' } : null);
    } catch {}
  };

  useEffect(() => () => clearInterval(pollRef.current), []);

  const reset = () => {
    clearInterval(pollRef.current);
    setFile(null);
    setJobId(null);
    setJobStatus(null);
    setError(null);
  };

  const isRunning = jobStatus?.status === 'processing' || jobStatus?.status === 'queued';
  const progress = jobStatus?.progress ?? 0;
  const classCounts = {};
  jobStatus?.detections?.forEach(d => {
    classCounts[d.class_name] = (classCounts[d.class_name] || 0) + 1;
  });

  return (
    <div className="flex flex-col gap-4 h-full">
      <div>
        <h1 className="font-mono text-lg font-bold text-matrix-accent tracking-widest">VIDEO ANALYSIS</h1>
        <p className="font-mono text-xs text-matrix-muted mt-1">Upload a video file for frame-by-frame weapon scanning</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 border border-red-500 rounded bg-red-500/10 font-mono text-xs text-red-400">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 flex-1 min-h-0">
        {/* Left: upload + controls */}
        <div className="flex flex-col gap-3 lg:w-80">
          <div className="font-mono text-xs text-matrix-muted tracking-widest">&gt; VIDEO INPUT</div>

          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => inputRef.current?.click()}
              className={`h-48 border-2 border-dashed rounded cursor-pointer flex flex-col items-center justify-center gap-3 transition-all ${
                dragOver ? 'border-matrix-accent bg-matrix-accent/10' : 'border-matrix-border hover:border-matrix-accent/60 hover:bg-matrix-btn'
              }`}
            >
              <VideoIcon size={32} className="text-matrix-muted opacity-50" />
              <div className="text-center">
                <div className="font-mono text-sm text-matrix-accent tracking-widest">DROP VIDEO HERE</div>
                <div className="font-mono text-xs text-matrix-muted mt-1">MP4 · AVI · MKV · MOV · max 500MB</div>
              </div>
              <input ref={inputRef} type="file" accept=".mp4,.avi,.mkv,.mov" className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])} />
            </div>
          ) : (
            <div className="p-3 rounded border border-matrix-border bg-matrix-panel">
              <div className="flex items-center gap-2 mb-2">
                <VideoIcon size={14} className="text-matrix-accent flex-shrink-0" />
                <span className="font-mono text-xs text-matrix-accent truncate">{file.name}</span>
              </div>
              <div className="font-mono text-xs text-matrix-muted">
                {(file.size / (1024 * 1024)).toFixed(1)} MB
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            {!jobId ? (
              <>
                <button onClick={startProcessing} disabled={!file || uploading}
                  className="flex items-center justify-center gap-2 py-3 rounded border border-matrix-accent bg-matrix-btn hover:bg-matrix-btn-hover font-mono text-sm text-matrix-accent tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  {uploading ? (
                    <><div className="w-4 h-4 border-2 border-matrix-accent border-t-transparent rounded-full animate-spin" />UPLOADING...</>
                  ) : (
                    <><Play size={14} />START ANALYSIS</>
                  )}
                </button>
                {file && <button onClick={reset} className="py-2 rounded border border-matrix-border text-matrix-muted hover:text-matrix-accent font-mono text-xs transition-all">RESET</button>}
              </>
            ) : (
              <>
                {isRunning && (
                  <button onClick={handleStop}
                    className="flex items-center justify-center gap-2 py-3 rounded border border-red-500 bg-red-500/10 hover:bg-red-500/20 font-mono text-sm text-red-400 tracking-wider transition-all">
                    <Square size={14} />STOP FEED
                  </button>
                )}
                {!isRunning && (
                  <button onClick={reset} className="py-2 rounded border border-matrix-border text-matrix-muted hover:text-matrix-accent font-mono text-xs transition-all">
                    NEW ANALYSIS
                  </button>
                )}
              </>
            )}
          </div>

          {/* Stats */}
          {jobStatus && (
            <div className="space-y-2 mt-2">
              {[
                ['STATUS', jobStatus.status?.toUpperCase()],
                ['PROGRESS', `${progress}%`],
                ['FRAMES', `${jobStatus.processed_frames ?? 0} / ${jobStatus.total_frames ?? '?'}`],
                ['DETECTIONS', jobStatus.detection_count ?? 0],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between font-mono text-xs border-b border-matrix-border border-opacity-30 pb-1">
                  <span className="text-matrix-muted">{k}</span>
                  <span className="text-matrix-accent font-bold">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: progress + results */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="font-mono text-xs text-matrix-muted tracking-widest">&gt; ANALYSIS RESULTS</div>

          {/* Progress bar */}
          {jobStatus && (
            <div className="space-y-2">
              <div className="flex justify-between font-mono text-xs text-matrix-muted">
                <span>SCAN PROGRESS</span>
                <span className="text-matrix-accent">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-matrix-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-matrix-accent rounded-full transition-all duration-500"
                  style={{ width: `${progress}%`, boxShadow: '0 0 8px #00ff41' }}
                />
              </div>
              <div className="font-mono text-xs text-matrix-muted">
                {isRunning ? 'SCANNING FRAMES...' : jobStatus.status?.toUpperCase()}
              </div>
            </div>
          )}

          {/* Detected classes */}
          {Object.keys(classCounts).length > 0 && (
            <div className="p-3 rounded border border-matrix-border bg-matrix-panel">
              <div className="font-mono text-xs text-matrix-accent tracking-widest mb-3">DETECTED WEAPONS</div>
              <div className="space-y-2">
                {Object.entries(classCounts).map(([name, count]) => {
                  const color = WEAPON_COLORS[name] || '#00ff41';
                  return (
                    <div key={name} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="font-mono text-xs font-bold flex-1" style={{ color }}>{name.toUpperCase()}</span>
                      <span className="font-mono text-xs text-matrix-muted">{count} frame{count !== 1 ? 's' : ''}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent detections table */}
          {jobStatus?.detections?.length > 0 && (
            <div className="flex-1 overflow-y-auto">
              <div className="font-mono text-xs text-matrix-muted tracking-widest mb-2">RECENT DETECTIONS</div>
              <div className="space-y-1">
                {[...jobStatus.detections].reverse().slice(0, 30).map((det, i) => {
                  const color = WEAPON_COLORS[det.class_name] || '#00ff41';
                  return (
                    <div key={i} className="flex items-center gap-3 px-3 py-1.5 rounded border border-matrix-border border-opacity-40 bg-matrix-panel font-mono text-xs">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                      <span className="font-bold" style={{ color }}>{det.class_name}</span>
                      <span className="text-matrix-muted">{(det.confidence * 100).toFixed(1)}%</span>
                      <span className="text-matrix-muted ml-auto">frame {det.frame} · {det.timestamp}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!jobStatus && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 border border-dashed border-matrix-border rounded text-matrix-muted">
              <VideoIcon size={32} className="opacity-20" />
              <span className="font-mono text-xs opacity-40 tracking-widest">UPLOAD VIDEO TO BEGIN</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
