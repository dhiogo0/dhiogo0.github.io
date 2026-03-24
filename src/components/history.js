import { store } from '../state/store.js';
import { teamAvg } from '../logic/balance.js';

export function renderHistory() {
  const { drawHistory } = store;

  if (!drawHistory.length) {
    return `
      <div class="fade-up">
        <div class="empty-state">
          <span class="empty-state__icon">📋</span>
          <p>Nenhum sorteio realizado ainda.<br>Sorteie times para ver o histórico aqui.</p>
        </div>
      </div>
    `;
  }

  const entries = drawHistory.map((entry, i) => _renderEntry(entry, i)).join('');

  return `
    <div class="fade-up">
      <div class="section-title" style="margin-bottom:14px">
        <span>Sorteios anteriores</span>
        <span class="badge">${drawHistory.length}</span>
      </div>
      ${entries}
    </div>
  `;
}

function _renderEntry(entry, idx) {
  const date   = _formatDate(entry.date);
  const nTeams = entry.teams.length;
  const nRes   = entry.reserves.length;

  const teamPills = entry.teams.map(t => {
    const avg = teamAvg(t).toFixed(1);
    return `
      <div class="hist-pill" style="border-color:${t.color}33;background:${t.color}0d">
        <span class="hist-pill__dot" style="background:${t.color}"></span>
        <span class="hist-pill__name">${t.name}</span>
        <span class="hist-pill__avg" style="color:${t.color}">⭐${avg}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="hist-entry" style="animation-delay:${idx * 0.05}s">
      <div class="hist-entry__meta">
        <span class="hist-entry__date">📅 ${date}</span>
        <span class="hist-entry__info">${nTeams} times · ${entry.playersPerTeam}×${nTeams}${nRes ? ` · ${nRes} reserva${nRes > 1 ? 's' : ''}` : ''}</span>
      </div>
      <div class="hist-pills">${teamPills}</div>
      <button
        class="btn btn--ghost btn--sm hist-entry__btn"
        onclick="App.loadDraw(${entry.id})">
        Ver este sorteio →
      </button>
    </div>
  `;
}

function _formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' às ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
