/**
 * useSystemLog — manages the Matrix-style system log entries.
 * Mirrors the log() function from src/utils.py.
 */

import { useState, useCallback } from 'react';

const LOG_PREFIXES = ['[MATRIX]', '[CORE]', '[NODE-01]', '[SYS]', '[SCAN]'];
const MAX_LOG_ENTRIES = 500;

function randomPrefix() {
  return LOG_PREFIXES[Math.floor(Math.random() * LOG_PREFIXES.length)];
}

function timestamp() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

export function useSystemLog() {
  const [entries, setEntries] = useState([
    { id: 1, prefix: '[MATRIX]', message: 'BOOT: MATRIX Online.', time: timestamp(), type: 'info' },
    { id: 2, prefix: '[CORE]', message: 'YOLOv8 Node Initialized.', time: timestamp(), type: 'info' },
    { id: 3, prefix: '[SYS]', message: 'Awaiting Commands...', time: timestamp(), type: 'info' },
  ]);

  const log = useCallback((message, type = 'info') => {
    const entry = {
      id: Date.now() + Math.random(),
      prefix: randomPrefix(),
      message,
      time: timestamp(),
      type,
    };
    setEntries(prev => {
      const next = [...prev, entry];
      return next.length > MAX_LOG_ENTRIES ? next.slice(-MAX_LOG_ENTRIES) : next;
    });
  }, []);

  const clearLog = useCallback(() => {
    setEntries([]);
  }, []);

  return { entries, log, clearLog };
}
