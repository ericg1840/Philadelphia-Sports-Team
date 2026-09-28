import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { Game } from '../../../../shared/types';
import { formatDate, formatMonth, formatTime, formatWeekday, vsAt } from '../../lib/format';
import { Broadcasts, Card, cx, LogoDisc, OpponentLogo, ResultBadge, WeatherChip } from '../bits';

function nextIndex(games: Game[]) {
  const now = Date.now();
  return games.findIndex((g) => g.status === 'live' || (g.status === 'scheduled' && Date.parse(g.start) > now - 3 * 3600_000));
}

interface Month {
  key: string;
  label: string;
  games: { g: Game; i: number }[];
}

function groupByMonth(games: Game[]): Month[] {
  const months: Month[] = [];
  games.forEach((g, i) => {
    const label = formatMonth(g.start);
    const last = months[months.length - 1];
    if (last?.label === label) last.games.push({ g, i });
    else months.push({ key: label, label, games: [{ g, i }] });
  });
  return months;
}

/** "17–10" (plus ties / OT losses where the league has them) for a month's finished games. */
function monthRecord(games: Game[]): string | null {
  const done = games.filter((g) => g.status === 'final' && g.result);
  if (!done.length) return null;
  const n = (r: string) => done.filter((g) => g.result === r).length;
  const parts = [n('W'), n('L')];
  if (n('OTL')) parts.push(n('OTL'));
  if (n('T')) parts.push(n('T'));
  return parts.join('–');
}

export function ScheduleList({ games }: { games: Game[] }) {
  const [showPreseason, setShowPreseason] = useState(false);
  const hasPreseason = games.some((g) => g.seasonType === 'preseason');
  const hasRegular = games.some((g) => g.seasonType !== 'preseason');
  // Preseason is hidden by default, unless that's all there is right now.
  const visible = games.filter((g) => showPreseason || !hasRegular || g.seasonType !== 'preseason');
  const next = nextIndex(visible);
  const months = groupByMonth(visible);
  // Months that finished before the next game start collapsed; with no next game
  // (season over), everything but the final month does.
  const pivot = next === -1 ? visible.length - 1 : next;
  const [open, setOpen] = useState<Record<string, boolean>>({});
  // In the month holding the next game, finished games before it hide behind a button.
  const [showEarlier, setShowEarlier] = useState(false);
  const isOpen = (m: Month) => open[m.key] ?? m.games[m.games.length - 1].i >= pivot;

  return (
    <div>
      {hasPreseason && hasRegular && (
        <label className="mb-2 flex min-h-11 cursor-pointer items-center justify-end gap-2 text-sm text-ink-2">
          <input type="checkbox" checked={showPreseason} onChange={(e) => setShowPreseason(e.target.checked)} className="h-4 w-4 accent-[var(--team-accent)]" />
          Show preseason
        </label>
      )}
      <div className="flex flex-col gap-2">
        {months.map((m) => {
          const expanded = isOpen(m);
          const record = monthRecord(m.games.map((x) => x.g));
          const id = `month-${m.key.replace(/\W+/g, '-')}`;
          // Only the month holding the next game tucks its earlier results away.
          const holdsNext = m.games.some(({ i }) => i === next);
          const earlier = holdsNext && !showEarlier ? m.games.filter(({ i }) => i < next) : [];
          const hidden = earlier.length >= 2 ? earlier : [];
          const shown = m.games.filter((x) => !hidden.includes(x));
          const hiddenRecord = monthRecord(hidden.map((x) => x.g));
          return (
            <section key={m.key} aria-label={m.label}>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={id}
                onClick={() => setOpen((o) => ({ ...o, [m.key]: !expanded }))}
                className={cx(
                  'flex min-h-12 w-full items-center gap-2 rounded-xl px-3 text-left transition',
                  expanded ? 'mt-3 hover:bg-line-2' : 'bg-surface shadow-[0_1px_2px_rgba(22,22,26,0.06)] hover:bg-line-2',
                )}
              >
                <ChevronRight size={18} aria-hidden className={cx('shrink-0 text-muted transition-transform', expanded && 'rotate-90')} />
                <span className="flex-1 text-xs font-bold uppercase tracking-[0.08em] text-ink-2">{m.label}</span>
                {record && <span className="tabular text-sm font-bold text-ink">{record}</span>}
                <span className="tabular text-xs text-muted">
                  {m.games.length} {m.games.length === 1 ? 'game' : 'games'}
                </span>
              </button>
              {expanded && (
                <ul id={id} className="mt-2 flex flex-col gap-2">
                  {hidden.length > 0 && (
                    <li>
                      <button
                        type="button"
                        onClick={() => setShowEarlier(true)}
                        className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line text-sm font-medium text-ink-2 hover:bg-line-2"
                      >
                        Show {hidden.length} earlier games{hiddenRecord ? ` · ${hiddenRecord}` : ''}
                      </button>
                    </li>
                  )}
                  {shown.map(({ g, i }) => (
                    <li key={g.id} className="scroll-mt-28">
                      <GameRow g={g} highlight={i === next} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
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
