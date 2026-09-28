import type { Game, GameResult } from '../../shared/types';

export const HOUR = 3600;
export const MINUTE = 60;

/** Plain-text value from NHL-style `{ default: "..." }` or a raw string. */
export function txt(x: unknown): string {
  if (typeof x === 'string') return x;
  if (x && typeof x === 'object' && 'default' in x) return String((x as { default: unknown }).default ?? '');
  return '';
}

export function num(x: unknown): number | null {
  if (x == null || x === '') return null;
  if (typeof x === 'object' && x !== null && 'value' in x) return num((x as { value: unknown }).value);
  const n = typeof x === 'number' ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : null;
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

/** yyyy-mm-dd in Philadelphia time. */
export function ymdET(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function ymdUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86400_000);
}

/** Midnight at the start of `d`'s day in Philadelphia, as a Date. */
export function startOfDayET(d: Date): Date {
  const ymd = ymdET(d);
  // Try both possible offsets (EDT -4, EST -5) and keep the one that maps back to ymd at 00:xx.
  for (const off of ['-04:00', '-05:00']) {
    const candidate = new Date(`${ymd}T00:00:00${off}`);
    if (ymdET(candidate) === ymd && ymdET(new Date(candidate.getTime() - 1)) !== ymd) return candidate;
  }
  return new Date(`${ymd}T00:00:00-05:00`);
}

export function isUpcoming(g: Game, now: Date): boolean {
  if (g.status === 'live') return true;
  if (g.status !== 'scheduled') return false;
  // Keep a just-started game that upstream hasn't flipped to live yet.
  return Date.parse(g.start) > now.getTime() - 3 * HOUR * 1000;
}

export function sortByStart(games: Game[]): Game[] {
  return [...games].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

export function resultFromScores(us: number, them: number, tieAllowed = true): GameResult {
  if (us > them) return 'W';
  if (us < them) return 'L';
  return tieAllowed ? 'T' : 'L';
}

/**
 * Short TTL around game time (live scores/status change), long otherwise.
 * Anything live, starting within 3h, or finished within the last 6h counts as "hot".
 */
export function scheduleTtl(games: Game[], now = Date.now(), hot = 2 * MINUTE, cold = 30 * MINUTE): number {
  const isHot = games.some((g) => {
    if (g.status === 'live') return true;
    const t = Date.parse(g.start);
    return t - now < 3 * HOUR * 1000 && now - t < 6 * HOUR * 1000 && g.status !== 'canceled';
  });
  return isHot ? hot : cold;
}

export function settledValue<T>(r: PromiseSettledResult<T>): T | undefined {
  return r.status === 'fulfilled' ? r.value : undefined;
}
