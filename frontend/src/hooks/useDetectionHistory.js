/**
 * useDetectionHistory — tracks all detections across sessions.
 */

import { useState, useCallback } from 'react';

const MAX_HISTORY = 100;

export function useDetectionHistory() {
  const [history, setHistory] = useState([]);

  const addDetection = useCallback(({ weapon, confidence, source, thumbnail, detections }) => {
    const entry = {
      id: Date.now() + Math.random(),
      weapon,
      confidence,
      source,
      thumbnail,
      detections: detections || [],
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      date: new Date().toLocaleDateString(),
    };

    setHistory(prev => {
      const next = [entry, ...prev];
      return next.length > MAX_HISTORY ? next.slice(0, MAX_HISTORY) : next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return { history, addDetection, clearHistory };
}
