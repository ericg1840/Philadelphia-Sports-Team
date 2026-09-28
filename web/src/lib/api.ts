import { useCallback, useEffect, useRef, useState } from 'react';

export const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8787';

const REFRESH_MS = 60_000;

interface Stored<T> {
  data: T;
  savedAt: number;
}

function readStored<T>(key: string): Stored<T> | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Stored<T>) : null;
  } catch {
    return null;
  }
}

function writeStored<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, savedAt: Date.now() }));
  } catch {
    // Quota or private mode: the service worker cache still covers offline.
  }
}

export interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  /** True when showing the locally saved copy because the last request failed. */
  offline: boolean;
  savedAt: number | null;
  refresh: () => void;
}

/**
 * Fetch + keep fresh. Shows the last saved response immediately (instant open,
 * works offline), refetches on an interval and whenever the app regains focus.
 */
export function useApi<T>(path: string): ApiState<T> {
  const key = `api:${path}`;
  const [state, setState] = useState<Omit<ApiState<T>, 'refresh'>>(() => {
    const stored = readStored<T>(key);
    return {
      data: stored?.data ?? null,
      savedAt: stored?.savedAt ?? null,
      error: null,
      loading: true,
      offline: false,
    };
  });
  const ctrl = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setState((s) => ({ ...s, loading: true }));
    try {
      const res = await fetch(`${API_BASE}${path}`, { signal: c.signal });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = (await res.json()) as T;
      writeStored(key, data);
      setState({ data, savedAt: Date.now(), error: null, loading: false, offline: false });
    } catch (e) {
      if (c.signal.aborted) return;
      const message = e instanceof Error ? e.message : String(e);
      setState((s) => ({ ...s, error: message, loading: false, offline: s.data != null }));
    }
  }, [key, path]);

  useEffect(() => {
    // Reset to this path's saved copy when navigating between teams.
    const stored = readStored<T>(key);
    setState({ data: stored?.data ?? null, savedAt: stored?.savedAt ?? null, error: null, loading: true, offline: false });
    load();
    const timer = setInterval(() => document.visibilityState === 'visible' && load(), REFRESH_MS);
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', load);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', load);
      ctrl.current?.abort();
    };
  }, [key, load]);

  return { ...state, refresh: load };
}
