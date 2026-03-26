import { store, presentPlayers, numTeams } from '../state/store.js';
import { POSITIONS }                    from '../data/constants.js';
import { escHtml, posIcon, posLabel, starsDisplay, starsInput } from '../utils/helpers.js';

function _formFields() {
  const { form, starHover } = store;

  const posButtons = POSITIONS.map(p => `
    <button
      class="pos-btn ${form.position === p.id ? 'pos-btn--active' : ''}"
      onclick="App.setFormField('position','${p.id}');App.render()">
      <span class="pos-btn__emoji">${p.emoji}</span>
      <span class="pos-btn__label">${p.label}</span>
    </button>
  `).join('');

  return `
    <div class="field">
      <label class="field__label" for="nameInput">Nome</label>
      <input
        class="input"
        id="nameInput"
        type="text"
        placeholder="Nome do jogador..."
        value="${escHtml(form.name)}"
        oninput="App.setFormField('name',this.value)"
        onkeydown="if(event.key==='Enter')App.addOrUpdatePlayer()"/>
    </div>

    <div class="field">
      <label class="field__label">Posição</label>
      <div class="pos-grid">${posButtons}</div>
    </div>

    <div class="field">
      <label class="field__label">Nível de habilidade</label>
      ${starsInput(form.level, starHover)}
    </div>
  `;
}

export function renderAddPlayer() {
  const { players } = store;
  const total   = players.length;
  const present = players.filter(p => p.present !== false);
  const ready   = present.length >= 4;
  const teams   = numTeams();
  const ppt     = store.playersPerTeam;

  const statsBlock = total === 0
    ? `<div class="add-player-hint">
         <span class="add-player-hint__icon">👥</span>
         <p class="add-player-hint__text">Adicione ao menos <strong>4 jogadores</strong> para poder sortear os times.</p>
       </div>`
    : `<div class="add-player-stats" onclick="App.goTo('players')">
         <div class="add-player-stats__info">
           <span class="add-player-stats__count">${total} jogador${total !== 1 ? 'es' : ''}</span>
           <span class="add-player-stats__sub">${present.length} presente${present.length !== 1 ? 's' : ''} · ${ready ? '✅ pronto para sortear' : `⚠️ faltam ${4 - present.length} para sortear`}</span>
         </div>
         <span class="add-player-stats__arrow">Ver lista →</span>
       </div>`;

  const fieldCaption = total === 0
    ? null
    : teams >= 2
      ? `Com ${present.length} presentes, dá pra fazer <strong>${teams} times de ${ppt} jogadores</strong>`
      : `Faltam jogadores para formar times de ${ppt}`;

  return `
    <div class="add-player-screen fade-up">
      <div class="card">
        <p class="card__headline">+ ADICIONAR JOGADOR</p>
        ${_formFields()}
        <div class="btn-row">
          <button class="btn btn--primary" onclick="App.addOrUpdatePlayer()">
            Adicionar jogador
          </button>
        </div>
      </div>
      ${statsBlock}
      <div class="field-wrap">
        ${fieldCaption ? `<p class="field-caption">${fieldCaption}</p>` : ''}
        ${_renderInteractiveField(present, teams, ppt)}
      </div>
    </div>
  `;
}

function _renderInteractiveField(present, teams, ppt) {
  const W = 480, H = 196;
  const COLOR_A = '#00e87a', COLOR_B = '#00c8e8';

  // Show exactly ppt outfield players per side (one team each)
  const outfield     = present.filter(p => p.position !== 'GK');
  const teamAPlayers = outfield.slice(0, ppt);
  const teamBPlayers = outfield.slice(ppt, ppt * 2);
  const reserves     = present.slice(ppt * 2);

  // Playable area: x 4–476, y 4–196 (field outline)
  // Left half:  x 4–240   Right half: x 240–476
  // GK stays inside penalty area (x≈15 for A, x≈465 for B)
  // DEF, MID, ATK occupy the rest of each half, split into 3 vertical bands
  // Band x centers (team A, left half, excluding GK area ~84):
  //   DEF: 108,  MID: 152,  ATK: 210
  // Band x centers (team B, right half, mirrored):
  //   DEF: 372,  MID: 328,  ATK: 270

  const xZone = {
    A: { GK: 16,  DEF: 100, MID: 155, ATK: 210 },
    B: { GK: 464, DEF: 380, MID: 325, ATK: 270 },
  };

  // Y spread: evenly distribute within field height with padding
  const Y_MIN = 14, Y_MAX = 182;

  function spreadY(count, index) {
    if (count === 1) return (Y_MIN + Y_MAX) / 2;
    return Y_MIN + ((Y_MAX - Y_MIN) / (count + 1)) * (index + 1);
  }

  // GK is always fixed at center of small goal area, one per side
  const GK_Y = 100;
  const fixedGkA = _playerDot(xZone.A.GK, GK_Y, COLOR_A);
  const fixedGkB = _playerDot(xZone.B.GK, GK_Y, COLOR_B);

  function posGroup(players, side, color) {
    if (!players.length) return '';
    const byPos = { DEF: [], MID: [], ATK: [] };
    players.forEach(p => {
      const pos = ['DEF','MID','ATK'].includes(p.position) ? p.position : 'MID';
      byPos[pos].push(p);
    });

    return Object.entries(byPos).flatMap(([pos, group]) =>
      group.map((p, i) => {
        const x = xZone[side][pos];
        const y = spreadY(group.length, i);
        return _playerDot(x, y, color);
      })
    ).join('');
  }

  const dotsA = posGroup(teamAPlayers, 'A', COLOR_A);
  const dotsB = posGroup(teamBPlayers, 'B', COLOR_B);

  const reserveLabel = reserves.length
    ? `<text x="8" y="${H + 14}" font-size="9" fill="#888" font-family="sans-serif">+${reserves.length} reserva${reserves.length !== 1 ? 's' : ''}</text>`
    : '';

  return `
    <svg class="field-illustration field-illustration--interactive" viewBox="0 0 ${W} ${H + (reserves.length ? 18 : 0)}" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#fff" stroke-width="1.5">
      <!-- field outline -->
      <rect x="4" y="4" width="472" height="192" rx="6"/>
      <!-- halfway line -->
      <line x1="240" y1="4" x2="240" y2="196"/>
      <!-- center circle -->
      <circle cx="240" cy="100" r="36"/>
      <circle cx="240" cy="100" r="3" fill="#fff" stroke="none"/>
      <!-- left penalty area -->
      <rect x="4" y="52" width="80" height="96"/>
      <rect x="4" y="76" width="28" height="48"/>
      <rect x="0" y="84" width="4" height="32" stroke-width="1.5"/>
      <circle cx="55" cy="100" r="2" fill="#fff" stroke="none"/>
      <path d="M84,68 A36,36 0 0,1 84,132" stroke-dasharray="4 3"/>
      <!-- right penalty area -->
      <rect x="396" y="52" width="80" height="96"/>
      <rect x="448" y="76" width="28" height="48"/>
      <rect x="476" y="84" width="4" height="32" stroke-width="1.5"/>
      <circle cx="425" cy="100" r="2" fill="#fff" stroke="none"/>
      <path d="M396,68 A36,36 0 0,0 396,132" stroke-dasharray="4 3"/>
      <!-- corner arcs -->
      <path d="M4,18 A14,14 0 0,1 18,4"/>
      <path d="M462,4 A14,14 0 0,1 476,18"/>
      <path d="M476,182 A14,14 0 0,1 462,196"/>
      <path d="M18,196 A14,14 0 0,1 4,182"/>
      <!-- players -->
      ${fixedGkA}
      ${fixedGkB}
      ${dotsA}
      ${dotsB}
      ${reserveLabel}
    </svg>
  `;
}

function _playerDot(x, y, color) {
  return `<circle cx="${x}" cy="${y}" r="9" fill="${color}" opacity=".9"/>`;
}

export function renderPasteModal() {
  return `
    <div class="modal-backdrop" onclick="App.closePasteModal()">
      <div class="modal" onclick="event.stopPropagation()">
        <div class="modal__header">
          <p class="card__headline" style="margin-bottom:0">📋 COLAR LISTA</p>
          <button class="icon-btn" aria-label="Fechar" onclick="App.closePasteModal()">✕</button>
        </div>
        <p class="modal__body" style="margin-bottom:8px">Um nome por linha:</p>
        <textarea
          id="pasteTextarea"
          class="input"
          rows="8"
          placeholder="João&#10;Pedro&#10;Lucas&#10;Maria..."
          style="resize:vertical;font-size:.95em"></textarea>
        <div class="btn-row" style="margin-top:14px;flex-direction:column;gap:8px">
          <button class="btn btn--primary" onclick="App.confirmPaste('replace')">
            Substituir minha lista
          </button>
          <button class="btn btn--ghost" onclick="App.confirmPaste('merge')">
            Adicionar à lista atual
          </button>
          <button class="btn btn--ghost btn--sm" onclick="App.closePasteModal()">Cancelar</button>
        </div>
      </div>
    </div>
  `;
}

export function renderPlayersList() {
  const { editModal, confirmDeleteId, players } = store;
  const presentCount = presentPlayers().length;
  const allPresent   = players.every(p => p.present !== false);

  const playersList = players.length === 0
    ? `<div class="empty-state">
         <span class="empty-state__icon">👥</span>
         <p>Adicione ao menos 4 jogadores para poder sortear os times.</p>
       </div>`
    : players.map((p, i) => {
        const absent = p.present === false;
        return `
        <div class="player-row ${absent ? 'player-row--absent' : ''} ${p.seed ? 'player-row--seed' : ''}" style="animation-delay:${i * 0.04}s" data-id="${p.id}">
          <button class="presence-btn ${absent ? '' : 'presence-btn--on'}"
            aria-label="${absent ? 'Marcar presente' : 'Marcar ausente'}"
            data-tooltip="${absent ? 'Marcar presente' : 'Marcar ausente'}"
            onclick="App.togglePresence(${p.id})">
            ${absent ? '○' : '●'}
          </button>
          <div class="player-row__icon">${posIcon(p.position)}</div>
          <div class="player-row__info">
            <span class="player-row__name">${escHtml(p.name)}</span>
            <span class="player-row__pos">${posLabel(p.position)}</span>
          </div>
          ${starsDisplay(p.level)}
          <button class="icon-btn seed-btn ${p.seed ? 'seed-btn--on' : ''}"
            aria-label="${p.seed ? 'Remover cabeça de chave' : 'Marcar como cabeça de chave'}"
            data-tooltip="${p.seed ? 'Cabeça de chave' : 'Marcar como cabeça de chave'}"
            onclick="App.toggleSeed(${p.id})">👑</button>
          <button class="icon-btn" aria-label="Editar ${escHtml(p.name)}"
            data-tooltip="Editar"
            onclick="App.editPlayer(${p.id})">✏️</button>
          <button class="icon-btn icon-btn--danger" aria-label="Remover ${escHtml(p.name)}"
            data-tooltip="Remover"
            onclick="App.confirmRemovePlayer(${p.id})">🗑️</button>
        </div>
      `}).join('');

  const confirmPlayer = confirmDeleteId !== null
    ? players.find(p => p.id === confirmDeleteId)
    : null;

  const confirmModal = confirmPlayer ? `
    <div class="modal-backdrop" onclick="App.cancelRemovePlayer()">
      <div class="modal modal--sm" onclick="event.stopPropagation()">
        <p class="modal__title">Remover jogador?</p>
        <p class="modal__body">
          <strong>${escHtml(confirmPlayer.name)}</strong> será removido da lista permanentemente.
        </p>
        <div class="btn-row" style="margin-top:18px">
          <button class="btn btn--primary btn--danger" onclick="App.removePlayer(${confirmPlayer.id})">
            Remover
          </button>
          <button class="btn btn--ghost btn--sm" onclick="App.cancelRemovePlayer()">Cancelar</button>
        </div>
      </div>
    </div>
  ` : '';

  const modal = editModal ? `
    <div class="modal-backdrop" onclick="App.closeEditModal()">
      <div class="modal" onclick="event.stopPropagation()">
        <div class="modal__header">
          <p class="card__headline" style="margin-bottom:0">✏️ EDITAR JOGADOR</p>
          <button class="icon-btn" aria-label="Fechar" onclick="App.closeEditModal()">✕</button>
        </div>
        ${_formFields()}
        <div class="btn-row">
          <button class="btn btn--primary" onclick="App.addOrUpdatePlayer()">
            Salvar alterações
          </button>
          <button class="btn btn--ghost btn--sm" onclick="App.closeEditModal()">Cancelar</button>
        </div>
      </div>
    </div>
  ` : '';

  const pasteModalHtml = store.pasteModal ? renderPasteModal() : '';

  return `
    <div class="fade-up">
      <div class="section-title" style="display:flex;align-items:center;gap:8px">
        <span>Jogadores</span>
        <span class="badge">${players.length}</span>
        <span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
          <button class="btn btn--ghost btn--sm" onclick="App.openPasteModal()">
            📋 Colar
          </button>
          ${players.length > 0 ? `
            <button class="btn btn--ghost btn--sm" onclick="App.copyPlayerNames()">
              📋 Copiar nomes
            </button>
            <button class="btn btn--ghost btn--sm" onclick="App.exportPlayersFile()">
              📤 Exportar
            </button>
          ` : ''}
          <button class="btn btn--ghost btn--sm" onclick="document.getElementById('importFileInput').click()">
            📥 Importar
          </button>
        </span>
        <input id="importFileInput" type="file" accept=".txt" style="display:none"
          onchange="App.importFile(this.files[0]);this.value=''">
      </div>

      ${players.length > 0 ? `
        <div class="presence-bar">
          <span class="presence-bar__count">${presentCount} de ${players.length} presentes</span>
          <button class="presence-bar__toggle"
            data-tooltip="${allPresent ? 'Desmarcar todos' : 'Marcar todos'}"
            onclick="App.toggleAllPresence()">
            ${allPresent ? 'Nenhum' : 'Todos'}
          </button>
        </div>
      ` : ''}

      ${playersList}
    </div>
    ${confirmModal}
    ${modal}
    ${pasteModalHtml}
  `;
}

export function renderImportModal() {
  const { importCandidates } = store;
  const preview = importCandidates.slice(0, 5).map(p => escHtml(p.name)).join(', ');
  const extra   = importCandidates.length > 5 ? ` e mais ${importCandidates.length - 5}...` : '';

  return `
    <div class="modal-backdrop" onclick="App.closeImportModal()">
      <div class="modal" onclick="event.stopPropagation()">
        <div class="modal__header">
          <p class="card__headline" style="margin-bottom:0">📥 IMPORTAR JOGADORES</p>
          <button class="icon-btn" aria-label="Fechar" onclick="App.closeImportModal()">✕</button>
        </div>
        <p class="modal__body">
          <strong>${importCandidates.length} jogadores</strong> recebidos:<br>
          <span style="opacity:.7;font-size:.9em">${preview}${extra}</span>
        </p>
        <div class="btn-row" style="margin-top:18px;flex-direction:column;gap:8px">
          <button class="btn btn--primary" onclick="App.confirmImport('replace')">
            Substituir minha lista
          </button>
          <button class="btn btn--ghost" onclick="App.confirmImport('merge')">
            Adicionar à lista atual
          </button>
          <button class="btn btn--ghost btn--sm" onclick="App.closeImportModal()">Cancelar</button>
        </div>
      </div>
    </div>
  `;
}
