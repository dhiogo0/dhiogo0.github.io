import { store, presentPlayers }        from '../state/store.js';
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
  return `
    <div class="fade-up">
      <div class="card">
        <p class="card__headline">+ ADICIONAR JOGADOR</p>
        ${_formFields()}
        <div class="btn-row">
          <button class="btn btn--primary" onclick="App.addOrUpdatePlayer()">
            Adicionar jogador
          </button>
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
        <div class="player-row ${absent ? 'player-row--absent' : ''}" style="animation-delay:${i * 0.04}s" data-id="${p.id}">
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

  return `
    <div class="fade-up">
      <div class="section-title" style="display:flex;align-items:center;gap:8px">
        <span>Jogadores</span>
        <span class="badge">${players.length}</span>
        <span style="margin-left:auto;display:flex;gap:6px">
          <button class="btn btn--ghost btn--sm" onclick="document.getElementById('importFileInput').click()">
            📥 Importar
          </button>
          ${players.length > 0 ? `
            <button class="btn btn--ghost btn--sm" onclick="App.exportPlayersFile()">
              📤 Exportar
            </button>
          ` : ''}
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
