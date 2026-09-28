import { AlertTriangle, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TEAMS } from '../../../shared/teams';
import type { TeamSummary } from '../../../shared/types';
import { countdown, gameWhen, scoreLine, vsAt } from '../lib/format';
import { useNow } from '../lib/useNow';
import { Card, FormDots, OpponentLogo, PlayoffPill, ResultBadge, TeamLogo, WeatherChip } from './bits';

/** Compact card for the non-favorite teams. */
export function TeamCard({ s }: { s: TeamSummary }) {
  const now = useNow();
  const meta = TEAMS[s.team];
  const g = s.nextGame;
  const last = s.lastGame;

  return (
    <Link to={`/team/${s.team}`} className="block transition active:scale-[0.99]">
      <Card className="relative h-full overflow-hidden p-4 hover:ring-zinc-700">
        <span className="absolute inset-y-0 left-0 w-1" style={{ background: meta.colors.accent }} />
        <div className="flex items-center gap-2.5">
          <TeamLogo team={s.team} size={26} />
          <div className="min-w-0 flex-1">
            <div className="font-semibold leading-tight">{meta.shortName}</div>
            <div className="truncate text-[11px] text-zinc-400">
              {s.standing ? `${s.standing.record} · ${s.standing.summary}` : meta.league}
            </div>
          </div>
          {s.error && !g && <AlertTriangle size={14} className="text-amber-400" aria-label="Data unavailable" />}
        </div>

        {g ? (
          <div className="mt-3 flex items-center gap-2.5">
            <OpponentLogo opp={g.opponent} size={30} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                <span className="text-zinc-500">{vsAt(g)} </span>
                {g.opponent.name}
              </div>
              <div className="truncate text-xs text-zinc-400">{gameWhen(g, new Date(now))}</div>
            </div>
            <div className="text-right">
              {g.status === 'live' ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400">
                  <Radio size={11} className="animate-pulse" />
                  {g.score ? `${g.score.us}–${g.score.them}` : 'LIVE'}
                </span>
              ) : (
                <span className="tabular text-sm font-bold" style={{ color: meta.colors.accent }}>
                  {g.timeTBD ? 'TBD' : countdown(g.start, now)}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-3 text-xs text-zinc-500">{s.error ? 'Schedule unavailable' : 'No upcoming games'}</div>
        )}

        {(g?.weather || g?.note) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
            {g.note && <span className="truncate">{g.note}</span>}
            {g.weather && <WeatherChip w={g.weather} compact />}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-800 pt-2.5 text-xs text-zinc-400">
          {last?.result ? (
            <span className="inline-flex items-center gap-1.5">
              <ResultBadge result={last.result} />
              <span className="tabular font-medium text-zinc-200">{scoreLine(last)}</span>
              {vsAt(last)} {last.opponent.abbrev}
            </span>
          ) : (
            <span />
          )}
          <FormDots form={s.form} />
        </div>
        {s.standing?.playoff && (
          <div className="mt-2">
            <PlayoffPill playoff={s.standing.playoff} />
          </div>
        )}
      </Card>
    </Link>
  );
}
