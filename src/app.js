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
} from './state/store.js';

import { renderStarsWidget }  from './utils/helpers.js';
import { renderHeader }       from './components/header.js';
import { renderBottomNav }    from './components/bottomnav.js';
import { renderPlayers }      from './components/players.js';
import { renderConfig }       from './components/config.js';
import { renderDrawing }      from './components/drawing.js';
import { renderTeams }        from './components/teams.js';
import { renderHistory }      from './components/history.js';
import { renderProfile }      from './components/profile.js';

/* ── Root element ── */
const root = document.getElementById('app');

/* ── Main render ── */
function render() {
  const { step } = store;

  let content = '';
  if      (step === 0) content = renderPlayers();
  else if (step === 1) content = renderConfig();
  else if (step === 2) content = renderDrawing();
  else if (step === 3) content = renderTeams();
  else if (step === 4) content = renderHistory();
  else if (step === 5) content = renderProfile();

  const isAnimating = step === 2;

  root.innerHTML =
    renderHeader() +
    `<main class="screen">${content}</main>` +
    (isAnimating ? '' : renderBottomNav());

  /* Auto-focus player name input when editing */
  if (step === 0) {
    const inp = document.getElementById('nameInput');
    if (inp && store.editId !== null) {
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
      case 'players':
        setStep(0);
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
    if (ok) render();
  },

  editPlayer(id) {
    const player = store.players.find(p => p.id === id);
    if (!player) return;
    startEditPlayer(player);
    render();
  },

  cancelEdit() {
    cancelEdit();
    render();
  },

  removePlayer(id) {
    removePlayer(id);
    render();
  },

  setPlayersPerTeam(n) {
    setPlayersPerTeam(n);
    render();
  },

  draw() {
    draw(render);
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
  },
};

/* ── Boot ── */
render();
