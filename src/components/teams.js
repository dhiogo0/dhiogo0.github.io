import { store }                          from '../state/store.js';
import { teamAvg, balanceScore, balanceInfo } from '../logic/balance.js';
import { posIcon, posLabel, starsDisplay, escHtml } from '../utils/helpers.js';

export function renderTeams() {
  const { teams, reserves, swapMode, swapSelected, history, championshipModal, championshipFormat, championship } = store;
  const score = balanceScore(teams);
  const bi    = balanceInfo(score);

  return `
    <div class="fade-up">

      ${_renderBalanceBar(bi)}
      ${_renderActions(swapMode, history)}
      ${swapMode ? _renderSwapHint(swapSelected) : ''}
      ${teams.map((t, i) => _renderTeamCard(t, i, swapMode, swapSelected)).join('')}
      ${reserves.length ? _renderReserves(reserves, swapMode, swapSelected) : ''}
      ${_renderChampionshipCTA(teams, championship)}

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
      <button class="btn btn--ghost btn--sm" data-tooltip="Fazer novo sorteio" onclick="App.draw()">🔁</button>
    </div>
  `;
}

function _renderSwapHint(selected) {
  const msg = selected
    ? '👆 Toque no jogador com quem quer trocar'
    : '👆 Toque em um jogador para selecionar';
  return `<div class="swap-hint">${msg}</div>`;
}

function _renderTeamCard(team, idx, swapMode, swapSelected) {
  const avg      = teamAvg(team).toFixed(1);
  const renaming = store.renamingTeamId === team.id;

  const nameEl = renaming
    ? `<input
        class="team-name-input"
        id="team-name-${team.id}"
        value="${escHtml(team.name)}"
        maxlength="20"
        onblur="App.commitRenameTeam(${team.id},this.value)"
        onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}if(event.key==='Escape')App.cancelRenameTeam();"
      />`
    : `<span
        class="team-card__name team-card__name--editable"
        onclick="App.startRenameTeam(${team.id})"
        data-tooltip="Clique para renomear">
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
