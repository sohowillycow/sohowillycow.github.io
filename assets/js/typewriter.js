'use strict';
/**
 * typewriter.js - 打字機效果 / Typewriter effect
 * @module typewriter
 */
export function typewriter(element, text, speed = 100) {
  let index = 0;
  function type() {
    if (index < text.length) {
      element.textContent += text.charAt(index);
      index += 1;
      setTimeout(type, speed);
    }
  }
  type();
}
