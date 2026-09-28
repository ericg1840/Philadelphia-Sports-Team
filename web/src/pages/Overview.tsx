// Schedule, Standings, Weather and Teams: different views over the same /api/home payload.
import { ChevronRight, CloudRain, MapPin, Star, Wind } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { TEAM_IDS, TEAMS } from '../../../shared/teams';
import type { Game, HomePayload } from '../../../shared/types';
import { Card, Empty, LogoDisc, OpponentLogo, SectionTitle, Skeleton, TeamLogo } from '../components/bits';
import { GamesList } from '../components/GamesList';
import { WhereTheyStand } from '../components/Overview';
import { DataStatus } from '../components/Status';
import { useApi } from '../lib/api';
import { useFavorite } from '../lib/favorite';
import { gameWhen, vsAt } from '../lib/format';

function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-4 lg:px-8 lg:py-8">
      <SectionTitle as="h1">{title}</SectionTitle>
      {children}
    </div>
  );
}

function useHome(title: string, render: (d: HomePayload) => ReactNode) {
  const api = useApi<HomePayload>('/api/home');
  return (
    <Page title={title}>
      {api.data ? (
        render(api.data)
      ) : (
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[68px]" />
          ))}
        </div>
      )}
      <DataStatus savedAt={api.savedAt} loading={api.loading} offline={api.offline} error={api.error} onRefresh={api.refresh} />
    </Page>
  );
}

export function SchedulePage() {
  return useHome('Schedule', (d) => <GamesList week={d.week} recent={d.recent ?? []} title="All Philly games" />);
}

export function StandingsPage() {
  const { favorite } = useFavorite();
  return useHome('Standings', (d) => (
    <WhereTheyStand
      detailed
      title="All five teams"
      teams={[...d.teams].sort((a, b) => (a.team === favorite ? -1 : b.team === favorite ? 1 : 0))}
    />
  ));
}

function WeatherCard({ g }: { g: Game }) {
  const w = g.weather!;
  const meta = TEAMS[g.team];
  const rainy = (w.precipChance ?? 0) >= 30;
  return (
    <Link to={`/team/${g.team}`} className="block">
      <Card className="flex items-center gap-4 p-4">
        <div className="w-20 shrink-0 text-center">
          <div className="font-display text-4xl font-black leading-none">{w.tempF}°</div>
          <div className="mt-1 text-xs text-muted">at start time</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 truncate text-[15px] font-semibold">
            <span style={{ color: meta.colors.accent }}>{meta.shortName}</span>
            <span className="font-normal text-muted">{vsAt(g)}</span>
            <OpponentLogo opp={g.opponent} size={18} />
            <span className="truncate">{g.opponent.name}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted">
            <MapPin size={12} aria-hidden /> {g.venue.name} · {gameWhen(g)}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
            <span>{w.shortForecast}</span>
            <span className="inline-flex items-center gap-1">
              <Wind size={14} aria-hidden /> {w.wind} {w.windDirection}
            </span>
            {w.precipChance != null && (
              <span className={rainy ? 'inline-flex items-center gap-1 font-semibold text-[#1D5FA8]' : 'inline-flex items-center gap-1'}>
                <CloudRain size={14} aria-hidden /> {w.precipChance}% rain
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function WeatherPage() {
  return useHome('Weather', (d) => {
    const games = d.week.filter((g) => g.weather && g.status === 'scheduled');
    return (
      <>
        <p className="-mt-2 text-sm text-muted">
          Game-time forecasts from the National Weather Service for home games at Citizens Bank Park, Lincoln Financial Field and Subaru
          Park, up to 7 days out.
        </p>
        {games.length ? (
          <div className="flex flex-col gap-2.5">
            {games.map((g) => (
              <WeatherCard key={g.id} g={g} />
            ))}
          </div>
        ) : (
          <Empty>No outdoor home games in the next 7 days.</Empty>
        )}
      </>
    );
  });
}

export function TeamsPage() {
  const { favorite, setFavorite } = useFavorite();
  return (
    <Page title="Teams">
      <Card className="divide-y divide-line-2">
        {TEAM_IDS.map((t) => {
          const meta = TEAMS[t];
          const fav = t === favorite;
          return (
            <div key={t} className="flex items-center gap-3 px-4 py-3">
              <Link to={`/team/${t}`} className="flex min-w-0 flex-1 items-center gap-3">
                <LogoDisc size={44}>
                  <TeamLogo team={t} size={32} />
                </LogoDisc>
                <span className="min-w-0">
                  <span className="block font-semibold">{meta.shortName}</span>
                  <span className="block text-xs text-muted">{meta.league}</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setFavorite(t)}
                aria-label={fav ? `${meta.shortName} is your favorite` : `Make ${meta.shortName} your favorite`}
                aria-pressed={fav}
                className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-line-2"
              >
                <Star size={20} style={fav ? { color: meta.colors.accent, fill: meta.colors.accent } : { color: 'var(--color-muted)' }} />
              </button>
              <Link to={`/team/${t}`} aria-label={`Open ${meta.shortName}`} className="flex h-11 w-8 items-center justify-center text-muted">
                <ChevronRight size={18} />
              </Link>
            </div>
          );
        })}
      </Card>
    </Page>
  );
}
