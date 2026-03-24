import { store }    from '../state/store.js';
import { posIcon }  from '../utils/helpers.js';

export function renderDrawing() {
  const { players } = store;
  const icons = players
    .slice(0, Math.min(8, players.length))
    .map((p, i) => `
      <div class="draw-icon" style="animation-delay:${i * 0.1}s">
        ${posIcon(p.position)}
      </div>
    `).join('');

  return `
    <div class="drawing-screen fade-up" role="status" aria-live="polite">
      <div class="draw-ball">⚽</div>
      <h2 class="draw-title">SORTEANDO...</h2>
      <p class="draw-sub">Balanceando os times automaticamente</p>
      <div class="draw-icons">${icons}</div>
    </div>
  `;
}
