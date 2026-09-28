import { ChevronRight, MapPin, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TEAMS } from '../../../shared/teams';
import type { TeamSummary } from '../../../shared/types';
import { countdown, formatDate, gameWhen, scoreLine, vsAt } from '../lib/format';
import { useNow } from '../lib/useNow';
import { Broadcasts, FormDots, OpponentLogo, PlayoffPill, ResultBadge, TeamLogo, WeatherChip } from './bits';

/** Top-billing card for the favorite team, painted in its colors. */
export function HeroCard({ s }: { s: TeamSummary }) {
  const now = useNow(1000 * 15);
  const meta = TEAMS[s.team];
  const g = s.nextGame;
  const last = s.lastGame;

  return (
    <Link
      to={`/team/${s.team}`}
      className="group relative block overflow-hidden rounded-3xl text-white shadow-2xl shadow-black/40 ring-1 ring-white/10"
      style={{
        background: `linear-gradient(135deg, ${meta.colors.primary} 0%, color-mix(in oklab, ${meta.colors.primary} 55%, ${meta.colors.secondary}) 60%, color-mix(in oklab, ${meta.colors.secondary} 70%, black) 100%)`,
      }}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 opacity-[0.12]">
        <TeamLogo team={s.team} size={200} decorative />
      </div>

      <div className="relative p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-white/90 p-1.5">
            <TeamLogo team={s.team} size={30} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold leading-tight">{meta.shortName}</div>
            <div className="truncate text-xs text-white/75">
              {s.standing ? `${s.standing.record} · ${s.standing.summary}` : meta.league}
            </div>
          </div>
          <ChevronRight className="text-white/60 transition group-hover:translate-x-0.5" size={20} />
        </div>

        {g ? (
          <div className="mt-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/70">
              {g.status === 'live' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-red-600">
                  <Radio size={11} className="animate-pulse" /> Live {g.statusDetail}
                </span>
              ) : (
                'Next up'
              )}
              {g.note && <span className="truncate normal-case tracking-normal text-white/80">· {g.note}</span>}
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="rounded-xl bg-white/90 p-1.5">
                <OpponentLogo opp={g.opponent} size={40} />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-extrabold leading-tight">
                  <span className="font-medium text-white/70">{vsAt(g)} </span>
                  {g.opponent.name}
                </div>
                <div className="text-sm text-white/85">{gameWhen(g, new Date(now))}</div>
              </div>
            </div>

            <div className="mt-4">
              {g.status === 'live' && g.score ? (
                <div className="tabular text-4xl font-black">
                  {g.score.us}
                  <span className="text-white/50">–</span>
                  {g.score.them}
                </div>
              ) : (
                <>
                  <div className="text-[11px] uppercase tracking-wider text-white/60">Starts in</div>
                  <div className="tabular whitespace-nowrap text-4xl font-black leading-none">
                    {g.timeTBD ? formatDate(g.start) : countdown(g.start, now)}
                  </div>
                </>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-white/80">
              {g.weather && <WeatherChip w={g.weather} />}
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} aria-hidden /> {g.venue.name}
              </span>
              <span className="[&_*]:!text-white/80">
                <Broadcasts game={g} />
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-xl bg-black/20 p-4 text-sm text-white/80">
            {s.error ? "Couldn't load the schedule right now." : 'No upcoming games scheduled — enjoy the offseason.'}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-white/15 pt-3 text-xs">
          {last?.result ? (
            <span className="inline-flex items-center gap-2 text-white/85">
              <ResultBadge result={last.result} />
              <span className="tabular font-semibold">{scoreLine(last)}</span>
              <span className="text-white/70">
                {vsAt(last)} {last.opponent.abbrev} · {formatDate(last.start)}
              </span>
            </span>
          ) : (
            <span />
          )}
          <span className="flex items-center gap-2">
            <FormDots form={s.form} />
          </span>
        </div>
        {s.standing?.playoff && (
          <div className="mt-2">
            <PlayoffPill playoff={s.standing.playoff} onColor />
          </div>
        )}
      </div>
    </Link>
  );
}
