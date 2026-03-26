import { store, numTeams, reserveCount, presentPlayers } from '../state/store.js';
import { renderInteractiveField }        from './players.js';

const PRESETS = [5, 6, 7, 11];

export function renderConfig() {
  const { playersPerTeam, players } = store;
  const nt  = numTeams();
  const rc  = reserveCount();
  const present = presentPlayers();
  const ppt = playersPerTeam;

  const presets = PRESETS
    .filter(n => n <= players.length)
    .map(n => `
      <button
        class="preset-btn ${playersPerTeam === n ? 'preset-btn--active' : ''}"
        data-tooltip="${n} por time"
        onclick="App.setPlayersPerTeam(${n})">
        ${n}v${n}
      </button>
    `).join('');

  return `
    <div class="fade-up">
      <div class="card">
        <p class="card__headline">⚙️ CONFIGURAÇÃO</p>

        <label class="field__label">Jogadores por time</label>
        <div class="counter-row">
          <button class="counter-btn"
            data-tooltip="Menos jogadores"
            onclick="App.setPlayersPerTeam(Math.max(2,${playersPerTeam}-1))">−</button>
          <div class="counter-center">
            <span class="counter-num">${playersPerTeam}</span>
            <span class="counter-label">por time</span>
          </div>
          <button class="counter-btn"
            data-tooltip="Mais jogadores"
            onclick="App.setPlayersPerTeam(Math.min(${players.length},${playersPerTeam}+1))">+</button>
        </div>

        <div class="presets">${presets}</div>

        <div class="preview-box">
          <p class="preview-box__label">Preview do sorteio</p>
          <div class="preview-grid">
            <div class="preview-cell">
              <span class="preview-num">${Math.max(0, nt)}</span>
              <span class="preview-sub">⚽ Times</span>
            </div>
            <div class="preview-cell">
              <span class="preview-num">${playersPerTeam}×${Math.max(0, nt)}</span>
              <span class="preview-sub">👤 Jog.</span>
            </div>
            <div class="preview-cell">
              <span class="preview-num">${rc}</span>
              <span class="preview-sub">🔄 Reservas</span>
            </div>
          </div>
          ${nt < 2
            ? `<div class="warn-box">⚠️ Diminua o número de jogadores por time para ter ao menos 2 times.</div>`
            : ''}
        </div>
      </div>

      <div style="margin-top:16px">
        <button
          class="btn btn--primary btn--draw"
          data-tooltip="Embaralhar e criar os times"
          onclick="App.draw()"
          ${nt < 2 ? 'disabled' : ''}>
          ⚽ SORTEAR TIMES!
        </button>
      </div>

      <div class="config-bottom">
        <div class="field-wrap" data-morph-key="field-${ppt}-${present.length}">
          <p class="field-caption">Como vão ficar os times no campo</p>
          ${renderInteractiveField(present, nt, ppt)}
        </div>
      </div>
    </div>
  `;
}
