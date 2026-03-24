const KEYS = {
  PLAYERS: 'racha_players',
  HISTORY: 'racha_history',
  PROFILE: 'racha_profile',
};

export function loadPlayers() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEYS.PLAYERS) || '[]');
    // Presence is ephemeral — always starts as present
    return raw.map(p => ({ ...p, present: true }));
  } catch {
    return [];
  }
}

export function savePlayers(players) {
  try {
    // Strip ephemeral presence field before persisting
    const toSave = players.map(({ present, ...p }) => p);
    localStorage.setItem(KEYS.PLAYERS, JSON.stringify(toSave));
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
