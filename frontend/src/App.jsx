/**
 * App.jsx — Root component.
 * Manages shared state (log, history) and provides routing layout.
 */

import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useSystemLog } from './hooks/useSystemLog';
import { useDetectionHistory } from './hooks/useDetectionHistory';
import SideNav from './components/SideNav';
import MobileHeader from './components/MobileHeader';
import StatusBar from './components/StatusBar';
import Dashboard from './pages/Dashboard';
import ImageDetection from './pages/ImageDetection';
import VideoDetection from './pages/VideoDetection';
import LiveCamera from './pages/LiveCamera';
import SystemLogPage from './pages/SystemLogPage';

export default function App() {
  const { entries, log, clearLog } = useSystemLog();
  const { history, addDetection, clearHistory } = useDetectionHistory();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const threatCount = history.length;

  // Shared props for all pages
  const sharedProps = { log, addDetection };

  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-matrix-bg text-matrix-accent">
        {/* Mobile backdrop overlay */}
        {mobileNavOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar — desktop fixed, mobile off-canvas drawer */}
        <SideNav
          logEntries={entries.length}
          threatCount={threatCount}
          mobileOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile top header */}
          <MobileHeader
            open={mobileNavOpen}
            onToggle={() => setMobileNavOpen(prev => !prev)}
            threatCount={threatCount}
          />

          {/* Status bar */}
          <div className="px-3 md:px-5 py-2 md:py-3 border-b border-matrix-border flex-shrink-0 overflow-x-auto">
            <StatusBar />
          </div>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-3 md:p-5">
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
