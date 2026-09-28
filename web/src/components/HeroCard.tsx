import { ArrowRight, MapPin, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TEAMS } from '../../../shared/teams';
import type { League, TeamSummary } from '../../../shared/types';
import { formatDate, formatTime, relativeDay } from '../lib/format';
import { useNow } from '../lib/useNow';
import { Broadcasts, ResultBadge } from './bits';

/** Faint sport mark in the banner's corner. */
function SportMark({ league }: { league: League }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 opacity-[0.16] sm:h-[420px] sm:w-[420px]">
      <circle cx="100" cy="100" r="92" stroke="#fff" strokeWidth="6" />
      {league === 'MLB' && (
        <>
          <path d="M40 30c30 40 30 100 0 140M160 30c-30 40-30 100 0 140" stroke="#fff" strokeWidth="5" />
          <path
            d="M48 50l12-6M52 70l13-3M54 90h13M54 110l13 3M52 130l13 6M152 50l-12-6M148 70l-13-3M146 90h-13M146 110l-13 3M148 130l-13 6"
            stroke="#fff"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </>
      )}
      {league === 'NFL' && <path d="M100 30v140M70 70h60M70 100h60M70 130h60" stroke="#fff" strokeWidth="5" strokeLinecap="round" />}
      {league === 'NBA' && <path d="M8 100h184M100 8v184M35 35c40 30 40 100 0 130M165 35c-40 30-40 100 0 130" stroke="#fff" strokeWidth="5" />}
      {league === 'NHL' && <circle cx="100" cy="100" r="40" stroke="#fff" strokeWidth="6" />}
      {league === 'MLS' && <path d="M100 55l40 28-15 47H75L60 83z" stroke="#fff" strokeWidth="6" strokeLinejoin="round" />}
    </svg>
  );
}

function split(ms: number) {
  const m = Math.max(0, Math.floor(ms / 60_000));
  return { d: Math.floor(m / 1440), h: Math.floor((m % 1440) / 60), m: m % 60 };
}

function Box({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl bg-black/20 py-2.5 text-center sm:py-3">
      <div className="tabular font-display text-3xl font-extrabold leading-none sm:text-4xl">{String(value).padStart(2, '0')}</div>
      <div className="mt-1 text-xs text-white/85">{label}</div>
    </div>
  );
}

/** The favorite team's next game, painted in the team's color. */
export function HeroCard({ s }: { s: TeamSummary }) {
  const now = useNow(15_000);
  const meta = TEAMS[s.team];
  const g = s.nextGame;
  const last = s.lastGame;

  if (!g) {
    return (
      <section className="relative overflow-hidden rounded-[20px] p-6 text-white sm:p-8" style={{ background: meta.colors.accent }}>
        <SportMark league={meta.league} />
        <div className="relative">
          <div className="text-sm font-medium text-white/90">{meta.name}</div>
          <h2 className="mt-2 font-display text-3xl font-black tracking-tight sm:text-5xl">
            {s.error ? "Schedule unavailable right now" : 'No games on the schedule'}
          </h2>
          {last?.result && (
            <p className="mt-3 text-sm text-white/90">
              Last: {last.result === 'W' ? 'Won' : last.result === 'T' ? 'Drew' : 'Lost'} {last.score?.us}–{last.score?.them} {last.home ? 'vs' : 'at'}{' '}
              {last.opponent.name}, {formatDate(last.start)}
            </p>
          )}
          <Link to={`/team/${s.team}`} className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-white underline underline-offset-4">
            Open {meta.shortName} page <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </section>
    );
  }

  const live = g.status === 'live';
  const t = split(Date.parse(g.start) - now);
  const when = g.timeTBD ? `${relativeDay(g.start, new Date(now))} · Time TBD` : `${relativeDay(g.start, new Date(now))} · ${formatTime(g.start)}`;

  return (
    <section
      aria-label={`${meta.shortName} next game`}
      className="relative flex flex-col overflow-hidden rounded-[20px] text-white md:flex-row"
      style={{ background: meta.colors.accent }}
    >
      <SportMark league={meta.league} />
      <div className="relative flex flex-1 flex-col justify-between gap-5 p-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          {live ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-bold uppercase tracking-wider" style={{ color: meta.colors.accent }}>
              <Radio size={12} className="animate-pulse" aria-hidden /> Live · {g.statusDetail}
            </span>
          ) : (
            <span className="rounded-full bg-black/25 px-2.5 py-1 text-xs font-bold uppercase tracking-wider">Next up</span>
          )}
          {g.note && <span className="text-sm font-medium text-white/90">{g.note}</span>}
        </div>
        <div>
          <div className="text-[15px] font-medium text-white/90 sm:text-[17px]">
            {when}
            <span className="hidden sm:inline"> · {g.venue.name}</span>
          </div>
          <h2 className="mt-1.5 font-display text-[34px] font-black leading-[1.02] tracking-tight sm:text-[52px]">
            {meta.shortName} {g.home ? 'host' : 'at'} {g.opponent.name}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <Link to={`/team/${s.team}`} className="inline-flex items-center gap-1.5 font-semibold text-white underline underline-offset-4">
            Open {meta.shortName} page <ArrowRight size={16} aria-hidden />
          </Link>
          <Broadcasts game={g} className="text-white/90" />
          <span className="inline-flex items-center gap-1 text-white/90 sm:hidden">
            <MapPin size={13} aria-hidden /> {g.venue.name}
          </span>
        </div>
      </div>

      <div className="relative flex flex-col justify-center gap-4 px-5 pb-5 md:w-[300px] md:shrink-0 md:py-8 md:pl-0 md:pr-8">
        {live && g.score ? (
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-white/80">Score</div>
            <div className="tabular font-display text-6xl font-black leading-none">
              {g.score.us}
              <span className="text-white/50">–</span>
              {g.score.them}
            </div>
          </div>
        ) : g.timeTBD ? (
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-white/80">Date</div>
            <div className="font-display text-4xl font-black">{formatDate(g.start)}</div>
          </div>
        ) : (
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-white/80">Starts in</div>
            <div className="grid grid-cols-3 gap-2">
              <Box value={t.d} label={t.d === 1 ? 'day' : 'days'} />
              <Box value={t.h} label="hrs" />
              <Box value={t.m} label="min" />
            </div>
          </div>
        )}
        {g.weather && (
          <div className="flex items-center gap-3 rounded-xl bg-white/15 px-3.5 py-3 text-sm">
            <span className="font-display text-2xl font-extrabold">{g.weather.tempF}°</span>
            <div className="min-w-0">
              <div className="truncate font-bold">{g.weather.shortForecast}</div>
              <div className="text-white/85">
                Wind {g.weather.wind} {g.weather.windDirection}
                {g.weather.precipChance != null && ` · Rain ${g.weather.precipChance}%`}
              </div>
            </div>
          </div>
        )}
        {last?.result && !live && (
          <div className="flex items-center gap-2 text-sm text-white/90">
            <span className="rounded bg-white/90 px-0.5">
              <ResultBadge result={last.result} small />
            </span>
            Last: {last.score?.us}–{last.score?.them} {last.home ? 'vs' : '@'} {last.opponent.abbrev}
          </div>
        )}
      </div>
    </section>
  );
}
