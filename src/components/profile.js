import { store } from '../state/store.js';
import { escHtml } from '../utils/helpers.js';

export function renderProfile() {
  const { profile, players, drawHistory, playersPerTeam, currentUser } = store;

  const totalDraws   = drawHistory.length;
  const totalPlayers = players.length;
  const mostUsed     = _mostUsedFormat(drawHistory);

  const presets = [5, 6, 7, 11].map(n => `
    <button
      class="preset-btn ${playersPerTeam === n ? 'preset-btn--active' : ''}"
      onclick="App.updateProfile('defaultPlayersPerTeam', ${n});App.render()">
      ${n}v${n}
    </button>
  `).join('');

  const authSection = currentUser
    ? `<div class="auth-card auth-card--signed">
        <img class="auth-avatar" src="${escHtml(currentUser.photoURL || '')}" alt="${escHtml(currentUser.displayName || '')}"/>
        <div class="auth-card__user">
          <p class="auth-card__name">${escHtml(currentUser.displayName || 'Usuário')}</p>
          <p class="auth-card__email">${escHtml(currentUser.email || '')}</p>
        </div>
        <button class="btn btn--ghost btn--sm" onclick="App.signOut()">Sair</button>
      </div>`
    : `<div class="auth-card">
        <p class="auth-card__title">Sincronize seus dados</p>
        <p class="auth-card__sub">Jogadores e histórico disponíveis em qualquer dispositivo</p>
        <button class="btn-google" onclick="App.signIn()">
          <span class="btn-google__icon">G</span>
          Entrar com Google
        </button>
      </div>`;

  return `
    <div class="fade-up">

      ${authSection}

      <div class="card" style="margin-bottom:16px">
        <p class="card__headline">👤 MEU PERFIL</p>

        <div class="field">
          <label class="field__label" for="nicknameInput">Apelido</label>
          <input
            class="input"
            id="nicknameInput"
            type="text"
            placeholder="Como te chamam no racha?"
            maxlength="30"
            value="${escHtml(profile.nickname)}"
            onblur="App.updateProfile('nickname', this.value)"
            onkeydown="if(event.key==='Enter')this.blur()"
          />
          <p class="profile-hint">Usado no cabeçalho do compartilhamento no Zap</p>
        </div>

        <div class="field" style="margin-bottom:0">
          <label class="field__label">Tamanho padrão do time</label>
          <div class="counter-row" style="margin-bottom:12px">
            <button class="counter-btn"
              onclick="App.updateProfile('defaultPlayersPerTeam', Math.max(2,${playersPerTeam}-1));App.render()">−</button>
            <div class="counter-center">
              <span class="counter-num">${playersPerTeam}</span>
              <span class="counter-label">por time</span>
            </div>
            <button class="counter-btn"
              onclick="App.updateProfile('defaultPlayersPerTeam', Math.min(15,${playersPerTeam}+1));App.render()">+</button>
          </div>
          <div class="presets">${presets}</div>
        </div>
      </div>

      <div class="section-title" style="margin-bottom:12px">
        <span>Estatísticas</span>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-card__num">${totalDraws}</span>
          <span class="stat-card__label">Sorteios</span>
        </div>
        <div class="stat-card">
          <span class="stat-card__num">${totalPlayers}</span>
          <span class="stat-card__label">Jogadores</span>
        </div>
        <div class="stat-card stat-card--wide">
          <span class="stat-card__num">${mostUsed}</span>
          <span class="stat-card__label">Formato mais usado</span>
        </div>
      </div>

    </div>
  `;
}

function _mostUsedFormat(history) {
  if (!history.length) return '—';
  const counts = {};
  history.forEach(e => {
    const k = `${e.playersPerTeam}v${e.playersPerTeam}`;
    counts[k] = (counts[k] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}
