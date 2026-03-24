import { POSITIONS } from '../data/constants.js';

export function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function posIcon(posId) {
  return POSITIONS.find(p => p.id === posId)?.emoji || '👤';
}

export function posLabel(posId) {
  return POSITIONS.find(p => p.id === posId)?.label || '';
}

export function starsDisplay(val) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += `<span class="star ${i <= val ? 'star--lit' : ''}" style="font-size:13px">★</span>`;
  }
  return `<span class="stars-row">${html}</span>`;
}

export function starsInput(level, starHover) {
  let html = '<div class="stars-input" id="starsInput">';
  for (let i = 1; i <= 5; i++) {
    const lit = (starHover || level) >= i;
    html += `<span
      class="star-btn ${lit ? 'star-btn--lit' : ''}"
      onmouseenter="App.onStarHover(${i})"
      onmouseleave="App.onStarHover(0)"
      onclick="App.onStarClick(${i})">★</span>`;
  }
  return html + '</div>';
}

export function renderStarsWidget(level, starHover) {
  const el = document.getElementById('starsInput');
  if (!el) return;
  el.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const lit = (starHover || level) >= i;
    const s = document.createElement('span');
    s.className = `star-btn ${lit ? 'star-btn--lit' : ''}`;
    s.textContent = '★';
    s.onmouseenter = () => App.onStarHover(i);
    s.onmouseleave = () => App.onStarHover(0);
    s.onclick      = () => App.onStarClick(i);
    el.appendChild(s);
  }
}
