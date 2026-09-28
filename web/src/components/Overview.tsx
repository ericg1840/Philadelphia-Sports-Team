// Right-column cards: your teams, where they stand, and the favorite's last game.
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TEAM_IDS, TEAMS } from '../../../shared/teams';
import type { BoxScore, TeamId, TeamPayload, TeamSummary } from '../../../shared/types';
import { useApi } from '../lib/api';
import { formatDate, gameWhen } from '../lib/format';
import { Card, cx, FormDots, LogoDisc, PLAYOFF_TEXT, Skeleton, TeamLogo } from './bits';

export function YourTeams({ favorite }: { favorite: TeamId }) {
  return (
    <section aria-label="Your teams">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="m-0 font-display text-lg font-extrabold tracking-tight">Your teams</h2>
      </div>
      <ul className="grid grid-cols-5 gap-2">
        {TEAM_IDS.map((t) => (
          <li key={t}>
            <Link to={`/team/${t}`} className="flex flex-col items-center gap-1.5 rounded-xl py-1 hover:bg-line-2">
              <LogoDisc size={56} ring={t === favorite ? TEAMS[t].colors.accent : undefined}>
                <TeamLogo team={t} size={40} />
              </LogoDisc>
              <span className={cx('text-xs', t === favorite ? 'font-bold' : 'text-ink-2')}>{TEAMS[t].shortName}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One row per team: record, where they sit relative to the playoffs, last-5 form. */
export function WhereTheyStand({ teams, detailed, title = 'Where they stand' }: { teams: TeamSummary[]; detailed?: boolean; title?: string }) {
  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="m-0 font-display text-lg font-extrabold tracking-tight">{title}</h2>
        <span className="text-xs text-muted">Last 5</span>
      </div>
      <Card className="divide-y divide-line-2 px-4">
        {teams.map((s) => {
          const meta = TEAMS[s.team];
          const st = s.standing;
          const sub = st?.playoff?.text ?? (s.form.length ? st?.summary : undefined);
          return (
            <Link key={s.team} to={`/team/${s.team}`} className="flex items-center gap-3 py-3">
              {detailed && (
                <LogoDisc size={40}>
                  <TeamLogo team={s.team} size={30} />
                </LogoDisc>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">
                  {meta.shortName}{' '}
                  {st && (s.form.length > 0 || st.record.replace(/0|-/g, '') !== '') && (
                    <span className="tabular font-medium text-muted">{st.points != null ? `${st.points} pts` : st.record}</span>
                  )}
                </div>
                {detailed && st && <div className="truncate text-xs text-ink-2">{st.summary}</div>}
                {sub ? (
                  <div className={cx('truncate text-xs font-semibold', st?.playoff ? PLAYOFF_TEXT[st.playoff.status] : 'text-muted')}>{sub}</div>
                ) : (
                  <div className="truncate text-xs text-muted">
                    {s.nextGame
                      ? `${s.nextGame.seasonType === 'preseason' ? 'Preseason · ' : ''}${s.nextGame.status === 'live' ? 'playing now' : `next ${gameWhen(s.nextGame)}`}`
                      : 'Offseason'}
                  </div>
                )}
              </div>
              <FormDots form={s.form} />
              {detailed && <ChevronRight size={16} className="text-muted" aria-hidden />}
            </Link>
          );
        })}
      </Card>
    </section>
  );
}

function boxTitle(box: BoxScore) {
  return box.lines.map((l) => `${l.team.abbrev} ${l.total}`).join(', ');
}

/** The favorite team's most recent game: line score totals plus the key names. */
export function LastGameCard({ team }: { team: TeamId }) {
  const api = useApi<TeamPayload>(`/api/team/${team}`);
  const box = api.data?.lastBox.data;
  const meta = TEAMS[team];

  return (
    <section aria-label="Last game">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="m-0 font-display text-lg font-extrabold tracking-tight">Last game</h2>
        {box && <span className="truncate text-xs text-muted">{formatDate(box.start)}</span>}
      </div>
      {!api.data ? (
        <Skeleton className="h-40" />
      ) : !box ? (
        <Card className="p-4 text-sm text-muted">No completed {meta.shortName} games yet this season.</Card>
      ) : (
        <Link to={`/team/${team}?tab=box`} className="block">
          <Card className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-display text-base font-extrabold">{boxTitle(box)}</span>
              <span className="text-xs font-semibold text-muted">{box.statusDetail}</span>
            </div>
            {box.highlights.length > 0 && (
              <ul className="flex flex-col gap-2.5">
                {box.highlights.slice(0, 4).map((h, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="shrink-0 font-semibold" style={{ color: meta.colors.accent }}>
                      {h.label}
                    </span>
                    <span className="truncate text-right text-ink-2">{h.value}</span>
                  </li>
                ))}
              </ul>
            )}
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-2">
              Full box score <ChevronRight size={14} aria-hidden />
            </span>
          </Card>
        </Link>
      )}
    </section>
  );
}
