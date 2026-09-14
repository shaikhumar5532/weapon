/**
 * StatusBar — System status indicators panel.
 * Mirrors the STATUS/DETAIL labels from the original Tkinter app.
 */

import { useEffect, useState } from 'react';
import { checkHealth } from '../services/api';

const STATUS_COLORS = {
  online: '#00ff41',
  error: '#ff4444',
  checking: '#ffaa00',
  offline: '#666',
};

export default function StatusBar({ systemStatus = 'idle', detail = 'Waiting for command...' }) {
  const [health, setHealth] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let interval;
    async function poll() {
      try {
        const data = await checkHealth();
        setHealth(data);
      } catch {
        setHealth(null);
      } finally {
        setChecking(false);
      }
    }
    poll();
    interval = setInterval(poll, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, []);

  const apiStatus = checking ? 'checking' : health ? 'online' : 'offline';
  const modelStatus = health?.model === 'loaded' ? 'online' : health ? 'error' : 'offline';

  const indicators = [
    { label: 'SYSTEM', status: apiStatus === 'online' ? 'online' : apiStatus },
    { label: 'YOLO MODEL', status: modelStatus },
    { label: 'API', status: apiStatus },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-2 border border-matrix-border rounded bg-matrix-panel">
      {indicators.map(({ label, status }) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: STATUS_COLORS[status] || '#666',
              boxShadow: status === 'online' ? `0 0 6px ${STATUS_COLORS.online}` : 'none',
            }}
          />
          <span className="font-mono text-xs text-matrix-muted tracking-widest">{label}</span>
          <span
            className="font-mono text-xs font-bold tracking-widest"
            style={{ color: STATUS_COLORS[status] || '#666' }}
          >
            {status.toUpperCase()}
          </span>
        </div>
      ))}

      {/* Current operation status */}
      <div className="ml-auto font-mono text-xs">
        <span className="text-matrix-accent font-bold">STATUS: </span>
        <span className="text-matrix-muted">{systemStatus.toUpperCase()}</span>
      </div>
    </div>
  );
}
