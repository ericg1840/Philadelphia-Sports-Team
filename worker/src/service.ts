import { TEAM_IDS } from '../../shared/teams';
import type {
  BoxScore,
  Game,
  HomePayload,
  Player,
  PlayerProfile,
  Sourced,
  Standing,
  TeamExtras,
  TeamId,
  TeamPayload,
  TeamSummary,
} from '../../shared/types';
import { eagles, sixers, union } from './adapters/espn';
import { mlb } from './adapters/mlb';
import { nhl } from './adapters/nhl';
import type { Adapter } from './adapters/types';
import type { Cached } from './cache';
import type { Ctx } from './context';
import { addDays, HOUR, isUpcoming, MINUTE, scheduleTtl, startOfDayET } from './util';
import { attachWeather } from './weather';

export const ADAPTERS: Record<TeamId, Adapter> = {
  phillies: mlb,
  eagles,
  sixers,
  flyers: nhl,
  union,
};

// ---------- cached resource getters ----------

function schedule(ctx: Ctx, team: TeamId) {
  return ctx.cache.get(`schedule:${team}`, (games: Game[]) => scheduleTtl(games, ctx.now.getTime()), () =>
    ADAPTERS[team].schedule(ctx),
  );
}

function standing(ctx: Ctx, team: TeamId, gameDay: boolean) {
  return ctx.cache.get(`standing:${team}`, gameDay ? 10 * MINUTE : HOUR, () => ADAPTERS[team].standing(ctx));
}

function roster(ctx: Ctx, team: TeamId) {
  return ctx.cache.get(`roster:${team}`, 6 * HOUR, () => ADAPTERS[team].roster(ctx));
}

function boxScore(ctx: Ctx, game: Game) {
  // Finished games don't change; keep them for a day.
  return ctx.cache.get(`box:${game.id}`, game.status === 'final' ? 24 * HOUR : 2 * MINUTE, () =>
    ADAPTERS[game.team].boxScore(ctx, game),
  );
}

function extras(ctx: Ctx, team: TeamId, deps: { schedule: Game[] | null; roster: Player[] | null }) {
  return ctx.cache.get(`extras:${team}`, 15 * MINUTE, () => ADAPTERS[team].extras(ctx, deps));
}

// ---------- derivations ----------

export function nextGame(games: Game[], now: Date): Game | null {
  return games.find((g) => isUpcoming(g, now)) ?? null;
}

export function lastFinal(games: Game[]): Game | null {
  for (let i = games.length - 1; i >= 0; i--) if (games[i].status === 'final') return games[i];
  return null;
}

export function recentForm(games: Game[], n = 5) {
  return games
    .filter((g) => g.status === 'final' && g.result && g.seasonType !== 'preseason')
    .slice(-n)
    .map((g) => g.result!);
}

function isGameDay(games: Game[], now: Date) {
  return scheduleTtl(games, now.getTime(), 1, 0) === 1;
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

function sourced<T>(r: PromiseSettledResult<Cached<T>>): Sourced<T> {
  if (r.status === 'fulfilled') {
    return {
      data: r.value.data,
      stale: r.value.stale,
      fetchedAt: new Date(r.value.fetchedAt).toISOString(),
      error: r.value.error,
    };
  }
  return { data: null, stale: false, fetchedAt: null, error: errMsg(r.reason) };
}

/** Deep-ish copy so attaching weather never mutates cached objects. */
function clone(g: Game): Game {
  return { ...g };
}

// ---------- payloads ----------

async function teamSummary(ctx: Ctx, team: TeamId): Promise<{ summary: TeamSummary; games: Game[] }> {
  const [sched, stand] = await Promise.allSettled([schedule(ctx, team), standing(ctx, team, false)]);
  const games = sched.status === 'fulfilled' ? sched.value.data.map(clone) : [];
  const errors = [sched, stand].flatMap((r) =>
    r.status === 'rejected' ? [errMsg(r.reason)] : r.value.error ? [r.value.error] : [],
  );
  return {
    games,
    summary: {
      team,
      nextGame: nextGame(games, ctx.now),
      lastGame: lastFinal(games),
      form: recentForm(games),
      standing: stand.status === 'fulfilled' ? stand.value.data : null,
      stale: [sched, stand].some((r) => r.status === 'fulfilled' && r.value.stale),
      error: errors.length ? errors.join('; ') : undefined,
    },
  };
}

export async function homePayload(ctx: Ctx): Promise<HomePayload> {
  const results = await Promise.all(TEAM_IDS.map((t) => teamSummary(ctx, t)));
  const from = startOfDayET(ctx.now).getTime();
  const to = addDays(startOfDayET(ctx.now), 7).getTime();

  const week = results
    .flatMap((r) => r.games)
    .filter((g) => {
      const t = Date.parse(g.start);
      return t >= from && t < to && g.status !== 'canceled';
    })
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));

  const recentFrom = addDays(startOfDayET(ctx.now), -7).getTime();
  const recent = results
    .flatMap((r) => r.games)
    .filter((g) => {
      const t = Date.parse(g.start);
      return g.status === 'final' && t >= recentFrom && t < from;
    })
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));

  // Same objects appear in `week` and as `nextGame`, so weather is attached once.
  const needWeather = new Set<Game>(week);
  for (const r of results) if (r.summary.nextGame) needWeather.add(r.summary.nextGame);
  await attachWeather(ctx, [...needWeather]);

  return { generatedAt: ctx.now.toISOString(), teams: results.map((r) => r.summary), week, recent };
}

export async function teamPayload(ctx: Ctx, team: TeamId): Promise<TeamPayload> {
  const [sched, rost] = await Promise.allSettled([schedule(ctx, team), roster(ctx, team)]);
  const games = sched.status === 'fulfilled' ? sched.value.data.map(clone) : null;
  const gameDay = games ? isGameDay(games, ctx.now) : false;
  const last = games ? lastFinal(games) : null;

  const [stand, box, ext] = await Promise.allSettled([
    standing(ctx, team, gameDay),
    last ? boxScore(ctx, last) : Promise.reject(new Error('No completed games yet')),
    extras(ctx, team, {
      schedule: games,
      roster: rost.status === 'fulfilled' ? rost.value.data : null,
    }),
  ]);

  if (games) {
    const soon = games.filter((g) => isUpcoming(g, ctx.now)).slice(0, 6);
    await attachWeather(ctx, soon);
  }

  const scheduleSection = sourced(sched);
  if (games) scheduleSection.data = games;

  return {
    generatedAt: ctx.now.toISOString(),
    team,
    schedule: scheduleSection,
    standing: sourced<Standing | null>(stand) as Sourced<Standing>,
    roster: sourced<Player[]>(rost),
    lastBox: sourced<BoxScore>(box),
    extras: sourced<TeamExtras>(ext),
  };
}

export async function playerPayload(ctx: Ctx, team: TeamId, id: string): Promise<PlayerProfile> {
  const [profile, rost] = await Promise.all([
    ctx.cache.get(`player:${team}:${id}`, HOUR, () => ADAPTERS[team].player(ctx, id)),
    roster(ctx, team).catch(() => null),
  ]);
  // The roster already carries injury status for every league (ESPN overlay for the Flyers).
  const injury = rost?.data.find((p) => p.id === id)?.injury;
  return { ...profile.data, injury };
}
