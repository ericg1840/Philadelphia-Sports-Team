import { RefreshCw, Search, Star } from 'lucide-react';
import { useState } from 'react';
import { TEAMS } from '../../../shared/teams';
import type { HomePayload } from '../../../shared/types';
import { cx, Skeleton } from '../components/bits';
import { GamesList } from '../components/GamesList';
import { HeroCard } from '../components/HeroCard';
import { LastGameCard, WhereTheyStand, YourTeams } from '../components/Overview';
import { useOpenSettings } from '../components/Shell';
import { DataStatus } from '../components/Status';
import { gamesToday, TodaySection } from '../components/TodaySection';
import { useApi } from '../lib/api';
import { useFavorite } from '../lib/favorite';

function TopBar({ query, setQuery, onRefresh, loading }: { query: string; setQuery: (q: string) => void; onRefresh: () => void; loading: boolean }) {
  const { favorite } = useFavorite();
  const openSettings = useOpenSettings();
  return (
    <div className="flex items-center gap-3">
      <label className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-line bg-surface px-4 text-muted focus-within:border-muted">
        <Search size={18} aria-hidden />
        <span className="sr-only">Search games</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search games, teams, venues"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
        />
      </label>
      <button
        type="button"
        onClick={openSettings}
        className="hidden h-11 shrink-0 items-center gap-2 rounded-xl bg-team px-4 text-sm font-semibold text-white lg:inline-flex"
      >
        <Star size={16} className="fill-current" aria-hidden />
        Favorite: {TEAMS[favorite].shortName}
      </button>
      <button
        type="button"
        onClick={onRefresh}
        aria-label="Refresh"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink-2 hover:bg-line-2"
      >
        <RefreshCw size={18} className={cx(loading && 'animate-spin')} aria-hidden />
      </button>
    </div>
  );
}

export function Home() {
  const { favorite } = useFavorite();
  const api = useApi<HomePayload>('/api/home');
  const [query, setQuery] = useState('');
  const data = api.data;

  if (!data) {
    return (
      <div className="flex flex-col gap-6 px-4 py-5 lg:px-8 lg:py-7">
        <Skeleton className="h-11" />
        <Skeleton className="h-[300px] rounded-[20px]" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[68px]" />
        ))}
        {api.error && <DataStatus savedAt={null} loading={api.loading} offline={false} error={api.error} onRefresh={api.refresh} />}
      </div>
    );
  }

  const fav = data.teams.find((t) => t.team === favorite);
  const staleTeams = data.teams.filter((t) => t.stale).map((t) => TEAMS[t.team].shortName);
  // Game day: today's games lead the page. Off day: the one-line "next game" note sits under the banner.
  const hasToday = gamesToday(data.week, Date.now()).length > 0;
  // Favorite first in the standings column.
  const ordered = [...data.teams].sort((a, b) => (a.team === favorite ? -1 : b.team === favorite ? 1 : 0));

  return (
    <div className="flex flex-col xl:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-6 px-4 py-4 lg:px-8 lg:py-7">
        <TopBar query={query} setQuery={setQuery} onRefresh={api.refresh} loading={api.loading} />
        {hasToday && <TodaySection week={data.week} teams={data.teams} />}
        {fav && <HeroCard s={fav} />}
        {!hasToday && <TodaySection week={data.week} teams={data.teams} />}
        <GamesList week={data.week} recent={data.recent ?? []} query={query} />
        <div className="flex flex-col gap-6 xl:hidden">
          <WhereTheyStand teams={ordered} />
          <LastGameCard team={favorite} />
        </div>
        <DataStatus
          savedAt={api.savedAt}
          loading={api.loading}
          offline={api.offline}
          error={api.error}
          staleTeams={staleTeams}
          onRefresh={api.refresh}
        />
      </div>
      <aside aria-label="Overview" className="hidden w-[360px] shrink-0 flex-col gap-6 py-7 pr-7 xl:flex">
        <YourTeams favorite={favorite} />
        <WhereTheyStand teams={ordered} />
        <LastGameCard team={favorite} />
      </aside>
    </div>
  );
}
