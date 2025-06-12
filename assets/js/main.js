'use strict';
/**
 * main.js - 主入口 / Main script
 * @module main
 */
import { startMatrix } from './matrix.js';
import { typewriter } from './typewriter.js';

/**
 * 初始化 | Initialize scripts
 */
export function init() {
  const canvas = document.querySelector('.hero__canvas');
  if (canvas) {
    startMatrix(canvas);
  }

  const title = document.querySelector('.hero__title');
  if (title) {
    typewriter(title, '$ whoami — white-hat.hacker');
  }

  setupCursor();
  setupCards();
}

/**
 * 設定光圈游標 | Neon cursor ripple
 */
function setupCursor() {
  const cursor = document.createElement('div');
  cursor.className = 'cursor';
  document.body.appendChild(cursor);
  document.addEventListener('mousemove', (e) => {
    cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  });
}

/**
 * 監測卡片進入畫面 | Flip cards on viewport
 */
function setupCards() {
  const cards = document.querySelectorAll('.card');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('card--show');
      }
    });
  }, { threshold: 0.1 });
  cards.forEach(card => {
    card.classList.add('card--flip');
    observer.observe(card);
  });
}

// 執行初始化 | Run init on DOM ready
if (document.readyState !== 'loading') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
