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
} from '../logic/championship.js';
import { snakeDraft }  from '../logic/balance.js';
import { showToast }   from '../utils/toast.js';

const INITIAL_FORM = { name: '', position: 'MID', level: 3 };

const _savedProfile = loadProfile();

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
  swapMode:        false,
  swapSelected:    null,
  history:             [],
  starHover:           0,
  renamingTeamId:      null,
  drawHistory:         loadHistory(),
  currentUser:         null,
  championship:          loadChampionship(),
  championshipHistory:   loadChampionshipHistory(),
  championshipModal:     false,
  championshipFormat:    'round-robin',
  scoringMatchId:        null,
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

export function numTeams() {
  return Math.floor(presentPlayers().length / store.playersPerTeam);
}

export function reserveCount() {
  return presentPlayers().length - numTeams() * store.playersPerTeam;
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

export function draw(onDone) {
  store.step = 2;
  setTimeout(() => {
    const shuffled = [...presentPlayers()].sort(() => Math.random() - 0.5);
    const result   = snakeDraft(shuffled, store.playersPerTeam);
    store.teams        = result.teams;
    store.reserves     = result.reserves;
    store.history      = [];
    store.swapMode     = false;
    store.swapSelected = null;
    store.step         = 3;
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

export function loadDraw(id) {
  const entry = store.drawHistory.find(e => e.id === id);
  if (!entry) return;
  store.teams        = JSON.parse(JSON.stringify(entry.teams));
  store.reserves     = JSON.parse(JSON.stringify(entry.reserves));
  store.swapMode     = false;
  store.swapSelected = null;
  store.history      = [];
  store.renamingTeamId = null;
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

export function registerMatchScore(matchId, homeScore, awayScore) {
  if (!store.championship) return;
  registerScore(store.championship, matchId, homeScore, awayScore);
  store.scoringMatchId = null;
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

export function registerSequentialResultAction(result) {
  if (!store.championship) return;
  const c = store.championship;
  store.championshipUndo = {
    currentHomeId: c.currentHomeId,
    currentAwayId: c.currentAwayId,
    queue:         [...c.queue],
    matches:       JSON.parse(JSON.stringify(c.matches)),
  };
  registerSequentialResult(c, result);
  saveChampionship(c);
}

export function undoSequentialResult() {
  if (!store.championship || !store.championshipUndo) return;
  const snap = store.championshipUndo;
  store.championship.currentHomeId = snap.currentHomeId;
  store.championship.currentAwayId = snap.currentAwayId;
  store.championship.queue         = snap.queue;
  store.championship.matches       = snap.matches;
  store.championshipUndo           = null;
  saveChampionship(store.championship);
}

export function requestEndChampionship() {
  store.confirmEndChampionship = true;
}

export function cancelEndChampionship() {
  store.confirmEndChampionship = false;
}

export function confirmEndChampionship() {
  if (!store.championship) return;
  finishSequentialChampionship(store.championship);
  store.confirmEndChampionship = false;
  saveChampionship(store.championship);
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
  };
  store.drawHistory = [entry, ...store.drawHistory].slice(0, 20);
  saveHistory(store.drawHistory);
}

function _emojiForPos(posId) {
  const map = { GK: '🧤', DEF: '🛡️', MID: '⚙️', ATK: '⚡' };
  return map[posId] || '👤';
}
