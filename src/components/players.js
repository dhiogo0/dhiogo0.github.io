import { store, presentPlayers }        from '../state/store.js';
import { POSITIONS }                    from '../data/constants.js';
import { escHtml, posIcon, posLabel, starsDisplay, starsInput } from '../utils/helpers.js';

export function renderPlayers() {
  const { form, editId, players, starHover } = store;
  const presentCount = presentPlayers().length;

  const posButtons = POSITIONS.map(p => `
    <button
      class="pos-btn ${form.position === p.id ? 'pos-btn--active' : ''}"
      onclick="App.setFormField('position','${p.id}');App.render()">
      <span class="pos-btn__emoji">${p.emoji}</span>
      <span class="pos-btn__label">${p.label}</span>
    </button>
  `).join('');

  const allPresent = players.every(p => p.present !== false);

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
            onclick="App.removePlayer(${p.id})">🗑️</button>
        </div>
      `}).join('');

  return `
    <div class="fade-up">
      <div class="card" style="margin-bottom:18px">
        <p class="card__headline">
          ${editId !== null ? '✏️ EDITAR JOGADOR' : '➕ ADICIONAR JOGADOR'}
        </p>

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

        <div class="btn-row">
          <button class="btn btn--primary" onclick="App.addOrUpdatePlayer()">
            ${editId !== null ? 'Salvar alterações' : 'Adicionar jogador'}
          </button>
          ${editId !== null
            ? `<button class="btn btn--ghost btn--sm" data-tooltip="Cancelar edição" onclick="App.cancelEdit()">✕</button>`
            : ''}
        </div>
      </div>

      <div class="section-title">
        <span>Jogadores</span>
        <span class="badge">${players.length}</span>
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

      ${players.length >= 4
        ? `<div style="margin-top:18px">
             <button class="btn btn--primary" onclick="App.goTo('draw')">
               Configurar Sorteio →
             </button>
           </div>`
        : ''}
    </div>
  `;
}
