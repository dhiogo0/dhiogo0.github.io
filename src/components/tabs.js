import { store } from '../state/store.js';

export function renderTabs() {
  const { step, players, teams, drawHistory } = store;
  const noPlayers = players.length < 2;
  const noTeams   = !teams.length;
  const noHistory = !drawHistory.length;

  return `
    <nav class="tabs" role="tablist" aria-label="Navegação principal">
      <button
        class="tab ${step === 0 ? 'tab--active' : ''}"
        role="tab"
        aria-selected="${step === 0}"
        onclick="App.setStep(0)">
        Jogadores
      </button>
      <button
        class="tab ${step === 1 ? 'tab--active' : ''}"
        role="tab"
        aria-selected="${step === 1}"
        ${noPlayers ? 'disabled' : ''}
        onclick="App.setStep(1)">
        Configurar
      </button>
      <button
        class="tab ${step === 3 ? 'tab--active' : ''}"
        role="tab"
        aria-selected="${step === 3}"
        ${noTeams ? 'disabled' : ''}
        onclick="App.setStep(3)">
        Times
      </button>
      <button
        class="tab ${step === 4 ? 'tab--active' : ''}"
        role="tab"
        aria-selected="${step === 4}"
        ${noHistory ? 'disabled' : ''}
        onclick="App.setStep(4)">
        Histórico
      </button>
    </nav>
  `;
}
