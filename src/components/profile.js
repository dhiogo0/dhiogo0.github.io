import { store } from '../state/store.js';
import { escHtml } from '../utils/helpers.js';
import { APP_VERSION } from '../version.js';

export function renderProfile() {
  const { profile, players, drawHistory, championshipHistory, playersPerTeam, currentUser } = store;

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

      <div class="card share-app-card" style="margin-bottom:16px;text-align:center">
        <p class="share-app-card__emoji">⚽</p>
        <p class="share-app-card__title">Gostou do Racha Fácil?</p>
        <p class="share-app-card__sub">Compartilhe com seus amigos e monte o racha mais equilibrado!</p>
        <button class="btn btn--primary" onclick="App.shareApp()">
          🔗 Compartilhar o app
        </button>
      </div>

      <div class="card" style="margin-bottom:16px">
        <p class="card__headline">👤 MEU PERFIL</p>

        <div class="field">
          <label class="field__label" for="nicknameInput">Apelido do Racha</label>
          <input
            class="input"
            id="nicknameInput"
            type="text"
            placeholder="Como chamam o seu racha?"
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

      ${_renderChampionshipHistory(championshipHistory)}
      ${_renderDrawHistory(drawHistory)}

      <p class="app-version">v${APP_VERSION}</p>

    </div>
  `;
}

function _renderChampionshipHistory(history) {
  if (!history.length) return '';

  const formatLabel = { 'round-robin': 'Pontos Corridos', 'knockout': 'Mata-mata', 'groups+knockout': 'Pontos + Final' };

  const items = history.slice(0, 5).map((c, i) => {
    const champion = c.teams?.find(t => t.id === c.championId);
    const date     = new Date(c.createdAt).toLocaleDateString('pt-BR');
    return `
      <div class="hist-entry" style="animation-delay:${i * 0.05}s">
        <div class="hist-entry__meta">
          <span class="hist-entry__date">📅 ${date}</span>
          <span class="hist-entry__info">${formatLabel[c.format] || c.format} · ${c.teams?.length || 0} times</span>
          <button
            class="btn btn--ghost btn--sm hist-entry__del"
            onclick="App.requestDeleteEntry('championship', '${c.createdAt}')"
            data-tooltip="Excluir">
            🗑️
          </button>
        </div>
        ${champion ? `
          <div class="hist-pills">
            <div class="hist-pill" style="border-color:${champion.color}33;background:${champion.color}0d">
              <span class="hist-pill__dot" style="background:${champion.color}"></span>
              <span class="hist-pill__name">🏆 ${escHtml(champion.name)}</span>
            </div>
          </div>` : ''}
      </div>
    `;
  }).join('');

  return `
    <div class="section-title" style="margin-top:22px;margin-bottom:12px">
      <span>Campeonatos</span>
      <span class="badge">${history.length}</span>
    </div>
    ${items}
  `;
}

function _renderDrawHistory(drawHistory) {
  if (!drawHistory.length) return '';

  const items = drawHistory.slice(0, 5).map((entry, i) => {
    const date  = new Date(entry.date).toLocaleDateString('pt-BR') +
                  ' às ' + new Date(entry.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const nRes  = entry.reserves.length;
    const pills = entry.teams.map(t => `
      <div class="hist-pill" style="border-color:${t.color}33;background:${t.color}0d">
        <span class="hist-pill__dot" style="background:${t.color}"></span>
        <span class="hist-pill__name">${escHtml(t.name)}</span>
      </div>
    `).join('');
    return `
      <div class="hist-entry" style="animation-delay:${i * 0.05}s">
        <div class="hist-entry__meta">
          <span class="hist-entry__date">📅 ${date}</span>
          <span class="hist-entry__info">${entry.teams.length} times · ${entry.playersPerTeam}×${entry.teams.length}${nRes ? ` · ${nRes} reserva${nRes > 1 ? 's' : ''}` : ''}</span>
          <button
            class="btn btn--ghost btn--sm hist-entry__del"
            onclick="App.requestDeleteEntry('draw', ${entry.id})"
            data-tooltip="Excluir">
            🗑️
          </button>
        </div>
        <div class="hist-pills">${pills}</div>
        <button class="btn btn--ghost btn--sm hist-entry__btn" onclick="App.loadDraw(${entry.id})">
          Ver este sorteio →
        </button>
      </div>
    `;
  }).join('');

  return `
    <div class="section-title" style="margin-top:22px;margin-bottom:12px">
      <span>Sorteios Anteriores</span>
      <span class="badge">${drawHistory.length}</span>
    </div>
    ${items}
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
