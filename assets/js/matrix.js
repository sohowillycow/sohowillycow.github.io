'use strict';
/**
 * matrix.js - 矩陣雨動畫 / Matrix rain animation
 * @module matrix
 */
export function startMatrix(canvas) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width = window.innerWidth;
  const height = canvas.height = window.innerHeight;
  const columns = Math.floor(width / 20);
  const drops = Array(columns).fill(0);
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';

  /**
   * 繪製每一幀 | Draw each frame
   */
  function draw() {
    ctx.fillStyle = 'rgba(5,5,5,0.05)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#00FF9F';
    ctx.font = '16px "IBM Plex Mono"';

    drops.forEach((y, i) => {
      const text = chars.charAt(Math.floor(Math.random() * chars.length));
      ctx.fillText(text, i * 20, y);
      if (y > height && Math.random() > 0.975) {
        drops[i] = 0;
      } else {
        drops[i] = y + 20;
      }
    });

    requestAnimationFrame(draw);
  }

  draw();
}
