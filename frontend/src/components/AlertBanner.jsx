/**
 * AlertBanner — Flashing threat alert indicator.
 * Shown when a weapon is detected. Mirrors the beep + status update
 * from the original utils.play_beep() + status_label.config().
 */

import { useEffect } from 'react';

const WEAPON_COLORS = {
  Grenade: '#ff5000',
  Knife: '#00ffb4',
  Missile: '#ff0000',
  Pistol: '#00ff50',
  Rifle: '#00c8ff',
};

export default function AlertBanner({ detections = [], show = false }) {
  // Play a subtle audio beep on detection (mirrors winsound.Beep)
  useEffect(() => {
    if (!show || detections.length === 0) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1200;
      gain.gain.value = 0.08;
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, 120);
    } catch (_) {}
  }, [show, detections.length]);

  if (!show || detections.length === 0) return null;

  const top = detections[0];
  const color = WEAPON_COLORS[top.class_name] || '#00ff41';

  return (
    <div
      className="relative overflow-hidden rounded border-2 animate-pulse-fast"
      style={{ borderColor: color, background: `${color}11` }}
    >
      {/* Scan line */}
      <div
        className="absolute inset-x-0 h-0.5 opacity-60 animate-scan-line"
        style={{ background: color }}
      />

      <div className="flex items-center gap-4 px-4 py-3">
        {/* Threat icon */}
        <div
          className="w-3 h-3 rounded-full animate-ping-slow flex-shrink-0"
          style={{ background: color }}
        />

        <div className="flex-1">
          <div className="font-mono text-sm font-bold tracking-widest" style={{ color }}>
            ⚠ THREAT DETECTED
          </div>
          <div className="flex flex-wrap gap-3 mt-1">
            {detections.map((det, i) => (
              <span key={i} className="font-mono text-xs" style={{ color }}>
                {det.class_name.toUpperCase()} — {det.confidence_pct?.toFixed(1) ?? (det.confidence * 100).toFixed(1)}%
              </span>
            ))}
          </div>
        </div>

        <div className="text-right">
          <div className="font-mono text-xs text-matrix-muted">THREAT LEVEL</div>
          <div className="font-mono text-lg font-bold" style={{ color }}>
            {detections.length > 2 ? 'CRITICAL' : detections.length > 1 ? 'HIGH' : 'MEDIUM'}
          </div>
        </div>
      </div>
    </div>
  );
}
