import { AlertTriangle, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TEAMS } from '../../../shared/teams';
import type { Game } from '../../../shared/types';
import { dayKey, formatDate, formatTime, formatWeekday, overlaps, relativeDay, vsAt } from '../lib/format';
import { cx, SectionTitle, WeatherChip } from './bits';

interface Day {
  key: string;
  games: Game[];
  clashes: Set<string>;
}

export function groupWeek(games: Game[]): Day[] {
  const days = new Map<string, Game[]>();
  for (const g of games) {
    const k = dayKey(g.start);
    days.set(k, [...(days.get(k) ?? []), g]);
  }
  return [...days.entries()].map(([key, gs]) => {
    const clashes = new Set<string>();
    for (let i = 0; i < gs.length; i++)
      for (let j = i + 1; j < gs.length; j++)
        if (overlaps(gs[i], gs[j])) {
          clashes.add(gs[i].id);
          clashes.add(gs[j].id);
        }
    return { key, games: gs, clashes };
  });
}

/** Every Philly game in the next 7 days, flagging busy days and time clashes. */
export function WeekStrip({ games }: { games: Game[] }) {
  const days = groupWeek(games);
  const busy = days.filter((d) => d.games.length > 1).length;

  return (
    <section>
      <SectionTitle right={busy > 0 && <span className="text-[11px] text-amber-300/90">{busy} multi-game {busy === 1 ? 'day' : 'days'}</span>}>
        This week
      </SectionTitle>
      {days.length === 0 ? (
        <div className="rounded-2xl bg-zinc-900/80 p-4 text-sm text-zinc-500 ring-1 ring-zinc-800">No Philly games in the next 7 days.</div>
      ) : (
        <div className="no-scrollbar -mx-4 flex snap-x items-start gap-3 overflow-x-auto px-4 pb-1">
          {days.map((d) => {
            const first = d.games[0].start;
            const multi = d.games.length > 1;
            return (
              <div
                key={d.key}
                className={cx(
                  'w-44 shrink-0 snap-start rounded-2xl bg-zinc-900/80 p-2.5 ring-1',
                  d.clashes.size ? 'ring-amber-500/50' : multi ? 'ring-zinc-700' : 'ring-zinc-800',
                )}
              >
                <div className="mb-2 flex items-center justify-between px-1">
                  <div>
                    <div className="text-sm font-semibold leading-tight">{relativeDay(first).replace(/,.*/, '')}</div>
                    <div className="text-[11px] text-zinc-500">
                      {formatWeekday(first)} {formatDate(first)}
                    </div>
                  </div>
                  {d.clashes.size > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300" title="Games overlap">
                      <AlertTriangle size={10} /> Clash
                    </span>
                  ) : multi ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300">
                      <Layers size={10} /> {d.games.length}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1.5">
                  {d.games.map((g) => (
                    <WeekGame key={g.id} g={g} clash={d.clashes.has(g.id)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function WeekGame({ g, clash }: { g: Game; clash: boolean }) {
  const meta = TEAMS[g.team];
  const done = g.status === 'final';
  return (
    <Link
      to={`/team/${g.team}`}
      className={cx('block rounded-xl bg-zinc-800/60 px-2.5 py-2 hover:bg-zinc-800', done && 'opacity-60', clash && 'ring-1 ring-inset ring-amber-500/40')}
      style={{ borderLeft: `3px solid ${meta.colors.accent}` }}
    >
      <div className="flex items-center justify-between gap-1 text-xs">
        <span className="font-semibold">{meta.shortName}</span>
        <span className="tabular text-zinc-300">
          {done && g.result ? `${g.result} ${g.score?.us}–${g.score?.them}` : g.status === 'live' ? 'LIVE' : g.timeTBD ? 'TBD' : formatTime(g.start)}
        </span>
      </div>
      <div className="mt-0.5 truncate text-[11px] text-zinc-400">
        {vsAt(g)} {g.opponent.abbrev}
        {g.note ? ` · ${g.note}` : ''}
      </div>
      {g.weather && !done && (
        <div className="mt-1">
          <WeatherChip w={g.weather} compact />
        </div>
      )}
    </Link>
  );
}
