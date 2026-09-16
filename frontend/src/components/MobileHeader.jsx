/**
 * MobileHeader — Shown only on mobile screens (< md).
 * Provides hamburger toggle, centered logo, and threat badge.
 */

import { Menu, X, Shield } from 'lucide-react';

export default function MobileHeader({ open, onToggle, threatCount = 0 }) {
  return (
    <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-matrix-border bg-matrix-sidebar flex-shrink-0 z-40">
      {/* Hamburger */}
      <button
        id="mobile-menu-btn"
        onClick={onToggle}
        aria-label="Toggle navigation"
        className="w-10 h-10 flex items-center justify-center rounded border border-matrix-border text-matrix-muted hover:text-matrix-accent hover:border-matrix-accent transition-all touch-manipulation"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2">
        <Shield size={16} className="text-matrix-accent" />
        <div className="font-mono text-xs font-bold text-matrix-accent tracking-widest leading-tight">
          MATRIX<span className="text-matrix-muted font-normal"> // WDS</span>
        </div>
      </div>

      {/* Threat badge */}
      <div className="w-10 h-10 flex items-center justify-center">
        {threatCount > 0 ? (
          <div className="flex items-center justify-center w-8 h-8 rounded-full border border-red-500 bg-red-500/20 font-mono text-xs font-bold text-red-400 animate-pulse-fast">
            {threatCount > 99 ? '99+' : threatCount}
          </div>
        ) : (
          <div className="w-2 h-2 rounded-full bg-matrix-accent animate-pulse" />
        )}
      </div>
    </header>
  );
}
