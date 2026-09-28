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
    <div className="flex flex-col items-center gap-2 py-6 text-xs text-muted">
      {offline && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF1D6] px-3 py-1 font-medium text-[#8A4B00]">
          <CloudOff size={13} aria-hidden /> Offline — showing data from {savedAt ? ago(savedAt) : 'earlier'}
        </span>
      )}
      {!offline && error && !savedAt && <span className="font-medium text-[#A30D25]">Couldn't reach the data service ({error}).</span>}
      {!!staleTeams?.length && <span className="text-[#8A4B00]">Upstream hiccup — {staleTeams.join(', ')} showing cached data.</span>}
      <button onClick={onRefresh} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 hover:bg-line-2">
        <RefreshCw size={13} className={cx(loading && 'animate-spin')} aria-hidden />
        {savedAt ? `Updated ${ago(savedAt)}` : 'Refresh'}
      </button>
    </div>
  );
}

export function SectionNote({ stale, error, fetchedAt }: { stale: boolean; error?: string; fetchedAt: string | null }) {
  if (!stale) return null;
  return (
    <div className="mb-3 rounded-xl bg-[#FFF1D6] px-3 py-2 text-xs text-[#8A4B00]">
      Live source unavailable{error ? ` (${error})` : ''} — showing data from {fetchedAt ? ago(fetchedAt) : 'earlier'}.
    </div>
  );
}
