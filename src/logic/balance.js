import { TEAM_NAMES, TEAM_COLORS } from '../data/constants.js';

/**
 * Position-aware Snake Draft:
 *
 * >= 5v5 (GK priority ON):
 *   - Up to 1 GK per team is guaranteed a spot regardless of level
 *   - GKs are drafted first (1 per team), then outfield by level
 *
 * < 5v5 (GK priority OFF):
 *   - Outfield players fill team slots first; GKs only get remaining spots
 *   - GKs are drafted last, after all outfield players
 */
export function snakeDraft(players, playersPerTeam) {
  const nTeams     = Math.floor(players.length / playersPerTeam);
  const totalSlots = nTeams * playersPerTeam;
  const gkPriority = playersPerTeam >= 5;

  const gks      = [...players].filter(p => p.position === 'GK').sort((a, b) => b.level - a.level);
  const outfield = [...players].filter(p => p.position !== 'GK').sort((a, b) => b.level - a.level);

  let inPlayGks, inPlayOutfield, reserves;

  if (gkPriority) {
    // GKs get guaranteed slots (up to 1 per team), outfield fills the rest
    inPlayGks      = gks.slice(0, Math.min(gks.length, nTeams));
    inPlayOutfield = outfield.slice(0, totalSlots - inPlayGks.length);
    reserves       = [
      ...gks.slice(inPlayGks.length),
      ...outfield.slice(inPlayOutfield.length),
    ].sort((a, b) => b.level - a.level);
  } else {
    // Outfield fills slots first; GKs only get what's left
    inPlayOutfield = outfield.slice(0, Math.min(outfield.length, totalSlots));
    inPlayGks      = gks.slice(0, totalSlots - inPlayOutfield.length);
    reserves       = [
      ...outfield.slice(inPlayOutfield.length),
      ...gks.slice(inPlayGks.length),
    ].sort((a, b) => b.level - a.level);
  }

  const teams = Array.from({ length: nTeams }, (_, i) => ({
    id:      i,
    name:    TEAM_NAMES[i] || `Time ${i + 1}`,
    color:   TEAM_COLORS[i] || '#00e87a',
    players: [],
  }));

  if (gkPriority) {
    // Draft GKs first (1 per team), then outfield + overflow GKs by level
    _snakeInto(teams, inPlayGks);
    const rest = [...inPlayOutfield].sort((a, b) => b.level - a.level);
    _snakeInto(teams, rest);
  } else {
    // Draft outfield first by level, GKs fill remaining slots last
    _snakeInto(teams, inPlayOutfield);
    _snakeInto(teams, inPlayGks);
  }

  return { teams, reserves };
}

function _snakeInto(teams, players) {
  if (!players.length) return;
  const n = teams.length;
  let dir = 1, ti = 0;
  for (const p of players) {
    teams[ti].players.push(p);
    ti += dir;
    if (ti >= n)    { dir = -1; ti = n - 1; }
    else if (ti < 0) { dir =  1; ti = 0; }
  }
}

export function teamAvg(team) {
  if (!team.players.length) return 0;
  return team.players.reduce((s, p) => s + p.level, 0) / team.players.length;
}

export function balanceScore(teams) {
  if (teams.length < 2) return 0;
  const avgs = teams.map(teamAvg);
  const mean = avgs.reduce((a, b) => a + b, 0) / avgs.length;
  const variance = avgs.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / avgs.length;
  return Math.sqrt(variance);
}

export function balanceInfo(score) {
  if (score < 0.25) return { label: 'Excelente', color: '#00e87a', pct: 100 };
  if (score < 0.50) return { label: 'Bom',       color: '#fbbf24', pct: 70  };
  if (score < 0.75) return { label: 'Regular',   color: '#f97316', pct: 45  };
  return               { label: 'Desnivelado', color: '#ef4444', pct: 20  };
}
