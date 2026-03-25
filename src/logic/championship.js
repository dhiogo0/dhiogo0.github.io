let _seq = 0;
function _uid() { return Date.now() * 1000 + (++_seq % 1000); }

/* ── Round-robin ── */

export function generateRoundRobin(teams) {
  const matches = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matches.push(_match('group', teams[i].id, teams[j].id));
    }
  }
  _assignRoundRobinRounds(matches);
  return matches;
}

function _assignRoundRobinRounds(matches) {
  const assigned = new Set();
  let round = 1;
  while (assigned.size < matches.length) {
    const used = new Set();
    for (const m of matches) {
      if (assigned.has(m.id)) continue;
      if (used.has(m.homeTeamId) || used.has(m.awayTeamId)) continue;
      m.round = round;
      assigned.add(m.id);
      used.add(m.homeTeamId);
      used.add(m.awayTeamId);
    }
    round++;
  }
}

/* ── Knockout ── */

export function generateKnockout(teams) {
  const n = teams.length;
  if (n < 2) return [];

  const size     = _nextPow2(n);
  const numByes  = size - n;
  const byeTeams = teams.slice(0, numByes);   // top seeds skip R1
  const playTeams = teams.slice(numByes);      // play in R1

  const all = [];

  // R1: pair up the teams that must play
  const r1Phase = _knockoutLabel(size / 2);
  const r1 = [];
  for (let i = 0; i < playTeams.length; i += 2) {
    r1.push(_match(r1Phase, playTeams[i].id, playTeams[i + 1].id));
  }
  all.push(...r1);

  // Build slots for R2: interleave bye teams with R1 winners
  const r2Slots = [];
  let byeIdx = 0;
  for (let i = 0; i < r1.length; i++) {
    if (byeIdx < byeTeams.length) {
      r2Slots.push({ teamId: byeTeams[byeIdx++].id, fromMatchId: null });
    }
    r2Slots.push({ teamId: null, fromMatchId: r1[i].id });
  }
  while (byeIdx < byeTeams.length) {
    r2Slots.push({ teamId: byeTeams[byeIdx++].id, fromMatchId: null });
  }

  // Generate R2, R3... from slots
  let prevSlots = r2Slots;
  while (prevSlots.length >= 2) {
    const phase = _knockoutLabel(prevSlots.length / 2);
    const roundMatches = [];
    for (let i = 0; i < prevSlots.length; i += 2) {
      const hs = prevSlots[i];
      const as = prevSlots[i + 1];
      const m = {
        ..._match(phase, hs.teamId, as.teamId),
        homeFromMatchId: hs.fromMatchId,
        awayFromMatchId: as.fromMatchId,
        status: (hs.teamId !== null && as.teamId !== null) ? 'pending' : 'waiting',
      };
      roundMatches.push(m);
    }
    all.push(...roundMatches);
    prevSlots = roundMatches.map(m => ({ teamId: null, fromMatchId: m.id }));
  }

  return all;
}

function _knockoutLabel(matchesInRound) {
  if (matchesInRound <= 1) return 'final';
  if (matchesInRound === 2) return 'semifinal';
  return 'quartas';
}

/* ── Groups + Final ── */

export function generateGroupsAndFinal(teams) {
  const group = generateRoundRobin(teams);
  const fin = {
    ..._match('final', null, null),
    homeFromMatchId: null,
    awayFromMatchId: null,
    status: 'waiting',
  };
  return [...group, fin];
}

/* ── Register score ── */

export function registerScore(championship, matchId, homeScore, awayScore, penalties = null) {
  const m = championship.matches.find(x => x.id === matchId);
  if (!m || m.status === 'done') return;

  m.homeScore  = homeScore;
  m.awayScore  = awayScore;
  m.status     = 'done';

  if (penalties) {
    m.homePenalties = penalties.home;
    m.awayPenalties = penalties.away;
    m.winnerId = penalties.home > penalties.away ? m.homeTeamId : m.awayTeamId;
  } else {
    m.winnerId = homeScore > awayScore ? m.homeTeamId
               : awayScore > homeScore ? m.awayTeamId
               : null;
  }

  if (championship.format === 'knockout') {
    _propagate(championship.matches, m);
  }

  if (championship.format === 'groups+knockout') {
    const groupsDone = championship.matches
      .filter(x => x.phase === 'group')
      .every(x => x.status === 'done');
    if (groupsDone) {
      const top2 = getStandings(championship);
      const fin  = championship.matches.find(x => x.phase === 'final');
      if (fin && fin.status === 'waiting' && top2.length >= 2) {
        fin.homeTeamId = top2[0].teamId;
        fin.awayTeamId = top2[1].teamId;
        fin.status     = 'pending';
      }
    }
  }

  _checkFinished(championship);
}

function _propagate(matches, done) {
  if (!done.winnerId) return;
  for (const m of matches) {
    let updated = false;
    if (m.homeFromMatchId === done.id) { m.homeTeamId = done.winnerId; updated = true; }
    if (m.awayFromMatchId === done.id) { m.awayTeamId = done.winnerId; updated = true; }
    if (updated && m.homeTeamId !== null && m.awayTeamId !== null && m.status === 'waiting') {
      m.status = 'pending';
    }
  }
}

export function repropagateKnockout(championship) {
  if (championship.format !== 'knockout') return;
  for (const m of championship.matches) {
    if (m.status === 'done' && m.winnerId) {
      _propagate(championship.matches, m);
    }
  }
}

function _checkFinished(championship) {
  const { format, matches } = championship;
  let isDone;
  if (format === 'round-robin') {
    isDone = matches.every(m => m.status === 'done');
  } else {
    const fin = matches.find(m => m.phase === 'final');
    isDone = fin?.status === 'done';
  }
  if (!isDone) return;

  championship.status      = 'finished';
  championship.finishedAt  = new Date().toISOString();

  if (format === 'round-robin') {
    championship.championId = getStandings(championship)[0]?.teamId ?? null;
  } else {
    const fin = matches.find(m => m.phase === 'final');
    championship.championId = fin?.winnerId ?? null;
  }
}

/* ── Standings ── */

export function getStandings(championship) {
  const stats = {};
  championship.teams.forEach(t => {
    stats[t.id] = { teamId: t.id, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
  });

  championship.matches
    .filter(m => m.phase === 'group' && m.status === 'done')
    .forEach(m => {
      const h = stats[m.homeTeamId];
      const a = stats[m.awayTeamId];
      if (!h || !a) return;
      h.gf += m.homeScore; h.ga += m.awayScore;
      a.gf += m.awayScore; a.ga += m.homeScore;
      if      (m.homeScore > m.awayScore) { h.w++; h.pts += 3; a.l++; }
      else if (m.awayScore > m.homeScore) { a.w++; a.pts += 3; h.l++; }
      else                                { h.d++; h.pts++;    a.d++; a.pts++; }
    });

  return Object.values(stats).sort((a, b) =>
    b.pts !== a.pts           ? b.pts - a.pts :
    (b.gf - b.ga) !== (a.gf - a.ga) ? (b.gf - b.ga) - (a.gf - a.ga) :
    b.gf - a.gf
  );
}

/* ── Sequential (Pontos Corridos / Rei da Quadra) ── */

export function registerSequentialResult(championship, result) {
  const { currentHomeId, currentAwayId } = championship;

  championship.matches.push({
    id:         _uid(),
    homeTeamId: currentHomeId,
    awayTeamId: currentAwayId,
    result,                       // 'home' | 'away' | 'draw'
  });

  if (result === 'home') {
    championship.queue.push(currentAwayId);
    championship.currentAwayId = championship.queue.shift();
  } else if (result === 'away') {
    championship.queue.push(currentHomeId);
    championship.currentHomeId = currentAwayId;
    championship.currentAwayId = championship.queue.shift();
  } else {
    // draw — both leave, next two enter
    championship.queue.push(currentHomeId, currentAwayId);
    championship.currentHomeId = championship.queue.shift();
    championship.currentAwayId = championship.queue.shift();
  }
}

export function finishSequentialChampionship(championship) {
  championship.status     = 'finished';
  championship.finishedAt = new Date().toISOString();
  const top = getSequentialStandings(championship);
  championship.championId = top[0]?.teamId ?? null;
}

export function getSequentialStandings(championship) {
  const stats = {};
  championship.teams.forEach(t => {
    stats[t.id] = { teamId: t.id, w: 0, d: 0, l: 0, pts: 0 };
  });

  championship.matches.forEach(m => {
    const h = stats[m.homeTeamId];
    const a = stats[m.awayTeamId];
    if (!h || !a) return;
    if      (m.result === 'home') { h.w++; h.pts += 3; a.l++; }
    else if (m.result === 'away') { a.w++; a.pts += 3; h.l++; }
    else                          { h.d++; h.pts++;    a.d++; a.pts++; }
  });

  return Object.values(stats).sort((a, b) =>
    b.pts !== a.pts ? b.pts - a.pts :
    b.w   !== a.w   ? b.w   - a.w   :
    b.d - a.d
  );
}

/* ── Factory ── */

export function createChampionship(teams, format) {
  const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'];
  const now  = new Date();
  const name = `Racha - ${days[now.getDay()]} ${now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;

  const base = {
    id:         Date.now(),
    name,
    format,
    status:     'ongoing',
    teams:      teams.map(t => ({ id: t.id, name: t.name, color: t.color })),
    championId: null,
    createdAt:  new Date().toISOString(),
    finishedAt: null,
    log:        [],
  };

  if (format === 'round-robin') {
    return {
      ...base,
      queue:         teams.slice(2).map(t => t.id),
      currentHomeId: teams[0].id,
      currentAwayId: teams[1].id,
      matches:       [],
    };
  }

  const matches =
    format === 'knockout'   ? generateKnockout(teams) :
    /* groups+knockout */     generateGroupsAndFinal(teams);

  return { ...base, matches };
}

/* ── Helpers ── */

function _match(phase, homeTeamId, awayTeamId) {
  return {
    id:               _uid(),
    phase,
    round:            1,
    homeTeamId,
    awayTeamId,
    homeFromMatchId:  null,
    awayFromMatchId:  null,
    homeScore:        null,
    awayScore:        null,
    status:           'pending',
    winnerId:         null,
  };
}

function _nextPow2(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}
