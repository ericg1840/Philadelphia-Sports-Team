import type { BoxScore } from '../../../../shared/types';
import { longDay } from '../../lib/format';
import { Card, cx, OpponentLogo } from '../bits';

export function BoxScoreView({ box }: { box: BoxScore }) {
  const winnerTotal = Math.max(...box.lines.map((l) => l.total));
  return (
    <div className="flex flex-col gap-4">
      <div className="px-1 text-xs text-zinc-400">
        <span className="font-semibold text-zinc-200">{box.statusDetail}</span> · {longDay(box.start)}
      </div>

      <Card className="overflow-x-auto p-3">
        <table className="tabular w-full text-sm">
          <thead>
            <tr className="text-[11px] text-zinc-500">
              <th className="pb-2 text-left font-medium" />
              {box.periodLabels.map((p) => (
                <th key={p} className="min-w-6 pb-2 text-center font-medium">
                  {p}
                </th>
              ))}
              <th className="min-w-8 pb-2 text-center font-semibold text-zinc-300">{box.league === 'MLB' ? 'R' : 'T'}</th>
              {box.extraLabels.map((l) => (
                <th key={l} className="min-w-8 pb-2 text-center font-medium">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {box.lines.map((l) => (
              <tr key={l.team.id + l.home} className="border-t border-zinc-800">
                <td className="py-2 pr-2">
                  <span className="flex items-center gap-2">
                    <OpponentLogo opp={l.team} size={20} />
                    <span className={cx('font-semibold', l.total === winnerTotal ? 'text-zinc-100' : 'text-zinc-400')}>{l.team.abbrev}</span>
                  </span>
                </td>
                {box.periodLabels.map((p, i) => (
                  <td key={p} className="py-2 text-center text-zinc-400">
                    {l.periods[i] ?? (box.league === 'MLB' ? 'x' : '–')}
                  </td>
                ))}
                <td className={cx('py-2 text-center font-bold', l.total === winnerTotal ? 'text-zinc-50' : 'text-zinc-400')}>{l.total}</td>
                {box.extraLabels.map((e) => (
                  <td key={e} className="py-2 text-center text-zinc-400">
                    {l.extra?.[e] ?? '–'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {box.highlights.length > 0 && (
        <section>
          <h3 className="px-1 pb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {box.league === 'MLB' ? 'Decisions' : box.league === 'NHL' ? 'Three stars' : 'Leaders'}
          </h3>
          <Card className="divide-y divide-zinc-800/80">
            {box.highlights.map((h, i) => (
              <div key={i} className="flex items-baseline gap-3 px-3 py-2 text-sm">
                <span className="w-28 shrink-0 text-[11px] font-semibold uppercase text-zinc-500">{h.label}</span>
                <span className="text-zinc-200">{h.value}</span>
              </div>
            ))}
          </Card>
        </section>
      )}

      {box.scoring.length > 0 && (
        <section>
          <h3 className="px-1 pb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">Scoring</h3>
          <Card className="divide-y divide-zinc-800/80">
            {box.scoring.map((s, i) => (
              <div key={i} className="flex items-baseline gap-3 px-3 py-2 text-sm">
                <span className="tabular w-16 shrink-0 text-[11px] text-zinc-500">
                  {s.period}
                  {s.time ? ` ${s.time}` : ''}
                </span>
                <span className="w-10 shrink-0 text-xs font-semibold text-zinc-300">{s.team}</span>
                <span className="text-zinc-300">{s.text}</span>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
