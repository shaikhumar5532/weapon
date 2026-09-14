/**
 * SystemLog — Real-time Matrix-style scrolling terminal log.
 * Mirrors the Tkinter Text widget log from the original ui.py.
 */

import { useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';

const TYPE_COLORS = {
  info: '#00aa55',
  threat: '#ff4444',
  success: '#00ff41',
  error: '#ff6600',
};

export default function SystemLog({ entries = [], onClear }) {
  const bottomRef = useRef(null);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-matrix-border">
        <span className="font-mono text-xs text-matrix-accent tracking-widest">&gt; SYSTEM LOG</span>
        <button
          onClick={onClear}
          className="text-matrix-muted hover:text-matrix-accent transition-colors p-1"
          title="Clear log"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin scrollbar-thumb-matrix-border scrollbar-track-transparent">
        {entries.map((entry) => (
          <div key={entry.id} className="flex gap-2 font-mono text-xs leading-5 group">
            <span className="text-matrix-muted flex-shrink-0 opacity-60">{entry.time}</span>
            <span
              className="flex-shrink-0 font-bold"
              style={{ color: TYPE_COLORS[entry.type] || '#00aa55' }}
            >
              {entry.prefix}
            </span>
            <span
              className="flex-1 break-all"
              style={{ color: entry.type === 'threat' ? '#ff4444' : entry.type === 'error' ? '#ff6600' : '#00cc44' }}
            >
              {entry.message}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Footer count */}
      <div className="px-3 py-1.5 border-t border-matrix-border">
        <span className="font-mono text-xs text-matrix-muted">{entries.length} entries</span>
      </div>
    </div>
  );
}
