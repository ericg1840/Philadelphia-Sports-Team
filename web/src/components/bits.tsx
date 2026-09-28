// Small presentational building blocks shared by the home screen and team pages.
import { CloudRain, Tv, Wind } from 'lucide-react';
import { useState } from 'react';
import { TEAMS } from '../../../shared/teams';
import type { Game, GameResult, GameWeather, Standing, TeamId, TeamRef } from '../../../shared/types';

export function cx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ');
}

export function Logo({
  src,
  alt,
  size = 28,
  className,
  decorative,
}: {
  src?: string;
  alt: string;
  size?: number;
  className?: string;
  /** Render nothing (instead of a monogram) if the image is missing. */
  decorative?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if ((!src || failed) && decorative) return null;
  if (!src || failed) {
    return (
      <span
        className={cx('inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-800 font-semibold text-zinc-300', className)}
        style={{ width: size, height: size, fontSize: size * 0.34 }}
        aria-label={alt}
      >
        {alt.slice(0, 3).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cx('shrink-0 object-contain', className)}
      style={{ width: size, height: size }}
    />
  );
}

export const TeamLogo = ({ team, size, decorative }: { team: TeamId; size?: number; decorative?: boolean }) => (
  <Logo src={TEAMS[team].logo} alt={TEAMS[team].shortName} size={size} decorative={decorative} />
);

export const OpponentLogo = ({ opp, size }: { opp: TeamRef; size?: number }) => (
  <Logo src={opp.logo} alt={opp.abbrev} size={size} />
);

const RESULT_STYLE: Record<GameResult, string> = {
  W: 'bg-emerald-500/90 text-emerald-950',
  L: 'bg-rose-500/80 text-rose-950',
  T: 'bg-zinc-500 text-zinc-950',
  OTL: 'bg-amber-400/90 text-amber-950',
};

export function ResultBadge({ result, className }: { result: GameResult; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-[11px] font-bold leading-none',
        RESULT_STYLE[result],
        className,
      )}
    >
      {result === 'OTL' ? 'OT' : result}
    </span>
  );
}

export function FormDots({ form }: { form: GameResult[] }) {
  if (!form.length) return null;
  return (
    <span className="inline-flex gap-1" aria-label={`Last ${form.length}: ${form.join(' ')}`}>
      {form.map((r, i) => (
        <ResultBadge key={i} result={r} className="h-4 min-w-4 text-[9px]" />
      ))}
    </span>
  );
}

const PLAYOFF_STYLE: Record<NonNullable<Standing['playoff']>['status'], string> = {
  clinched: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  in: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
  bubble: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  out: 'bg-zinc-500/15 text-zinc-400 ring-zinc-500/30',
  eliminated: 'bg-zinc-500/15 text-zinc-500 ring-zinc-500/30',
};

export function PlayoffPill({ playoff, onColor }: { playoff: Standing['playoff']; onColor?: boolean }) {
  if (!playoff) return null;
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        onColor ? 'bg-black/25 text-white ring-white/25' : PLAYOFF_STYLE[playoff.status],
      )}
    >
      {playoff.text}
    </span>
  );
}

export function WeatherChip({ w, compact }: { w: GameWeather; compact?: boolean }) {
  const rainy = (w.precipChance ?? 0) >= 30;
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-zinc-800/80 px-2 py-0.5 text-[11px] text-zinc-300 ring-1 ring-inset ring-zinc-700/60',
      )}
      title={w.shortForecast}
    >
      <span className="font-semibold text-zinc-100">{w.tempF}°</span>
      {!compact && <span className="max-w-32 truncate">{w.shortForecast}</span>}
      <span className="inline-flex items-center gap-0.5">
        <Wind size={11} aria-hidden />
        {w.wind.replace(' mph', '')}
        {!compact && ` mph ${w.windDirection}`}
      </span>
      {w.precipChance != null && (
        <span className={cx('inline-flex items-center gap-0.5', rainy && 'text-sky-300')}>
          <CloudRain size={11} aria-hidden />
          {w.precipChance}%
        </span>
      )}
    </span>
  );
}

export function Broadcasts({ game }: { game: Game }) {
  if (!game.broadcasts.length) return null;
  return (
    <span className="inline-flex items-center gap-1 text-zinc-400">
      <Tv size={12} aria-hidden />
      {game.broadcasts.slice(0, 2).join(', ')}
    </span>
  );
}

export function Card({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cx('rounded-2xl bg-zinc-900/80 ring-1 ring-zinc-800', className)} style={style}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between px-1">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{children}</h2>
      {right}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-2xl bg-zinc-900 ring-1 ring-zinc-800', className)} />;
}
