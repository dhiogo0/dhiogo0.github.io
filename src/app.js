import {
  store,
  setStep,
  setFormField,
  setStarHover,
  addOrUpdatePlayer,
  startEditPlayer,
  cancelEdit,
  removePlayer,
  setPlayersPerTeam,
  draw,
  toggleSwapMode,
  clickTeamPlayer,
  clickReserve,
  undo,
  exportWhatsapp,
  startRenameTeam,
  commitRenameTeam,
  cancelRenameTeam,
  loadDraw,
  updateProfile,
  togglePresence,
  toggleAllPresence,
} from './state/store.js';

import { savePlayers, saveHistory, saveProfile } from './utils/storage.js';
import { renderStarsWidget } from './utils/helpers.js';
import { showToast }         from './utils/toast.js';
import { renderHeader }      from './components/header.js';
import { renderBottomNav }   from './components/bottomnav.js';
import { renderAddPlayer, renderPlayersList } from './components/players.js';
import { renderConfig }      from './components/config.js';
import { renderDrawing }     from './components/drawing.js';
import { renderTeams }       from './components/teams.js';
import { renderHistory }     from './components/history.js';
import { renderProfile }     from './components/profile.js';

import { signInWithGoogle, signOutUser, onAuthChange } from './firebase/auth.js';
import { loadUserData, saveUserData }                  from './firebase/db.js';

/* ── Root element ── */
const root = document.getElementById('app');

/* ── Cloud sync ── */
function _syncToCloud() {
  const user = store.currentUser;
  if (!user) return;
  saveUserData(user.uid, {
    players: store.players.map(({ present, ...p }) => p),
    history: store.drawHistory,
    profile: store.profile,
  }).catch(err => console.error('Sync error:', err));
}

/* ── Main render ── */
function render() {
  const { step } = store;

  let content = '';
  if      (step === 0) content = renderAddPlayer();
  else if (step === 1) content = renderConfig();
  else if (step === 2) content = renderDrawing();
  else if (step === 3) content = renderTeams();
  else if (step === 4) content = renderHistory();
  else if (step === 5) content = renderProfile();
  else if (step === 6) content = renderPlayersList();

  const isAnimating = step === 2;

  root.innerHTML =
    renderHeader() +
    `<main class="screen">${content}</main>` +
    (isAnimating ? '' : renderBottomNav());

  /* Auto-focus player name input when editing modal is open */
  if (step === 6 && store.editModal) {
    const inp = document.getElementById('nameInput');
    if (inp) {
      inp.focus();
      inp.setSelectionRange(inp.value.length, inp.value.length);
    }
  }

  /* Auto-focus team name input when renaming */
  if (step === 3 && store.renamingTeamId !== null) {
    const inp = document.getElementById(`team-name-${store.renamingTeamId}`);
    if (inp) { inp.focus(); inp.select(); }
  }
}

/* ── Public API exposed to inline handlers ── */
window.App = {
  render,

  goTo(section) {
    switch (section) {
      case 'add':
        setStep(0);
        break;
      case 'players':
        setStep(6);
        break;
      case 'draw':
        if (store.players.length < 2 && !store.teams.length) return;
        setStep(store.teams.length ? 3 : 1);
        break;
      case 'history':
        setStep(4);
        break;
      case 'profile':
        setStep(5);
        break;
    }
    render();
  },

  setStep(n) {
    setStep(n);
    render();
  },

  setFormField(key, value) {
    setFormField(key, value);
  },

  onStarHover(val) {
    setStarHover(val);
    renderStarsWidget(store.form.level, store.starHover);
  },

  onStarClick(val) {
    setFormField('level', val);
    setStarHover(0);
    renderStarsWidget(store.form.level, 0);
  },

  addOrUpdatePlayer() {
    const ok = addOrUpdatePlayer();
    if (ok) { render(); _syncToCloud(); }
  },

  editPlayer(id) {
    const player = store.players.find(p => p.id === id);
    if (!player) return;
    startEditPlayer(player);
    render();
  },

  closeEditModal() {
    cancelEdit();
    render();
  },

  confirmRemovePlayer(id) {
    store.confirmDeleteId = id;
    render();
  },

  cancelRemovePlayer() {
    store.confirmDeleteId = null;
    render();
  },

  removePlayer(id) {
    store.confirmDeleteId = null;
    removePlayer(id);
    render();
    _syncToCloud();
  },

  togglePresence(id) {
    togglePresence(id);
    savePlayers(store.players);
    render();
  },

  toggleAllPresence() {
    toggleAllPresence();
    savePlayers(store.players);
    render();
  },

  setPlayersPerTeam(n) {
    setPlayersPerTeam(n);
    render();
    _syncToCloud();
  },

  draw() {
    draw(() => {
      render();
      _syncToCloud();
    });
    render();
  },

  toggleSwapMode() {
    toggleSwapMode();
    render();
  },

  clickTeamPlayer(teamId, playerId) {
    clickTeamPlayer(teamId, playerId);
    render();
  },

  clickReserve(reserveId) {
    clickReserve(reserveId);
    render();
  },

  undo() {
    undo();
    render();
  },

  exportWhatsapp,

  startRenameTeam(teamId) {
    startRenameTeam(teamId);
    render();
  },

  commitRenameTeam(teamId, newName) {
    commitRenameTeam(teamId, newName);
    render();
  },

  cancelRenameTeam() {
    cancelRenameTeam();
    render();
  },

  loadDraw(id) {
    loadDraw(id);
    render();
  },

  updateProfile(key, value) {
    updateProfile(key, value);
    _syncToCloud();
  },

  async signIn() {
    try {
      await signInWithGoogle();
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        showToast('Erro ao entrar. Tente novamente.', 'error');
      }
    }
  },

  async signOut() {
    await signOutUser();
    store.currentUser = null;
    showToast('Você saiu da conta.');
    render();
  },
};

/* ── Auth state listener ── */
onAuthChange(async (user) => {
  store.currentUser = user;

  if (user) {
    try {
      const cloudData = await loadUserData(user.uid);
      if (cloudData) {
        if (cloudData.players?.length)  store.players     = cloudData.players;
        if (cloudData.history?.length)  store.drawHistory = cloudData.history;
        if (cloudData.profile) {
          store.profile       = { ...store.profile, ...cloudData.profile };
          store.playersPerTeam = store.profile.defaultPlayersPerTeam || 5;
        }
        savePlayers(store.players);
        saveHistory(store.drawHistory);
        saveProfile(store.profile);
      } else {
        await saveUserData(user.uid, {
          players: store.players,
          history: store.drawHistory,
          profile: store.profile,
        });
      }
    } catch (err) {
      console.error('Cloud load error:', err);
    }
    const firstName = user.displayName?.split(' ')[0] || 'jogador';
    showToast(`Bem-vindo, ${firstName}!`);
  }

  render();
});

/* ── Boot ── */
render();
