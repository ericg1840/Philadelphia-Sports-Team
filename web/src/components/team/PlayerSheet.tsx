import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TEAMS } from '../../../../shared/teams';
import type { PlayerProfile, TeamId } from '../../../../shared/types';
import { useApi } from '../../lib/api';
import { Skeleton } from '../bits';
import { InjuryBadge } from './RosterList';

function Headshot({ src, name, color }: { src?: string; name: string; color: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('');
  if (!src || failed) {
    return (
      <span className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full font-display text-3xl font-black text-white" style={{ background: color }}>
        {initials}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={`${name} headshot`}
      onError={() => setFailed(true)}
      className="h-28 w-28 shrink-0 rounded-full bg-white object-cover object-top ring-4 ring-white/40"
    />
  );
}

/** Player card: headshot, bio facts and the latest season's line. */
export function PlayerSheet({ team, playerId, fallbackName, onClose }: { team: TeamId; playerId: string; fallbackName?: string; onClose: () => void }) {
  const api = useApi<PlayerProfile>(`/api/player/${team}/${playerId}`);
  const meta = TEAMS[team];
  const p = api.data?.id === playerId ? api.data : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const name = p?.name ?? fallbackName ?? 'Player';
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={name}>
      <button className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]" onClick={onClose} aria-label="Close player card" />
      <div className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-ground shadow-2xl sm:rounded-3xl">
        <div className="relative shrink-0 px-5 pb-5 pt-4 text-white" style={{ background: meta.colors.accent }}>
          <button
            onClick={onClose}
            className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/15"
            aria-label="Close"
          >
            <X size={22} />
          </button>
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/40 sm:hidden" />
          <div className="flex items-center gap-4">
            <Headshot src={p?.headshot} name={name} color="rgba(0,0,0,0.25)" />
            <div className="min-w-0 pr-8">
              <div className="text-sm font-semibold text-white/85">
                {[p?.number ? `#${p.number}` : null, p?.position].filter(Boolean).join(' · ') || meta.shortName}
              </div>
              <h2 className="font-display text-[28px] font-black leading-tight tracking-tight">{name}</h2>
              <div className="text-sm text-white/85">{meta.name}</div>
              {p?.injury && (
                <div className="mt-2">
                  <InjuryBadge status={p.injury.status} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
          {!p ? (
            api.error && !api.loading ? (
              <p className="text-sm text-muted">Couldn't load this player right now.</p>
            ) : (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-24" />
                <Skeleton className="h-40" />
              </div>
            )
          ) : (
            <div className="flex flex-col gap-5">
              {p.injury?.detail && (
                <div className="rounded-xl bg-[#FFF1D6] px-3.5 py-2.5 text-sm text-[#8A4B00]">
                  <span className="font-semibold">{p.injury.status}:</span> {p.injury.detail}
                  {p.injury.returnDate && ` · expected back ${p.injury.returnDate}`}
                </div>
              )}

              <section aria-label="Season stats">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted">{p.season?.title ?? 'This season'}</h3>
                {p.season ? (
                  <div className="grid grid-cols-4 gap-2">
                    {p.season.stats.map((s) => (
                      <div key={s.label} className="rounded-xl bg-surface px-2 py-2.5 text-center shadow-[0_1px_2px_rgba(22,22,26,0.06)]">
                        <div className="tabular truncate font-display text-lg font-extrabold leading-tight">{s.value}</div>
                        <div className="truncate text-[11px] font-semibold uppercase text-muted">{s.label}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No stats yet this season.</p>
                )}
              </section>

              {p.bio.length > 0 && (
                <section aria-label="Bio">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted">Bio</h3>
                  <dl className="divide-y divide-line-2 rounded-2xl bg-surface px-4 shadow-[0_1px_2px_rgba(22,22,26,0.06)]">
                    {p.bio.map((b) => (
                      <div key={b.label} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
                        <dt className="shrink-0 text-muted">{b.label}</dt>
                        <dd className="text-right font-medium text-ink">{b.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
