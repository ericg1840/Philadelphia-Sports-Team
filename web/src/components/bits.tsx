// Small presentational building blocks shared across pages.
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
  fallbackBg,
}: {
  src?: string;
  alt: string;
  size?: number;
  className?: string;
  /** Render nothing (instead of a monogram) if the image is missing. */
  decorative?: boolean;
  fallbackBg?: string;
}) {
  const [failed, setFailed] = useState(false);
  if ((!src || failed) && decorative) return null;
  if (!src || failed) {
    return (
      <span
        className={cx(
          'inline-flex shrink-0 items-center justify-center rounded-full font-bold',
          fallbackBg ? 'text-white' : 'bg-line-2 text-ink-2',
          className,
        )}
        style={{ width: size, height: size, fontSize: Math.max(9, size * 0.32), background: fallbackBg }}
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
  <Logo src={TEAMS[team].logo} alt={TEAMS[team].shortName} size={size} decorative={decorative} fallbackBg={TEAMS[team].colors.accent} />
);

export const OpponentLogo = ({ opp, size }: { opp: TeamRef; size?: number }) => (
  <Logo src={opp.logo} alt={opp.abbrev} size={size} />
);

/** Team logo sitting in a white disc, so any logo reads on any background. */
export function LogoDisc({ children, size = 40, ring }: { children: React.ReactNode; size?: number; ring?: string }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-surface ring-1 ring-line"
      style={{ width: size, height: size, boxShadow: ring ? `0 0 0 3px var(--color-ground), 0 0 0 5px ${ring}` : undefined }}
    >
      {children}
    </span>
  );
}

const RESULT_STYLE: Record<GameResult, string> = {
  W: 'bg-[#1B7A43] text-white',
  L: 'bg-[#D8D8DF] text-ink-2',
  T: 'bg-[#8C8C98] text-white',
  OTL: 'bg-[#FFE2B8] text-[#8A4B00]',
};

export function ResultBadge({ result, small }: { result: GameResult; small?: boolean }) {
  return (
    <span
      className={cx(
        'inline-flex items-center justify-center rounded font-extrabold leading-none',
        small ? 'h-[18px] min-w-[18px] px-0.5 text-[10px]' : 'h-6 min-w-6 px-1 text-xs',
        RESULT_STYLE[result],
      )}
    >
      {result === 'OTL' ? 'OT' : result === 'T' ? 'D' : result}
    </span>
  );
}

export function FormDots({ form }: { form: GameResult[] }) {
  if (!form.length) return null;
  return (
    <span className="inline-flex gap-[3px]" aria-label={`Last ${form.length}: ${form.join(' ')}`}>
      {form.map((r, i) => (
        <ResultBadge key={i} result={r} small />
      ))}
    </span>
  );
}

export const PLAYOFF_TEXT: Record<NonNullable<Standing['playoff']>['status'], string> = {
  clinched: 'text-[#1B7A43]',
  in: 'text-[#1D5FA8]',
  bubble: 'text-[#8A4B00]',
  out: 'text-muted',
  eliminated: 'text-muted',
};

const PLAYOFF_PILL: Record<NonNullable<Standing['playoff']>['status'], string> = {
  clinched: 'bg-[#E3F3EA] text-[#1B7A43]',
  in: 'bg-[#E4EEF9] text-[#1D5FA8]',
  bubble: 'bg-[#FFF1D6] text-[#8A4B00]',
  out: 'bg-line-2 text-muted',
  eliminated: 'bg-line-2 text-muted',
};

export function PlayoffPill({ playoff, onColor }: { playoff: Standing['playoff']; onColor?: boolean }) {
  if (!playoff) return null;
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        onColor ? 'bg-black/25 text-white' : PLAYOFF_PILL[playoff.status],
      )}
    >
      {playoff.text}
    </span>
  );
}

export function ClashTag() {
  return <span className="rounded-md bg-[#FFF1D6] px-2 py-1 text-xs font-semibold text-[#8A4B00]">Clash</span>;
}

export function WeatherChip({ w, compact }: { w: GameWeather; compact?: boolean }) {
  const rainy = (w.precipChance ?? 0) >= 30;
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs',
        rainy ? 'bg-[#E4EEF9] text-[#1D5FA8]' : 'bg-line-2 text-ink-2',
      )}
      title={w.shortForecast}
    >
      <span className="font-bold">{w.tempF}°</span>
      {!compact && <span className="max-w-36 truncate">{w.shortForecast}</span>}
      <span className="inline-flex items-center gap-0.5">
        <Wind size={12} aria-hidden />
        {w.wind.replace(' mph', '')}
        {!compact && ` mph ${w.windDirection}`}
      </span>
      {w.precipChance != null && (
        <span className="inline-flex items-center gap-0.5 font-semibold">
          <CloudRain size={12} aria-hidden />
          {w.precipChance}%
        </span>
      )}
    </span>
  );
}

export function Broadcasts({ game, className }: { game: Game; className?: string }) {
  if (!game.broadcasts.length) return null;
  return (
    <span className={cx('inline-flex items-center gap-1', className)}>
      <Tv size={13} aria-hidden />
      {game.broadcasts.slice(0, 2).join(' · ')}
    </span>
  );
}

export function Card({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cx('rounded-2xl bg-surface shadow-[0_1px_2px_rgba(22,22,26,0.06)]', className)} style={style}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, right, as: As = 'h2' }: { children: React.ReactNode; right?: React.ReactNode; as?: 'h1' | 'h2' }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <As className={cx('m-0 font-display font-extrabold tracking-tight', As === 'h1' ? 'text-3xl' : 'text-lg sm:text-xl')}>{children}</As>
      {right}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-2xl bg-line-2', className)} />;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <Card className="p-5 text-sm text-muted">{children}</Card>;
}
