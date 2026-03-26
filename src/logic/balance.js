import { TEAM_NAMES, TEAM_COLORS } from '../data/constants.js';

/**
 * Snake Draft — recebe apenas jogadores de linha (GKs são separados antes).
 * Jogadores marcados como seed são distribuídos um por time antes do draft.
 * Ordena por nível e distribui em snake, garantindo exatamente
 * playersPerTeam jogadores por time.
 */
export function snakeDraft(players, playersPerTeam) {
  const nTeams = Math.floor(players.length / playersPerTeam);

  const teams = Array.from({ length: nTeams }, (_, i) => ({
    id:      i,
    name:    TEAM_NAMES[i] || `Time ${i + 1}`,
    color:   TEAM_COLORS[i] || '#00e87a',
    players: [],
  }));

  // Separa seeds dos demais
  const seeds   = [...players].filter(p => p.seed);
  const regular = [...players].filter(p => !p.seed);

  // Seeds que cabem (1 por time) são ancoradas; excedentes entram no pool regular
  const anchoredSeeds = seeds.slice(0, nTeams);
  const extraSeeds    = seeds.slice(nTeams);

  // Embaralha seeds ancoradas e distribui uma por time (Fisher-Yates)
  for (let i = anchoredSeeds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [anchoredSeeds[i], anchoredSeeds[j]] = [anchoredSeeds[j], anchoredSeeds[i]];
  }
  anchoredSeeds.forEach((seed, i) => teams[i].players.push(seed));

  // Pool restante: regular + seeds excedentes, ordenado por nível
  const pool   = [...regular, ...extraSeeds].sort((a, b) => b.level - a.level);
  const slots  = nTeams * playersPerTeam - anchoredSeeds.length;
  const inPlay = pool.slice(0, slots);
  const reserves = pool.slice(slots);

  _snakeInto(teams, inPlay);
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
