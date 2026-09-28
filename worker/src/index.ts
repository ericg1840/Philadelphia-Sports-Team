import { isTeamId } from '../../shared/teams';
import { DataCache } from './cache';
import { createFetchJson, type Ctx, type FetchJson } from './context';
import { homePayload, teamPayload } from './service';

export interface Env {
  ALLOWED_ORIGIN?: string;
  STALE_KV?: KVNamespace;
}

function corsHeaders(env: Env, req: Request): Record<string, string> {
  const allowed = (env.ALLOWED_ORIGIN ?? '*').split(',').map((s) => s.trim());
  const origin = req.headers.get('origin') ?? '';
  const allow = allowed.includes('*') ? '*' : allowed.includes(origin) ? origin : allowed[0];
  return {
    'access-control-allow-origin': allow,
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
    vary: 'origin',
  };
}

function json(body: unknown, init: ResponseInit & { cors: Record<string, string> }) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=30',
      ...init.cors,
    },
  });
}

/** Exposed for the local fixture server, which swaps in fixture-backed fetchJson. */
export async function handle(
  req: Request,
  env: Env,
  deps: { cache: DataCache; fetchJson: FetchJson; now?: Date },
): Promise<Response> {
  const cors = corsHeaders(env, req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'GET') return json({ error: 'method not allowed' }, { status: 405, cors });

  const url = new URL(req.url);
  const ctx: Ctx = { cache: deps.cache, fetchJson: deps.fetchJson, now: deps.now ?? new Date() };
  // Handy for testing "what does game day look like" against real data: ?now=2026-10-04T18:00:00Z
  const nowOverride = url.searchParams.get('now');
  if (nowOverride && !Number.isNaN(Date.parse(nowOverride))) ctx.now = new Date(nowOverride);

  try {
    if (url.pathname === '/api/health') return json({ ok: true, now: ctx.now.toISOString() }, { cors });
    if (url.pathname === '/api/home') return json(await homePayload(ctx), { cors });
    const m = url.pathname.match(/^\/api\/team\/([a-z]+)$/);
    if (m) {
      if (!isTeamId(m[1])) return json({ error: 'unknown team' }, { status: 404, cors });
      return json(await teamPayload(ctx, m[1]), { cors });
    }
    return json({ error: 'not found' }, { status: 404, cors });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'internal error' }, { status: 502, cors });
  }
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const cache = new DataCache({
      kv: env.STALE_KV,
      edge: typeof caches !== 'undefined' ? caches.default : undefined,
      waitUntil: (p) => ctx.waitUntil(p),
    });
    return handle(req, env, { cache, fetchJson: createFetchJson() });
  },
} satisfies ExportedHandler<Env>;
