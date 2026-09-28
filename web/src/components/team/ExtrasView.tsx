import type { ProbablePitcher, TeamExtras } from '../../../../shared/types';
import { gameWhen, vsAt } from '../../lib/format';
import { Card, cx, Logo, OpponentLogo } from '../bits';
import { PlayerRow } from './RosterList';

export function ExtrasView({ extras }: { extras: TeamExtras }) {
  switch (extras.kind) {
    case 'probables':
      return <Probables extras={extras} />;
    case 'injuries':
      return <Injuries extras={extras} />;
    case 'table':
      return <Table extras={extras} />;
    default:
      return null;
  }
}

function Pitcher({ p, label }: { p: ProbablePitcher | null; label: string }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      {p ? (
        <>
          <div className="truncate text-sm font-semibold">{p.name}</div>
          <div className="truncate text-[11px] text-zinc-400">{[p.hand, p.line].filter(Boolean).join(' · ') || '—'}</div>
        </>
      ) : (
        <div className="text-sm text-zinc-500">TBD</div>
      )}
    </div>
  );
}

function Probables({ extras }: { extras: Extract<TeamExtras, { kind: 'probables' }> }) {
  if (!extras.matchups.length) return <Empty>No upcoming games in the next week.</Empty>;
  return (
    <div className="flex flex-col gap-3">
      {extras.matchups.map((m) => (
        <Card key={m.gameId} className="p-3">
          <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
            <OpponentLogo opp={m.opponent} size={18} />
            <span className="font-medium text-zinc-200">
              {vsAt(m)} {m.opponent.name}
            </span>
            <span className="ml-auto">{gameWhen({ start: m.start, timeTBD: false })}</span>
          </div>
          <div className="flex items-center gap-3">
            <Pitcher p={m.us} label="Phillies" />
            <span className="text-xs text-zinc-600">vs</span>
            <div className="text-right">
              <Pitcher p={m.them} label={m.opponent.abbrev} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Injuries({ extras }: { extras: Extract<TeamExtras, { kind: 'injuries' }> }) {
  if (!extras.players.length) return <Empty>No reported injuries. 🙌</Empty>;
  return (
    <Card className="divide-y divide-zinc-800/80">
      {extras.players.map((p) => (
        <PlayerRow key={p.id} p={p} />
      ))}
    </Card>
  );
}

function Table({ extras }: { extras: Extract<TeamExtras, { kind: 'table' }> }) {
  return (
    <div>
      <div className="px-1 pb-2 text-xs text-zinc-400">
        {extras.group} · top {extras.playoffSpots} make the playoffs
      </div>
      <Card className="overflow-hidden">
        <table className="tabular w-full text-sm">
          <thead>
            <tr className="text-[11px] text-zinc-500">
              <th className="py-2 pl-3 text-left font-medium">#</th>
              <th className="py-2 text-left font-medium">Club</th>
              <th className="py-2 text-center font-medium">GP</th>
              <th className="hidden py-2 text-center font-medium sm:table-cell">W-L-D</th>
              <th className="py-2 text-center font-medium">GD</th>
              <th className="py-2 pr-3 text-right font-semibold text-zinc-300">Pts</th>
            </tr>
          </thead>
          <tbody>
            {extras.rows.map((r) => (
              <tr
                key={r.team.id}
                className={cx(
                  'border-t',
                  r.rank === extras.playoffSpots + 1 ? 'border-dashed border-team-accent/60' : 'border-zinc-800',
                  r.isUs && 'bg-team/20',
                )}
              >
                <td className={cx('py-2 pl-3 text-xs', r.rank <= extras.playoffSpots ? 'text-zinc-300' : 'text-zinc-600')}>{r.rank}</td>
                <td className="py-2">
                  <span className="flex items-center gap-2">
                    <Logo src={r.team.logo} alt={r.team.abbrev} size={18} />
                    <span className={cx('truncate', r.isUs ? 'font-semibold text-zinc-50' : 'text-zinc-300')}>{r.team.name}</span>
                  </span>
                </td>
                <td className="py-2 text-center text-zinc-400">{r.played}</td>
                <td className="hidden py-2 text-center text-zinc-400 sm:table-cell">{r.record}</td>
                <td className="py-2 text-center text-zinc-400">{r.goalDiff != null ? (r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff) : '–'}</td>
                <td className="py-2 pr-3 text-right font-bold">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-zinc-900/70 p-4 text-sm text-zinc-400 ring-1 ring-zinc-800">{children}</div>;
}
