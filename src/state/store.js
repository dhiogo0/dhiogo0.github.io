import { loadPlayers, savePlayers, loadHistory, saveHistory, loadProfile, saveProfile } from '../utils/storage.js';
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
  playersPerTeam:  _savedProfile.defaultPlayersPerTeam || 5,
  teams:           [],
  reserves:        [],
  swapMode:        false,
  swapSelected:    null,
  history:         [],
  starHover:       0,
  renamingTeamId:  null,
  drawHistory:     loadHistory(),
  currentUser:     null,
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
