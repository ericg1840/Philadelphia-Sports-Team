import { ArrowLeft, Star } from 'lucide-react';
import { useCallback, useState, type ReactNode } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { isTeamId, TEAMS } from '../../../shared/teams';
import type { Player, Sourced, TeamId, TeamPayload } from '../../../shared/types';
import { Card, cx, PlayoffPill, Skeleton, TeamLogo } from '../components/bits';
import { DataStatus, SectionNote } from '../components/Status';
import { BoxScoreView } from '../components/team/BoxScoreView';
import { ExtrasView } from '../components/team/ExtrasView';
import { PlayerSheet } from '../components/team/PlayerSheet';
import { OpenPlayerContext, RosterList } from '../components/team/RosterList';
import { ScheduleList } from '../components/team/ScheduleList';
import { useApi } from '../lib/api';
import { teamStyle, useFavorite } from '../lib/favorite';

type Tab = 'schedule' | 'roster' | 'box' | 'extras';

export function TeamPage() {
  const { id } = useParams();
  if (!isTeamId(id)) return <Navigate to="/" replace />;
  return <TeamView team={id} key={id} />;
}

function TeamView({ team }: { team: TeamId }) {
  const meta = TEAMS[team];
  const api = useApi<TeamPayload>(`/api/team/${team}`);
  const { favorite, setFavorite } = useFavorite();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) ?? 'schedule';
  // The open player card lives in the URL (?player=id) so the back button closes it.
  const playerId = params.get('player');
  const [playerName, setPlayerName] = useState<string>();
  const openPlayer = useCallback(
    (p: Player) => {
      setPlayerName(p.name);
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('player', p.id);
        return next;
      });
    },
    [setParams],
  );
  const closePlayer = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('player');
        return next;
      },
      { replace: true },
    );
  }, [setParams]);
  const d = api.data;
  const isFav = favorite === team;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'schedule', label: 'Schedule' },
    { id: 'roster', label: 'Roster' },
    { id: 'box', label: 'Last game' },
  ];
  if (meta.extrasLabel) tabs.push({ id: 'extras', label: meta.extrasLabel });

  const standing = d?.standing.data;
  return (
    <OpenPlayerContext.Provider value={openPlayer}>
    <div style={teamStyle(team)} className="mx-auto w-full max-w-4xl lg:px-8 lg:py-7">
      <header className="relative overflow-hidden px-4 pb-5 pt-4 text-white lg:rounded-[20px] lg:px-7 lg:py-6" style={{ background: meta.colors.accent }}>
        <div className="pointer-events-none absolute -right-8 -top-8 opacity-[0.14]">
          <TeamLogo team={team} size={220} decorative />
        </div>
        <div className="relative flex items-center justify-between">
          <Link to="/" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/15" aria-label="Back to dashboard">
            <ArrowLeft size={22} />
          </Link>
          <button
            onClick={() => setFavorite(team)}
            className="-mr-2 flex h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold hover:bg-white/15"
            aria-pressed={isFav}
          >
            <Star size={18} className={isFav ? 'fill-white' : ''} aria-hidden />
            {isFav ? 'Favorite' : 'Make favorite'}
          </button>
        </div>
        <div className="relative mt-2 flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white">
            <TeamLogo team={team} size={46} />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-black leading-tight tracking-tight sm:text-4xl">{meta.shortName}</h1>
            <div className="text-sm text-white/90">
              {standing ? `${standing.record} · ${standing.summary}` : meta.name}
              {standing?.points != null ? ` · ${standing.points} pts` : ''}
            </div>
          </div>
        </div>
        {standing?.playoff && (
          <div className="relative mt-3">
            <PlayoffPill playoff={standing.playoff} onColor />
          </div>
        )}
      </header>

      <nav
        aria-label={`${meta.shortName} sections`}
        className="no-scrollbar sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-line bg-ground/95 px-4 py-2.5 backdrop-blur lg:mt-4 lg:border-0 lg:px-0"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setParams(t.id === 'schedule' ? {} : { tab: t.id }, { replace: true })}
            className={cx(
              'h-10 shrink-0 rounded-[10px] px-4 text-sm transition',
              tab === t.id ? 'bg-team font-semibold text-white' : 'font-medium text-ink-2 hover:bg-line-2',
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="px-4 pt-4 lg:px-0">
        {!d ? (
          <div className="flex flex-col gap-2.5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : (
          <>
            {tab === 'schedule' && (
              <Section s={d.schedule} empty="No schedule published yet.">
                {(games) => <ScheduleList games={games} />}
              </Section>
            )}
            {tab === 'roster' && (
              <Section s={d.roster} empty="Roster unavailable.">
                {(players) => <RosterList players={players} />}
              </Section>
            )}
            {tab === 'box' && (
              <Section s={d.lastBox} empty="No completed games yet.">
                {(box) => <BoxScoreView box={box} />}
              </Section>
            )}
            {tab === 'extras' && (
              <Section s={d.extras} empty="Nothing here right now.">
                {(extras) => <ExtrasView extras={extras} teamName={meta.shortName} />}
              </Section>
            )}
          </>
        )}
        <DataStatus savedAt={api.savedAt} loading={api.loading} offline={api.offline} error={api.error} onRefresh={api.refresh} />
      </div>
      {playerId && /^\d+$/.test(playerId) && <PlayerSheet team={team} playerId={playerId} fallbackName={playerName} onClose={closePlayer} />}
    </div>
    </OpenPlayerContext.Provider>
  );
}

function Section<T>({ s, empty, children }: { s: Sourced<T>; empty: string; children: (data: T) => ReactNode }) {
  const [showErr, setShowErr] = useState(false);
  if (s.data == null || (Array.isArray(s.data) && s.data.length === 0)) {
    return (
      <Card className="p-5 text-sm text-muted">
        {s.error && !/no completed/i.test(s.error) ? (
          <button onClick={() => setShowErr(!showErr)} className="text-left">
            Couldn't load this right now.{showErr && <span className="mt-1 block text-xs">{s.error}</span>}
          </button>
        ) : (
          empty
        )}
      </Card>
    );
  }
  return (
    <>
      <SectionNote stale={s.stale} error={s.error} fetchedAt={s.fetchedAt} />
      {children(s.data)}
    </>
  );
}
