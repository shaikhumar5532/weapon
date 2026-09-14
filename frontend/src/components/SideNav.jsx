/**
 * SideNav — Matrix-themed navigation sidebar.
 * Mirrors the control panel layout from ui.py.
 */

import { NavLink } from 'react-router-dom';
import {
  Image,
  Video,
  Camera,
  LayoutDashboard,
  ScrollText,
  Shield,
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'DASHBOARD', icon: LayoutDashboard, exact: true },
  { path: '/image', label: 'IMAGE SCAN', icon: Image },
  { path: '/video', label: 'VIDEO SCAN', icon: Video },
  { path: '/live', label: 'LIVE CAMERA', icon: Camera },
  { path: '/log', label: 'SYSTEM LOG', icon: ScrollText },
];

export default function SideNav({ logEntries = 0, threatCount = 0 }) {
  return (
    <nav className="flex flex-col h-full bg-matrix-sidebar border-r border-matrix-border w-64 flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-matrix-border">
        <div className="flex items-center gap-3 mb-1">
          <Shield size={20} className="text-matrix-accent flex-shrink-0" />
          <div>
            <div className="font-mono text-sm font-bold text-matrix-accent tracking-widest leading-tight">
              MATRIX
            </div>
            <div className="font-mono text-xs text-matrix-muted tracking-widest leading-tight">
              WEAPON DETECTION
            </div>
          </div>
        </div>
        <div className="font-mono text-xs text-matrix-muted opacity-60 mt-2 pl-8">
          AI-POWERED THREAT ANALYSIS
        </div>
      </div>

      {/* Control Panel header */}
      <div className="px-5 pt-4 pb-2">
        <span className="font-mono text-xs text-matrix-accent tracking-widest">&gt; CONTROL PANEL</span>
      </div>

      {/* Nav items */}
      <div className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map(({ path, label, icon: Icon, exact }) => (
          <NavLink
            key={path}
            to={path}
            end={exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded font-mono text-sm tracking-wider transition-all duration-150 border ${
                isActive
                  ? 'bg-matrix-btn-hover border-matrix-accent text-matrix-accent shadow-matrix-glow'
                  : 'border-transparent text-matrix-muted hover:border-matrix-border hover:text-matrix-accent hover:bg-matrix-btn'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="text-xs font-bold opacity-70">{isActive ? '▶' : '▣'}</span>
                <Icon size={15} className="flex-shrink-0" />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* Stats */}
      <div className="px-5 py-4 border-t border-matrix-border space-y-2">
        <div className="flex justify-between font-mono text-xs">
          <span className="text-matrix-muted">LOG ENTRIES</span>
          <span className="text-matrix-accent font-bold">{logEntries}</span>
        </div>
        <div className="flex justify-between font-mono text-xs">
          <span className="text-matrix-muted">THREATS FOUND</span>
          <span className={`font-bold ${threatCount > 0 ? 'text-red-400' : 'text-matrix-accent'}`}>
            {threatCount}
          </span>
        </div>
      </div>

      {/* Credit — preserved from original */}
      <div className="px-5 py-3 border-t border-matrix-border">
        <p className="font-mono text-xs text-matrix-muted text-center">
          Made with ❤️ by Umar Team
        </p>
      </div>
    </nav>
  );
}
