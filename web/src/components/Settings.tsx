import { Check, Star, X } from 'lucide-react';
import { useEffect } from 'react';
import { TEAM_IDS, TEAMS } from '../../../shared/teams';
import { useFavorite } from '../lib/favorite';
import { cx, LogoDisc, TeamLogo } from './bits';

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { favorite, setFavorite } = useFavorite();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Favorite team">
      <button className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-md rounded-t-3xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
            <Star size={18} className="fill-team text-team" aria-hidden /> Favorite team
          </h2>
          <button onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-line-2" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <p className="mb-4 text-sm text-muted">Your favorite gets the big banner on the dashboard and sets the app's color.</p>
        <div className="flex flex-col gap-2">
          {TEAM_IDS.map((t) => {
            const meta = TEAMS[t];
            const on = t === favorite;
            return (
              <button
                key={t}
                onClick={() => {
                  setFavorite(t);
                  onClose();
                }}
                className={cx(
                  'flex min-h-14 items-center gap-3 rounded-2xl px-3 text-left ring-1 ring-inset transition',
                  on ? 'bg-ground ring-2' : 'ring-line hover:bg-ground',
                )}
                style={on ? ({ '--tw-ring-color': meta.colors.accent } as React.CSSProperties) : undefined}
              >
                <LogoDisc size={36}>
                  <TeamLogo team={t} size={26} />
                </LogoDisc>
                <span className="flex-1">
                  <span className="block text-[15px] font-semibold">{meta.shortName}</span>
                  <span className="block text-xs text-muted">{meta.league}</span>
                </span>
                {on && <Check size={20} style={{ color: meta.colors.accent }} aria-label="Selected" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
