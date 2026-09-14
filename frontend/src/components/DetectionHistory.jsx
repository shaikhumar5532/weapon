/**
 * DetectionHistory — Table of all weapon detection events.
 * Mirrors the thumbnail log from the original Tkinter app.
 */

import { Trash2 } from 'lucide-react';

const SOURCE_LABELS = {
  image: 'IMG',
  video: 'VID',
  webcam: 'CAM',
};

const WEAPON_COLORS = {
  Grenade: '#ff5000',
  Knife: '#00ffb4',
  Missile: '#ff0000',
  Pistol: '#00ff50',
  Rifle: '#00c8ff',
};

export default function DetectionHistory({ history = [], onClear }) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-3 text-matrix-muted font-mono text-xs">
        <div className="w-8 h-8 border border-matrix-border rounded flex items-center justify-center opacity-40">
          —
        </div>
        <span>NO DETECTIONS RECORDED</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="font-mono text-xs text-matrix-accent tracking-widest">
          DETECTION HISTORY ({history.length})
        </span>
        <button
          onClick={onClear}
          className="text-matrix-muted hover:text-red-400 transition-colors"
          title="Clear history"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="border-b border-matrix-border text-matrix-muted tracking-widest">
              <th className="py-2 px-2 w-14">SRC</th>
              <th className="py-2 px-2 w-16">THUMB</th>
              <th className="py-2 px-2">WEAPON</th>
              <th className="py-2 px-2">CONF</th>
              <th className="py-2 px-2">TIME</th>
              <th className="py-2 px-2">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {history.map((entry) => {
              const color = WEAPON_COLORS[entry.weapon] || '#00ff41';
              return (
                <tr
                  key={entry.id}
                  className="border-b border-matrix-border border-opacity-30 hover:bg-matrix-btn transition-colors"
                >
                  {/* Source */}
                  <td className="py-2 px-2">
                    <span className="px-1.5 py-0.5 rounded text-matrix-muted border border-matrix-border text-xs">
                      {SOURCE_LABELS[entry.source] || entry.source}
                    </span>
                  </td>

                  {/* Thumbnail */}
                  <td className="py-2 px-2">
                    {entry.thumbnail ? (
                      <img
                        src={entry.thumbnail.startsWith('data:') ? entry.thumbnail : `data:image/jpeg;base64,${entry.thumbnail}`}
                        alt={entry.weapon}
                        className="w-12 h-8 object-cover rounded border border-matrix-border opacity-80"
                      />
                    ) : (
                      <div className="w-12 h-8 rounded border border-matrix-border flex items-center justify-center text-matrix-muted opacity-40">
                        —
                      </div>
                    )}
                  </td>

                  {/* Weapon */}
                  <td className="py-2 px-2 font-bold" style={{ color }}>
                    {entry.weapon?.toUpperCase()}
                  </td>

                  {/* Confidence */}
                  <td className="py-2 px-2">
                    <span style={{ color }}>{(entry.confidence * 100).toFixed(1)}%</span>
                  </td>

                  {/* Time */}
                  <td className="py-2 px-2 text-matrix-muted">{entry.timestamp}</td>

                  {/* Status */}
                  <td className="py-2 px-2">
                    <span className="text-red-400 font-bold tracking-widest">THREAT</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
