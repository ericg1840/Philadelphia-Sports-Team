import { Check, Star, X } from 'lucide-react';
import { useEffect } from 'react';
import { TEAM_IDS, TEAMS } from '../../../shared/teams';
import { useFavorite } from '../lib/favorite';
import { cx, TeamLogo } from './bits';

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
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Settings">
      <button className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-label="Close settings" />
      <div className="relative w-full max-w-md rounded-t-3xl bg-zinc-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] ring-1 ring-zinc-800 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Star size={16} className="text-team-accent" /> Favorite team
          </h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <p className="mb-3 text-xs text-zinc-400">Your favorite gets top billing on the home screen and sets the app's colors.</p>
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
                  'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left ring-1 transition',
                  on ? 'bg-zinc-800 ring-zinc-600' : 'ring-zinc-800 hover:bg-zinc-800/60',
                )}
              >
                <span className="h-8 w-1.5 rounded-full" style={{ background: meta.colors.accent }} />
                <TeamLogo team={t} size={28} />
                <span className="flex-1">
                  <span className="block text-sm font-medium">{meta.shortName}</span>
                  <span className="block text-[11px] text-zinc-500">{meta.league}</span>
                </span>
                {on && <Check size={18} style={{ color: meta.colors.accent }} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
