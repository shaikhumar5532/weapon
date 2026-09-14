/**
 * MatrixRain — Canvas-based Matrix digital rain effect.
 * Lightweight: 30fps, configurable density, auto-sizes to parent.
 */

import { useEffect, useRef } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&アイウエオカキクケコサシスセソ';
const FONT_SIZE = 13;
const OPACITY = 0.85;

export default function MatrixRain({ className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animId;
    let drops = [];

    function resize() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const cols = Math.floor(canvas.width / FONT_SIZE);
      drops = Array(cols).fill(1);
    }

    function draw() {
      // Fade effect
      ctx.fillStyle = `rgba(2, 11, 2, 0.05)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${FONT_SIZE}px 'Share Tech Mono', monospace`;

      drops.forEach((y, i) => {
        // Vary brightness: bright green for head, dimmer for tail
        const alpha = Math.random() > 0.95 ? 1 : OPACITY;
        ctx.fillStyle = `rgba(0, 255, 65, ${alpha})`;

        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        ctx.fillText(char, i * FONT_SIZE, y * FONT_SIZE);

        // Reset drop randomly or when it goes off screen
        if (y * FONT_SIZE > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      });

      animId = requestAnimationFrame(draw);
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    // 30fps throttle
    let lastTime = 0;
    function throttledDraw(time) {
      animId = requestAnimationFrame(throttledDraw);
      if (time - lastTime < 33) return; // ~30fps
      lastTime = time;
      draw();
    }
    // Start the loop
    animId = requestAnimationFrame(throttledDraw);

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full h-full ${className}`}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
