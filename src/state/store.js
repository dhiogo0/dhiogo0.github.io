import {
  loadPlayers, savePlayers, loadHistory, saveHistory, loadProfile, saveProfile,
  loadChampionship, saveChampionship, clearChampionship,
  loadChampionshipHistory, saveChampionshipHistory,
} from '../utils/storage.js';
import {
  createChampionship as _createChampionship,
  registerScore,
  registerSequentialResult,
  finishSequentialChampionship,
  repropagateKnockout,
} from '../logic/championship.js';
import { snakeDraft }  from '../logic/balance.js';
import { showToast }   from '../utils/toast.js';

const INITIAL_FORM = { name: '', position: 'MID', level: 3 };

const _savedProfile = loadProfile();
const _savedChampionship = loadChampionship();
if (_savedChampionship) repropagateKnockout(_savedChampionship);

export const store = {
  step:            0,
  players:         loadPlayers(),
  form:            { ...INITIAL_FORM },
  editId:          null,
  editModal:       false,
  confirmDeleteId: null,
  importModal:      false,
  importCandidates: [],
  playersPerTeam:  _savedProfile.defaultPlayersPerTeam || 5,
  teams:           [],
  reserves:        [],
  gks:             [],
  gkAssignments:   [],
  swapMode:        false,
  swapSelected:    null,
  history:             [],
  starHover:           0,
  readOnly:            false,
  renamingTeamId:      null,
  drawHistory:         loadHistory(),
  currentUser:         null,
  championship:          _savedChampionship,
  championshipHistory:   loadChampionshipHistory(),
  championshipModal:     false,
  championshipFormat:    'round-robin',
  scoringMatchId:        null,
  penaltyMatchId:        null,
  pendingScore:          null,
  confirmEndChampionship: false,
  championshipUndo:      null,
  profile: {
    nickname:              _savedProfile.nickname              || '',
    defaultPlayersPerTeam: _savedProfile.defaultPlayersPerTeam || 5,
  },
};

/* ── Computed ── */
export function presentPlayers() {
  return store.players.filter(p => p.present !== false);
}

export function presentOutfield() {
  return store.players.filter(p => p.present !== false && p.position !== 'GK');
}

export function presentGks() {
  return store.players.filter(p => p.present !== false && p.position === 'GK');
}

export function numTeams() {
  return Math.floor(presentOutfield().length / store.playersPerTeam);
}

export function reserveCount() {
  return presentOutfield().length - numTeams() * store.playersPerTeam;
}

export function togglePresence(id) {
  store.players = store.players.map(p =>
    p.id === id ? { ...p, present: p.present === false } : p
  );
}

export function toggleAllPresence() {
  const allPresent = store.players.every(p => p.present !== false);
  store.players = store.players.map(p => ({ ...p, present: !allPresent }));
}

/* ── Actions ── */
export function setStep(n) {
  store.step           = n;
  store.swapMode       = false;
  store.swapSelected   = null;
  store.renamingTeamId = null;
}

export function setFormField(key, value) {
  store.form[key] = value;
}

export function setStarHover(val) {
  store.starHover = val;
}

export function addOrUpdatePlayer() {
  const { name, position, level } = store.form;
  if (!name.trim()) {
    showToast('Digite o nome!', 'error');
    return false;
  }
  if (store.editId !== null) {
    store.players = store.players.map(p =>
      p.id === store.editId ? { ...p, name: name.trim(), position, level } : p
    );
    store.editId    = null;
    store.editModal = false;
    showToast('Jogador atualizado!');
  } else {
    store.players.push({ id: Date.now(), name: name.trim(), position, level });
    showToast('Jogador adicionado!');
  }
  store.form = { ...INITIAL_FORM };
  savePlayers(store.players);
  return true;
}

export function startEditPlayer(player) {
  store.form      = { name: player.name, position: player.position, level: player.level };
  store.editId    = player.id;
  store.editModal = true;
}

export function cancelEdit() {
  store.editId    = null;
  store.editModal = false;
  store.form      = { ...INITIAL_FORM };
}

export function removePlayer(id) {
  store.players = store.players.filter(p => p.id !== id);
  savePlayers(store.players);
}

export function setPlayersPerTeam(n) {
  store.playersPerTeam = Number(n);
  store.profile.defaultPlayersPerTeam = Number(n);
  saveProfile(store.profile);
}

export function updateProfile(key, value) {
  store.profile[key] = value;
  if (key === 'defaultPlayersPerTeam') {
    store.playersPerTeam = Number(value);
  }
  saveProfile(store.profile);
}

let _drawing = false;

export function draw(onDone) {
  if (_drawing) return;
  _drawing = true;
  store.step = 2;
  setTimeout(() => {
    const gkPlayers = presentGks();
    const shuffled  = [...presentOutfield()].sort(() => Math.random() - 0.5);
    const result    = snakeDraft(shuffled, store.playersPerTeam);
    store.teams          = result.teams;
    store.reserves       = result.reserves;
    store.gks            = gkPlayers;
    store.gkAssignments  = gkPlayers.map(gk => gk.id);
    store.history        = [];
    store.swapMode       = false;
    store.swapSelected   = null;
    store.readOnly       = false;
    store.step           = 3;
    _drawing           = false;
    _pushDrawHistory();
    onDone();
  }, 2200);
}

export function toggleSwapMode() {
  store.swapMode     = !store.swapMode;
  store.swapSelected = null;
}

export function clickTeamPlayer(teamId, playerId) {
  const sel = store.swapSelected;
  if (!sel) {
    store.swapSelected = { teamId, playerId };
    return;
  }
  if (sel.teamId === teamId && sel.playerId === playerId) {
    store.swapSelected = null;
    return;
  }
  const t1 = store.teams.find(t => t.id === sel.teamId);
  const t2 = store.teams.find(t => t.id === teamId);
  if (!t1 || !t2) { store.swapSelected = null; return; }
  const p1 = t1.players.find(p => p.id === sel.playerId);
  const p2 = t2.players.find(p => p.id === playerId);
  if (!p1 || !p2) { store.swapSelected = null; return; }

  _snapshot();
  t1.players = t1.players.map(p => p.id === sel.playerId ? { ...p2 } : p);
  t2.players = t2.players.map(p => p.id === playerId     ? { ...p1 } : p);
  store.swapSelected = null;
  showToast('Troca feita!');
}

export function clickReserve(reserveId) {
  const sel = store.swapSelected;
  if (!sel) return;
  const team       = store.teams.find(t => t.id === sel.teamId);
  const teamPlayer = team?.players.find(p => p.id === sel.playerId);
  const reserve    = store.reserves.find(r => r.id === reserveId);
  if (!teamPlayer || !reserve) return;

  _snapshot();
  team.players   = team.players.map(p => p.id === sel.playerId ? { ...reserve }    : p);
  store.reserves = store.reserves.map(r => r.id === reserveId  ? { ...teamPlayer } : r);
  store.swapSelected = null;
  showToast('Reserva entrou!');
}

export function undo() {
  if (!store.history.length) return;
  const prev     = store.history.pop();
  store.teams    = prev.teams;
  store.reserves = prev.reserves;
  showToast('Troca desfeita!');
}

export function startRenameTeam(teamId) {
  store.renamingTeamId = teamId;
}

export function commitRenameTeam(teamId, newName) {
  if (store.renamingTeamId !== teamId) return;
  const t = store.teams.find(t => t.id === teamId);
  if (t && newName.trim()) t.name = newName.trim();
  store.renamingTeamId = null;
}

export function cancelRenameTeam() {
  store.renamingTeamId = null;
}

export function moveGk(gkId, direction) {
  const idx = store.gkAssignments.indexOf(gkId);
  if (idx === -1) return;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= store.gkAssignments.length) return;
  const arr = [...store.gkAssignments];
  [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
  store.gkAssignments = arr;
}

export function loadDraw(id) {
  const entry = store.drawHistory.find(e => e.id === id);
  if (!entry) return;
  store.teams          = JSON.parse(JSON.stringify(entry.teams));
  store.reserves       = JSON.parse(JSON.stringify(entry.reserves));
  store.gks            = JSON.parse(JSON.stringify(entry.gks || []));
  store.gkAssignments  = [...(entry.gkAssignments || [])];
  store.swapMode       = false;
  store.swapSelected = null;
  store.history      = [];
  store.renamingTeamId = null;
  store.readOnly     = true;
  store.step         = 3;
}

export function exportWhatsapp() {
  const name = store.profile.nickname
    ? store.profile.nickname.toUpperCase()
    : 'DO DIA';
  let txt = `⚽ *RACHA ${name}* ⚽\n\n`;
  store.teams.forEach(t => {
    txt += `*${t.name}*\n`;
    t.players.forEach(p => {
      txt += `${_emojiForPos(p.position)} ${p.name} — ${'⭐'.repeat(p.level)}\n`;
    });
    const avg = (t.players.reduce((s, p) => s + p.level, 0) / t.players.length).toFixed(1);
    txt += `_Média: ${avg} ⭐_\n\n`;
  });
  if (store.reserves.length) {
    txt += '*🔄 Reservas*\n';
    store.reserves.forEach(p => { txt += `${_emojiForPos(p.position)} ${p.name}\n`; });
  }
  if (store.gks.length) {
    txt += '\n*🧤 Goleiros*\n';
    const isTeamMode = store.gks.length === store.teams.length;
    const isRotation = !isTeamMode && store.gks.length === 3;
    store.gkAssignments.forEach((gkId, idx) => {
      const gk = store.gks.find(g => g.id === gkId);
      if (!gk) return;
      let assign;
      if (isTeamMode)        assign = store.teams[idx]?.name || '—';
      else if (isRotation)   assign = idx < 2 ? `Em quadra (Lado ${idx === 0 ? 'A' : 'B'})` : 'Aguardando';
      else                   assign = idx === 0 ? 'Lado A' : idx === 1 ? 'Lado B' : 'Aguardando';
      txt += `🧤 ${gk.name} — ${assign}\n`;
    });
  }
  window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(txt), '_blank');
}

/* ── Championship actions ── */

export function openChampionshipModal() {
  store.championshipModal  = true;
  store.championshipFormat = 'round-robin';
}

export function closeChampionshipModal() {
  store.championshipModal = false;
}

export function setChampionshipFormat(format) {
  store.championshipFormat = format;
}

export function createChampionshipFromDraw() {
  const c = _createChampionship(store.teams, store.championshipFormat);
  store.championship      = c;
  store.championshipModal = false;
  saveChampionship(c);
  setStep(4);
}

export function registerMatchScore(matchId, homeScore, awayScore, penalties = null) {
  if (!store.championship) return;
  registerScore(store.championship, matchId, homeScore, awayScore, penalties);
  repropagateKnockout(store.championship);
  store.scoringMatchId = null;
  store.penaltyMatchId = null;
  store.pendingScore   = null;
  saveChampionship(store.championship);

  if (store.championship.status === 'finished') {
    _archiveChampionship();
  }
}

export function setScoringMatch(matchId) {
  store.scoringMatchId = matchId;
}

export function cancelScoringMatch() {
  store.scoringMatchId = null;
}

export function setPenaltyMatch(matchId, homeScore, awayScore) {
  store.penaltyMatchId = matchId;
  store.pendingScore   = { homeScore, awayScore };
  store.scoringMatchId = null;
}

export function clearPenaltyMatch() {
  store.penaltyMatchId = null;
  store.pendingScore   = null;
}

export function registerSequentialResultAction(result) {
  if (!store.championship) return;
  const c    = store.championship;
  const home = c.teams.find(t => t.id === c.currentHomeId);
  const away = c.teams.find(t => t.id === c.currentAwayId);

  store.championshipUndo = {
    currentHomeId: c.currentHomeId,
    currentAwayId: c.currentAwayId,
    queue:         [...c.queue],
    matches:       JSON.parse(JSON.stringify(c.matches)),
  };

  if (!c.log) c.log = [];
  c.log.unshift({
    type:         'add',
    at:           Date.now(),
    homeTeamName: home?.name || '?',
    awayTeamName: away?.name || '?',
    result,
    winner:       result === 'home' ? home?.name
                : result === 'away' ? away?.name
                : null,
    pts:          result === 'draw' ? 1 : 3,
  });

  registerSequentialResult(c, result);
  saveChampionship(c);
}

export function undoSequentialResult() {
  if (!store.championship || !store.championshipUndo) return;
  const c    = store.championship;
  const snap = store.championshipUndo;

  if (!c.log) c.log = [];
  const lastAdd = c.log.find(e => e.type === 'add');
  if (lastAdd) {
    c.log.unshift({
      type:         'undo',
      at:           Date.now(),
      homeTeamName: lastAdd.homeTeamName,
      awayTeamName: lastAdd.awayTeamName,
      result:       lastAdd.result,
      winner:       lastAdd.winner,
    });
  }

  c.currentHomeId        = snap.currentHomeId;
  c.currentAwayId        = snap.currentAwayId;
  c.queue                = snap.queue;
  c.matches              = snap.matches;
  store.championshipUndo = null;
  saveChampionship(c);
}

export function requestEndChampionship() {
  store.confirmEndChampionship = true;
}

export function cancelEndChampionship() {
  store.confirmEndChampionship = false;
}

export function confirmEndChampionship() {
  if (!store.championship) return;
  const c = store.championship;
  if (c.format === 'round-robin') {
    finishSequentialChampionship(c);
  } else {
    c.status     = 'finished';
    c.finishedAt = new Date().toISOString();
    const fin = c.matches.find(m => m.phase === 'final' && m.status === 'done');
    c.championId = fin?.winnerId ?? null;
  }
  store.confirmEndChampionship = false;
  saveChampionship(c);
  _archiveChampionship();
}

export function archiveAndClearChampionship() {
  store.championship           = null;
  store.scoringMatchId         = null;
  store.confirmEndChampionship = false;
  clearChampionship();
}

function _archiveChampionship() {
  const c = store.championship;
  if (!c) return;
  store.championshipHistory = [c, ...store.championshipHistory].slice(0, 20);
  saveChampionshipHistory(store.championshipHistory);
}

/* ── Import / Export ── */
export async function exportPlayersFile() {
  if (!store.players.length) {
    showToast('Nenhum jogador para exportar.', 'error');
    return;
  }
  const lines = store.players.map(p => `${p.name}|${p.position}|${p.level}`).join('\n');
  const file  = new File([lines], 'racha-facil.txt', { type: 'text/plain' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Lista de Jogadores — Racha Fácil' });
    } catch (e) {
      if (e.name !== 'AbortError') showToast('Erro ao compartilhar.', 'error');
    }
  } else {
    const url = URL.createObjectURL(file);
    const a   = Object.assign(document.createElement('a'), { href: url, download: 'racha-facil.txt' });
    a.click();
    URL.revokeObjectURL(url);
  }
}

export function parsePlayersText(text) {
  return text.trim().split('\n').filter(Boolean).map(line => {
    const [name, position, level] = line.split('|');
    return { name: name?.trim(), position: position?.trim() || 'MID', level: parseInt(level) || 3 };
  }).filter(p => p.name);
}

export function openImportModal(players) {
  store.importCandidates = players;
  store.importModal      = true;
}

export function closeImportModal() {
  store.importModal      = false;
  store.importCandidates = [];
}

export function confirmImport(mode) {
  const base = Date.now();
  const newPlayers = store.importCandidates.map((p, i) => ({
    id:       base + i,
    name:     p.name,
    position: p.position || 'MID',
    level:    p.level    || 3,
    present:  true,
  }));
  store.players = mode === 'replace'
    ? newPlayers
    : [...store.players, ...newPlayers];
  savePlayers(store.players);
  store.importModal      = false;
  store.importCandidates = [];
  showToast(`${newPlayers.length} jogadores importados!`);
}

/* ── Internals ── */
function _snapshot() {
  store.history.push({
    teams:    JSON.parse(JSON.stringify(store.teams)),
    reserves: JSON.parse(JSON.stringify(store.reserves)),
  });
}

function _pushDrawHistory() {
  const entry = {
    id:             Date.now(),
    date:           new Date().toISOString(),
    playersPerTeam: store.playersPerTeam,
    teams:          JSON.parse(JSON.stringify(store.teams)),
    reserves:       JSON.parse(JSON.stringify(store.reserves)),
    gks:            JSON.parse(JSON.stringify(store.gks)),
    gkAssignments:  [...store.gkAssignments],
  };
  store.drawHistory = [entry, ...store.drawHistory].slice(0, 20);
  saveHistory(store.drawHistory);
}

function _emojiForPos(posId) {
  const map = { GK: '🧤', DEF: '🛡️', MID: '⚙️', ATK: '⚡' };
  return map[posId] || '👤';
}
