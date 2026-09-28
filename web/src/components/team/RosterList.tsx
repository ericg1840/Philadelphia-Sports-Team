import { ChevronRight } from 'lucide-react';
import { createContext, useContext } from 'react';
import type { Player } from '../../../../shared/types';
import { Card, cx } from '../bits';

/** Set by the team page: opens the player card. Rows are plain when it's absent. */
export const OpenPlayerContext = createContext<((p: Player) => void) | null>(null);

export function injuryTone(status: string): string {
  const s = status.toLowerCase();
  if (/(reserve|injured list|out|60-day|il\b)/.test(s)) return 'bg-[#FDE8EB] text-[#A30D25]';
  if (/doubtful/.test(s)) return 'bg-[#FFE7D6] text-[#9A3A00]';
  if (/(questionable|day-to-day|10-day|15-day|7-day)/.test(s)) return 'bg-[#FFF1D6] text-[#8A4B00]';
  return 'bg-line-2 text-ink-2';
}

export function InjuryBadge({ status }: { status: string }) {
  return <span className={cx('inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-bold', injuryTone(status))}>{status}</span>;
}

export function PlayerRow({ p }: { p: Player }) {
  const open = useContext(OpenPlayerContext);
  const body = (
    <>
      <span className="tabular flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-line-2 text-xs font-extrabold text-ink-2">{p.number ?? '–'}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold">{p.name}</div>
        <div className="truncate text-xs text-muted">
          {p.position}
          {p.injury?.detail ? ` · ${p.injury.detail}` : ''}
        </div>
      </div>
      {p.injury && <InjuryBadge status={p.injury.status} />}
    </>
  );
  if (!open) return <div className="flex items-center gap-3 px-4 py-2.5">{body}</div>;
  return (
    <button
      type="button"
      onClick={() => open(p)}
      className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition first:rounded-t-2xl last:rounded-b-2xl hover:bg-ground"
    >
      {body}
      <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden />
    </button>
  );
}

export function RosterList({ players }: { players: Player[] }) {
  const groups = new Map<string, Player[]>();
  for (const p of players) groups.set(p.group ?? 'Roster', [...(groups.get(p.group ?? 'Roster') ?? []), p]);
  const injured = players.filter((p) => p.injury).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="px-1 text-sm text-muted">
        {players.length} players{injured ? ` · ${injured} injured` : ''}
      </div>
      {[...groups.entries()].map(([group, ps]) => (
        <section key={group}>
          <h3 className="px-1 pb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted">{group}</h3>
          <Card className="divide-y divide-line-2">
            {[...ps]
              .sort((a, b) => (Number(a.number) || 999) - (Number(b.number) || 999))
              .map((p) => (
                <PlayerRow key={p.id} p={p} />
              ))}
          </Card>
        </section>
      ))}
    </div>
  );
}
