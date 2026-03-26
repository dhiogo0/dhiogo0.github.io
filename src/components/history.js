import { store } from '../state/store.js';
import { teamAvg } from '../logic/balance.js';
import { posIcon, posLabel, starsDisplay, escHtml } from '../utils/helpers.js';

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
        <button
          class="btn btn--ghost btn--sm hist-entry__del"
          onclick="App.requestDeleteEntry('draw', ${entry.id})"
          data-tooltip="Excluir">
          🗑️
        </button>
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

export function renderHistoryView() {
  const { teams, reserves, gks = [], gkAssignments = [] } = store.historyEntry || {};

  const teamCards = teams.map((t, i) => {
    const avg = teamAvg(t).toFixed(1);
    const players = t.players.map(p => `
      <div class="team-player">
        <span class="team-player__icon">${posIcon(p.position)}</span>
        <span class="team-player__name">${escHtml(p.name)}</span>
        <span class="team-player__pos">${posLabel(p.position)}</span>
        ${starsDisplay(p.level)}
      </div>
    `).join('');
    return `
      <div class="team-card" style="animation-delay:${i * 0.08}s">
        <div class="team-card__header" style="background:linear-gradient(135deg,${t.color}18,${t.color}06)">
          <div class="team-card__name-wrap">
            <span class="team-card__dot" style="background:${t.color};box-shadow:0 0 7px ${t.color}88"></span>
            <span class="team-card__name">${escHtml(t.name.toUpperCase())}</span>
          </div>
          <span class="team-card__avg" style="background:${t.color}20;border:1px solid ${t.color}44;color:${t.color}">
            ⭐ ${avg}
          </span>
        </div>
        <div class="team-card__body">${players}</div>
      </div>
    `;
  }).join('');

  const reservesSection = reserves.length ? `
    <div class="reserves-card">
      <div class="reserves-card__header">
        <span class="reserves-card__title">🔄 RESERVAS</span>
        <span class="reserves-card__count">${reserves.length} jogador${reserves.length > 1 ? 'es' : ''}</span>
      </div>
      ${reserves.map(p => `
        <div class="reserve-row">
          <span class="reserve-row__icon">${posIcon(p.position)}</span>
          <span class="reserve-row__name">${escHtml(p.name)}</span>
          <span class="reserve-row__pos">${posLabel(p.position)}</span>
          ${starsDisplay(p.level)}
        </div>
      `).join('')}
    </div>
  ` : '';

  const gkSection = gks.length ? (() => {
    const isTeamMode = gks.length === teams.length;
    const isRotation = !isTeamMode && gks.length === 3;
    const title = isRotation ? '🧤 GOLEIROS — RODÍZIO' : '🧤 GOLEIROS';
    const rows = gkAssignments.map((gkId, idx) => {
      const gk = gks.find(g => g.id === gkId);
      if (!gk) return '';
      let assignLabel, assignColor;
      if (isTeamMode) {
        const team = teams[idx];
        assignLabel = team ? escHtml(team.name) : '—';
        assignColor = team?.color || '#aaa';
      } else if (isRotation) {
        if      (idx === 0) { assignLabel = 'Em quadra · Lado A'; assignColor = 'var(--green)'; }
        else if (idx === 1) { assignLabel = 'Em quadra · Lado B'; assignColor = '#00c8e8'; }
        else                { assignLabel = 'Aguardando';          assignColor = 'var(--dimmed)'; }
      } else {
        if      (idx === 0) { assignLabel = 'Lado A'; assignColor = 'var(--green)'; }
        else if (idx === 1) { assignLabel = 'Lado B'; assignColor = '#00c8e8'; }
        else                { assignLabel = 'Aguardando'; assignColor = 'var(--dimmed)'; }
      }
      return `
        <div class="gk-row">
          <span class="gk-row__icon">🧤</span>
          <span class="gk-row__name">${escHtml(gk.name)}</span>
          <span class="gk-row__assign" style="color:${assignColor}">${assignLabel}</span>
        </div>
      `;
    }).join('');
    return `
      <div class="gk-section">
        <div class="gk-section__header">
          <span class="gk-section__title">${title}</span>
        </div>
        ${rows}
      </div>
    `;
  })() : '';

  return `
    <div class="fade-up">
      <div class="actions-row">
        <button class="btn btn--ghost btn--sm btn--whatsapp" data-tooltip="Compartilhar no WhatsApp" onclick="App.exportWhatsapp()">
          📤 Zap
        </button>
        <button class="btn btn--ghost btn--sm" onclick="App.goTo('history')">↩️ Voltar</button>
      </div>
      ${teamCards}
      ${reservesSection}
      ${gkSection}
    </div>
  `;
}

function _formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' às ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
