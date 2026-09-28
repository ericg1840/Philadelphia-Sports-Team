// MLB Stats API (statsapi.mlb.com) -> normalized model.
import type {
  BoxScore,
  Game,
  GameStatus,
  Player,
  ProbablePitcher,
  ProbablePitchersMatchup,
  SeasonType,
  Standing,
  TeamRef,
} from '../../../shared/types';
import type { Ctx } from '../context';
import { addDays, isUpcoming, ordinal, sortByStart, uniq, ymdET } from '../util';
import { makeVenue } from '../venues';
import type { Adapter } from './types';

const API = 'https://statsapi.mlb.com/api/v1';
const PHILLIES = 143;
const NL = 104;
const DIVISIONS: Record<number, string> = { 204: 'NL East', 205: 'NL Central', 203: 'NL West' };

const logo = (id: number | string) => `https://www.mlbstatic.com/team-logos/${id}.svg`;

function seasonOf(now: Date) {
  return now.getUTCFullYear();
}

function teamRef(t: any): TeamRef {
  return {
    id: String(t?.id ?? ''),
    name: t?.name ?? 'TBD',
    abbrev: t?.abbreviation ?? t?.teamName?.slice(0, 3).toUpperCase() ?? '???',
    logo: t?.id ? logo(t.id) : undefined,
  };
}

function seasonType(gameType: string): SeasonType {
  if (gameType === 'R') return 'regular';
  if (gameType === 'S' || gameType === 'E') return 'preseason';
  return 'postseason'; // F (wild card), D, L, W
}

function status(g: any): GameStatus {
  const detailed: string = g.status?.detailedState ?? '';
  if (/postponed|suspended/i.test(detailed)) return 'postponed';
  if (/cancel/i.test(detailed)) return 'canceled';
  switch (g.status?.abstractGameState) {
    case 'Final':
      return 'final';
    case 'Live':
      return 'live';
    default:
      return 'scheduled';
  }
}

export function normalizeMlbGame(g: any): Game {
  const home = g.teams?.home?.team?.id === PHILLIES;
  const us = home ? g.teams.home : g.teams.away;
  const them = home ? g.teams.away : g.teams.home;
  const st = status(g);

  let score: Game['score'];
  let result: Game['result'];
  if ((st === 'live' || st === 'final') && us?.score != null && them?.score != null) {
    score = { us: us.score, them: them.score };
    if (st === 'final') {
      result = us.isWinner ? 'W' : them.isWinner ? 'L' : us.score > them.score ? 'W' : us.score < them.score ? 'L' : 'T';
    }
  }

  let statusDetail: string | undefined = g.status?.detailedState;
  const ls = g.linescore;
  if (st === 'live' && ls?.currentInningOrdinal) statusDetail = `${ls.inningState ?? ''} ${ls.currentInningOrdinal}`.trim();
  if (st === 'final' && ls?.currentInning && ls.currentInning !== 9) statusDetail = `Final/${ls.currentInning}`;
  if (st === 'final' && statusDetail === 'Game Over') statusDetail = 'Final';

  const notes: string[] = [];
  const type = seasonType(g.gameType);
  if (type === 'postseason') {
    const series = g.seriesDescription ?? 'Postseason';
    notes.push(g.seriesGameNumber ? `${series} Game ${g.seriesGameNumber}` : series);
  }
  if (type === 'preseason') notes.push('Spring Training');
  if (g.doubleHeader === 'Y' || g.doubleHeader === 'S') notes.push(`Doubleheader G${g.gameNumber}`);

  const broadcasts = uniq(
    ((g.broadcasts ?? []) as any[])
      .filter((b) => b.type === 'TV' && (b.isNational || b.homeAway === (home ? 'home' : 'away')))
      .map((b) => String(b.name).replace(/\s*\(out-of-market.*\)$/i, '')),
  );

  return {
    id: `phillies:${g.gamePk}`,
    upstreamId: String(g.gamePk),
    team: 'phillies',
    league: 'MLB',
    start: g.gameDate,
    timeTBD: !!g.status?.startTimeTBD,
    status: st,
    statusDetail,
    seasonType: type,
    home,
    opponent: teamRef(them?.team),
    score,
    result,
    venue: makeVenue(g.venue?.name, g.venue?.location?.city),
    broadcasts,
    note: notes.join(' · ') || undefined,
  };
}

export function normalizeMlbSchedule(d: any): Game[] {
  const byPk = new Map<number, any>();
  // A suspended game appears twice (original + resumption date); the later entry wins.
  for (const date of d?.dates ?? []) for (const g of date.games ?? []) byPk.set(g.gamePk, g);
  return sortByStart([...byPk.values()].map(normalizeMlbGame));
}

export function normalizeMlbStanding(d: any): Standing | null {
  for (const rec of d?.records ?? []) {
    const tr = (rec.teamRecords ?? []).find((t: any) => t.team?.id === PHILLIES);
    if (!tr) continue;
    const group = DIVISIONS[rec.division?.id] ?? rec.division?.name ?? 'Division';
    const rank = parseInt(tr.divisionRank, 10);
    const gb = tr.gamesBack;
    const summary = rank === 1 ? `1st ${group}` : `${ordinal(rank)} ${group}${gb && gb !== '-' ? `, ${gb} GB` : ''}`;

    let playoff: Standing['playoff'];
    const clinch: string | undefined = tr.clinchIndicator;
    if (tr.clinched || clinch) {
      const text =
        clinch === 'z'
          ? 'Clinched first-round bye'
          : tr.divisionChamp || clinch === 'y'
            ? `Clinched ${group}`
            : clinch === 'w'
              ? 'Clinched wild card'
              : 'Clinched playoff spot';
      playoff = { status: 'clinched', text };
    } else if (tr.eliminationNumber === 'E' && tr.wildCardEliminationNumber === 'E') {
      playoff = { status: 'eliminated', text: 'Eliminated' };
    } else if (rank === 1) {
      playoff = { status: 'in', text: 'Division leader' };
    } else {
      const wcRank = parseInt(tr.wildCardRank, 10);
      const wcgb: string = tr.wildCardGamesBack ?? '';
      if (wcRank && wcRank <= 3) {
        playoff = { status: 'in', text: `Wild Card #${wcRank}${wcgb.startsWith('+') ? ` (${wcgb} on WC4)` : ''}` };
      } else if (wcgb) {
        const back = parseFloat(wcgb);
        playoff = { status: back <= 3 ? 'bubble' : 'out', text: `${wcgb} GB of final Wild Card` };
      }
    }
    if ((tr.wins ?? 0) + (tr.losses ?? 0) === 0) playoff = undefined;

    return { summary, record: `${tr.wins}-${tr.losses}`, rank, group, playoff };
  }
  return null;
}

const ROSTER_GROUPS: Record<string, string> = {
  Pitcher: 'Pitchers',
  Catcher: 'Catchers',
  Infielder: 'Infielders',
  Outfielder: 'Outfielders',
  Hitter: 'Hitters',
  'Two-Way Player': 'Two-Way',
};

export function normalizeMlbRoster(d: any): Player[] {
  const all = ((d?.roster ?? []) as any[]).map((r) => {
    const code: string = r.status?.code ?? 'A';
    const injured = /^D\d+/.test(code) || /injured/i.test(r.status?.description ?? '');
    return {
      code,
      player: {
        id: String(r.person?.id),
        name: r.person?.fullName ?? 'Unknown',
        number: r.jerseyNumber || undefined,
        position: r.position?.abbreviation ?? '',
        group: ROSTER_GROUPS[r.position?.type] ?? r.position?.type ?? 'Roster',
        injury: injured ? { status: r.status?.description ?? 'Injured List' } : undefined,
      } satisfies Player,
    };
  });
  // 40-man roster includes optioned minor leaguers; keep active + IL.
  const relevant = all.filter((x) => x.code === 'A' || !!x.player.injury);
  return (relevant.length >= 10 ? relevant : all).map((x) => x.player);
}

export function normalizeMlbBox(d: any): BoxScore {
  const g = d?.dates?.[0]?.games?.[0];
  if (!g) throw new Error('box score not found');
  const ls = g.linescore ?? {};
  const innings: any[] = ls.innings ?? [];
  const periodLabels = innings.map((i) => String(i.num));
  const lines = (['away', 'home'] as const).map((side) => {
    const t = g.teams?.[side];
    const totals = ls.teams?.[side] ?? {};
    return {
      team: teamRef(t?.team),
      home: side === 'home',
      periods: innings.map((i) => i[side]?.runs ?? null),
      total: totals.runs ?? t?.score ?? 0,
      extra: { H: String(totals.hits ?? '-'), E: String(totals.errors ?? '-') },
    };
  });
  const highlights: BoxScore['highlights'] = [];
  const dec = g.decisions ?? {};
  if (dec.winner) highlights.push({ label: 'W', value: dec.winner.fullName });
  if (dec.loser) highlights.push({ label: 'L', value: dec.loser.fullName });
  if (dec.save) highlights.push({ label: 'SV', value: dec.save.fullName });
  const st = normalizeMlbGame(g);
  return {
    gameId: st.id,
    league: 'MLB',
    start: g.gameDate,
    statusDetail: st.statusDetail ?? 'Final',
    periodLabels,
    extraLabels: ['H', 'E'],
    lines,
    highlights,
    scoring: [],
  };
}

function pitcherLine(p: any): ProbablePitcher | null {
  if (!p?.id) return null;
  const stat = p.stats?.find((s: any) => s.group?.displayName === 'pitching' || s.splits)?.splits?.[0]?.stat;
  return {
    id: String(p.id),
    name: p.fullName,
    hand: p.pitchHand?.code ? `${p.pitchHand.code}HP` : undefined,
    line: stat ? `${stat.wins}-${stat.losses}, ${stat.era} ERA` : undefined,
  };
}

export const mlb: Adapter = {
  async schedule(ctx) {
    const season = seasonOf(ctx.now);
    const d = await ctx.fetchJson(
      `${API}/schedule?sportId=1&teamId=${PHILLIES}&season=${season}&gameType=S,R,F,D,L,W` +
        `&hydrate=team,venue(location),linescore,broadcasts(all),seriesStatus`,
    );
    return normalizeMlbSchedule(d);
  },

  async standing(ctx) {
    const d = await ctx.fetchJson(
      `${API}/standings?leagueId=${NL}&season=${seasonOf(ctx.now)}&standingsTypes=regularSeason`,
    );
    return normalizeMlbStanding(d);
  },

  async roster(ctx) {
    const d = await ctx.fetchJson(`${API}/teams/${PHILLIES}/roster?rosterType=40Man&season=${seasonOf(ctx.now)}`);
    return normalizeMlbRoster(d);
  },

  async boxScore(ctx, game) {
    const d = await ctx.fetchJson(`${API}/schedule?gamePk=${game.upstreamId}&hydrate=linescore,decisions,team`);
    return normalizeMlbBox(d);
  },

  async extras(ctx) {
    const start = ymdET(ctx.now);
    const end = ymdET(addDays(ctx.now, 7));
    const d = await ctx.fetchJson(
      `${API}/schedule?sportId=1&teamId=${PHILLIES}&startDate=${start}&endDate=${end}&hydrate=team,probablePitcher`,
    );
    const games: any[] = (d?.dates ?? []).flatMap((x: any) => x.games ?? []);
    const upcoming = games.filter((g) => isUpcoming(normalizeMlbGame(g), ctx.now)).slice(0, 4);

    const ids = uniq(
      upcoming.flatMap((g) => [g.teams?.home?.probablePitcher?.id, g.teams?.away?.probablePitcher?.id]).filter(Boolean),
    );
    const people = new Map<number, any>();
    if (ids.length) {
      try {
        const p = await ctx.fetchJson(
          `${API}/people?personIds=${ids.join(',')}&hydrate=stats(group=[pitching],type=[season],season=${seasonOf(ctx.now)})`,
        );
        for (const person of p?.people ?? []) people.set(person.id, person);
      } catch {
        // Season lines are a nice-to-have; names come from the schedule.
      }
    }

    const matchups: ProbablePitchersMatchup[] = upcoming.map((g) => {
      const n = normalizeMlbGame(g);
      const usSide = n.home ? 'home' : 'away';
      const themSide = n.home ? 'away' : 'home';
      const pp = (side: string) => {
        const base = g.teams?.[side]?.probablePitcher;
        return base ? pitcherLine({ ...base, ...people.get(base.id) }) : null;
      };
      return { gameId: n.id, start: n.start, home: n.home, opponent: n.opponent, us: pp(usSide), them: pp(themSide) };
    });
    return { kind: 'probables', matchups };
  },
};
