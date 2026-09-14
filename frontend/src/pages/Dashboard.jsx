/**
 * Dashboard — Main landing view with system overview, stats, and Matrix rain.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Image, Video, Camera, Shield, Zap, Activity } from 'lucide-react';
import MatrixRain from '../components/MatrixRain';
import { checkHealth } from '../services/api';

const CLASS_NAMES = ['Grenade', 'Knife', 'Missile', 'Pistol', 'Rifle'];
const WEAPON_COLORS = {
  Grenade: '#ff5000', Knife: '#00ffb4', Missile: '#ff0000', Pistol: '#00ff50', Rifle: '#00c8ff',
};

const FEATURE_CARDS = [
  { path: '/image', icon: Image, label: 'IMAGE SCAN', desc: 'Upload and analyze images for weapon detection' },
  { path: '/video', icon: Video, label: 'VIDEO ANALYSIS', desc: 'Frame-by-frame video weapon scanning' },
  { path: '/live', icon: Camera, label: 'LIVE CAMERA', desc: 'Real-time webcam detection via WebSocket' },
];

export default function Dashboard({ history = [], logEntries = [] }) {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    checkHealth().then(setHealth).catch(() => setHealth(null));
  }, []);

  const threatCount = history.length;
  const classCounts = {};
  history.forEach(h => { classCounts[h.weapon] = (classCounts[h.weapon] || 0) + 1; });

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Hero banner with Matrix rain */}
      <div className="relative rounded border border-matrix-border overflow-hidden h-44 flex-shrink-0">
        <div className="absolute inset-0 opacity-20">
          <MatrixRain />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center h-full gap-2 text-center px-4">
          <div className="flex items-center gap-3 mb-1">
            <Shield size={24} className="text-matrix-accent" />
            <h1 className="font-mono text-2xl font-bold text-matrix-accent tracking-widest">
              MATRIX // WEAPON DETECTION SYSTEM
            </h1>
          </div>
          <p className="font-mono text-xs text-matrix-muted tracking-widest">
            AI-POWERED THREAT ANALYSIS · YOLOV8 ENGINE · REAL-TIME DETECTION
          </p>
          <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded border border-matrix-border bg-black/60">
            <div className={`w-2 h-2 rounded-full ${health ? 'bg-matrix-accent animate-pulse' : 'bg-red-500'}`} />
            <span className="font-mono text-xs text-matrix-muted">
              {health ? `SYSTEM ONLINE · MODEL ${health.model.toUpperCase()} · v${health.version}` : 'SYSTEM OFFLINE'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'TOTAL THREATS', value: threatCount, color: threatCount > 0 ? '#ff4444' : '#00ff41', icon: Zap },
          { label: 'LOG ENTRIES', value: logEntries.length, color: '#00ff41', icon: Activity },
          { label: 'YOLO CLASSES', value: 5, color: '#00c8ff', icon: Shield },
          { label: 'ENGINE', value: 'YOLOv8', color: '#00ff41', icon: Activity },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="p-4 rounded border border-matrix-border bg-matrix-panel flex items-center gap-3">
            <Icon size={18} style={{ color }} className="flex-shrink-0" />
            <div>
              <div className="font-mono text-xs text-matrix-muted tracking-widest">{label}</div>
              <div className="font-mono text-xl font-bold mt-0.5" style={{ color }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Feature nav cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {FEATURE_CARDS.map(({ path, icon: Icon, label, desc }) => (
          <Link
            key={path}
            to={path}
            className="group p-5 rounded border border-matrix-border bg-matrix-panel hover:border-matrix-accent hover:bg-matrix-btn-hover transition-all duration-200 flex flex-col gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded border border-matrix-border group-hover:border-matrix-accent flex items-center justify-center transition-colors">
                <Icon size={18} className="text-matrix-muted group-hover:text-matrix-accent transition-colors" />
              </div>
              <span className="font-mono text-sm font-bold text-matrix-accent tracking-widest">{label}</span>
            </div>
            <p className="font-mono text-xs text-matrix-muted leading-relaxed">{desc}</p>
            <div className="flex items-center gap-1 font-mono text-xs text-matrix-accent opacity-0 group-hover:opacity-100 transition-opacity">
              <span>▶ ACTIVATE</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Bottom row: weapon classes + recent history */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
        {/* Detected weapon classes */}
        <div className="p-4 rounded border border-matrix-border bg-matrix-panel">
          <div className="font-mono text-xs text-matrix-accent tracking-widest mb-3">&gt; DETECTABLE CLASSES</div>
          <div className="space-y-2">
            {CLASS_NAMES.map(name => {
              const color = WEAPON_COLORS[name];
              const count = classCounts[name] || 0;
              return (
                <div key={name} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="font-mono text-xs flex-1" style={{ color }}>{name.toUpperCase()}</span>
                  <span className="font-mono text-xs text-matrix-muted">{count > 0 ? `${count} detected` : '—'}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent detections */}
        <div className="p-4 rounded border border-matrix-border bg-matrix-panel overflow-y-auto">
          <div className="font-mono text-xs text-matrix-accent tracking-widest mb-3">&gt; RECENT ACTIVITY</div>
          {history.slice(0, 8).length > 0 ? (
            <div className="space-y-2">
              {history.slice(0, 8).map(entry => {
                const color = WEAPON_COLORS[entry.weapon] || '#00ff41';
                return (
                  <div key={entry.id} className="flex items-center gap-3 font-mono text-xs">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="font-bold" style={{ color }}>{entry.weapon?.toUpperCase()}</span>
                    <span className="text-matrix-muted">{(entry.confidence * 100).toFixed(1)}%</span>
                    <span className="text-matrix-muted uppercase text-xs">[{entry.source}]</span>
                    <span className="text-matrix-muted ml-auto">{entry.timestamp}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-20 font-mono text-xs text-matrix-muted opacity-40 tracking-widest">
              NO THREATS RECORDED
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
