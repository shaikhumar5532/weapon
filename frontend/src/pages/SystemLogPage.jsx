/**
 * SystemLogPage — Full-page system log view.
 */

import SystemLog from '../components/SystemLog';
import DetectionHistory from '../components/DetectionHistory';

export default function SystemLogPage({ entries, onClear, history, onClearHistory }) {
  return (
    <div className="flex flex-col gap-4 h-full">
      <div>
        <h1 className="font-mono text-lg font-bold text-matrix-accent tracking-widest">SYSTEM LOG</h1>
        <p className="font-mono text-xs text-matrix-muted mt-1">Real-time operational event log</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        {/* Log */}
        <div className="flex-1 rounded border border-matrix-border bg-matrix-panel overflow-hidden flex flex-col">
          <SystemLog entries={entries} onClear={onClear} />
        </div>

        {/* History */}
        <div className="flex-1 rounded border border-matrix-border bg-matrix-panel p-4 overflow-y-auto">
          <DetectionHistory history={history} onClear={onClearHistory} />
        </div>
      </div>
    </div>
  );
}
