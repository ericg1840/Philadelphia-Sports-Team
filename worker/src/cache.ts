// Two-tier cache with stale-on-error fallback.
//
//   L1: in-isolate memory, backed by the Cache API (per-colo, may be evicted,
//       a no-op on workers.dev -- that's fine, it's an accelerator).
//   L2: optional KV namespace. Durable, so it survives isolate recycling and
//       gives us something to serve when an upstream is down. Writes are
//       throttled to stay well inside the free tier's daily write limit.
//
// Freshness is decided by us (fetchedAt + ttl), not by the storage layer, so an
// expired entry is still available as a stale fallback.

export interface Entry<T = unknown> {
  data: T;
  fetchedAt: number;
  kvWrittenAt?: number;
}

export interface Cached<T> {
  data: T;
  fetchedAt: number;
  stale: boolean;
  error?: string;
}

/** Seconds, or a function of the freshly fetched data (for game-day aware TTLs). */
export type Ttl<T> = number | ((data: T) => number);

interface KVLike {
  get(key: string, type: 'json'): Promise<unknown>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

interface CacheLike {
  match(req: Request): Promise<Response | undefined>;
  put(req: Request, res: Response): Promise<void>;
}

const KV_WRITE_INTERVAL_MS = 10 * 60 * 1000;
const RETAIN_SECONDS = 14 * 24 * 60 * 60; // keep stale copies around for two weeks
const memory = new Map<string, Entry>();
const inflight = new Map<string, Promise<Cached<unknown>>>();

export class DataCache {
  constructor(
    private opts: {
      kv?: KVLike;
      edge?: CacheLike;
      waitUntil?: (p: Promise<unknown>) => void;
      now?: () => number;
    } = {},
  ) {}

  private now() {
    return this.opts.now ? this.opts.now() : Date.now();
  }

  private defer(p: Promise<unknown>) {
    const guarded = p.catch((e) => console.warn('cache write failed', e));
    if (this.opts.waitUntil) this.opts.waitUntil(guarded);
  }

  private edgeUrl(key: string) {
    return new Request(`https://cache.philly-sports.internal/${encodeURIComponent(key)}`);
  }

  private async readL1<T>(key: string): Promise<Entry<T> | undefined> {
    const mem = memory.get(key) as Entry<T> | undefined;
    if (mem) return mem;
    if (!this.opts.edge) return undefined;
    try {
      const res = await this.opts.edge.match(this.edgeUrl(key));
      if (!res) return undefined;
      const entry = (await res.json()) as Entry<T>;
      memory.set(key, entry);
      return entry;
    } catch {
      return undefined;
    }
  }

  private writeL1(key: string, entry: Entry) {
    memory.set(key, entry);
    if (this.opts.edge) {
      const res = new Response(JSON.stringify(entry), {
        headers: { 'content-type': 'application/json', 'cache-control': `max-age=${RETAIN_SECONDS}` },
      });
      this.defer(this.opts.edge.put(this.edgeUrl(key), res));
    }
  }

  private async readKV<T>(key: string): Promise<Entry<T> | undefined> {
    if (!this.opts.kv) return undefined;
    try {
      return ((await this.opts.kv.get(key, 'json')) as Entry<T> | null) ?? undefined;
    } catch {
      return undefined;
    }
  }

  async get<T>(key: string, ttl: Ttl<T>, fetcher: () => Promise<T>): Promise<Cached<T>> {
    const running = inflight.get(key);
    if (running) return running as Promise<Cached<T>>;
    const p = this.resolve(key, ttl, fetcher).finally(() => inflight.delete(key));
    inflight.set(key, p as Promise<Cached<unknown>>);
    return p;
  }

  private isFresh<T>(entry: Entry<T>, ttl: Ttl<T>) {
    const seconds = typeof ttl === 'function' ? ttl(entry.data) : ttl;
    return this.now() - entry.fetchedAt < seconds * 1000;
  }

  private async resolve<T>(key: string, ttl: Ttl<T>, fetcher: () => Promise<T>): Promise<Cached<T>> {
    let entry = await this.readL1<T>(key);
    if (entry && this.isFresh(entry, ttl)) return { data: entry.data, fetchedAt: entry.fetchedAt, stale: false };

    // L1 miss or expired: a newer copy may be in KV (another isolate refreshed it).
    const kvEntry = await this.readKV<T>(key);
    if (kvEntry && (!entry || kvEntry.fetchedAt > entry.fetchedAt)) {
      entry = { ...kvEntry, kvWrittenAt: kvEntry.fetchedAt };
      if (this.isFresh(entry, ttl)) {
        this.writeL1(key, entry);
        return { data: entry.data, fetchedAt: entry.fetchedAt, stale: false };
      }
    }

    try {
      const data = await fetcher();
      const now = this.now();
      const next: Entry<T> = { data, fetchedAt: now, kvWrittenAt: entry?.kvWrittenAt };
      if (this.opts.kv && (!next.kvWrittenAt || now - next.kvWrittenAt > KV_WRITE_INTERVAL_MS)) {
        next.kvWrittenAt = now;
        this.defer(
          this.opts.kv.put(key, JSON.stringify({ data, fetchedAt: now }), { expirationTtl: RETAIN_SECONDS }),
        );
      }
      this.writeL1(key, next);
      return { data, fetchedAt: now, stale: false };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (entry) {
        console.warn(`serving stale ${key}: ${message}`);
        return { data: entry.data, fetchedAt: entry.fetchedAt, stale: true, error: message };
      }
      throw err;
    }
  }
}

/** Test helper. */
export function _resetMemoryCache() {
  memory.clear();
  inflight.clear();
}
