import { ArrowLeft, Star } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { isTeamId, TEAMS } from '../../../shared/teams';
import type { Sourced, TeamId, TeamPayload } from '../../../shared/types';
import { cx, PlayoffPill, Skeleton, TeamLogo } from '../components/bits';
import { DataStatus, SectionNote } from '../components/Status';
import { BoxScoreView } from '../components/team/BoxScoreView';
import { ExtrasView } from '../components/team/ExtrasView';
import { RosterList } from '../components/team/RosterList';
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
  const d = api.data;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'schedule', label: 'Schedule' },
    { id: 'roster', label: 'Roster' },
    { id: 'box', label: 'Last game' },
  ];
  if (meta.extrasLabel) tabs.push({ id: 'extras', label: meta.extrasLabel });

  const standing = d?.standing.data;
  return (
    <div style={teamStyle(team)}>
      <header
        className="relative -mx-4 -mt-4 mb-4 overflow-hidden px-4 pb-4 pt-4 text-white sm:rounded-b-3xl"
        style={{
          background: `linear-gradient(135deg, ${meta.colors.primary}, color-mix(in oklab, ${meta.colors.secondary} 65%, black))`,
        }}
      >
        <div className="flex items-center justify-between">
          <Link to="/" className="-ml-2 rounded-full p-2 hover:bg-white/10" aria-label="Back">
            <ArrowLeft size={20} />
          </Link>
          <button
            onClick={() => setFavorite(team)}
            className="-mr-2 rounded-full p-2 hover:bg-white/10"
            aria-label={favorite === team ? 'Favorite team' : 'Make favorite'}
            title={favorite === team ? 'Favorite team' : 'Make favorite'}
          >
            <Star size={20} className={favorite === team ? 'fill-white' : ''} />
          </button>
        </div>
        <div className="mt-1 flex items-center gap-3">
          <div className="rounded-2xl bg-white/90 p-2">
            <TeamLogo team={team} size={44} />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold leading-tight">{meta.shortName}</h1>
            <div className="text-sm text-white/80">
              {standing ? `${standing.record} · ${standing.summary}` : meta.league}
              {standing?.points != null ? ` · ${standing.points} pts` : ''}
            </div>
          </div>
        </div>
        {standing?.playoff && (
          <div className="mt-3">
            <PlayoffPill playoff={standing.playoff} onColor />
          </div>
        )}
      </header>

      <nav className="no-scrollbar sticky top-0 z-10 -mx-4 mb-4 flex gap-1 overflow-x-auto bg-zinc-950/90 px-4 py-2 backdrop-blur">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setParams(t.id === 'schedule' ? {} : { tab: t.id }, { replace: true })}
            className={cx(
              'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition',
              tab === t.id ? 'bg-team text-white ring-1 ring-inset ring-team-accent/70' : 'text-zinc-400 hover:bg-zinc-900',
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {!d ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14" />
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
              {(extras) => <ExtrasView extras={extras} />}
            </Section>
          )}
        </>
      )}

      <DataStatus savedAt={api.savedAt} loading={api.loading} offline={api.offline} error={api.error} onRefresh={api.refresh} />
    </div>
  );
}

function Section<T>({ s, empty, children }: { s: Sourced<T>; empty: string; children: (data: T) => ReactNode }) {
  const [showErr, setShowErr] = useState(false);
  if (s.data == null || (Array.isArray(s.data) && s.data.length === 0)) {
    return (
      <div className="rounded-2xl bg-zinc-900/70 p-4 text-sm text-zinc-400 ring-1 ring-zinc-800">
        {s.error && !/no completed/i.test(s.error) ? (
          <button onClick={() => setShowErr(!showErr)} className="text-left">
            Couldn't load this right now.{showErr && <span className="mt-1 block text-[11px] text-zinc-500">{s.error}</span>}
          </button>
        ) : (
          empty
        )}
      </div>
    );
  }
  return (
    <>
      <SectionNote stale={s.stale} error={s.error} fetchedAt={s.fetchedAt} />
      {children(s.data)}
    </>
  );
}
