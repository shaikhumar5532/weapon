/**
 * BoundingBoxCanvas — Overlays weapon detection bounding boxes on a video feed.
 * Used by LiveCamera to draw YOLO results on top of the webcam stream.
 */

import { useEffect, useRef } from 'react';

const WEAPON_COLORS = {
  Grenade: '#ff5000',
  Knife: '#00ffb4',
  Missile: '#ff0000',
  Pistol: '#00ff50',
  Rifle: '#00c8ff',
};

export default function BoundingBoxCanvas({ detections = [], width, height, className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width || canvas.offsetWidth;
    canvas.height = height || canvas.offsetHeight;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!detections || detections.length === 0) return;

    detections.forEach((det) => {
      const [x1, y1, x2, y2] = det.bbox;
      const color = WEAPON_COLORS[det.class_name] || '#00ff41';
      const label = `${det.class_name.toUpperCase()} ${(det.confidence * 100).toFixed(1)}%`;

      // Bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

      // Corner decorators (HUD style)
      const cs = 12; // corner size
      ctx.lineWidth = 3;
      [[x1, y1, 1, 1], [x2, y1, -1, 1], [x1, y2, 1, -1], [x2, y2, -1, -1]].forEach(([cx, cy, dx, dy]) => {
        ctx.beginPath();
        ctx.moveTo(cx + dx * cs, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + dy * cs);
        ctx.stroke();
      });

      // Label background
      ctx.shadowBlur = 0;
      ctx.font = 'bold 12px "Share Tech Mono", monospace';
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = color + 'dd';
      ctx.fillRect(x1, y1 - 22, tw + 10, 20);

      // Label text
      ctx.fillStyle = '#000';
      ctx.fillText(label, x1 + 5, y1 - 6);
    });
  }, [detections, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
