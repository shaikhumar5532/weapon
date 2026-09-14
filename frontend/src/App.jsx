/**
 * App.jsx — Root component.
 * Manages shared state (log, history) and provides routing layout.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useSystemLog } from './hooks/useSystemLog';
import { useDetectionHistory } from './hooks/useDetectionHistory';
import SideNav from './components/SideNav';
import StatusBar from './components/StatusBar';
import Dashboard from './pages/Dashboard';
import ImageDetection from './pages/ImageDetection';
import VideoDetection from './pages/VideoDetection';
import LiveCamera from './pages/LiveCamera';
import SystemLogPage from './pages/SystemLogPage';

export default function App() {
  const { entries, log, clearLog } = useSystemLog();
  const { history, addDetection, clearHistory } = useDetectionHistory();

  const threatCount = history.length;

  // Shared props for all pages
  const sharedProps = { log, addDetection };

  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-matrix-bg text-matrix-accent">
        {/* Sidebar */}
        <SideNav logEntries={entries.length} threatCount={threatCount} />

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Status bar */}
          <div className="px-5 py-3 border-b border-matrix-border flex-shrink-0">
            <StatusBar />
          </div>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-5">
            <Routes>
              <Route
                path="/"
                element={<Dashboard history={history} logEntries={entries} />}
              />
              <Route path="/image" element={<ImageDetection {...sharedProps} />} />
              <Route path="/video" element={<VideoDetection {...sharedProps} />} />
              <Route path="/live" element={<LiveCamera {...sharedProps} />} />
              <Route
                path="/log"
                element={
                  <SystemLogPage
                    entries={entries}
                    onClear={clearLog}
                    history={history}
                    onClearHistory={clearHistory}
                  />
                }
              />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
