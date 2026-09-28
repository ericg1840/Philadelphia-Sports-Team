import type { Game, League } from '../../../shared/types';

// Everything is displayed in Philly time, regardless of where the phone is.
const TZ = 'America/New_York';

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: TZ, ...opts });
const timeFmt = fmt({ hour: 'numeric', minute: '2-digit' });
const dayFmt = fmt({ weekday: 'short' });
const dateFmt = fmt({ month: 'short', day: 'numeric' });
const longDayFmt = fmt({ weekday: 'long', month: 'short', day: 'numeric' });
const monthFmt = fmt({ month: 'long', year: 'numeric' });
const keyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

export const dayKey = (iso: string | Date) => keyFmt.format(typeof iso === 'string' ? new Date(iso) : iso);
export const formatTime = (iso: string) => timeFmt.format(new Date(iso));
export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatMonth = (iso: string) => monthFmt.format(new Date(iso));
export const formatWeekday = (iso: string) => dayFmt.format(new Date(iso));

/** "Today", "Tomorrow", "Sat", or "Sat, Oct 10" further out. */
export function relativeDay(iso: string, now = new Date()): string {
  const k = dayKey(iso);
  if (k === dayKey(now)) return 'Today';
  if (k === dayKey(new Date(now.getTime() + 86400_000))) return 'Tomorrow';
  const days = (Date.parse(iso) - now.getTime()) / 86400_000;
  if (days > 0 && days < 6) return dayFmt.format(new Date(iso));
  return `${dayFmt.format(new Date(iso))}, ${dateFmt.format(new Date(iso))}`;
}

export function longDay(iso: string) {
  return longDayFmt.format(new Date(iso));
}

/** "Tonight 7:05 PM" / "Sat 1:00 PM" / "Sat, Oct 10 · TBD" */
export function gameWhen(g: Pick<Game, 'start' | 'timeTBD'>, now = new Date()): string {
  const day = relativeDay(g.start, now);
  if (g.timeTBD) return `${day} · Time TBD`;
  const t = formatTime(g.start);
  const hour = parseInt(fmt({ hour: 'numeric', hour12: false }).format(new Date(g.start)), 10);
  if (day === 'Today' && hour >= 17) return `Tonight ${t}`;
  return `${day} ${t}`;
}

export function countdown(iso: string, now = Date.now()): string {
  const ms = Date.parse(iso) - now;
  if (ms <= 0) return 'Starting';
  const m = Math.floor(ms / 60_000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${mm}m`;
  return `${mm}m`;
}

export const vsAt = (g: Pick<Game, 'home'>) => (g.home ? 'vs' : '@');

export function scoreLine(g: Game): string {
  if (!g.score) return '';
  return `${g.score.us}–${g.score.them}`;
}

export function ago(ts: number | string, now = Date.now()): string {
  const t = typeof ts === 'string' ? Date.parse(ts) : ts;
  const m = Math.round((now - t) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/** Rough game lengths for flagging schedule clashes. */
const DURATION_H: Record<League, number> = { MLB: 3, NFL: 3.25, NBA: 2.5, NHL: 2.5, MLS: 2 };

export function gameEnd(g: Game): number {
  return Date.parse(g.start) + DURATION_H[g.league] * 3600_000;
}

export function overlaps(a: Game, b: Game): boolean {
  if (a.timeTBD || b.timeTBD) return false;
  return Date.parse(a.start) < gameEnd(b) && Date.parse(b.start) < gameEnd(a);
}
