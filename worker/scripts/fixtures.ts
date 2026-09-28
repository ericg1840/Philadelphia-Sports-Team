// Synthetic upstream payloads in the shapes of MLB Stats API, NHL api-web, ESPN
// site API and NWS -- generated relative to `now` so the UI always has upcoming
// games. Used by unit tests and by the local fixture server (`npm run fixtures`).
import type { FetchJson } from '../src/context';

const H = 3600_000;
const D = 24 * H;

/** Date at a given ET wall-clock time, `days` from now's ET date. */
function et(now: Date, days: number, hh: number, mm = 0): string {
  const base = new Date(now.getTime() + days * D);
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(base);
  // EDT through early November; good enough for fixtures.
  const month = parseInt(ymd.slice(5, 7), 10);
  const off = month >= 4 && month <= 10 ? '-04:00' : '-05:00';
  return new Date(`${ymd}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00${off}`).toISOString();
}

// ---------------- MLB ----------------
const MLB_TEAMS: Record<number, [string, string]> = {
  143: ['Philadelphia Phillies', 'PHI'],
  121: ['New York Mets', 'NYM'],
  144: ['Atlanta Braves', 'ATL'],
  120: ['Washington Nationals', 'WSH'],
  146: ['Miami Marlins', 'MIA'],
  119: ['Los Angeles Dodgers', 'LAD'],
  158: ['Milwaukee Brewers', 'MIL'],
  137: ['San Francisco Giants', 'SF'],
  138: ['St. Louis Cardinals', 'STL'],
  112: ['Chicago Cubs', 'CHC'],
  135: ['San Diego Padres', 'SD'],
  113: ['Cincinnati Reds', 'CIN'],
};
const mlbTeam = (id: number) => ({ id, name: MLB_TEAMS[id][0], abbreviation: MLB_TEAMS[id][1], teamName: MLB_TEAMS[id][0].split(' ').pop() });

function mlbGame(now: Date, pk: number, days: number, hh: number, opp: number, home: boolean, opts: any = {}) {
  const final = opts.us != null;
  const phi = { team: mlbTeam(143), score: opts.us, isWinner: final ? opts.us > opts.them : undefined, probablePitcher: opts.phiP };
  const other = { team: mlbTeam(opp), score: opts.them, isWinner: final ? opts.them > opts.us : undefined, probablePitcher: opts.oppP };
  return {
    gamePk: pk,
    gameDate: et(now, days, hh, 5),
    gameType: opts.gameType ?? 'R',
    seriesDescription: opts.series,
    seriesGameNumber: opts.seriesGame,
    doubleHeader: 'N',
    gameNumber: 1,
    status: final
      ? { abstractGameState: 'Final', detailedState: 'Final', codedGameState: 'F' }
      : { abstractGameState: 'Preview', detailedState: 'Scheduled', startTimeTBD: !!opts.tbd },
    teams: home ? { home: phi, away: other } : { home: other, away: phi },
    venue: { id: 2681, name: home ? 'Citizens Bank Park' : `${MLB_TEAMS[opp][0].split(' ').pop()} Park`, location: { city: home ? 'Philadelphia' : 'Elsewhere' } },
    broadcasts: [
      { type: 'TV', name: 'NBC Sports Philadelphia', homeAway: 'home', isNational: false },
      { type: 'TV', name: 'SNY', homeAway: 'away', isNational: false },
      ...(opts.natl ? [{ type: 'TV', name: opts.natl, homeAway: 'home', isNational: true }] : []),
    ].map((b) => (home ? b : { ...b, homeAway: b.homeAway === 'home' ? 'away' : 'home' })),
    linescore: final ? { currentInning: 9, currentInningOrdinal: '9th', inningState: 'Bottom' } : undefined,
  };
}

function mlbSchedule(now: Date) {
  const opps = [121, 144, 120, 146, 121, 144, 158, 119, 137];
  // ~7 weeks of results so the team page has several months to collapse.
  const past = Array.from({ length: 48 }, (_, i) => {
    const us = [5, 3, 7, 2, 4, 6, 1, 8, 3, 5, 2, 6][i % 12];
    const them = [3, 4, 2, 5, 1, 2, 3, 4, 2, 4, 3, 1][(i + Math.floor(i / 12)) % 12];
    return mlbGame(now, 777000 + i, -49 + i, 18, opps[i % opps.length], i % 2 === 0, { us: us === them ? us + 1 : us, them });
  });
  const upcoming = [
    mlbGame(now, 778001, 1, 18, 135, true, {
      gameType: 'F', series: 'Wild Card Series', seriesGame: 1, natl: 'ESPN',
      phiP: { id: 554430, fullName: 'Zack Wheeler' }, oppP: { id: 642547, fullName: 'Dylan Cease' },
    }),
    mlbGame(now, 778002, 2, 18, 135, true, {
      gameType: 'F', series: 'Wild Card Series', seriesGame: 2, natl: 'ESPN',
      phiP: { id: 605400, fullName: 'Aaron Nola' },
    }),
    mlbGame(now, 778003, 3, 18, 135, true, { gameType: 'F', series: 'Wild Card Series', seriesGame: 3, natl: 'ESPN', tbd: true }),
  ];
  return { dates: [...past, ...upcoming].map((g) => ({ date: g.gameDate.slice(0, 10), games: [g] })) };
}

function mlbStandings() {
  return {
    records: [
      {
        division: { id: 204 },
        teamRecords: [
          { team: { id: 143 }, divisionRank: '1', wildCardRank: '', gamesBack: '-', wildCardGamesBack: '-', wins: 94, losses: 68, clinched: true, clinchIndicator: 'y', divisionChamp: true },
          { team: { id: 121 }, divisionRank: '2', wildCardRank: '2', gamesBack: '5.0', wildCardGamesBack: '+2.0', wins: 89, losses: 73 },
        ],
      },
    ],
  };
}

function mlbRoster() {
  const names: [string, string, string, string, string?][] = [
    ['Zack Wheeler', '45', 'P', 'Pitcher'],
    ['Aaron Nola', '27', 'P', 'Pitcher'],
    ['Cristopher Sánchez', '61', 'P', 'Pitcher'],
    ['Ranger Suárez', '55', 'P', 'Pitcher', 'Injured 15-Day'],
    ['Jhoan Duran', '59', 'P', 'Pitcher'],
    ['Matt Strahm', '25', 'P', 'Pitcher'],
    ['J.T. Realmuto', '10', 'C', 'Catcher'],
    ['Rafael Marchan', '13', 'C', 'Catcher'],
    ['Bryce Harper', '3', '1B', 'Infielder'],
    ['Bryson Stott', '5', '2B', 'Infielder'],
    ['Trea Turner', '7', 'SS', 'Infielder'],
    ['Alec Bohm', '28', '3B', 'Infielder'],
    ['Kyle Schwarber', '12', 'DH', 'Hitter'],
    ['Brandon Marsh', '16', 'LF', 'Outfielder'],
    ['Nick Castellanos', '8', 'RF', 'Outfielder', 'Injured 10-Day'],
    ['Justin Crawford', '2', 'CF', 'Outfielder'],
  ];
  return {
    roster: names.map(([fullName, jerseyNumber, abbreviation, type, il], i) => ({
      person: { id: 600000 + i, fullName },
      jerseyNumber,
      position: { abbreviation, type },
      status: il ? { code: il.includes('15') ? 'D15' : 'D10', description: il } : { code: 'A', description: 'Active' },
    })),
  };
}

function mlbBox(now: Date, pk: number) {
  const g: any = mlbGame(now, pk, -2, 18, 146, true, { us: 6, them: 1 });
  const inn = [0, 2, 0, 0, 3, 0, 1, 0];
  const innAway = [0, 0, 0, 1, 0, 0, 0, 0, 0];
  g.linescore = {
    currentInning: 9,
    innings: innAway.map((r, i) => ({ num: i + 1, away: { runs: r, hits: 1, errors: 0 }, home: { runs: i < 8 ? inn[i] : null } })),
    teams: { away: { runs: 1, hits: 5, errors: 1 }, home: { runs: 6, hits: 11, errors: 0 } },
  };
  g.decisions = { winner: { fullName: 'Cristopher Sánchez' }, loser: { fullName: 'Sandy Alcantara' } };
  return { dates: [{ games: [g] }] };
}

function mlbPeople() {
  return {
    people: [
      { id: 554430, fullName: 'Zack Wheeler', pitchHand: { code: 'R' }, stats: [{ splits: [{ stat: { wins: 16, losses: 6, era: '2.71' } }] }] },
      { id: 605400, fullName: 'Aaron Nola', pitchHand: { code: 'R' }, stats: [{ splits: [{ stat: { wins: 12, losses: 9, era: '3.84' } }] }] },
      { id: 642547, fullName: 'Dylan Cease', pitchHand: { code: 'R' }, stats: [{ splits: [{ stat: { wins: 11, losses: 10, era: '3.62' } }] }] },
    ],
  };
}

// ---------------- NHL ----------------
const nhlTeam = (abbrev: string, place: string, common: string, score?: number) => ({
  id: abbrev.length,
  abbrev,
  placeName: { default: place },
  commonName: { default: common },
  logo: `https://assets.nhle.com/logos/nhl/svg/${abbrev}_light.svg`,
  score,
});
const PHI_NHL = (s?: number) => nhlTeam('PHI', 'Philadelphia', 'Flyers', s);

function nhlGame(now: Date, id: number, days: number, hh: number, opp: any, home: boolean, gameType: number, final?: [number, number, string?]) {
  const us = PHI_NHL(final?.[0]);
  const them = { ...opp, score: final?.[1] };
  return {
    id,
    gameType,
    startTimeUTC: et(now, days, hh),
    venue: { default: home ? 'Xfinity Mobile Arena' : `${opp.placeName.default} Arena` },
    gameState: final ? 'OFF' : 'FUT',
    gameScheduleState: 'OK',
    homeTeam: home ? us : them,
    awayTeam: home ? them : us,
    gameOutcome: final ? { lastPeriodType: final[2] ?? 'REG' } : undefined,
    tvBroadcasts: [{ market: home ? 'H' : 'A', countryCode: 'US', network: 'NBCSP' }],
  };
}

function nhlSchedule(now: Date) {
  const NYR = nhlTeam('NYR', 'New York', 'Rangers');
  const NJD = nhlTeam('NJD', 'New Jersey', 'Devils');
  const NYI = nhlTeam('NYI', 'New York', 'Islanders');
  const BOS = nhlTeam('BOS', 'Boston', 'Bruins');
  const PIT = nhlTeam('PIT', 'Pittsburgh', 'Penguins');
  return {
    games: [
      nhlGame(now, 2026010001, -6, 19, BOS, true, 1, [3, 2]),
      nhlGame(now, 2026010002, -4, 19, NYI, false, 1, [2, 3, 'OT']),
      nhlGame(now, 2026010003, -2, 19, NJD, true, 1, [4, 1]),
      { ...nhlGame(now, 2026010009, 0, 13, BOS, false, 1), gameState: 'LIVE', periodDescriptor: { number: 2, periodType: 'REG' }, homeTeam: { ...BOS, score: 1 }, awayTeam: PHI_NHL(2) },
      nhlGame(now, 2026010004, 1, 19, NYR, false, 1),
      nhlGame(now, 2026010005, 3, 19, NJD, true, 1),
      nhlGame(now, 2026010006, 5, 19, NYI, true, 1),
      nhlGame(now, 2026020007, 10, 19, PIT, true, 2),
      nhlGame(now, 2026020008, 12, 19, NYR, false, 2),
    ],
  };
}

function nhlStandings() {
  return {
    standings: [
      { teamAbbrev: { default: 'PHI' }, conferenceName: 'Eastern', divisionName: 'Metropolitan', divisionSequence: 4, wildcardSequence: 3, points: 0, gamesPlayed: 0, wins: 0, losses: 0, otLosses: 0 },
    ],
  };
}

function nhlRoster() {
  const p = (id: number, first: string, last: string, n: number, pos: string) => ({
    id,
    firstName: { default: first },
    lastName: { default: last },
    sweaterNumber: n,
    positionCode: pos,
  });
  return {
    forwards: [p(1, 'Travis', 'Konecny', 11, 'R'), p(2, 'Owen', 'Tippett', 74, 'R'), p(3, 'Matvei', 'Michkov', 39, 'R'), p(4, 'Sean', 'Couturier', 14, 'C'), p(5, 'Noah', 'Cates', 27, 'C')],
    defensemen: [p(6, 'Travis', 'Sanheim', 6, 'D'), p(7, 'Cam', 'York', 8, 'D'), p(8, 'Jamie', 'Drysdale', 9, 'D')],
    goalies: [p(9, 'Samuel', 'Ersson', 33, 'G'), p(10, 'Dan', 'Vladar', 80, 'G')],
  };
}

function nhlLanding(now: Date) {
  const g: any = nhlGame(now, 2026010003, -2, 19, nhlTeam('NJD', 'New Jersey', 'Devils'), true, 1, [4, 1]);
  g.homeTeam.sog = 34;
  g.awayTeam.sog = 22;
  const goal = (team: string, first: string, last: string, t: string, n: number, strength = 'ev') => ({
    teamAbbrev: { default: team },
    firstName: { default: first },
    lastName: { default: last },
    timeInPeriod: t,
    goalsToDate: n,
    strength,
    assists: [{ firstName: { default: 'Cam' }, lastName: { default: 'York' } }],
  });
  g.summary = {
    scoring: [
      { periodDescriptor: { number: 1, periodType: 'REG' }, goals: [goal('PHI', 'Travis', 'Konecny', '04:12', 1), goal('NJD', 'Jack', 'Hughes', '15:40', 1, 'pp')] },
      { periodDescriptor: { number: 2, periodType: 'REG' }, goals: [goal('PHI', 'Matvei', 'Michkov', '08:03', 1)] },
      { periodDescriptor: { number: 3, periodType: 'REG' }, goals: [goal('PHI', 'Owen', 'Tippett', '02:55', 2), goal('PHI', 'Sean', 'Couturier', '19:01', 1)] },
    ],
    threeStars: [
      { star: 1, name: { default: 'M. Michkov' }, teamAbbrev: 'PHI' },
      { star: 2, name: { default: 'S. Ersson' }, teamAbbrev: 'PHI' },
      { star: 3, name: { default: 'J. Hughes' }, teamAbbrev: 'NJD' },
    ],
  };
  return g;
}

// ---------------- ESPN ----------------
const espnTeam = (id: string, abbreviation: string, displayName: string) => ({
  id,
  abbreviation,
  displayName,
  logos: [{ href: `https://a.espncdn.com/i/teamlogos/${id}.png` }],
});

function espnEvent(now: Date, id: string, days: number, hh: number, mm: number, us: any, them: any, home: boolean, venue: string, opts: any = {}) {
  const final = opts.us != null;
  const c = (t: any, side: string, score?: number, winner?: boolean) => ({
    id: t.id,
    homeAway: side,
    team: t,
    score: score != null ? { value: score, displayValue: String(score) } : undefined,
    winner,
  });
  return {
    id,
    date: et(now, days, hh, mm),
    seasonType: { type: opts.seasonType ?? 2 },
    week: opts.week ? { number: opts.week, text: `Week ${opts.week}` } : undefined,
    competitions: [
      {
        date: et(now, days, hh, mm),
        timeValid: opts.tbd ? false : true,
        venue: { fullName: venue, address: { city: home ? 'Philadelphia' : 'Away' } },
        competitors: [
          c(us, home ? 'home' : 'away', opts.us, final ? opts.us > opts.them : undefined),
          c(them, home ? 'away' : 'home', opts.them, final ? opts.them > opts.us : undefined),
        ],
        status: { type: final ? { state: 'post', name: 'STATUS_FINAL', shortDetail: 'Final' } : { state: 'pre', name: 'STATUS_SCHEDULED', shortDetail: 'Scheduled' } },
        broadcasts: opts.tv ? [{ media: { shortName: opts.tv } }] : [],
      },
    ],
  };
}

const EAGLES = espnTeam('21', 'PHI', 'Philadelphia Eagles');
const SIXERS = espnTeam('20', 'PHI', 'Philadelphia 76ers');
const UNION = espnTeam('10739', 'PHI', 'Philadelphia Union');

function eaglesSchedule(now: Date, seasontype: string | null) {
  if (seasontype !== '2') return { events: [] };
  const DAL = espnTeam('6', 'DAL', 'Dallas Cowboys');
  const KC = espnTeam('12', 'KC', 'Kansas City Chiefs');
  const LAR = espnTeam('14', 'LAR', 'Los Angeles Rams');
  const TB = espnTeam('27', 'TB', 'Tampa Bay Buccaneers');
  const NYG = espnTeam('19', 'NYG', 'New York Giants');
  return {
    events: [
      espnEvent(now, '401770001', -22, 20, 20, EAGLES, DAL, true, 'Lincoln Financial Field', { week: 1, us: 24, them: 20, tv: 'NBC' }),
      espnEvent(now, '401770002', -15, 16, 25, EAGLES, KC, false, 'GEHA Field at Arrowhead Stadium', { week: 2, us: 20, them: 17, tv: 'FOX' }),
      espnEvent(now, '401770003', -8, 13, 0, EAGLES, LAR, true, 'Lincoln Financial Field', { week: 3, us: 33, them: 26, tv: 'FOX' }),
      espnEvent(now, '401770004', -1, 13, 0, EAGLES, TB, false, 'Raymond James Stadium', { week: 4, us: 27, them: 31, tv: 'CBS' }),
      espnEvent(now, '401770005', 6, 13, 0, EAGLES, NYG, true, 'Lincoln Financial Field', { week: 5, tv: 'FOX' }),
      espnEvent(now, '401770006', 13, 20, 20, EAGLES, DAL, false, 'AT&T Stadium', { week: 6, tv: 'NBC', tbd: false }),
    ],
  };
}

function sixersSchedule(now: Date, seasontype: string | null) {
  const BOS = espnTeam('2', 'BOS', 'Boston Celtics');
  const NYK = espnTeam('18', 'NY', 'New York Knicks');
  if (seasontype === '1')
    return {
      events: [
        espnEvent(now, '401800001', 5, 19, 0, SIXERS, BOS, true, 'Xfinity Mobile Arena', { seasonType: 1, tv: 'NBCSP' }),
        espnEvent(now, '401800002', 8, 19, 30, SIXERS, NYK, false, 'Madison Square Garden', { seasonType: 1 }),
      ],
    };
  if (seasontype === '2')
    return { events: [espnEvent(now, '401800010', 23, 19, 30, SIXERS, NYK, true, 'Xfinity Mobile Arena', { tv: 'ESPN' })] };
  return { events: [] };
}

function unionSchedule(now: Date, fixture: boolean) {
  const NYRB = espnTeam('399', 'RBNY', 'New York Red Bulls');
  const NE = espnTeam('928', 'NE', 'New England Revolution');
  const CLB = espnTeam('183', 'CLB', 'Columbus Crew');
  const DC = espnTeam('193', 'DC', 'D.C. United');
  const MIA = espnTeam('20232', 'MIA', 'Inter Miami CF');
  const NYC = espnTeam('17606', 'NYC', 'New York City FC');
  if (fixture)
    return {
      events: [
        espnEvent(now, '701002', 0, 19, 30, UNION, NE, true, 'Subaru Park', { tv: 'Apple TV' }),
        espnEvent(now, '701003', 2, 19, 30, UNION, DC, false, 'Audi Field', { tv: 'Apple TV' }),
        espnEvent(now, '701004', 5, 19, 30, UNION, NYC, true, 'Subaru Park', { tv: 'Apple TV' }),
        espnEvent(now, '701005', 12, 19, 30, UNION, MIA, true, 'Subaru Park', { tv: 'Apple TV' }),
      ],
    };
  return {
    events: [
      espnEvent(now, '700001', -17, 19, 30, UNION, NYRB, true, 'Subaru Park', { us: 2, them: 0 }),
      espnEvent(now, '700002', -10, 19, 30, UNION, NE, false, 'Gillette Stadium', { us: 1, them: 1 }),
      espnEvent(now, '700003', -6, 19, 30, UNION, CLB, true, 'Subaru Park', { us: 3, them: 1 }),
      espnEvent(now, '700004', -2, 19, 30, UNION, MIA, false, 'Chase Stadium', { us: 1, them: 2 }),
    ],
  };
}

function stat(name: string, value: number, displayValue = String(value)) {
  return { name, value, displayValue };
}

function espnStandings(path: string) {
  if (path === 'nfl')
    return {
      children: [
        {
          name: 'National Football Conference',
          abbreviation: 'NFC',
          children: [
            {
              name: 'NFC East',
              standings: {
                entries: [
                  { team: EAGLES, stats: [stat('wins', 3), stat('losses', 1), stat('ties', 0), stat('playoffSeed', 2)] },
                  { team: espnTeam('6', 'DAL', 'Dallas Cowboys'), stats: [stat('wins', 2), stat('losses', 2), stat('ties', 0), stat('playoffSeed', 8)] },
                  { team: espnTeam('19', 'NYG', 'New York Giants'), stats: [stat('wins', 1), stat('losses', 3), stat('ties', 0), stat('playoffSeed', 12)] },
                  { team: espnTeam('28', 'WSH', 'Washington Commanders'), stats: [stat('wins', 2), stat('losses', 2), stat('ties', 0), stat('playoffSeed', 9)] },
                ],
              },
            },
          ],
        },
      ],
    };
  if (path === 'nba')
    return {
      children: [
        {
          name: 'Eastern Conference',
          standings: { entries: [{ team: SIXERS, stats: [stat('wins', 0), stat('losses', 0), stat('playoffSeed', 7), stat('gamesBehind', 0, '-')] }] },
        },
      ],
    };
  const teams: [any, number, number, number, number, number][] = [
    [espnTeam('20232', 'MIA', 'Inter Miami CF'), 18, 7, 6, 60, 22],
    [espnTeam('183', 'CLB', 'Columbus Crew'), 17, 8, 6, 57, 15],
    [UNION, 16, 9, 6, 54, 12],
    [espnTeam('17606', 'NYC', 'New York City FC'), 15, 10, 6, 51, 8],
    [espnTeam('9720', 'CLT', 'Charlotte FC'), 14, 11, 6, 48, 5],
    [espnTeam('7318', 'ORL', 'Orlando City SC'), 13, 10, 8, 47, 6],
    [espnTeam('182', 'CHI', 'Chicago Fire FC'), 13, 12, 6, 45, 1],
    [espnTeam('399', 'RBNY', 'New York Red Bulls'), 12, 12, 7, 43, -1],
    [espnTeam('928', 'NE', 'New England Revolution'), 11, 12, 8, 41, -3],
    [espnTeam('18267', 'NSH', 'Nashville SC'), 11, 14, 6, 39, -5],
    [espnTeam('193', 'DC', 'D.C. United'), 8, 16, 7, 31, -15],
  ];
  return {
    children: [
      {
        name: 'Eastern Conference',
        standings: {
          entries: teams.map(([team, w, l, t, pts, gd], i) => ({
            team,
            stats: [stat('rank', i + 1), stat('wins', w), stat('losses', l), stat('ties', t), stat('points', pts), stat('gamesPlayed', w + l + t), stat('pointDifferential', gd)],
          })),
        },
      },
    ],
  };
}

function espnRoster(path: string) {
  const a = (id: string, fullName: string, jersey: string, pos: string, injury?: [string, string]) => ({
    id,
    fullName,
    jersey,
    position: { abbreviation: pos, displayName: pos },
    injuries: injury ? [{ status: injury[0], details: { type: injury[1] } }] : [],
  });
  if (path === 'nfl')
    return {
      athletes: [
        { position: 'offense', items: [a('1', 'Jalen Hurts', '1', 'QB'), a('2', 'Saquon Barkley', '26', 'RB'), a('3', 'A.J. Brown', '11', 'WR', ['Questionable', 'Hamstring']), a('4', 'DeVonta Smith', '6', 'WR'), a('5', 'Dallas Goedert', '88', 'TE', ['Out', 'Knee']), a('6', 'Lane Johnson', '65', 'OT')] },
        { position: 'defense', items: [a('7', 'Jalen Carter', '98', 'DT'), a('8', 'Zack Baun', '53', 'LB'), a('9', 'Quinyon Mitchell', '27', 'CB', ['Doubtful', 'Ankle']), a('10', 'Cooper DeJean', '33', 'CB'), a('11', 'Reed Blankenship', '32', 'S', ['Injured Reserve', 'Shoulder'])] },
        { position: 'specialTeam', items: [a('12', 'Jake Elliott', '4', 'PK'), a('13', 'Braden Mann', '10', 'P')] },
      ],
    };
  if (path === 'nba')
    return { athletes: [a('1', 'Tyrese Maxey', '0', 'G'), a('2', 'Joel Embiid', '21', 'C', ['Day-To-Day', 'Knee']), a('3', 'Paul George', '8', 'F'), a('4', 'VJ Edgecombe', '77', 'G'), a('5', 'Kelly Oubre Jr.', '9', 'F')] };
  if (path === 'nhl') return { athletes: [{ position: 'forwards', items: [a('1', 'Owen Tippett', '74', 'RW', ['Day-To-Day', 'Upper Body'])] }] };
  return {
    athletes: [
      a('1', 'Andre Blake', '18', 'G'),
      a('2', 'Jakob Glesnes', '5', 'D'),
      a('3', 'Kai Wagner', '27', 'D', ['Out', 'Hamstring']),
      a('4', 'Jovan Lukic', '4', 'M'),
      a('5', 'Quinn Sullivan', '33', 'M'),
      a('6', 'Tai Baribo', '9', 'F'),
      a('7', 'Mikael Uhre', '7', 'F'),
    ],
  };
}

function espnSummary(now: Date, path: string, event: string) {
  const payload = (competitors: any[], date: string, extra: any = {}) => ({
    header: { id: event, competitions: [{ id: event, date, competitors, status: { type: { state: 'post', shortDetail: 'Final' } } }] },
    ...extra,
  });
  const ls = (xs: number[]) => xs.map((x) => ({ displayValue: String(x) }));
  if (path === 'nfl')
    return payload(
      [
        { homeAway: 'away', team: EAGLES, score: '27', linescores: ls([7, 10, 3, 7]) },
        { homeAway: 'home', team: espnTeam('27', 'TB', 'Tampa Bay Buccaneers'), score: '31', linescores: ls([3, 14, 7, 7]) },
      ],
      et(now, -1, 13),
      {
        leaders: [
          { team: { abbreviation: 'PHI' }, leaders: [{ displayName: 'Passing Yards', leaders: [{ displayValue: '24/35, 281 YDS, 2 TD', athlete: { shortName: 'J. Hurts' } }] }, { displayName: 'Rushing Yards', leaders: [{ displayValue: '19 CAR, 112 YDS, 1 TD', athlete: { shortName: 'S. Barkley' } }] }] },
          { team: { abbreviation: 'TB' }, leaders: [{ displayName: 'Passing Yards', leaders: [{ displayValue: '27/38, 305 YDS, 3 TD', athlete: { shortName: 'B. Mayfield' } }] }] },
        ],
        scoringPlays: [
          { period: { number: 1 }, clock: { displayValue: '8:12' }, team: { abbreviation: 'PHI' }, text: 'Saquon Barkley 12 Yd Run (Jake Elliott Kick)' },
          { period: { number: 4 }, clock: { displayValue: '0:48' }, team: { abbreviation: 'TB' }, text: 'Mike Evans 9 Yd pass from Baker Mayfield (Chase McLaughlin Kick)' },
        ],
      },
    );
  return payload(
    [
      { homeAway: 'away', team: UNION, score: '1', linescores: ls([0, 1]) },
      { homeAway: 'home', team: espnTeam('20232', 'MIA', 'Inter Miami CF'), score: '2', linescores: ls([1, 1]) },
    ],
    et(now, -2, 19, 30),
    {
      keyEvents: [
        { scoringPlay: true, period: { number: 1 }, clock: { displayValue: "23'" }, team: { abbreviation: 'MIA' }, participants: [{ athlete: { displayName: 'Lionel Messi' } }] },
        { scoringPlay: true, period: { number: 2 }, clock: { displayValue: "61'" }, team: { abbreviation: 'PHI' }, participants: [{ athlete: { displayName: 'Tai Baribo' } }] },
        { scoringPlay: true, period: { number: 2 }, clock: { displayValue: "88'" }, team: { abbreviation: 'MIA' }, participants: [{ athlete: { displayName: 'Luis Suárez' } }] },
      ],
    },
  );
}

// ---------------- NWS ----------------
function nwsHourly(now: Date, venue: string) {
  const start = Math.floor(now.getTime() / H) * H;
  const conditions = ['Sunny', 'Mostly Sunny', 'Partly Cloudy', 'Mostly Cloudy', 'Chance Showers', 'Showers Likely'];
  return {
    properties: {
      periods: Array.from({ length: 156 }, (_, i) => {
        const t = start + i * H;
        const hourET = (new Date(t).getUTCHours() + 20) % 24;
        const day = Math.floor(i / 24);
        const cond = conditions[(day + (venue === 'subaru' ? 2 : 0)) % conditions.length];
        return {
          startTime: new Date(t).toISOString(),
          endTime: new Date(t + H).toISOString(),
          temperature: Math.round(62 + 10 * Math.sin(((hourET - 9) / 24) * 2 * Math.PI) - day),
          temperatureUnit: 'F',
          windSpeed: `${5 + ((i * 7) % 11)} mph`,
          windDirection: ['NW', 'W', 'SW', 'S'][day % 4],
          probabilityOfPrecipitation: { unitCode: 'wmoUnit:percent', value: cond.includes('Shower') ? 40 + day * 5 : (day * 3) % 15 },
          shortForecast: cond,
        };
      }),
    },
  };
}

// ---------------- player cards ----------------
function mlbPerson(id: number) {
  const roster = mlbRoster().roster.find((r) => r.person.id === id);
  const pitcher = roster?.position.type === 'Pitcher';
  return {
    people: [
      {
        id,
        fullName: roster?.person.fullName ?? 'Zack Wheeler',
        primaryNumber: roster?.jerseyNumber ?? '45',
        primaryPosition: pitcher ? { abbreviation: 'P', name: 'Pitcher', type: 'Pitcher' } : { abbreviation: roster?.position.abbreviation ?? 'SS', name: 'Shortstop', type: 'Infielder' },
        currentAge: 32,
        birthDate: '1994-06-01',
        birthCity: 'Athens',
        birthStateProvince: 'GA',
        height: `6' 2"`,
        weight: 200,
        batSide: { code: 'R' },
        pitchHand: { code: 'R' },
        mlbDebutDate: '2016-04-10',
        drafts: [{ year: 2012, pickRound: '1', pickNumber: 14, school: { name: 'Univ. of Georgia' } }],
        stats: pitcher
          ? [{ group: { displayName: 'pitching' }, splits: [
              { season: '2025', stat: { era: '2.95', wins: 14, losses: 7 } },
              { season: '2026', team: { id: 143 }, stat: { era: '2.71', wins: 16, losses: 6, strikeOuts: 211, inningsPitched: '192.1', whip: '0.98', saves: 0, gamesPlayed: 31 } },
            ] }]
          : [{ group: { displayName: 'hitting' }, splits: [
              { season: '2026', team: { id: 120 }, stat: { avg: '.250', homeRuns: 5 } },
              { season: '2026', stat: { avg: '.287', homeRuns: 24, rbi: 81, ops: '.842', hits: 171, stolenBases: 22, obp: '.346', gamesPlayed: 150 } },
            ] }],
      },
    ],
  };
}

function nhlLandingPlayer(id: number) {
  const goalie = id === 9 || id === 10;
  return {
    playerId: id,
    firstName: { default: goalie ? 'Samuel' : 'Travis' },
    lastName: { default: goalie ? 'Ersson' : 'Konecny' },
    sweaterNumber: goalie ? 33 : 11,
    position: goalie ? 'G' : 'R',
    headshot: `https://assets.nhle.com/mugs/nhl/20262027/PHI/${id}.png`,
    birthDate: '1997-03-11',
    birthCity: { default: 'London' },
    birthCountry: 'CAN',
    heightInInches: 70,
    weightInPounds: 175,
    shootsCatches: goalie ? 'L' : 'R',
    draftDetails: { year: 2015, round: 1, pickInRound: 24, overallPick: 24, teamAbbrev: 'PHI' },
    featuredStats: {
      season: 20252026,
      regularSeason: {
        subSeason: goalie
          ? { gamesPlayed: 51, wins: 27, losses: 17, otLosses: 6, goalsAgainstAvg: 2.7123, savePctg: 0.9031, shutouts: 3 }
          : { gamesPlayed: 82, goals: 33, assists: 43, points: 76, plusMinus: 7, pim: 26, shots: 245 },
      },
    },
  };
}

function espnAthlete(path: string, id: string) {
  const roster = espnRoster(path) as any;
  const all: any[] = roster.athletes.flatMap((g: any) => g.items ?? [g]);
  const a = all.find((x) => x.id === id) ?? all[0];
  return {
    athlete: {
      id,
      displayName: a.fullName,
      jersey: a.jersey,
      position: { displayName: path === 'nfl' ? 'Quarterback' : 'Guard', abbreviation: a.position.abbreviation },
      age: 28,
      dateOfBirth: '1998-08-07T07:00Z',
      displayHeight: `6' 1"`,
      displayWeight: '223 lbs',
      displayBirthPlace: 'Houston, TX',
      college: path === 'usa.1' ? undefined : { name: 'Oklahoma' },
      displayDraft: path === 'nfl' ? '2020: Rd 2, Pk 53 (PHI)' : undefined,
      displayExperience: '7th Season',
      citizenship: path === 'usa.1' ? 'Jamaica' : undefined,
    },
  };
}

function espnOverview(path: string) {
  const byLeague: Record<string, [string, string[], string[]]> = {
    nfl: ['2026 Regular Season', ['CMP', 'ATT', 'YDS', 'CMP%', 'TD', 'INT', 'RTG'], ['89', '131', '1,043', '67.9', '8', '2', '104.3']],
    nba: ['2025-26 Regular Season', ['GP', 'PTS', 'REB', 'AST', 'FG%', '3P%'], ['70', '26.3', '3.4', '6.2', '44.8', '37.1']],
    'usa.1': ['2026 Regular Season', ['APP', 'G', 'A', 'SHOTS', 'SV'], ['29', '0', '0', '0', '94']],
  };
  const [title, labels, values] = byLeague[path] ?? byLeague.nfl;
  return { statistics: { displayName: title, labels, splits: [{ displayName: 'Regular Season', stats: values }, { displayName: 'Career', stats: values }] } };
}

// ---------------- router ----------------
export function fixtureRouter(now: Date) {
  return (raw: string): unknown => {
    const url = new URL(raw);
    const q = url.searchParams;
    const p = url.pathname;
    if (url.host === 'statsapi.mlb.com') {
      if (p.endsWith('/schedule') && q.get('gamePk')) return mlbBox(now, Number(q.get('gamePk')));
      if (p.endsWith('/schedule')) return mlbSchedule(now);
      if (p.endsWith('/standings')) return mlbStandings();
      if (p.includes('/roster')) return mlbRoster();
      if (p.endsWith('/people')) return mlbPeople();
      const pm = p.match(/\/people\/(\d+)$/);
      if (pm) return mlbPerson(Number(pm[1]));
    }
    if (url.host === 'api-web.nhle.com') {
      if (p.includes('/club-schedule-season/')) return nhlSchedule(now);
      if (p.includes('/standings/')) return nhlStandings();
      if (p.includes('/roster/')) return nhlRoster();
      if (p.includes('/gamecenter/')) return nhlLanding(now);
      const pl = p.match(/\/player\/(\d+)\/landing$/);
      if (pl) return nhlLandingPlayer(Number(pl[1]));
    }
    if (url.host === 'site.api.espn.com') {
      const m = p.match(/sports\/[^/]+\/([^/]+)\//);
      const path = m?.[1] ?? '';
      if (p.includes('/standings')) return espnStandings(path);
      if (p.endsWith('/roster')) return espnRoster(path);
      if (p.endsWith('/summary')) return espnSummary(now, path, q.get('event') ?? '');
      if (p.endsWith('/schedule')) {
        if (path === 'nfl') return eaglesSchedule(now, q.get('seasontype'));
        if (path === 'nba') return sixersSchedule(now, q.get('seasontype'));
        if (path === 'usa.1') return unionSchedule(now, q.get('fixture') === 'true');
      }
    }
    if (url.host === 'site.web.api.espn.com') {
      const am = p.match(/sports\/[^/]+\/([^/]+)\/athletes\/(\d+)(\/overview)?$/);
      if (am) return am[3] ? espnOverview(am[1]) : espnAthlete(am[1], am[2]);
    }
    if (url.host === 'api.weather.gov') {
      const pm = p.match(/^\/points\/([\d.-]+),([\d.-]+)/);
      if (pm) {
        const key = pm[1].startsWith('39.83') ? 'subaru' : pm[1].startsWith('39.906') ? 'cbp' : 'linc';
        return {
          properties: {
            forecastHourly: `https://api.weather.gov/gridpoints/PHI/${key}/forecast/hourly`,
            forecast: `https://api.weather.gov/gridpoints/PHI/${key}/forecast`,
          },
        };
      }
      const gm = p.match(/^\/gridpoints\/PHI\/(\w+)\/forecast(\/hourly)?/);
      if (gm) return nwsHourly(now, gm[1]);
    }
    throw new Error(`no fixture for ${raw}`);
  };
}

export function fixtureFetch(now: Date, opts: { failHosts?: string[] } = {}): FetchJson {
  const route = fixtureRouter(now);
  return async (url) => {
    if (opts.failHosts?.includes(new URL(url).host)) throw new Error(`simulated outage: ${new URL(url).host}`);
    return JSON.parse(JSON.stringify(route(url)));
  };
}
