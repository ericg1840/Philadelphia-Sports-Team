import { AlertTriangle, CalendarClock, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TEAMS } from '../../../shared/teams';
import type { Game, TeamSummary } from '../../../shared/types';
import { countdown, dayKey, formatTime, gameWhen, overlaps, vsAt } from '../lib/format';
import { useNow } from '../lib/useNow';
import { Card, cx, OpponentLogo, ResultBadge, SectionTitle, TeamLogo, WeatherChip } from './bits';

/** Today's Philly games (in Philadelphia time), in start order. */
export function gamesToday(week: Game[], now: number): Game[] {
  const today = dayKey(new Date(now));
  return week.filter((g) => g.status !== 'canceled' && dayKey(g.start) === today);
}

function clashIds(games: Game[]): Set<string> {
  const ids = new Set<string>();
  for (let i = 0; i < games.length; i++)
    for (let j = i + 1; j < games.length; j++)
      if (games[i].status !== 'final' && games[j].status !== 'final' && overlaps(games[i], games[j])) {
        ids.add(games[i].id);
        ids.add(games[j].id);
      }
  return ids;
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
        <CalendarClock size={18} className="shrink-0 text-zinc-500" aria-hidden />
        <span className="min-w-0 text-zinc-400">
          <span className="font-medium text-zinc-200">No Philly games today</span>
          {next && (
            <>
              {' · Next: '}
              <Link to={`/team/${next.team}`} className="text-zinc-300 underline-offset-2 hover:underline">
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
      <SectionTitle
        right={
          live > 0 ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400">
              <Radio size={11} className="animate-pulse" aria-hidden /> {live} live
            </span>
          ) : (
            <span className="text-[11px] text-zinc-500">
              {games.length} {games.length === 1 ? 'game' : 'games'}
            </span>
          )
        }
      >
        Today in Philly
      </SectionTitle>
      <Card className="divide-y divide-zinc-800/80">
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
    <Link to={`/team/${g.team}`} className={cx('flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/40', final && 'opacity-70')}>
      <TeamLogo team={g.team} size={28} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 truncate text-sm">
          <span className="font-semibold" style={{ color: meta.colors.accent }}>
            {meta.shortName}
          </span>
          <span className="text-zinc-500">{vsAt(g)}</span>
          <OpponentLogo opp={g.opponent} size={16} />
          <span className="truncate font-medium">{g.opponent.name}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-500">
          {g.note && <span>{g.note}</span>}
          {!final && g.broadcasts.length > 0 && <span>{g.broadcasts.slice(0, 2).join(', ')}</span>}
          {clash && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 font-semibold text-amber-300">
              <AlertTriangle size={10} aria-hidden /> Clash
            </span>
          )}
          {g.weather && !final && <WeatherChip w={g.weather} compact />}
        </div>
      </div>
      <div className="shrink-0 text-right">
        {g.status === 'live' ? (
          <>
            <div className="tabular text-base font-bold text-zinc-50">
              {g.score ? `${g.score.us}–${g.score.them}` : 'LIVE'}
            </div>
            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400">
              <Radio size={10} className="animate-pulse" aria-hidden />
              {g.statusDetail ?? 'Live'}
            </div>
          </>
        ) : final && g.result ? (
          <div className="flex items-center gap-1.5">
            <ResultBadge result={g.result} />
            <span className="tabular text-sm font-semibold">
              {g.score?.us}–{g.score?.them}
            </span>
          </div>
        ) : g.status === 'postponed' ? (
          <span className="text-xs text-zinc-400">Postponed</span>
        ) : (
          <>
            <div className="tabular text-sm font-semibold">{g.timeTBD ? 'TBD' : formatTime(g.start)}</div>
            {!g.timeTBD && (
              <div className="tabular text-[11px]" style={{ color: meta.colors.accent }}>
                {Date.parse(g.start) > now ? `in ${countdown(g.start, now)}` : 'Starting'}
              </div>
            )}
          </>
        )}
      </div>
    </Link>
  );
}
