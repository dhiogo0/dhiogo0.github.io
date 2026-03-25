import { store }                                        from '../state/store.js';
import { getStandings, getSequentialStandings }         from '../logic/championship.js';
import { escHtml }                                      from '../utils/helpers.js';
import { renderTimer, isTimerRunning }                  from './timer.js';

export function renderChampionship() {
  const { championship } = store;

  if (!championship) {
    return `
      <div class="fade-up">
        <div class="empty-state">
          <span class="empty-state__icon">🏆</span>
          <p>Nenhum campeonato ativo.<br>Sorteie os times e toque em <strong>Fazer Campeonato</strong>.</p>
        </div>
      </div>
    `;
  }

  if (championship.status === 'finished') {
    return _renderFinished(championship);
  }

  return _renderOngoing(championship);
}

/* ── Finished ── */

function _renderFinished(c) {
  const champion = c.teams.find(t => t.id === c.championId);
  const body = c.format === 'round-robin'
    ? _renderSeqStandings(c, true)
    : (c.format === 'groups+knockout' ? _renderStandings(c) : '') + _renderMatchList(c, true);

  return `
    <div class="fade-up">
      <div class="champion-banner">
        <div class="champion-banner__trophy">🏆</div>
        <p class="champion-banner__label">CAMPEÃO</p>
        <p class="champion-banner__name" style="color:${champion?.color || 'var(--green)'}">
          ${escHtml(champion?.name || '???')}
        </p>
        <p class="champion-banner__sub">${escHtml(c.name)} · ${_formatLabel(c.format)}</p>
      </div>
      ${body}
      <div style="margin-top:16px">
        <button class="btn btn--ghost" onclick="App.newChampionship()">+ Novo campeonato</button>
      </div>
    </div>
  `;
}

/* ── Ongoing ── */

function _renderOngoing(c) {
  if (c.format === 'round-robin') return _renderSequential(c);

  return `
    <div class="fade-up">
      ${renderTimer()}
      <div class="champ-header">
        <p class="champ-header__name">${escHtml(c.name)}</p>
        <span class="badge">${_formatLabel(c.format)}</span>
      </div>
      ${c.format === 'groups+knockout' ? _renderStandings(c) : ''}
      ${_renderMatchList(c, false, isTimerRunning())}
    </div>
  `;
}

/* ── Sequential (Pontos Corridos) ── */

function _renderSequential(c) {
  const home  = c.teams.find(t => t.id === c.currentHomeId);
  const away  = c.teams.find(t => t.id === c.currentAwayId);
  const queue = c.queue.map(id => c.teams.find(t => t.id === id)).filter(Boolean);
  const { confirmEndChampionship, championshipUndo } = store;
  const timerRunning = isTimerRunning();

  const queuePreview = queue.length
    ? queue.map(t => `<span class="seq-queue-team"><span class="standings-dot standings-dot--sm" style="background:${t.color}"></span>${escHtml(t.name)}</span>`).join('<span class="seq-queue-arrow">→</span>')
    : '<span style="color:var(--dimmed);font-size:12px">Nenhum time na fila</span>';

  return `
    <div class="fade-up">
      ${renderTimer()}
      <div class="champ-header">
        <p class="champ-header__name">${escHtml(c.name)}</p>
        <span class="badge">${_formatLabel(c.format)}</span>
      </div>

      <div class="current-match-card">
        <p class="current-match-label">EM QUADRA</p>
        <div class="current-match-teams">
          <div class="current-match-team">
            <span class="current-match-dot" style="background:${home?.color}"></span>
            <span class="current-match-name">${escHtml(home?.name || '?')}</span>
          </div>
          <span class="current-match-vs">VS</span>
          <div class="current-match-team current-match-team--right">
            <span class="current-match-name">${escHtml(away?.name || '?')}</span>
            <span class="current-match-dot" style="background:${away?.color}"></span>
          </div>
        </div>
        ${timerRunning ? `
          <div class="timer-blocking-msg">Aguarde o fim do cronômetro para registrar o resultado</div>
        ` : `
        <div class="result-btns">
          <button class="result-btn result-btn--win" onclick="App.registerResult('home')"
            style="--team-color:${home?.color || 'var(--green)'}">
            <span class="result-btn__icon">🏆</span>
            <span class="result-btn__name">${escHtml(home?.name || '?')}</span>
          </button>
          <button class="result-btn result-btn--draw" onclick="App.registerResult('draw')">
            <span class="result-btn__icon">🤝</span>
            <span class="result-btn__name">Empate</span>
          </button>
          <button class="result-btn result-btn--win" onclick="App.registerResult('away')"
            style="--team-color:${away?.color || 'var(--green)'}">
            <span class="result-btn__icon">🏆</span>
            <span class="result-btn__name">${escHtml(away?.name || '?')}</span>
          </button>
        </div>
        ${championshipUndo ? `
          <button class="btn btn--ghost btn--sm seq-undo-btn" onclick="App.undoResult()">
            ↩ Desfazer último resultado
          </button>
        ` : ''}
        `}
      </div>

      ${queue.length ? `
        <div class="seq-queue">
          <span class="seq-queue-label">Na fila:</span>
          ${queuePreview}
        </div>` : ''}

      ${_renderSeqStandings(c, false)}
      ${_renderAuditLog(c)}

      <div style="margin-top:16px">
        ${confirmEndChampionship ? `
          <div class="confirm-end">
            <p class="confirm-end__text">Encerrar e definir o campeão?</p>
            <div class="btn-row">
              <button class="btn btn--ghost" style="flex:1" onclick="App.cancelEndChampionship()">Cancelar</button>
              <button class="btn btn--danger" style="flex:1" onclick="App.confirmEndChampionship()">Encerrar</button>
            </div>
          </div>
        ` : `
          <button class="btn btn--ghost" onclick="App.endChampionship()">Encerrar Campeonato</button>
        `}
      </div>
    </div>
  `;
}

function _renderSeqStandings(c, finished) {
  const rows    = getSequentialStandings(c);
  const playing = finished ? [] : [c.currentHomeId, c.currentAwayId];

  return `
    <div class="section-title" style="margin-bottom:8px"><span>Classificacao</span></div>
    <div class="card" style="padding:0;overflow:hidden;margin-bottom:16px">
      <table class="standings-table">
        <thead>
          <tr>
            <th>#</th>
            <th class="standings-th--team">Time</th>
            <th>Pts</th>
            <th>V</th>
            <th>E</th>
            <th>D</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r, i) => {
            const team    = c.teams.find(t => t.id === r.teamId);
            const onCourt = playing.includes(r.teamId);
            return `
              <tr>
                <td class="standings-pos">${i + 1}</td>
                <td>
                  <span class="standings-dot" style="background:${team?.color || '#aaa'}"></span>
                  ${escHtml(team?.name || '?')}
                  ${onCourt ? '<span class="seq-oncourt">em quadra</span>' : ''}
                </td>
                <td class="standings-pts">${r.pts}</td>
                <td>${r.w}</td>
                <td>${r.d}</td>
                <td>${r.l}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      ${!finished && c.matches.length === 0 ? '<p class="standings-qualify-note">Nenhuma partida registrada ainda</p>' : ''}
    </div>
  `;
}

/* ── Standings ── */

function _renderStandings(c) {
  const rows = getStandings(c);
  const champion = c.format === 'groups+knockout'
    ? rows.slice(0, 2).map(r => r.teamId)
    : [];

  return `
    <div class="champ-standings">
      <div class="section-title" style="margin-bottom:8px"><span>Classificação</span></div>
      <div class="card" style="padding:0;overflow:hidden;margin-bottom:16px">
        <table class="standings-table">
          <thead>
            <tr>
              <th>#</th>
              <th class="standings-th--team">Time</th>
              <th>Pts</th>
              <th>J</th>
              <th>V</th>
              <th>E</th>
              <th>D</th>
              <th>SG</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => {
              const team = c.teams.find(t => t.id === r.teamId);
              const j    = r.w + r.d + r.l;
              const sg   = r.gf - r.ga;
              const qual = champion.includes(r.teamId);
              return `
                <tr class="${qual ? 'standings-row--qualify' : ''}">
                  <td class="standings-pos">${i + 1}</td>
                  <td>
                    <span class="standings-dot" style="background:${team?.color || '#aaa'}"></span>
                    ${escHtml(team?.name || '?')}
                  </td>
                  <td class="standings-pts">${r.pts}</td>
                  <td>${j}</td>
                  <td>${r.w}</td>
                  <td>${r.d}</td>
                  <td>${r.l}</td>
                  <td>${sg > 0 ? '+' + sg : sg}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        ${champion.length ? `<p class="standings-qualify-note">Top 2 avancam para a final</p>` : ''}
      </div>
    </div>
  `;
}

/* ── Match list ── */

function _renderMatchList(c, readonly, timerRunning = false) {
  const { scoringMatchId, penaltyMatchId } = store;
  const groups = {};

  for (const m of c.matches) {
    const key = m.phase === 'group' ? `Rodada ${m.round}` : _phaseLabel(m.phase);
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  }

  return Object.entries(groups)
    .sort((a, b) => _groupSortKey(a[0]) - _groupSortKey(b[0]))
    .map(([label, matches]) => `
      <div class="section-title" style="margin-bottom:8px"><span>${label}</span></div>
      ${matches.map(m => _renderMatchCard(c, m, readonly, scoringMatchId, timerRunning, penaltyMatchId)).join('')}
    `).join('');
}

function _renderMatchCard(c, m, readonly, scoringId, timerRunning = false, penaltyMatchId = null) {
  const home  = c.teams.find(t => t.id === m.homeTeamId);
  const away  = c.teams.find(t => t.id === m.awayTeamId);
  const homeN = home ? escHtml(home.name) : 'A definir';
  const awayN = away ? escHtml(away.name) : 'A definir';
  const homeDot = home ? `<span class="standings-dot standings-dot--sm" style="background:${home.color}"></span>` : '';
  const awayDot = away ? `<span class="standings-dot standings-dot--sm" style="background:${away.color}"></span>` : '';

  if (m.status === 'waiting') {
    return `
      <div class="match-card match-card--waiting">
        <span class="match-tbd">${homeN} × ${awayN}</span>
        <span class="match-waiting-label">Aguardando...</span>
      </div>
    `;
  }

  if (m.status === 'done') {
    const homeWon = m.winnerId === m.homeTeamId;
    const awayWon = m.winnerId === m.awayTeamId;
    const penLabel = m.homePenalties != null
      ? `<span class="match-penalties">(pen. ${m.homePenalties}–${m.awayPenalties})</span>`
      : '';
    return `
      <div class="match-card match-card--done">
        <span class="match-team ${homeWon ? 'match-team--winner' : ''}">${homeDot}${homeN}</span>
        <span class="match-scoreline">${m.homeScore} × ${m.awayScore}${penLabel}</span>
        <span class="match-team match-team--right ${awayWon ? 'match-team--winner' : ''}">${awayN}${awayDot}</span>
        ${!readonly && !timerRunning && m.phase === 'group'
          ? `<button class="btn btn--ghost btn--sm match-edit-btn" onclick="App.startScore(${m.id})">✏️</button>`
          : ''}
      </div>
    `;
  }

  // pending — pênaltis?
  if (penaltyMatchId === m.id) {
    return `
      <div class="match-card match-card--scoring">
        <p class="score-form__penalty-header">⚽ Empate! Definir por pênaltis</p>
        <div class="score-form">
          <span class="score-form__team">${homeDot}${homeN}</span>
          <input type="number" class="score-input" id="php-${m.id}" min="0" max="99" value="0" />
          <span class="score-form__sep">×</span>
          <input type="number" class="score-input" id="pap-${m.id}" min="0" max="99" value="0" />
          <span class="score-form__team">${awayDot}${awayN}</span>
        </div>
        <div class="score-form__actions">
          <button class="btn btn--ghost btn--sm" onclick="App.cancelPenalties()">Cancelar</button>
          <button class="btn btn--primary btn--sm" onclick="App.confirmPenalties(${m.id})">Confirmar</button>
        </div>
      </div>
    `;
  }

  // pending — scoring active?
  if (scoringId === m.id) {
    return `
      <div class="match-card match-card--scoring">
        <div class="score-form">
          <span class="score-form__team">${homeDot}${homeN}</span>
          <input type="number" class="score-input" id="sh-${m.id}" min="0" max="99" value="0" />
          <span class="score-form__sep">×</span>
          <input type="number" class="score-input" id="sa-${m.id}" min="0" max="99" value="0" />
          <span class="score-form__team">${awayDot}${awayN}</span>
        </div>
        <div class="score-form__actions">
          <button class="btn btn--ghost btn--sm" onclick="App.cancelScore()">Cancelar</button>
          <button class="btn btn--primary btn--sm" onclick="App.confirmScore(${m.id})">Confirmar</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="match-card match-card--pending">
      <span class="match-team">${homeDot}${homeN}</span>
      <span class="match-vs">×</span>
      <span class="match-team">${awayDot}${awayN}</span>
      <button class="btn btn--primary btn--sm match-score-btn"
        onclick="App.startScore(${m.id})"
        ${timerRunning ? 'disabled' : ''}>
        Placar
      </button>
    </div>
  `;
}

/* ── Audit Log ── */

function _renderAuditLog(c) {
  const log = c.log;
  if (!log?.length) return '';

  const rows = log.map(e => {
    const time = new Date(e.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let icon, desc;
    if (e.type === 'undo') {
      icon = '↩';
      const orig = e.result === 'draw'
        ? `Empate ${escHtml(e.homeTeamName)} × ${escHtml(e.awayTeamName)}`
        : `Vitória de ${escHtml(e.winner)}`;
      desc = `<span class="audit-undo">Desfeito: ${orig}</span>`;
    } else if (e.result === 'draw') {
      icon = '🤝';
      desc = `Empate: ${escHtml(e.homeTeamName)} × ${escHtml(e.awayTeamName)} <span class="audit-pts">+${e.pts}pt</span>`;
    } else {
      icon = '🏆';
      desc = `${escHtml(e.winner)} venceu <span class="audit-pts">+${e.pts}pts</span>`;
    }

    return `
      <div class="audit-row ${e.type === 'undo' ? 'audit-row--undo' : ''}">
        <span class="audit-icon">${icon}</span>
        <span class="audit-desc">${desc}</span>
        <span class="audit-time">${time}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="section-title" style="margin-top:16px;margin-bottom:8px"><span>Histórico</span></div>
    <div class="audit-log">${rows}</div>
  `;
}

/* ── Helpers ── */

function _formatLabel(format) {
  return { 'round-robin': 'Pontos Corridos', 'knockout': 'Mata-mata', 'groups+knockout': 'Pontos + Final' }[format] || format;
}

function _phaseLabel(phase) {
  return { final: 'Final', semifinal: 'Semifinal', quartas: 'Quartas de Final' }[phase] || phase;
}

function _groupSortKey(key) {
  if (key.startsWith('Rodada')) return -1000 + parseInt(key.split(' ')[1]);
  return { 'Quartas de Final': 1, 'Semifinal': 2, 'Final': 3 }[key] ?? 0;
}
