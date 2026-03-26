const THEME_CYCLE = { system: 'light', light: 'dark', dark: 'system' };
const THEME_ICON  = { system: '◑', light: '☀', dark: '🌙' };
const THEME_LABEL = { system: 'Sistema', light: 'Claro', dark: 'Escuro' };

export function renderHeader(step) {
  const pref       = window.App?.getThemePreference?.() || 'system';
  const next       = THEME_CYCLE[pref];
  const showToggle = step === 5;

  return `
    <header class="header">
      <div class="header__ball">⚽</div>
      <h1 class="header__title">RACHA FÁCIL</h1>
      <p class="header__subtitle">Sorteio inteligente de times</p>
      ${showToggle ? `
      <button
        class="theme-pill"
        onclick="App.setTheme('${next}')"
        data-tooltip="${THEME_LABEL[pref]}"
        aria-label="Tema: ${THEME_LABEL[pref]}">
        <span class="theme-pill__icon">${THEME_ICON[pref]}</span>
      </button>` : ''}
    </header>
  `;
}
