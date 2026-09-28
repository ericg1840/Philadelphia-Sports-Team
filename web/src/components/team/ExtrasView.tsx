import type { ProbablePitcher, TeamExtras } from '../../../../shared/types';
import { gameWhen, vsAt } from '../../lib/format';
import { Card, cx, Empty, Logo, LogoDisc, OpponentLogo } from '../bits';
import { PlayerRow } from './RosterList';

export function ExtrasView({ extras, teamName }: { extras: TeamExtras; teamName: string }) {
  switch (extras.kind) {
    case 'probables':
      return <Probables extras={extras} teamName={teamName} />;
    case 'injuries':
      return <Injuries extras={extras} />;
    case 'table':
      return <Table extras={extras} />;
    default:
      return null;
  }
}

function Pitcher({ p, label, align = 'left' }: { p: ProbablePitcher | null; label: string; align?: 'left' | 'right' }) {
  return (
    <div className={cx('min-w-0 flex-1', align === 'right' && 'text-right')}>
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{label}</div>
      {p ? (
        <>
          <div className="truncate text-[15px] font-bold">{p.name}</div>
          <div className="truncate text-xs text-ink-2">{[p.hand, p.line].filter(Boolean).join(' · ') || '—'}</div>
        </>
      ) : (
        <div className="text-[15px] text-muted">TBD</div>
      )}
    </div>
  );
}

function Probables({ extras, teamName }: { extras: Extract<TeamExtras, { kind: 'probables' }>; teamName: string }) {
  if (!extras.matchups.length) return <Empty>No games in the next week.</Empty>;
  return (
    <div className="flex flex-col gap-3">
      {extras.matchups.map((m) => (
        <Card key={m.gameId} className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm">
            <LogoDisc size={28}>
              <OpponentLogo opp={m.opponent} size={20} />
            </LogoDisc>
            <span className="truncate font-semibold">
              {vsAt(m)} {m.opponent.name}
            </span>
            <span className="ml-auto shrink-0 text-xs text-muted">{gameWhen({ start: m.start, timeTBD: false })}</span>
          </div>
          <div className="flex items-center gap-3">
            <Pitcher p={m.us} label={teamName} />
            <span className="text-xs font-bold text-muted">vs</span>
            <Pitcher p={m.them} label={m.opponent.abbrev} align="right" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function Injuries({ extras }: { extras: Extract<TeamExtras, { kind: 'injuries' }> }) {
  if (!extras.players.length) return <Empty>No reported injuries.</Empty>;
  return (
    <Card className="divide-y divide-line-2">
      {extras.players.map((p) => (
        <PlayerRow key={p.id} p={p} />
      ))}
    </Card>
  );
}

function Table({ extras }: { extras: Extract<TeamExtras, { kind: 'table' }> }) {
  return (
    <div>
      <div className="px-1 pb-2 text-sm text-muted">
        {extras.group} · top {extras.playoffSpots} make the playoffs
      </div>
      <Card className="overflow-hidden">
        <table className="tabular w-full text-sm">
          <thead>
            <tr className="text-xs text-muted">
              <th className="py-2.5 pl-4 text-left font-medium">#</th>
              <th className="py-2.5 text-left font-medium">Club</th>
              <th className="py-2.5 text-center font-medium">GP</th>
              <th className="hidden py-2.5 text-center font-medium sm:table-cell">W-L-D</th>
              <th className="py-2.5 text-center font-medium">GD</th>
              <th className="py-2.5 pr-4 text-right font-bold text-ink">Pts</th>
            </tr>
          </thead>
          <tbody>
            {extras.rows.map((r) => (
              <tr
                key={r.team.id}
                className={cx(
                  'border-t',
                  r.rank === extras.playoffSpots + 1 ? 'border-t-2 border-dashed border-team' : 'border-line-2',
                  r.isUs && 'bg-team-soft',
                )}
              >
                <td className={cx('py-2.5 pl-4 text-xs font-semibold', r.rank <= extras.playoffSpots ? 'text-ink' : 'text-muted')}>{r.rank}</td>
                <td className="py-2.5">
                  <span className="flex items-center gap-2">
                    <Logo src={r.team.logo} alt={r.team.abbrev} size={20} />
                    <span className={cx('truncate', r.isUs ? 'font-bold text-ink' : 'text-ink-2')}>{r.team.name}</span>
                  </span>
                </td>
                <td className="py-2.5 text-center text-ink-2">{r.played}</td>
                <td className="hidden py-2.5 text-center text-ink-2 sm:table-cell">{r.record}</td>
                <td className="py-2.5 text-center text-ink-2">{r.goalDiff != null ? (r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff) : '–'}</td>
                <td className="py-2.5 pr-4 text-right font-display font-extrabold">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
