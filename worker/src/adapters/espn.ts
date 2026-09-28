// ESPN unofficial "site" API (NFL, NBA, MLS) -> normalized model.
import type {
  BoxScore,
  Game,
  GameStatus,
  Injury,
  League,
  Player,
  SeasonType,
  Standing,
  TableRow,
  TeamExtras,
  TeamId,
  TeamRef,
} from '../../../shared/types';
import type { Ctx } from '../context';
import { MINUTE, num, ordinal, sortByStart, uniq } from '../util';
import { makeVenue } from '../venues';
import type { Adapter } from './types';

const SITE = 'https://site.api.espn.com/apis/site/v2/sports';
const STANDINGS = 'https://site.api.espn.com/apis/v2/sports';

export interface EspnTeamConfig {
  team: TeamId;
  league: League;
  sport: 'football' | 'basketball' | 'soccer' | 'hockey';
  path: string; // 'nfl' | 'nba' | 'usa.1'
  espnId: string;
  season: (now: Date) => number;
  /** How to request the whole season's schedule. */
  scheduleQueries: (season: number) => string[];
  /** Extra query for standings (e.g. NFL division level). */
  standingsQuery?: string;
  playoff: (seed: number, entry: StandingEntry, group: StandingGroup) => Standing['playoff'];
  extras?: 'injuries' | 'table';
}

export interface StandingEntry {
  team: TeamRef;
  stats: Record<string, number>;
  display: Record<string, string>;
}
export interface StandingGroup {
  name: string;
  entries: StandingEntry[];
}

// ---------- helpers ----------

export function normName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .replace(/\s+(jr|sr|ii|iii|iv)$/, '')
    .trim();
}

function teamRef(t: any): TeamRef {
  return {
    id: String(t?.id ?? ''),
    name: t?.displayName ?? t?.name ?? 'TBD',
    abbrev: t?.abbreviation ?? '???',
    logo: t?.logos?.[0]?.href ?? t?.logo,
  };
}

function statusOf(st: any): GameStatus {
  const name: string = st?.type?.name ?? '';
  if (/POSTPONED|SUSPENDED|DELAYED/.test(name)) return 'postponed';
  if (/CANCEL/.test(name)) return 'canceled';
  switch (st?.type?.state) {
    case 'in':
      return 'live';
    case 'post':
      return 'final';
    default:
      return 'scheduled';
  }
}

const SEASON_TYPES: Record<number, SeasonType> = { 1: 'preseason', 2: 'regular', 3: 'postseason' };

export function normalizeEspnEvent(ev: any, cfg: Pick<EspnTeamConfig, 'team' | 'league' | 'espnId'>): Game | null {
  const comp = ev?.competitions?.[0];
  if (!comp) return null;
  const competitors: any[] = comp.competitors ?? [];
  const us = competitors.find((c) => String(c.team?.id ?? c.id) === cfg.espnId);
  const them = competitors.find((c) => c !== us);
  if (!us || !them) return null;

  const statusObj = comp.status ?? ev.status;
  const st = statusOf(statusObj);
  let score: Game['score'];
  let result: Game['result'];
  const usScore = num(us.score);
  const themScore = num(them.score);
  if ((st === 'live' || st === 'final') && usScore != null && themScore != null) {
    score = { us: usScore, them: themScore };
    if (st === 'final') {
      result = us.winner === true ? 'W' : them.winner === true ? 'L' : usScore > themScore ? 'W' : usScore < themScore ? 'L' : 'T';
    }
  }

  const seasonType = SEASON_TYPES[ev.seasonType?.type ?? comp.type?.id] ?? 'regular';
  const notes: string[] = [];
  const headline = comp.notes?.[0]?.headline;
  if (headline) notes.push(headline);
  else if (cfg.league === 'NFL' && ev.week?.text && seasonType !== 'postseason') notes.push(ev.week.text);
  if (seasonType === 'preseason' && !notes.some((n) => /preseason/i.test(n))) notes.unshift('Preseason');

  return {
    id: `${cfg.team}:${ev.id}`,
    upstreamId: String(ev.id),
    team: cfg.team,
    league: cfg.league,
    start: comp.date ?? ev.date,
    timeTBD: comp.timeValid === false || ev.timeValid === false,
    status: st,
    statusDetail: statusObj?.type?.shortDetail ?? statusObj?.type?.detail,
    seasonType,
    home: us.homeAway === 'home',
    opponent: teamRef(them.team),
    score,
    result,
    venue: makeVenue(comp.venue?.fullName, comp.venue?.address?.city),
    broadcasts: uniq(
      ((comp.broadcasts ?? []) as any[])
        .map((b) => b.media?.shortName ?? b.names?.join(', '))
        .filter(Boolean),
    ),
    note: notes.join(' · ') || undefined,
  };
}

export function normalizeEspnSchedules(payloads: any[], cfg: EspnTeamConfig): Game[] {
  const byId = new Map<string, Game>();
  for (const p of payloads) {
    for (const ev of p?.events ?? []) {
      const g = normalizeEspnEvent(ev, cfg);
      if (g) byId.set(g.upstreamId, g);
    }
  }
  return sortByStart([...byId.values()]);
}

// ---------- standings ----------

export function flattenStandings(d: any): StandingGroup[] {
  const out: StandingGroup[] = [];
  const walk = (node: any) => {
    const entries: any[] | undefined = node?.standings?.entries;
    if (entries?.length) {
      out.push({
        name: node.name ?? node.abbreviation ?? 'Standings',
        entries: entries.map((e) => {
          const stats: Record<string, number> = {};
          const display: Record<string, string> = {};
          for (const s of e.stats ?? []) {
            const key = s.name ?? s.type;
            if (!key) continue;
            if (typeof s.value === 'number') stats[key] = s.value;
            if (s.displayValue != null) display[key] = String(s.displayValue);
          }
          return { team: teamRef(e.team), stats, display };
        }),
      });
    }
    for (const c of node?.children ?? []) walk(c);
  };
  walk(d);
  return out;
}

function sortGroup(g: StandingGroup): StandingEntry[] {
  const key = g.entries.some((e) => e.stats.playoffSeed) ? 'playoffSeed' : g.entries.some((e) => e.stats.rank) ? 'rank' : null;
  if (key) return [...g.entries].sort((a, b) => (a.stats[key] ?? 99) - (b.stats[key] ?? 99));
  return [...g.entries].sort((a, b) => (b.stats.points ?? b.stats.winPercent ?? 0) - (a.stats.points ?? a.stats.winPercent ?? 0));
}

function recordOf(e: StandingEntry, league: League): string {
  const w = e.stats.wins ?? 0;
  const l = e.stats.losses ?? 0;
  const t = e.stats.ties ?? 0;
  if (league === 'MLS') return `${w}-${l}-${t}`;
  return t ? `${w}-${l}-${t}` : `${w}-${l}`;
}

export function standingFromGroups(groups: StandingGroup[], cfg: EspnTeamConfig): Standing | null {
  // Prefer the smallest group containing us (a division over a conference).
  const mine = groups
    .filter((g) => g.entries.some((e) => e.team.id === cfg.espnId))
    .sort((a, b) => a.entries.length - b.entries.length);
  const group = mine[0];
  if (!group) return null;
  const sorted = sortGroup(group);
  const idx = sorted.findIndex((e) => e.team.id === cfg.espnId);
  const entry = sorted[idx];
  const rank = idx + 1;
  const seed = entry.stats.playoffSeed ?? entry.stats.rank ?? rank;
  const played = entry.stats.gamesPlayed ?? (entry.stats.wins ?? 0) + (entry.stats.losses ?? 0) + (entry.stats.ties ?? 0);

  let playoff: Standing['playoff'];
  const clincher = (entry.display.clincher ?? '').toLowerCase();
  if (clincher === 'e') playoff = { status: 'eliminated', text: 'Eliminated' };
  else if (clincher && clincher !== '-') playoff = { status: 'clinched', text: 'Clinched playoff spot' };
  else if (played > 0) playoff = cfg.playoff(seed, entry, mine[mine.length - 1]);

  const gb = entry.display.gamesBehind;
  // Before the season starts every team is 0-0, so a rank would be meaningless.
  const summary =
    played === 0
      ? group.name
      : `${ordinal(rank)} ${group.name}` + (cfg.league === 'NBA' && gb && gb !== '-' && gb !== '0' ? `, ${gb} GB` : '');

  return {
    summary,
    record: recordOf(entry, cfg.league),
    rank,
    group: group.name,
    points: cfg.league === 'MLS' ? entry.stats.points : undefined,
    playoff,
  };
}

export function tableFromGroups(groups: StandingGroup[], cfg: EspnTeamConfig, playoffSpots: number): TeamExtras {
  const group = groups
    .filter((g) => g.entries.some((e) => e.team.id === cfg.espnId))
    .sort((a, b) => a.entries.length - b.entries.length)[0];
  if (!group) return { kind: 'none' };
  const rows: TableRow[] = sortGroup(group).map((e, i) => ({
    rank: e.stats.rank ?? i + 1,
    team: e.team,
    played: e.stats.gamesPlayed ?? 0,
    points: e.stats.points ?? 0,
    record: recordOf(e, cfg.league),
    goalDiff: e.stats.pointDifferential ?? e.stats.goalDifference,
    isUs: e.team.id === cfg.espnId,
  }));
  return { kind: 'table', group: group.name, playoffSpots, rows };
}

// ---------- roster ----------

function injuryOf(a: any): Injury | undefined {
  const inj = a?.injuries?.[0];
  if (!inj) return undefined;
  const d = inj.details;
  const detail = [d?.type, d?.detail, d?.side && d.side !== 'Not Specified' ? `(${d.side})` : '']
    .filter(Boolean)
    .join(' ')
    .trim();
  return {
    status: inj.status ?? inj.type?.description ?? 'Injured',
    detail: detail || inj.shortComment || undefined,
    returnDate: d?.returnDate,
  };
}

export function normalizeEspnRoster(d: any): Player[] {
  const athletes: any[] = d?.athletes ?? [];
  const grouped = athletes.length > 0 && Array.isArray(athletes[0]?.items);
  const flat: { a: any; group?: string }[] = grouped
    ? athletes.flatMap((g) =>
        (g.items ?? []).map((a: any) => ({ a, group: g.position ? cap(String(g.position)) : undefined })),
      )
    : athletes.map((a) => ({ a, group: a.position?.parent?.displayName ?? a.position?.displayName }));
  return flat.map(({ a, group }) => ({
    id: String(a.id),
    name: a.fullName ?? a.displayName ?? 'Unknown',
    number: a.jersey || undefined,
    position: a.position?.abbreviation ?? '',
    group: group ?? 'Roster',
    injury: injuryOf(a),
  }));
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/([a-z])([A-Z])/g, '$1 $2');
}

export async function espnInjuriesByName(ctx: Ctx, sport: string, path: string, id: string) {
  const r = await ctx.cache.get(`espn-roster:${path}:${id}`, 6 * 60 * MINUTE, async () =>
    normalizeEspnRoster(await ctx.fetchJson(`${SITE}/${sport}/${path}/teams/${id}/roster`)),
  );
  const m = new Map<string, Injury | undefined>();
  for (const p of r.data) if (p.injury) m.set(normName(p.name), p.injury);
  return m;
}

const INJURY_ORDER = ['injured reserve', 'out', 'doubtful', 'questionable', 'day-to-day', 'probable'];
export function injuryRank(status: string): number {
  const i = INJURY_ORDER.findIndex((s) => status.toLowerCase().includes(s));
  return i === -1 ? INJURY_ORDER.length : i;
}

// ---------- box score ----------

function periodLabels(league: League, count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    if (league === 'MLS') return i === 0 ? '1H' : i === 1 ? '2H' : i < 4 ? `ET${i - 1}` : 'PK';
    if (i < 4) return String(i + 1);
    return i === 4 ? 'OT' : `${i - 3}OT`;
  });
}

export function normalizeEspnBox(d: any, cfg: EspnTeamConfig): BoxScore {
  const comp = d?.header?.competitions?.[0];
  if (!comp) throw new Error('box score not found');
  const competitors: any[] = [...(comp.competitors ?? [])].sort(
    (a, b) => (a.homeAway === 'away' ? 0 : 1) - (b.homeAway === 'away' ? 0 : 1),
  );
  const maxPeriods = Math.max(0, ...competitors.map((c) => c.linescores?.length ?? 0));
  const labels = periodLabels(cfg.league, maxPeriods);

  const lines = competitors.map((c) => ({
    team: teamRef(c.team),
    home: c.homeAway === 'home',
    periods: labels.map((_, i) => num(c.linescores?.[i]?.displayValue ?? c.linescores?.[i]?.value)),
    total: num(c.score) ?? 0,
  }));

  const highlights: BoxScore['highlights'] = [];
  for (const teamLeaders of d?.leaders ?? []) {
    const abbrev = teamLeaders.team?.abbreviation ?? '';
    for (const cat of (teamLeaders.leaders ?? []).slice(0, 3)) {
      const top = cat.leaders?.[0];
      if (!top) continue;
      highlights.push({
        label: `${abbrev} ${cat.displayName ?? cat.name}`,
        value: `${top.athlete?.shortName ?? top.athlete?.displayName ?? ''} ${top.displayValue ?? ''}`.trim(),
      });
    }
  }

  let scoring: BoxScore['scoring'] = [];
  if (Array.isArray(d?.scoringPlays)) {
    scoring = d.scoringPlays.map((p: any) => ({
      period: labels[(p.period?.number ?? 1) - 1] ?? String(p.period?.number ?? ''),
      time: p.clock?.displayValue,
      team: p.team?.abbreviation ?? '',
      text: p.text ?? p.type?.text ?? '',
    }));
  } else if (Array.isArray(d?.keyEvents)) {
    scoring = d.keyEvents
      .filter((e: any) => e.scoringPlay)
      .map((e: any) => ({
        period: labels[(e.period?.number ?? 1) - 1] ?? '',
        time: e.clock?.displayValue,
        team: e.team?.abbreviation ?? e.team?.displayName ?? '',
        text: e.participants?.map((p: any) => p.athlete?.displayName).filter(Boolean).join(', ') || e.text || 'Goal',
      }));
  }

  return {
    gameId: `${cfg.team}:${d?.header?.id ?? comp.id}`,
    league: cfg.league,
    start: comp.date,
    statusDetail: comp.status?.type?.shortDetail ?? comp.status?.type?.detail ?? 'Final',
    periodLabels: labels,
    extraLabels: [],
    lines,
    highlights: highlights.slice(0, 6),
    scoring,
  };
}

// ---------- adapter factory ----------

export function espnAdapter(cfg: EspnTeamConfig): Adapter {
  const base = `${SITE}/${cfg.sport}/${cfg.path}`;

  const groups = (ctx: Ctx) =>
    ctx.cache.get(`espn-standings:${cfg.path}`, 30 * MINUTE, async () =>
      flattenStandings(
        await ctx.fetchJson(
          `${STANDINGS}/${cfg.sport}/${cfg.path}/standings?season=${cfg.season(ctx.now)}${cfg.standingsQuery ? `&${cfg.standingsQuery}` : ''}`,
        ),
      ),
    );

  return {
    async schedule(ctx) {
      const season = cfg.season(ctx.now);
      const results = await Promise.allSettled(
        cfg.scheduleQueries(season).map((q) => ctx.fetchJson(`${base}/teams/${cfg.espnId}/schedule?${q}`)),
      );
      const ok = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
      if (!ok.length) throw (results[0] as PromiseRejectedResult).reason;
      return normalizeEspnSchedules(ok, cfg);
    },

    async standing(ctx) {
      return standingFromGroups((await groups(ctx)).data, cfg);
    },

    async roster(ctx) {
      return normalizeEspnRoster(await ctx.fetchJson(`${base}/teams/${cfg.espnId}/roster`));
    },

    async boxScore(ctx, game) {
      return normalizeEspnBox(await ctx.fetchJson(`${base}/summary?event=${game.upstreamId}`), cfg);
    },

    async extras(ctx, deps) {
      if (cfg.extras === 'injuries') {
        const players = (deps.roster ?? [])
          .filter((p) => p.injury)
          .sort((a, b) => injuryRank(a.injury!.status) - injuryRank(b.injury!.status) || a.name.localeCompare(b.name));
        return { kind: 'injuries', players };
      }
      if (cfg.extras === 'table') {
        return tableFromGroups((await groups(ctx)).data, cfg, 9);
      }
      return { kind: 'none' };
    },
  };
}

// ---------- team configs ----------

/** "NFC East" -> "NFC", "Eastern Conference" -> "Eastern". */
function confLabel(name: string): string {
  return name.match(/\b(AFC|NFC)\b/)?.[1] ?? name.replace(/ Conference$/, '');
}

const seedPlayoff =
  (inCut: number, bubbleCut: number, bubbleLabel: string) =>
  (seed: number, _e: StandingEntry, conf: StandingGroup): Standing['playoff'] => {
    const name = confLabel(conf.name);
    if (seed <= inCut) return { status: 'in', text: `#${seed} seed in ${name}` };
    if (seed <= bubbleCut) return { status: 'bubble', text: `${bubbleLabel} (#${seed} ${name})` };
    return { status: 'out', text: `#${seed} in ${name}, outside playoffs` };
  };

export const eagles = espnAdapter({
  team: 'eagles',
  league: 'NFL',
  sport: 'football',
  path: 'nfl',
  espnId: '21',
  // NFL season is labeled by its starting year; Jan/Feb playoffs belong to the previous year.
  season: (now) => (now.getUTCMonth() >= 2 ? now.getUTCFullYear() : now.getUTCFullYear() - 1),
  scheduleQueries: (s) => [1, 2, 3].map((t) => `season=${s}&seasontype=${t}`),
  standingsQuery: 'level=3',
  playoff: seedPlayoff(7, 10, 'In the hunt'),
  extras: 'injuries',
});

export const sixers = espnAdapter({
  team: 'sixers',
  league: 'NBA',
  sport: 'basketball',
  path: 'nba',
  espnId: '20',
  // ESPN labels NBA seasons by the ending year (2026-27 => 2027).
  season: (now) => (now.getUTCMonth() >= 6 ? now.getUTCFullYear() + 1 : now.getUTCFullYear()),
  scheduleQueries: (s) => [1, 2, 3].map((t) => `season=${s}&seasontype=${t}`),
  playoff: seedPlayoff(6, 10, 'Play-in'),
});

export const union = espnAdapter({
  team: 'union',
  league: 'MLS',
  sport: 'soccer',
  path: 'usa.1',
  espnId: '10739',
  season: (now) => now.getUTCFullYear(),
  // Soccer team schedules return results by default; `fixture=true` returns upcoming matches.
  scheduleQueries: (s) => [`season=${s}`, `season=${s}&fixture=true`],
  playoff: (seed, _e, conf) => {
    const name = confLabel(conf.name);
    if (seed <= 9) return { status: 'in', text: `Above the line (#${seed} ${name})` };
    if (seed <= 12) return { status: 'bubble', text: `Below the line (#${seed} ${name})` };
    return { status: 'out', text: `#${seed} in ${name}` };
  },
  extras: 'table',
});
