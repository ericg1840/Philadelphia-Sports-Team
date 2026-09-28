import { TEAMS } from '../../../shared/teams';
import type { HomePayload } from '../../../shared/types';
import { SectionTitle, Skeleton } from '../components/bits';
import { HeroCard } from '../components/HeroCard';
import { DataStatus } from '../components/Status';
import { TeamCard } from '../components/TeamCard';
import { WeekStrip } from '../components/WeekStrip';
import { useApi } from '../lib/api';
import { useFavorite } from '../lib/favorite';

export function Home() {
  const { favorite } = useFavorite();
  const api = useApi<HomePayload>('/api/home');
  const data = api.data;

  if (!data) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-80 rounded-3xl" />
        <Skeleton className="h-32" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
        {api.error && <DataStatus savedAt={null} loading={api.loading} offline={false} error={api.error} onRefresh={api.refresh} />}
      </div>
    );
  }

  const fav = data.teams.find((t) => t.team === favorite);
  // Others ordered by who plays soonest.
  const others = data.teams
    .filter((t) => t.team !== favorite)
    .sort((a, b) => (a.nextGame ? Date.parse(a.nextGame.start) : Infinity) - (b.nextGame ? Date.parse(b.nextGame.start) : Infinity));
  const staleTeams = data.teams.filter((t) => t.stale).map((t) => TEAMS[t.team].shortName);

  return (
    <div className="flex flex-col gap-6">
      {fav && <HeroCard s={fav} />}
      <WeekStrip games={data.week} />
      <section>
        <SectionTitle>Around Philly</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {others.map((s) => (
            <TeamCard key={s.team} s={s} />
          ))}
        </div>
      </section>
      <DataStatus
        savedAt={api.savedAt}
        loading={api.loading}
        offline={api.offline}
        error={api.error}
        staleTeams={staleTeams}
        onRefresh={api.refresh}
      />
    </div>
  );
}
