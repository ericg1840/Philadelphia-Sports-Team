import type { BoxScore } from '../../../../shared/types';
import { longDay } from '../../lib/format';
import { Card, cx, LogoDisc, OpponentLogo } from '../bits';

export function BoxScoreView({ box }: { box: BoxScore }) {
  const winnerTotal = Math.max(...box.lines.map((l) => l.total));
  return (
    <div className="flex flex-col gap-5">
      <div className="px-1 text-sm text-muted">
        <span className="font-bold text-ink">{box.statusDetail}</span> · {longDay(box.start)}
      </div>

      <Card className="overflow-x-auto p-4">
        <table className="tabular w-full text-sm">
          <thead>
            <tr className="text-xs text-muted">
              <th className="pb-2 text-left font-medium">
                <span className="sr-only">Team</span>
              </th>
              {box.periodLabels.map((p) => (
                <th key={p} className="min-w-7 pb-2 text-center font-medium">
                  {p}
                </th>
              ))}
              <th className="min-w-9 pb-2 text-center font-bold text-ink">{box.league === 'MLB' ? 'R' : 'T'}</th>
              {box.extraLabels.map((l) => (
                <th key={l} className="min-w-9 pb-2 text-center font-medium">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {box.lines.map((l) => {
              const won = l.total === winnerTotal;
              return (
                <tr key={l.team.id + l.home} className="border-t border-line-2">
                  <td className="py-2.5 pr-3">
                    <span className="flex items-center gap-2">
                      <LogoDisc size={28}>
                        <OpponentLogo opp={l.team} size={20} />
                      </LogoDisc>
                      <span className={cx('font-bold', won ? 'text-ink' : 'text-muted')}>{l.team.abbrev}</span>
                    </span>
                  </td>
                  {box.periodLabels.map((p, i) => (
                    <td key={p} className="py-2.5 text-center text-ink-2">
                      {l.periods[i] ?? (box.league === 'MLB' ? 'x' : '–')}
                    </td>
                  ))}
                  <td className={cx('py-2.5 text-center font-display text-base font-extrabold', won ? 'text-ink' : 'text-muted')}>{l.total}</td>
                  {box.extraLabels.map((e) => (
                    <td key={e} className="py-2.5 text-center text-ink-2">
                      {l.extra?.[e] ?? '–'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {box.highlights.length > 0 && (
        <section>
          <h3 className="px-1 pb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted">
            {box.league === 'MLB' ? 'Decisions' : box.league === 'NHL' ? 'Three stars' : 'Leaders'}
          </h3>
          <Card className="divide-y divide-line-2">
            {box.highlights.map((h, i) => (
              <div key={i} className="flex items-baseline gap-3 px-4 py-2.5 text-sm">
                <span className="w-32 shrink-0 text-xs font-bold uppercase text-muted">{h.label}</span>
                <span className="text-ink">{h.value}</span>
              </div>
            ))}
          </Card>
        </section>
      )}

      {box.scoring.length > 0 && (
        <section>
          <h3 className="px-1 pb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted">Scoring</h3>
          <Card className="divide-y divide-line-2">
            {box.scoring.map((s, i) => (
              <div key={i} className="flex items-baseline gap-3 px-4 py-2.5 text-sm">
                <span className="tabular w-16 shrink-0 text-xs text-muted">
                  {s.period}
                  {s.time ? ` ${s.time}` : ''}
                </span>
                <span className="w-10 shrink-0 text-xs font-bold text-ink">{s.team}</span>
                <span className="text-ink-2">{s.text}</span>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
