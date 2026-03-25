import { store }                          from '../state/store.js';
import { teamAvg, balanceScore, balanceInfo } from '../logic/balance.js';
import { posIcon, posLabel, starsDisplay, escHtml } from '../utils/helpers.js';

export function renderTeams() {
  const { teams, reserves, gks, gkAssignments, swapMode, swapSelected, history, championshipModal, championshipFormat, championship, readOnly } = store;
  const score = balanceScore(teams);
  const bi    = balanceInfo(score);

  return `
    <div class="fade-up">

      ${readOnly ? '<div class="swap-hint">📋 Visualização do histórico (somente leitura)</div>' : ''}
      ${_renderBalanceBar(bi)}
      ${readOnly ? '' : _renderActions(swapMode, history)}
      ${!readOnly && swapMode ? _renderSwapHint(swapSelected) : ''}
      ${teams.map((t, i) => _renderTeamCard(t, i, readOnly ? false : swapMode, swapSelected, readOnly)).join('')}
      ${reserves.length ? _renderReserves(reserves, readOnly ? false : swapMode, swapSelected) : ''}
      ${gks.length ? _renderGkSection(gks, teams, gkAssignments, readOnly) : ''}
      ${readOnly ? _renderReadOnlyActions() : _renderChampionshipCTA(teams, championship)}

    </div>
    ${championshipModal ? _renderChampionshipModal(teams, championshipFormat) : ''}
  `;
}

/* ── Private renderers ── */

function _renderBalanceBar(bi) {
  const icon = bi.pct >= 85 ? '🟢' : bi.pct >= 55 ? '🟡' : '🔴';
  return `
    <div class="balance-bar">
      <div class="balance-bar__info">
        <span class="balance-bar__title">Equilíbrio</span>
        <span class="balance-bar__val" style="color:${bi.color}">${bi.label}</span>
      </div>
      <div class="balance-bar__track">
        <div class="balance-bar__fill" style="width:${bi.pct}%;background:${bi.color}"></div>
      </div>
      <span class="balance-bar__icon">${icon}</span>
    </div>
  `;
}

function _renderActions(swapMode, history) {
  return `
    <div class="actions-row">
      <button
        class="btn btn--ghost btn--sm ${swapMode ? 'btn--swap-active' : ''}"
        data-tooltip="${swapMode ? 'Desativar modo troca' : 'Trocar jogadores entre times'}"
        onclick="App.toggleSwapMode()">
        ${swapMode ? '✅ Troca ON' : '🔄 Trocar'}
      </button>
      ${history.length
        ? `<button class="btn btn--ghost btn--sm" data-tooltip="Desfazer última troca" onclick="App.undo()">↩️ Desfazer</button>`
        : ''}
      <button
        class="btn btn--ghost btn--sm btn--whatsapp"
        data-tooltip="Compartilhar no WhatsApp"
        onclick="App.exportWhatsapp()">
        📤 Zap
      </button>
      <button class="btn btn--ghost btn--sm" data-tooltip="Reconfigurar e sortear novamente" onclick="App.setStep(1)">🔁</button>
      <button class="btn btn--ghost btn--sm" data-tooltip="Novo sorteio do zero" onclick="App.newDraw()">🏠</button>
    </div>
  `;
}

function _renderSwapHint(selected) {
  const msg = selected
    ? '👆 Toque no jogador com quem quer trocar'
    : '👆 Toque em um jogador para selecionar';
  return `<div class="swap-hint">${msg}</div>`;
}

function _renderReadOnlyActions() {
  return `
    <div class="actions-row">
      <button
        class="btn btn--ghost btn--sm btn--whatsapp"
        data-tooltip="Compartilhar no WhatsApp"
        onclick="App.exportWhatsapp()">
        📤 Zap
      </button>
      <button class="btn btn--ghost btn--sm" data-tooltip="Voltar ao histórico" onclick="App.goTo('history')">↩️ Voltar</button>
    </div>
  `;
}

function _renderTeamCard(team, idx, swapMode, swapSelected, readOnly = false) {
  const avg      = teamAvg(team).toFixed(1);
  const renaming = store.renamingTeamId === team.id;

  const nameEl = renaming && !readOnly
    ? `<input
        class="team-name-input"
        id="team-name-${team.id}"
        value="${escHtml(team.name)}"
        maxlength="20"
        onblur="App.commitRenameTeam(${team.id},this.value)"
        onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}if(event.key==='Escape')App.cancelRenameTeam();"
      />`
    : `<span
        class="team-card__name${readOnly ? '' : ' team-card__name--editable'}"
        ${readOnly ? '' : `onclick="App.startRenameTeam(${team.id})" data-tooltip="Clique para renomear"`}>
        ${escHtml(team.name.toUpperCase())}
      </span>`;

  const playerRows = team.players.map(p => {
    const isSel = swapSelected?.teamId === team.id && swapSelected?.playerId === p.id;
    return `
      <div
        class="team-player ${swapMode ? 'team-player--swappable' : ''} ${isSel ? 'team-player--selected' : ''}"
        style="${isSel ? `border-color:${team.color};background:${team.color}18` : ''}"
        onclick="App.clickTeamPlayer(${team.id},${p.id})">
        <span class="team-player__icon">${posIcon(p.position)}</span>
        <span class="team-player__name">${escHtml(p.name)}</span>
        <span class="team-player__pos">${posLabel(p.position)}</span>
        ${starsDisplay(p.level)}
      </div>
    `;
  }).join('');

  return `
    <div class="team-card" style="animation-delay:${idx * 0.08}s">
      <div class="team-card__header" style="background:linear-gradient(135deg,${team.color}18,${team.color}06)">
        <div class="team-card__name-wrap">
          <span class="team-card__dot" style="background:${team.color};box-shadow:0 0 7px ${team.color}88"></span>
          ${nameEl}
        </div>
        <span class="team-card__avg" style="background:${team.color}20;border:1px solid ${team.color}44;color:${team.color}">
          ⭐ ${avg}
        </span>
      </div>
      <div class="team-card__body">${playerRows}</div>
    </div>
  `;
}

function _renderChampionshipCTA(teams, championship) {
  if (!teams.length) return '';

  if (championship?.status === 'ongoing') {
    return `
      <div class="champ-cta">
        <div class="champ-cta__divider">ou</div>
        <button class="btn btn--ghost" onclick="App.goTo('championship')">
          🏆 Ver Campeonato em Andamento
        </button>
      </div>
    `;
  }

  return `
    <div class="champ-cta">
      <div class="champ-cta__divider">ou</div>
      <button class="btn btn--ghost" onclick="App.openChampionshipModal()">
        🏆 Fazer Campeonato com Esses Times
      </button>
    </div>
  `;
}

function _renderChampionshipModal(teams, selectedFormat) {
  const n = teams.length;

  const formats = [
    { id: 'round-robin',      emoji: '⚽', label: 'Pontos Corridos', sub: 'Todos jogam entre si',      ok: n >= 2 },
    { id: 'knockout',         emoji: '🏆', label: 'Mata-mata',        sub: 'Eliminação direta',          ok: n >= 2 },
    { id: 'groups+knockout',  emoji: '🔀', label: 'Pontos + Final',   sub: 'Todos jogam, top 2 decidem', ok: n >= 3 },
  ];

  const options = formats.map(f => `
    <button
      class="format-btn ${selectedFormat === f.id ? 'format-btn--active' : ''} ${!f.ok ? 'format-btn--disabled' : ''}"
      onclick="App.selectChampionshipFormat('${f.id}')"
      ${!f.ok ? 'disabled' : ''}>
      <span class="format-btn__emoji">${f.emoji}</span>
      <span class="format-btn__label">${f.label}</span>
      <span class="format-btn__sub">${!f.ok ? 'Precisa de 3+ times' : f.sub}</span>
    </button>
  `).join('');

  return `
    <div class="modal-backdrop" onclick="App.closeChampionshipModal()">
      <div class="modal" onclick="event.stopPropagation()">
        <div class="modal__header">
          <p class="modal__title">Campeonato do Dia</p>
        </div>
        <div class="format-grid">${options}</div>
        <div class="btn-row" style="margin-top:20px">
          <button class="btn btn--ghost" style="flex:1" onclick="App.closeChampionshipModal()">Cancelar</button>
          <button class="btn btn--primary" style="flex:2" onclick="App.confirmChampionship()">Criar →</button>
        </div>
      </div>
    </div>
  `;
}

function _renderGkSection(gks, teams, gkAssignments) {
  const isTeamMode = gks.length === teams.length && gks.length > 0;
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
        <div class="gk-row__controls">
          <button class="gk-ctrl-btn" onclick="App.moveGk(${gkId}, -1)"
            ${idx === 0 ? 'disabled' : ''}>↑</button>
          <button class="gk-ctrl-btn" onclick="App.moveGk(${gkId}, 1)"
            ${idx === gkAssignments.length - 1 ? 'disabled' : ''}>↓</button>
        </div>
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
}

function _renderReserves(reserves, swapMode, swapSelected) {
  const rows = reserves.map(p => `
    <div
      class="reserve-row ${swapMode && swapSelected ? 'reserve-row--targetable' : ''}"
      onclick="App.clickReserve(${p.id})">
      <span class="reserve-row__icon">${posIcon(p.position)}</span>
      <span class="reserve-row__name">${escHtml(p.name)}</span>
      <span class="reserve-row__pos">${posLabel(p.position)}</span>
      ${starsDisplay(p.level)}
    </div>
  `).join('');

  return `
    <div class="reserves-card">
      <div class="reserves-card__header">
        <span class="reserves-card__title">🔄 RESERVAS</span>
        <span class="reserves-card__count">${reserves.length} jogador${reserves.length > 1 ? 'es' : ''}</span>
      </div>
      ${rows}
    </div>
  `;
}
