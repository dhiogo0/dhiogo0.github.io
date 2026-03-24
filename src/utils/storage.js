const KEYS = {
  PLAYERS: 'racha_players',
  HISTORY: 'racha_history',
  PROFILE: 'racha_profile',
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
