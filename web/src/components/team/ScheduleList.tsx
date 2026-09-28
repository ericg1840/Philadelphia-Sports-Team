import { useEffect, useRef, useState } from 'react';
import type { Game } from '../../../../shared/types';
import { formatDate, formatMonth, formatTime, formatWeekday, vsAt } from '../../lib/format';
import { Broadcasts, Card, cx, LogoDisc, OpponentLogo, ResultBadge, WeatherChip } from '../bits';

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
        <label className="mb-2 flex min-h-11 cursor-pointer items-center justify-end gap-2 text-sm text-ink-2">
          <input type="checkbox" checked={showPreseason} onChange={(e) => setShowPreseason(e.target.checked)} className="h-4 w-4 accent-[var(--team-accent)]" />
          Show preseason
        </label>
      )}
      <ul className="flex flex-col gap-2">
        {visible.map((g, i) => {
          const month = formatMonth(g.start);
          const header = month !== lastMonth;
          lastMonth = month;
          const isNext = i === next;
          return (
            <li key={g.id} ref={isNext ? nextRef : undefined} className="scroll-mt-28">
              {header && <div className="px-1 pb-2 pt-5 text-xs font-bold uppercase tracking-[0.08em] text-muted">{month}</div>}
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
    <Card
      className={cx(
        'flex items-center gap-3 px-3.5 py-3',
        highlight && 'ring-2 ring-team',
        (g.status === 'postponed' || g.status === 'canceled') && 'opacity-60',
      )}
    >
      <div className="w-11 shrink-0 text-center">
        <div className="text-[11px] font-semibold uppercase text-muted">{formatWeekday(g.start)}</div>
        <div className="font-display text-lg font-extrabold leading-tight">{formatDate(g.start).replace(/^\w+ /, '')}</div>
      </div>
      <LogoDisc size={36}>
        <OpponentLogo opp={g.opponent} size={26} />
      </LogoDisc>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px]">
          <span className="text-muted">{vsAt(g)} </span>
          <span className="font-semibold">{g.opponent.name}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted">
          {highlight && <span className="font-bold text-team">Next up</span>}
          {g.note && <span>{g.note}</span>}
          {!past && <Broadcasts game={g} />}
          {g.weather && <WeatherChip w={g.weather} compact />}
        </div>
      </div>
      <div className="shrink-0 text-right">
        {past && g.result ? (
          <div className="flex items-center gap-2">
            <span className="tabular text-[15px] font-bold">
              {g.score?.us}–{g.score?.them}
            </span>
            <ResultBadge result={g.result} />
          </div>
        ) : g.status === 'live' ? (
          <span className="tabular rounded-md bg-[#C8102E] px-2 py-1 text-xs font-bold text-white">
            LIVE {g.score ? `${g.score.us}–${g.score.them}` : ''}
          </span>
        ) : g.status === 'postponed' || g.status === 'canceled' ? (
          <span className="text-xs capitalize text-muted">{g.status}</span>
        ) : (
          <span className="tabular text-sm font-bold text-ink-2">{g.timeTBD ? 'TBD' : formatTime(g.start)}</span>
        )}
        {past && g.statusDetail && g.statusDetail !== 'Final' && <div className="text-[11px] text-muted">{g.statusDetail}</div>}
      </div>
    </Card>
  );
}
