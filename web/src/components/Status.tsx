import { CloudOff, RefreshCw } from 'lucide-react';
import { ago } from '../lib/format';
import { cx } from './bits';

/** Footer line: when data was fetched, plus offline / stale warnings. */
export function DataStatus({
  savedAt,
  loading,
  offline,
  error,
  staleTeams,
  onRefresh,
}: {
  savedAt: number | null;
  loading: boolean;
  offline: boolean;
  error: string | null;
  staleTeams?: string[];
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-[11px] text-zinc-500">
      {offline && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-amber-300">
          <CloudOff size={12} /> Offline — showing data from {savedAt ? ago(savedAt) : 'earlier'}
        </span>
      )}
      {!offline && error && !savedAt && <span className="text-rose-300">Couldn't reach the data service ({error}).</span>}
      {!!staleTeams?.length && (
        <span className="text-amber-300/80">Upstream hiccup — {staleTeams.join(', ')} showing cached data.</span>
      )}
      <button onClick={onRefresh} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 hover:bg-zinc-900">
        <RefreshCw size={12} className={cx(loading && 'animate-spin')} />
        {savedAt ? `Updated ${ago(savedAt)}` : 'Refresh'}
      </button>
    </div>
  );
}

export function SectionNote({ stale, error, fetchedAt }: { stale: boolean; error?: string; fetchedAt: string | null }) {
  if (!stale) return null;
  return (
    <div className="mb-3 rounded-xl bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
      Live source unavailable{error ? ` (${error})` : ''} — showing data from {fetchedAt ? ago(fetchedAt) : 'earlier'}.
    </div>
  );
}
