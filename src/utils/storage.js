const KEYS = {
  PLAYERS:      'racha_players',
  HISTORY:      'racha_history',
  PROFILE:      'racha_profile',
  CHAMPIONSHIP: 'racha_championship',
  CHAMP_HIST:   'racha_championship_history',
};

export function loadPlayers() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEYS.PLAYERS) || '[]');
    return raw.map(p => ({ ...p, present: p.present !== false }));
  } catch {
    return [];
  }
}

export function savePlayers(players) {
  try {
    localStorage.setItem(KEYS.PLAYERS, JSON.stringify(players));
  } catch {
    console.warn('localStorage unavailable');
  }
}

export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]');
  } catch {
    return [];
  }
}

export function saveHistory(history) {
  try {
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
  } catch {
    console.warn('localStorage unavailable');
  }
}

export function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.PROFILE) || '{}');
  } catch {
    return {};
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  } catch {
    console.warn('localStorage unavailable');
  }
}

export function loadChampionship() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.CHAMPIONSHIP) || 'null');
  } catch {
    return null;
  }
}

export function saveChampionship(c) {
  try {
    localStorage.setItem(KEYS.CHAMPIONSHIP, JSON.stringify(c));
  } catch {
    console.warn('localStorage unavailable');
  }
}

export function clearChampionship() {
  try {
    localStorage.removeItem(KEYS.CHAMPIONSHIP);
  } catch {
    console.warn('localStorage unavailable');
  }
}

export function loadChampionshipHistory() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.CHAMP_HIST) || '[]');
  } catch {
    return [];
  }
}

export function saveChampionshipHistory(history) {
  try {
    localStorage.setItem(KEYS.CHAMP_HIST, JSON.stringify(history.slice(0, 10)));
  } catch {
    console.warn('localStorage unavailable');
  }
}
