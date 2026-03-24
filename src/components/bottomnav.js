import { store } from '../state/store.js';

export function renderBottomNav() {
  const section       = _activeSection();
  const drawDisabled  = store.players.length < 2 && !store.teams.length;

  const items = [
    {
      id:       'add',
      icon:     '➕',
      label:    'Adicionar',
      disabled: false,
    },
    {
      id:       'players',
      icon:     '👥',
      label:    'Jogadores',
      disabled: false,
    },
    {
      id:       'draw',
      icon:     '⚽',
      label:    'Sorteio',
      disabled: drawDisabled,
    },
    {
      id:       'championship',
      icon:     '🏆',
      label:    'Campeonato',
      disabled: false,
    },
    {
      id:       'profile',
      icon:     '⚙️',
      label:    'Perfil',
      disabled: false,
    },
  ];

  const buttons = items.map(item => `
    <button
      class="bnav-item ${section === item.id ? 'bnav-item--active' : ''}"
      onclick="App.goTo('${item.id}')"
      ${item.disabled ? 'disabled' : ''}
      aria-label="${item.label}"
      aria-current="${section === item.id ? 'page' : 'false'}">
      <span class="bnav-item__icon">${item.icon}</span>
      <span class="bnav-item__label">${item.label}</span>
    </button>
  `).join('');

  return `<nav class="bottom-nav" role="navigation" aria-label="Menu principal">${buttons}</nav>`;
}

function _activeSection() {
  const { step } = store;
  if (step === 0)              return 'add';
  if (step === 6)              return 'players';
  if (step >= 1 && step <= 3) return 'draw';
  if (step === 4)              return 'championship';
  if (step === 5)              return 'profile';
  return 'add';
}
