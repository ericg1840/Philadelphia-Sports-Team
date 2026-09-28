import { CalendarClock, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TEAMS } from '../../../shared/teams';
import type { Game, TeamSummary } from '../../../shared/types';
import { countdown, dayKey, formatTime, gameWhen, vsAt } from '../lib/format';
import { useNow } from '../lib/useNow';
import { Card, ClashTag, cx, LogoDisc, ResultBadge, TeamLogo, WeatherChip } from './bits';
import { clashIds } from './GamesList';

/** Today's Philly games (in Philadelphia time), in start order. */
export function gamesToday(week: Game[], now: number): Game[] {
  const today = dayKey(new Date(now));
  return week.filter((g) => g.status !== 'canceled' && dayKey(g.start) === today);
}

/**
 * "Today in Philly": appears on its own whenever a Philly team plays today,
 * flips rows to live scores and finals as the data refreshes, and collapses to
 * a single "next game" line on off days.
 */
export function TodaySection({ week, teams }: { week: Game[]; teams: TeamSummary[] }) {
  const now = useNow(30_000);
  const games = gamesToday(week, now);

  if (!games.length) {
    const next = teams
      .map((t) => t.nextGame)
      .filter((g): g is Game => !!g)
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0];
    return (
      <Card className="flex items-center gap-3 px-4 py-3 text-sm">
        <CalendarClock size={18} className="shrink-0 text-muted" aria-hidden />
        <span className="min-w-0 text-muted">
          <span className="font-semibold text-ink">No Philly games today</span>
          {next && (
            <>
              {' · Next: '}
              <Link to={`/team/${next.team}`} className="font-medium text-ink-2 underline-offset-2 hover:underline">
                {TEAMS[next.team].shortName} {vsAt(next)} {next.opponent.abbrev}, {gameWhen(next, new Date(now))}
              </Link>
            </>
          )}
        </span>
      </Card>
    );
  }

  const clashes = clashIds(games);
  const live = games.filter((g) => g.status === 'live').length;
  return (
    <section aria-label="Today in Philly">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="m-0 font-display text-lg font-extrabold tracking-tight sm:text-xl">Today in Philly</h2>
        {live > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#C8102E]">
            <Radio size={12} className="animate-pulse" aria-hidden /> {live} live
          </span>
        ) : (
          <span className="text-xs text-muted">
            {games.length} {games.length === 1 ? 'game' : 'games'}
          </span>
        )}
      </div>
      <Card className="divide-y divide-line-2">
        {games.map((g) => (
          <TodayRow key={g.id} g={g} now={now} clash={clashes.has(g.id)} />
        ))}
      </Card>
    </section>
  );
}

function TodayRow({ g, now, clash }: { g: Game; now: number; clash: boolean }) {
  const meta = TEAMS[g.team];
  const final = g.status === 'final';
  return (
    <Link to={`/team/${g.team}`} className={cx('flex items-center gap-3 px-4 py-3 hover:bg-ground/60', final && 'opacity-75')}>
      <LogoDisc size={38}>
        <TeamLogo team={g.team} size={28} />
      </LogoDisc>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px]">
          <span className="font-bold" style={{ color: meta.colors.accent }}>
            {meta.shortName}
          </span>{' '}
          <span className="text-muted">{vsAt(g)}</span> <span className="font-semibold">{g.opponent.name}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          {g.note && <span>{g.note}</span>}
          {!final && g.broadcasts.length > 0 && <span>{g.broadcasts.slice(0, 2).join(' · ')}</span>}
          {clash && <ClashTag />}
          {g.weather && !final && <WeatherChip w={g.weather} compact />}
        </div>
      </div>
      <div className="shrink-0 text-right">
        {g.status === 'live' ? (
          <>
            <div className="tabular font-display text-xl font-extrabold">{g.score ? `${g.score.us}–${g.score.them}` : 'LIVE'}</div>
            <div className="inline-flex items-center gap-1 text-xs font-bold text-[#C8102E]">
              <Radio size={11} className="animate-pulse" aria-hidden />
              {g.statusDetail ?? 'Live'}
            </div>
          </>
        ) : final && g.result ? (
          <div className="flex items-center gap-2">
            <span className="tabular font-display text-lg font-extrabold">
              {g.score?.us}–{g.score?.them}
            </span>
            <ResultBadge result={g.result} />
          </div>
        ) : g.status === 'postponed' ? (
          <span className="text-xs text-muted">Postponed</span>
        ) : (
          <>
            <div className="tabular text-[15px] font-bold">{g.timeTBD ? 'TBD' : formatTime(g.start)}</div>
            {!g.timeTBD && (
              <div className="tabular text-xs font-semibold" style={{ color: meta.colors.accent }}>
                {Date.parse(g.start) > now ? `in ${countdown(g.start, now)}` : 'Starting'}
              </div>
            )}
          </>
        )}
      </div>
    </Link>
  );
}
