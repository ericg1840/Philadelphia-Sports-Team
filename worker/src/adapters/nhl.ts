// NHL public API (api-web.nhle.com) -> normalized model.
// Injury status isn't published by the NHL API, so it's overlaid from ESPN's roster.
import type { BoxScore, Game, GameStatus, Player, PlayerProfile, SeasonType, Standing, TeamRef } from '../../../shared/types';
import type { Ctx } from '../context';
import { ageOn, facts, formatBirthDate, ordinal, sortByStart, txt, uniq } from '../util';
import { makeVenue } from '../venues';
import { espnInjuriesByName, normName } from './espn';
import type { Adapter } from './types';

const API = 'https://api-web.nhle.com/v1';
const PHI = 'PHI';

/** NHL season id like 20262027. New schedule is published over the summer. */
export function nhlSeason(now: Date): string {
  const y = now.getUTCFullYear();
  return now.getUTCMonth() >= 6 ? `${y}${y + 1}` : `${y - 1}${y}`;
}

function teamRef(t: any): TeamRef {
  const place = txt(t?.placeName);
  const common = txt(t?.commonName);
  return {
    id: String(t?.id ?? t?.abbrev ?? ''),
    name: common ? `${place} ${common}`.trim() : txt(t?.name) || place || t?.abbrev || 'TBD',
    abbrev: t?.abbrev ?? '???',
    logo: t?.logo,
  };
}

function status(g: any): GameStatus {
  if (g.gameScheduleState === 'PPD') return 'postponed';
  if (g.gameScheduleState === 'CNCL') return 'canceled';
  switch (g.gameState) {
    case 'LIVE':
    case 'CRIT':
      return 'live';
    case 'FINAL':
    case 'OFF':
      return 'final';
    default:
      return 'scheduled';
  }
}

const SEASON_TYPES: Record<number, SeasonType> = { 1: 'preseason', 2: 'regular', 3: 'postseason' };

export function normalizeNhlGame(g: any): Game {
  const home = g.homeTeam?.abbrev === PHI;
  const us = home ? g.homeTeam : g.awayTeam;
  const them = home ? g.awayTeam : g.homeTeam;
  const st = status(g);
  const lastPeriod: string | undefined = g.gameOutcome?.lastPeriodType ?? g.periodDescriptor?.periodType;

  let score: Game['score'];
  let result: Game['result'];
  let statusDetail: string | undefined;
  if ((st === 'live' || st === 'final') && us?.score != null && them?.score != null) {
    score = { us: us.score, them: them.score };
    if (st === 'final') {
      const extra = lastPeriod === 'OT' || lastPeriod === 'SO';
      result = us.score > them.score ? 'W' : extra ? 'OTL' : 'L';
      statusDetail = extra ? `Final/${lastPeriod}` : 'Final';
    } else {
      const p = g.periodDescriptor;
      statusDetail = p?.periodType === 'REG' ? `P${p.number}` : p?.periodType;
    }
  }
  if (st === 'postponed') statusDetail = 'Postponed';

  const broadcasts = uniq(
    ((g.tvBroadcasts ?? []) as any[])
      .filter((b) => b.countryCode !== 'CA' && (b.market === 'N' || b.market === (home ? 'H' : 'A')))
      .map((b) => b.network as string),
  );

  const seasonType = SEASON_TYPES[g.gameType] ?? 'regular';
  return {
    id: `flyers:${g.id}`,
    upstreamId: String(g.id),
    team: 'flyers',
    league: 'NHL',
    start: g.startTimeUTC,
    timeTBD: g.gameScheduleState === 'TBD',
    status: st,
    statusDetail,
    seasonType,
    home,
    opponent: teamRef(them),
    score,
    result,
    venue: makeVenue(txt(g.venue)),
    broadcasts,
    note: seasonType === 'preseason' ? 'Preseason' : seasonType === 'postseason' ? 'Playoffs' : undefined,
  };
}

export function normalizeNhlSchedule(d: any): Game[] {
  return sortByStart(((d?.games ?? []) as any[]).map(normalizeNhlGame));
}

export function normalizeNhlStanding(d: any): Standing | null {
  const all: any[] = d?.standings ?? [];
  const s = all.find((x) => txt(x.teamAbbrev) === PHI);
  if (!s) return null;
  const group = `${s.divisionName} Division`;
  const rank: number = s.divisionSequence;
  const record = `${s.wins}-${s.losses}-${s.otLosses}`;

  let playoff: Standing['playoff'];
  const clinch: string | undefined = s.clinchIndicator;
  if (clinch === 'e') playoff = { status: 'eliminated', text: 'Eliminated' };
  else if (clinch) playoff = { status: 'clinched', text: 'Clinched playoff spot' };
  else if (s.gamesPlayed > 0) {
    if (rank <= 3) playoff = { status: 'in', text: `Top 3 in ${s.divisionName}` };
    else if (s.wildcardSequence && s.wildcardSequence <= 2) playoff = { status: 'in', text: `Wild Card #${s.wildcardSequence}` };
    else {
      const wc2 = all.find((x) => x.conferenceName === s.conferenceName && x.wildcardSequence === 2);
      const back = wc2 ? wc2.points - s.points : null;
      playoff =
        back == null
          ? { status: 'out', text: 'Outside playoff spots' }
          : { status: back <= 4 ? 'bubble' : 'out', text: `${back} pts back of WC2` };
    }
  }

  return {
    summary: s.gamesPlayed > 0 ? `${ordinal(rank)} ${s.divisionName}` : `${s.divisionName} Division`,
    record,
    rank,
    group,
    points: s.points,
    playoff,
  };
}

export function normalizeNhlRoster(d: any, injuries: Map<string, Player['injury']> = new Map()): Player[] {
  const groups: [string, string][] = [
    ['forwards', 'Forwards'],
    ['defensemen', 'Defense'],
    ['goalies', 'Goalies'],
  ];
  return groups.flatMap(([key, label]) =>
    ((d?.[key] ?? []) as any[]).map((p) => {
      const name = `${txt(p.firstName)} ${txt(p.lastName)}`.trim();
      return {
        id: String(p.id),
        name,
        number: p.sweaterNumber != null ? String(p.sweaterNumber) : undefined,
        position: p.positionCode ?? '',
        group: label,
        injury: injuries.get(normName(name)),
      } satisfies Player;
    }),
  );
}

function periodLabel(pd: any): string {
  if (!pd) return '';
  if (pd.periodType === 'REG') return String(pd.number);
  if (pd.periodType === 'OT' && pd.number > 4) return `${pd.number - 3}OT`;
  return pd.periodType;
}

function personName(p: any): string {
  const n = txt(p?.name);
  if (n) return n;
  return `${txt(p?.firstName).charAt(0)}. ${txt(p?.lastName)}`.trim();
}

export function normalizeNhlBox(d: any): BoxScore {
  const scoringPeriods: any[] = d?.summary?.scoring ?? [];
  const periodLabels = ['1', '2', '3'];
  for (const p of scoringPeriods) {
    const l = periodLabel(p.periodDescriptor);
    if (!periodLabels.includes(l)) periodLabels.push(l);
  }
  // A shootout is shown as a single column; goals in it aren't counted per period.
  const goalsFor = (abbrev: string) =>
    periodLabels.map((label) => {
      const period = scoringPeriods.find((p) => periodLabel(p.periodDescriptor) === label);
      if (!period) return label === 'SO' ? null : 0;
      return (period.goals ?? []).filter((g: any) => txt(g.teamAbbrev) === abbrev).length;
    });

  const lines = (['awayTeam', 'homeTeam'] as const).map((side) => {
    const t = d?.[side] ?? {};
    return {
      team: teamRef(t),
      home: side === 'homeTeam',
      periods: goalsFor(t.abbrev),
      total: t.score ?? 0,
      extra: { SOG: t.sog != null ? String(t.sog) : '-' },
    };
  });

  const scoring = scoringPeriods.flatMap((p) =>
    ((p.goals ?? []) as any[]).map((g) => {
      const assists = ((g.assists ?? []) as any[]).map(personName).join(', ');
      const scorer = personName(g);
      const strength = g.strength && g.strength !== 'ev' ? ` ${String(g.strength).toUpperCase()}` : '';
      return {
        period: periodLabel(p.periodDescriptor),
        time: g.timeInPeriod,
        team: txt(g.teamAbbrev),
        text: `${scorer}${g.goalsToDate ? ` (${g.goalsToDate})` : ''}${strength}${assists ? ` — ${assists}` : ''}`,
      };
    }),
  );

  const highlights = ((d?.summary?.threeStars ?? []) as any[]).map((s) => ({
    label: `★${s.star}`,
    value: `${personName(s)} (${txt(s.teamAbbrev)})`,
  }));

  const game = normalizeNhlGame(d);
  return {
    gameId: game.id,
    league: 'NHL',
    start: d.startTimeUTC,
    statusDetail: game.statusDetail ?? 'Final',
    periodLabels,
    extraLabels: ['SOG'],
    lines,
    highlights,
    scoring,
  };
}

const POSITIONS: Record<string, string> = { C: 'Center', L: 'Left Wing', R: 'Right Wing', D: 'Defense', G: 'Goalie' };

/** "20262027" -> "2026-27" */
function seasonLabel(id: unknown): string | undefined {
  const s = String(id ?? '');
  return /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(6)}` : undefined;
}

export function normalizeNhlPlayer(d: any, now: Date): PlayerProfile {
  if (!d?.playerId) throw new Error('player not found');
  const goalie = d.position === 'G';
  const sub = d.featuredStats?.regularSeason?.subSeason;
  const stats = sub
    ? facts(
        goalie
          ? [
              ['GP', sub.gamesPlayed],
              ['W', sub.wins],
              ['L', sub.losses],
              ['OTL', sub.otLosses],
              ['GAA', sub.goalsAgainstAvg != null ? Number(sub.goalsAgainstAvg).toFixed(2) : undefined],
              ['SV%', sub.savePctg != null ? Number(sub.savePctg).toFixed(3).replace(/^0/, '') : undefined],
              ['SO', sub.shutouts],
            ]
          : [
              ['GP', sub.gamesPlayed],
              ['G', sub.goals],
              ['A', sub.assists],
              ['P', sub.points],
              ['+/-', sub.plusMinus != null ? (sub.plusMinus > 0 ? `+${sub.plusMinus}` : sub.plusMinus) : undefined],
              ['PIM', sub.pim],
              ['SOG', sub.shots],
            ],
      )
    : [];
  const dd = d.draftDetails;
  const inches = d.heightInInches;
  return {
    id: String(d.playerId),
    team: 'flyers',
    name: `${txt(d.firstName)} ${txt(d.lastName)}`.trim(),
    number: d.sweaterNumber != null ? String(d.sweaterNumber) : undefined,
    position: POSITIONS[d.position] ?? d.position ?? '',
    headshot: d.headshot,
    bio: facts([
      ['Age', ageOn(d.birthDate, now)],
      [goalie ? 'Catches' : 'Shoots', d.shootsCatches],
      ['Height', inches ? `${Math.floor(inches / 12)}' ${inches % 12}"` : undefined],
      ['Weight', d.weightInPounds ? `${d.weightInPounds} lbs` : undefined],
      ['Born', [formatBirthDate(d.birthDate), [txt(d.birthCity), d.birthCountry].filter(Boolean).join(', ')].filter(Boolean).join(' · ') || undefined],
      ['Draft', dd?.year ? `${dd.year}, Rd ${dd.round}, #${dd.overallPick} (${dd.teamAbbrev})` : undefined],
    ]),
    season: stats.length ? { title: `${seasonLabel(d.featuredStats?.season) ?? 'Latest'} season`, stats } : null,
  };
}

export const nhl: Adapter = {
  async schedule(ctx) {
    return normalizeNhlSchedule(await ctx.fetchJson(`${API}/club-schedule-season/${PHI}/${nhlSeason(ctx.now)}`));
  },
  async standing(ctx) {
    return normalizeNhlStanding(await ctx.fetchJson(`${API}/standings/now`));
  },
  async roster(ctx: Ctx) {
    const [roster, injuries] = await Promise.all([
      ctx.fetchJson(`${API}/roster/${PHI}/current`),
      espnInjuriesByName(ctx, 'hockey', 'nhl', '15').catch(() => new Map()),
    ]);
    return normalizeNhlRoster(roster, injuries);
  },
  async boxScore(ctx, game) {
    const d = await ctx.fetchJson(`${API}/gamecenter/${game.upstreamId}/landing`);
    return normalizeNhlBox(d);
  },
  async extras() {
    return { kind: 'none' };
  },
  async player(ctx, id) {
    return normalizeNhlPlayer(await ctx.fetchJson(`${API}/player/${id}/landing`), ctx.now);
  },
};

