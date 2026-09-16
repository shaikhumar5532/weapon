/**
 * useWebSocket — manages the WebSocket connection for live webcam detection.
 */

import { useRef, useState, useCallback } from 'react';
import { getWebcamWsUrl } from '../services/api';

export function useWebSocket({ onDetection, onConnected, onError, onDisconnected }) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnecting(true);
    const ws = new WebSocket(getWebcamWsUrl());
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setConnecting(false);
      onConnected?.();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'detection') {
          onDetection?.(data);
        } else if (data.type === 'error') {
          onError?.(data.message);
        }
      } catch (e) {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      setConnecting(false);
      onError?.('WebSocket connection error');
    };

    ws.onclose = () => {
      setConnected(false);
      setConnecting(false);
      wsRef.current = null;
      onDisconnected?.();
    };
  }, [onDetection, onConnected, onError, onDisconnected]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User stopped feed');
      wsRef.current = null;
    }
    setConnected(false);
    setConnecting(false);
  }, []);

  const sendFrame = useCallback((blob) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(blob);
    }
  }, []);

  return { connect, disconnect, sendFrame, connected, connecting, wsRef };
}
