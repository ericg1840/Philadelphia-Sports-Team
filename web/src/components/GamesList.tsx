import { AlertTriangle, CloudRain, Plus, Radio, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TEAM_IDS, TEAMS } from '../../../shared/teams';
import type { Game, TeamId } from '../../../shared/types';
import { countdown, formatTime, formatWeekday, formatDate, overlaps, relativeDay, vsAt } from '../lib/format';
import { useNow } from '../lib/useNow';
import { Card, ClashTag, cx, Empty, LogoDisc, OpponentLogo, ResultBadge, TeamLogo } from './bits';

type Tab = 'week' | 'live' | 'results' | 'upcoming';

const TABS: { id: Tab; label: string }[] = [
  { id: 'week', label: 'This week' },
  { id: 'live', label: 'Live' },
  { id: 'results', label: 'Results' },
  { id: 'upcoming', label: 'Upcoming' },
];

export function clashIds(games: Game[]): Set<string> {
  const ids = new Set<string>();
  const open = games.filter((g) => g.status === 'scheduled' || g.status === 'live');
  for (let i = 0; i < open.length; i++)
    for (let j = i + 1; j < open.length; j++)
      if (overlaps(open[i], open[j])) {
        ids.add(open[i].id);
        ids.add(open[j].id);
      }
  return ids;
}

function matches(g: Game, q: string) {
  if (!q) return true;
  const hay = `${TEAMS[g.team].shortName} ${g.opponent.name} ${g.opponent.abbrev} ${g.venue.name} ${g.note ?? ''}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((w) => hay.includes(w));
}

/** Every Philly game in one list: this week, live, recent results, upcoming. */
export function GamesList({ week, recent, query = '', title = 'Philly Games' }: { week: Game[]; recent: Game[]; query?: string; title?: string }) {
  const now = useNow(30_000);
  const [tab, setTab] = useState<Tab>('week');
  const [filterOpen, setFilterOpen] = useState(false);
  const [teams, setTeams] = useState<Set<TeamId>>(new Set());
  const clashes = useMemo(() => clashIds(week), [week]);
  const liveCount = week.filter((g) => g.status === 'live').length;

  const source =
    tab === 'results'
      ? [...recent, ...week.filter((g) => g.status === 'final')].reverse()
      : tab === 'live'
        ? week.filter((g) => g.status === 'live')
        : tab === 'upcoming'
          ? week.filter((g) => g.status === 'scheduled' || g.status === 'postponed')
          : week;
  const games = source.filter((g) => (teams.size === 0 || teams.has(g.team)) && matches(g, query));

  const toggle = (t: TeamId) =>
    setTeams((s) => {
      const next = new Set(s);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="m-0 font-display text-lg font-extrabold tracking-tight sm:text-xl">{title}</h2>
        {clashes.size > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8A4B00] sm:text-sm">
            <AlertTriangle size={15} aria-hidden />
            {clashes.size} games overlap
          </span>
        )}
      </div>

      <div className="mb-3 flex items-center gap-1 border-b border-line pb-3">
        <div role="tablist" aria-label="Filter games" className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cx(
                'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[9px] px-2.5 text-sm transition sm:px-3.5',
                tab === t.id ? 'bg-team font-semibold text-white' : 'font-medium text-ink-2 hover:bg-line-2',
              )}
            >
              {t.id === 'live' && <span className={cx('h-[7px] w-[7px] rounded-full', tab === 'live' ? 'bg-white' : 'bg-[#C8102E]')} />}
              {t.label}
              {t.id === 'live' && liveCount > 0 && <span className="tabular">({liveCount})</span>}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setFilterOpen((o) => !o)}
          aria-expanded={filterOpen}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[9px] px-2.5 text-sm font-medium text-ink-2 hover:bg-line-2"
        >
          <span className="hidden sm:inline">Filter teams</span>
          <span className="sm:hidden">Teams</span>
          {teams.size > 0 && <span className="tabular rounded-full bg-team px-1.5 text-xs font-bold text-white">{teams.size}</span>}
          <Plus size={16} aria-hidden className={cx('transition', filterOpen && 'rotate-45')} />
        </button>
      </div>

      {filterOpen && (
        <div className="mb-3 flex flex-wrap gap-2">
          {TEAM_IDS.map((t) => {
            const on = teams.has(t);
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(t)}
                className={cx(
                  'inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-medium ring-1 ring-inset transition',
                  on ? 'bg-ink text-white ring-ink' : 'bg-surface text-ink-2 ring-line hover:ring-muted',
                )}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: TEAMS[t].colors.dot }} />
                {TEAMS[t].shortName}
              </button>
            );
          })}
          {teams.size > 0 && (
            <button type="button" onClick={() => setTeams(new Set())} className="inline-flex h-9 items-center gap-1 px-2 text-sm text-muted hover:text-ink">
              <X size={14} aria-hidden /> Clear
            </button>
          )}
        </div>
      )}

      {games.length === 0 ? (
        <Empty>
          {query
            ? `No games match “${query}”.`
            : tab === 'live'
              ? 'No Philly games in progress right now.'
              : tab === 'results'
                ? 'No results in the last week.'
                : 'No Philly games in the next 7 days.'}
        </Empty>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {games.map((g) => (
            <li key={g.id}>
              <GameRow g={g} now={now} clash={clashes.has(g.id)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Center({ g }: { g: Game }) {
  if ((g.status === 'live' || g.status === 'final') && g.score) {
    return (
      <div className={cx('tabular flex h-11 min-w-[64px] items-center justify-center rounded-full px-3 text-sm font-extrabold', g.status === 'live' ? 'bg-[#FDE8EB] text-[#A30D25]' : 'bg-line-2')}>
        {g.score.us}–{g.score.them}
      </div>
    );
  }
  return (
    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border-2 border-line text-xs font-bold text-muted">
      {g.home ? 'VS' : '@'}
    </div>
  );
}

function RightInfo({ g, now, clash }: { g: Game; now: number; clash: boolean }) {
  if (g.status === 'live')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-[#C8102E] px-2 py-1 text-xs font-bold text-white">
        <Radio size={12} className="animate-pulse" aria-hidden /> {g.statusDetail ?? 'Live'}
      </span>
    );
  if (g.status === 'final' && g.result)
    return (
      <span className="inline-flex items-center gap-2 text-sm text-muted">
        {g.statusDetail && g.statusDetail !== 'Final' && <span>{g.statusDetail}</span>}
        <ResultBadge result={g.result} />
      </span>
    );
  if (g.status === 'postponed' || g.status === 'canceled') return <span className="text-sm capitalize text-muted">{g.status}</span>;
  const rainy = g.weather && (g.weather.precipChance ?? 0) >= 30;
  return (
    <span className="flex items-center justify-end gap-2 text-sm text-muted">
      {clash && <ClashTag />}
      {g.weather ? (
        <span className={cx('inline-flex items-center gap-1 whitespace-nowrap', rainy && 'font-semibold text-[#1D5FA8]')}>
          {rainy && <CloudRain size={15} aria-hidden />}
          {g.weather.tempF}°{g.weather.precipChance != null && ` · ${g.weather.precipChance}% rain`}
        </span>
      ) : g.broadcasts.length ? (
        <span className="truncate">{g.broadcasts[0]}</span>
      ) : Date.parse(g.start) > now ? (
        <span className="tabular">in {countdown(g.start, now)}</span>
      ) : null}
    </span>
  );
}

function GameRow({ g, now, clash }: { g: Game; now: number; clash: boolean }) {
  const meta = TEAMS[g.team];
  const time = g.timeTBD ? 'TBD' : formatTime(g.start);
  const sub = g.note ?? (g.broadcasts[0] || g.venue.name);
  return (
    <Link to={`/team/${g.team}`} className="block rounded-[14px] transition hover:-translate-y-px">
      <Card className={cx('hover:shadow-[0_2px_8px_rgba(22,22,26,0.08)]', g.status === 'final' && 'bg-surface/80')}>
        {/* Wide: five columns like a scoreboard row */}
        <div className="hidden min-h-[68px] grid-cols-[100px_118px_64px_minmax(0,1fr)_auto] items-center gap-3.5 px-5 md:grid">
          <div>
            <div className="tabular text-[15px] font-bold">{time}</div>
            <div className="text-[13px] text-muted">
              {formatWeekday(g.start)}, {formatDate(g.start)}
            </div>
          </div>
          <div className="flex min-w-0 items-center justify-end gap-2.5">
            <span className="truncate font-semibold">{meta.shortName}</span>
            <LogoDisc size={36}>
              <TeamLogo team={g.team} size={26} />
            </LogoDisc>
          </div>
          <Center g={g} />
          <div className="flex min-w-0 items-center gap-2.5">
            <LogoDisc size={36}>
              <OpponentLogo opp={g.opponent} size={26} />
            </LogoDisc>
            <div className="min-w-0">
              <div className="truncate font-semibold">{g.opponent.name}</div>
              {g.note && <div className="truncate text-xs text-muted">{g.note}</div>}
            </div>
          </div>
          <div className="flex justify-end">
            <RightInfo g={g} now={now} clash={clash} />
          </div>
        </div>

        {/* Narrow: compact row */}
        <div className="flex items-center gap-3 px-3.5 py-3 md:hidden">
          <LogoDisc size={38}>
            <TeamLogo team={g.team} size={28} />
          </LogoDisc>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold">
              {meta.shortName} <span className="font-normal text-muted">{vsAt(g)}</span> {g.opponent.name}
            </div>
            <div className="truncate text-xs text-muted">
              {relativeDay(g.start, new Date(now)).replace(/,.*/, '')} · {time}
              {sub ? ` · ${sub}` : ''}
            </div>
          </div>
          <div className="shrink-0">
            {g.status === 'final' && g.result ? (
              <span className="flex items-center gap-1.5">
                <span className="tabular text-sm font-bold">
                  {g.score?.us}–{g.score?.them}
                </span>
                <ResultBadge result={g.result} small />
              </span>
            ) : g.status === 'live' ? (
              <span className="tabular rounded-md bg-[#C8102E] px-2 py-1 text-xs font-bold text-white">
                {g.score ? `${g.score.us}–${g.score.them}` : 'LIVE'}
              </span>
            ) : clash ? (
              <ClashTag />
            ) : g.status === 'scheduled' && Date.parse(g.start) > now ? (
              <span className="tabular text-sm font-bold text-muted">{countdown(g.start, now).split(' ')[0]}</span>
            ) : null}
          </div>
        </div>
      </Card>
    </Link>
  );
}
