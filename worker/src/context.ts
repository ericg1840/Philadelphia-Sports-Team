import type { DataCache } from './cache';

export type FetchJson = (url: string, init?: { headers?: Record<string, string> }) => Promise<any>;

export interface Ctx {
  cache: DataCache;
  fetchJson: FetchJson;
  now: Date;
}

export class UpstreamError extends Error {
  constructor(
    public url: string,
    public status: number,
  ) {
    super(`upstream ${status} for ${new URL(url).host}${new URL(url).pathname}`);
  }
}

const USER_AGENT = 'philly-sports-dashboard/1.0 (personal dashboard; github.com/ericg1840/philadelphia-sports-team)';

export function createFetchJson(timeoutMs = 8000): FetchJson {
  return async (url, init) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'user-agent': USER_AGENT, accept: 'application/json, application/geo+json', ...init?.headers },
      });
      if (!res.ok) throw new UpstreamError(url, res.status);
      return await res.json();
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') throw new Error(`timeout fetching ${new URL(url).host}`);
      throw e;
    } finally {
      clearTimeout(timer);
    }
  };
}
