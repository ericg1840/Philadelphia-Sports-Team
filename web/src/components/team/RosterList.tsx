import type { Player } from '../../../../shared/types';
import { cx } from '../bits';

export function injuryTone(status: string): string {
  const s = status.toLowerCase();
  if (/(reserve|injured list|out|60-day|il\b)/.test(s)) return 'bg-rose-500/15 text-rose-300 ring-rose-500/30';
  if (/doubtful/.test(s)) return 'bg-orange-500/15 text-orange-300 ring-orange-500/30';
  if (/(questionable|day-to-day|10-day|15-day|7-day)/.test(s)) return 'bg-amber-500/15 text-amber-300 ring-amber-500/30';
  return 'bg-zinc-500/15 text-zinc-300 ring-zinc-500/30';
}

export function InjuryBadge({ status }: { status: string }) {
  return (
    <span className={cx('inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset', injuryTone(status))}>
      {status}
    </span>
  );
}

export function PlayerRow({ p }: { p: Player }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <span className="tabular flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-300">
        {p.number ?? '–'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{p.name}</div>
        <div className="truncate text-[11px] text-zinc-500">
          {p.position}
          {p.injury?.detail ? ` · ${p.injury.detail}` : ''}
        </div>
      </div>
      {p.injury && <InjuryBadge status={p.injury.status} />}
    </div>
  );
}

export function RosterList({ players }: { players: Player[] }) {
  const groups = new Map<string, Player[]>();
  for (const p of players) groups.set(p.group ?? 'Roster', [...(groups.get(p.group ?? 'Roster') ?? []), p]);
  const injured = players.filter((p) => p.injury).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="px-1 text-xs text-zinc-400">
        {players.length} players{injured ? ` · ${injured} injured` : ''}
      </div>
      {[...groups.entries()].map(([group, ps]) => (
        <section key={group}>
          <h3 className="px-1 pb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">{group}</h3>
          <div className="divide-y divide-zinc-800/80 rounded-2xl bg-zinc-900/70 ring-1 ring-zinc-800">
            {[...ps]
              .sort((a, b) => (Number(a.number) || 999) - (Number(b.number) || 999))
              .map((p) => (
                <PlayerRow key={p.id} p={p} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
