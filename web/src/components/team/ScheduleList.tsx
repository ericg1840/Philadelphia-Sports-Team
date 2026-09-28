import { useEffect, useRef, useState } from 'react';
import type { Game } from '../../../../shared/types';
import { formatMonth, formatTime, formatWeekday, formatDate, vsAt } from '../../lib/format';
import { Broadcasts, cx, OpponentLogo, ResultBadge, WeatherChip } from '../bits';

function nextIndex(games: Game[]) {
  const now = Date.now();
  return games.findIndex((g) => g.status === 'live' || (g.status === 'scheduled' && Date.parse(g.start) > now - 3 * 3600_000));
}

export function ScheduleList({ games }: { games: Game[] }) {
  const [showPreseason, setShowPreseason] = useState(false);
  const hasPreseason = games.some((g) => g.seasonType === 'preseason');
  const hasRegular = games.some((g) => g.seasonType !== 'preseason');
  // Preseason is hidden by default, unless that's all there is right now.
  const visible = games.filter((g) => showPreseason || !hasRegular || g.seasonType !== 'preseason');
  const next = nextIndex(visible);
  const nextRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    nextRef.current?.scrollIntoView({ block: 'center' });
  }, []);

  let lastMonth = '';
  return (
    <div>
      {hasPreseason && hasRegular && (
        <label className="mb-3 flex items-center justify-end gap-2 text-xs text-zinc-400">
          <input type="checkbox" checked={showPreseason} onChange={(e) => setShowPreseason(e.target.checked)} className="accent-team-accent" />
          Show preseason
        </label>
      )}
      <ul className="flex flex-col gap-1.5">
        {visible.map((g, i) => {
          const month = formatMonth(g.start);
          const header = month !== lastMonth;
          lastMonth = month;
          const isNext = i === next;
          return (
            <li key={g.id} ref={isNext ? nextRef : undefined} className="scroll-mt-24">
              {header && <div className="px-1 pb-1.5 pt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">{month}</div>}
              <GameRow g={g} highlight={isNext} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function GameRow({ g, highlight }: { g: Game; highlight: boolean }) {
  const past = g.status === 'final';
  return (
    <div
      className={cx(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1',
        highlight ? 'bg-team/15 ring-team-accent/60' : 'bg-zinc-900/70 ring-zinc-800',
        g.status === 'postponed' || g.status === 'canceled' ? 'opacity-50' : '',
      )}
    >
      <div className="w-11 shrink-0 text-center">
        <div className="text-[10px] uppercase text-zinc-500">{formatWeekday(g.start)}</div>
        <div className="text-sm font-semibold leading-tight">{formatDate(g.start).replace(/^\w+ /, '')}</div>
      </div>
      <OpponentLogo opp={g.opponent} size={28} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">
          <span className="text-zinc-500">{vsAt(g)} </span>
          <span className="font-medium">{g.opponent.name}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-500">
          {g.note && <span>{g.note}</span>}
          {!past && <Broadcasts game={g} />}
          {g.weather && <WeatherChip w={g.weather} compact />}
        </div>
      </div>
      <div className="shrink-0 text-right">
        {past && g.result ? (
          <div className="flex items-center gap-1.5">
            <ResultBadge result={g.result} />
            <span className="tabular text-sm font-semibold">
              {g.score?.us}–{g.score?.them}
            </span>
          </div>
        ) : g.status === 'live' ? (
          <span className="text-xs font-bold text-red-400">
            LIVE {g.score ? `${g.score.us}–${g.score.them}` : ''}
          </span>
        ) : g.status === 'postponed' || g.status === 'canceled' ? (
          <span className="text-xs capitalize text-zinc-400">{g.status}</span>
        ) : (
          <span className="tabular text-sm text-zinc-300">{g.timeTBD ? 'TBD' : formatTime(g.start)}</span>
        )}
        {past && g.statusDetail && g.statusDetail !== 'Final' && <div className="text-[10px] text-zinc-500">{g.statusDetail}</div>}
      </div>
    </div>
  );
}
