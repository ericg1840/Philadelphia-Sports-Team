import { beforeEach, describe, expect, it } from 'vitest';
import type { HomePayload, TeamPayload } from '../../shared/types';
import { flattenStandings, normalizeEspnEvent, standingFromGroups } from '../src/adapters/espn';
import { normalizeMlbStanding } from '../src/adapters/mlb';
import { nhlSeason } from '../src/adapters/nhl';
import { DataCache, _resetMemoryCache } from '../src/cache';
import { handle } from '../src/index';
import { scheduleTtl, startOfDayET } from '../src/util';
import { fixtureFetch } from '../scripts/fixtures';

const NOW = new Date('2026-09-28T19:00:00Z');

async function get<T>(path: string, opts: { failHosts?: string[]; cache?: DataCache; now?: Date } = {}) {
  const cache = opts.cache ?? new DataCache();
  const res = await handle(new Request(`http://x${path}`), {}, {
    cache,
    fetchJson: fixtureFetch(NOW, opts),
    now: opts.now ?? NOW,
  });
  return { status: res.status, body: (await res.json()) as T };
}

beforeEach(() => _resetMemoryCache());

describe('/api/home', () => {
  it('returns a summary for every team', async () => {
    const { status, body } = await get<HomePayload>('/api/home');
    expect(status).toBe(200);
    expect(body.teams.map((t) => t.team)).toEqual(['phillies', 'eagles', 'sixers', 'flyers', 'union']);
    for (const t of body.teams) {
      expect(t.nextGame, t.team).not.toBeNull();
      expect(Date.parse(t.nextGame!.start)).toBeGreaterThan(NOW.getTime());
    }
  });

  it('computes form and last game', async () => {
    const { body } = await get<HomePayload>('/api/home');
    const eagles = body.teams.find((t) => t.team === 'eagles')!;
    expect(eagles.form).toEqual(['W', 'W', 'W', 'L']);
    expect(eagles.lastGame?.score).toEqual({ us: 27, them: 31 });
    const union = body.teams.find((t) => t.team === 'union')!;
    expect(union.form).toEqual(['W', 'T', 'W', 'L']);
    const flyers = body.teams.find((t) => t.team === 'flyers')!;
    // Preseason games are excluded from form.
    expect(flyers.form).toEqual([]);
    expect(flyers.lastGame?.result).toBe('W');
  });

  it('builds a sorted 7-day week strip', async () => {
    const { body } = await get<HomePayload>('/api/home');
    const starts = body.week.map((g) => Date.parse(g.start));
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    expect(Math.min(...starts)).toBeGreaterThanOrEqual(startOfDayET(NOW).getTime());
    expect(Math.max(...starts)).toBeLessThan(NOW.getTime() + 8 * 86400_000);
    expect(new Set(body.week.map((g) => g.team)).size).toBe(5);
  });

  it('attaches weather only to outdoor Philly venues', async () => {
    const { body } = await get<HomePayload>('/api/home');
    for (const g of body.week) {
      if (g.weather) expect(['Citizens Bank Park', 'Lincoln Financial Field', 'Subaru Park']).toContain(g.venue.name);
      if (!g.venue.outdoor) expect(g.weather).toBeUndefined();
    }
    const phils = body.teams.find((t) => t.team === 'phillies')!.nextGame!;
    expect(phils.weather?.tempF).toBeTypeOf('number');
    expect(phils.weather?.wind).toMatch(/mph/);
    expect(body.teams.find((t) => t.team === 'eagles')!.nextGame!.weather).toBeDefined();
  });

  it('degrades per team when an upstream is down', async () => {
    const { status, body } = await get<HomePayload>('/api/home', { failHosts: ['site.api.espn.com'] });
    expect(status).toBe(200);
    const eagles = body.teams.find((t) => t.team === 'eagles')!;
    expect(eagles.nextGame).toBeNull();
    expect(eagles.error).toMatch(/outage/);
    expect(body.teams.find((t) => t.team === 'phillies')!.nextGame).not.toBeNull();
  });
});

describe('/api/team/:id', () => {
  it.each(['phillies', 'eagles', 'sixers', 'flyers', 'union'])('%s has all sections', async (team) => {
    const { status, body } = await get<TeamPayload>(`/api/team/${team}`);
    expect(status).toBe(200);
    expect(body.schedule.data?.length).toBeGreaterThan(0);
    expect(body.roster.data?.length).toBeGreaterThan(0);
    expect(body.extras.error).toBeUndefined();
    if (team !== 'sixers') expect(body.lastBox.data?.lines).toHaveLength(2);
  });

  it('phillies probables include season lines', async () => {
    const { body } = await get<TeamPayload>('/api/team/phillies');
    const ex = body.extras.data!;
    expect(ex.kind).toBe('probables');
    if (ex.kind !== 'probables') return;
    expect(ex.matchups[0].us?.name).toBe('Zack Wheeler');
    expect(ex.matchups[0].us?.line).toBe('16-6, 2.71 ERA');
    expect(ex.matchups[0].them?.name).toBe('Dylan Cease');
    expect(ex.matchups[2].us).toBeNull();
  });

  it('phillies roster flags IL players', async () => {
    const { body } = await get<TeamPayload>('/api/team/phillies');
    const il = body.roster.data!.filter((p) => p.injury);
    expect(il.map((p) => p.name).sort()).toEqual(['Nick Castellanos', 'Ranger Suárez']);
  });

  it('eagles injury report is sorted by severity', async () => {
    const { body } = await get<TeamPayload>('/api/team/eagles');
    const ex = body.extras.data!;
    if (ex.kind !== 'injuries') throw new Error('expected injuries');
    expect(ex.players.map((p) => p.injury!.status)).toEqual(['Injured Reserve', 'Out', 'Doubtful', 'Questionable']);
    expect(body.standing.data?.summary).toBe('1st NFC East');
    expect(body.standing.data?.playoff).toEqual({ status: 'in', text: '#2 seed in NFC' });
  });

  it('union MLS table marks our row and the playoff line', async () => {
    const { body } = await get<TeamPayload>('/api/team/union');
    const ex = body.extras.data!;
    if (ex.kind !== 'table') throw new Error('expected table');
    expect(ex.playoffSpots).toBe(9);
    expect(ex.rows.find((r) => r.isUs)?.rank).toBe(3);
    expect(body.standing.data?.points).toBe(54);
    expect(body.lastBox.data?.scoring).toHaveLength(3);
  });

  it('flyers box score and injury overlay from ESPN', async () => {
    const { body } = await get<TeamPayload>('/api/team/flyers');
    const box = body.lastBox.data!;
    expect(box.lines.map((l) => l.periods)).toEqual([
      [1, 0, 0],
      [1, 1, 2],
    ]);
    expect(box.lines[1].extra?.SOG).toBe('34');
    expect(box.highlights[0].label).toBe('★1');
    expect(body.roster.data!.find((p) => p.name === 'Owen Tippett')?.injury?.status).toBe('Day-To-Day');
  });

  it('404s unknown teams', async () => {
    const { status } = await get('/api/team/rangers');
    expect(status).toBe(404);
  });
});

describe('stale-cache fallback', () => {
  it('serves the last good copy when the upstream fails', async () => {
    let t = NOW.getTime();
    const cache = new DataCache({ now: () => t });
    const first = await get<TeamPayload>('/api/team/union', { cache });
    expect(first.body.schedule.stale).toBe(false);

    t += 2 * 3600_000; // past every TTL
    const second = await get<TeamPayload>('/api/team/union', { cache, failHosts: ['site.api.espn.com'] });
    expect(second.body.schedule.stale).toBe(true);
    expect(second.body.schedule.data).toEqual(first.body.schedule.data);
    expect(second.body.schedule.error).toMatch(/outage/);
  });

  it('uses KV when the in-memory copy is gone', async () => {
    const store = new Map<string, string>();
    const kv = {
      get: async (k: string) => (store.has(k) ? JSON.parse(store.get(k)!) : null),
      put: async (k: string, v: string) => void store.set(k, v),
    };
    const pending: Promise<unknown>[] = [];
    let t = NOW.getTime();
    const cache = new DataCache({ kv, now: () => t, waitUntil: (p) => pending.push(p) });
    await get('/api/team/sixers', { cache });
    await Promise.all(pending);
    expect(store.has('schedule:sixers')).toBe(true);

    _resetMemoryCache(); // new isolate
    t += 2 * 3600_000;
    const r = await get<TeamPayload>('/api/team/sixers', { cache, failHosts: ['site.api.espn.com'] });
    expect(r.body.schedule.stale).toBe(true);
    expect(r.body.schedule.data?.length).toBeGreaterThan(0);
  });

  it('dedupes concurrent fetches', async () => {
    let calls = 0;
    const cache = new DataCache();
    const fetcher = async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 10));
      return 1;
    };
    await Promise.all([cache.get('k', 60, fetcher), cache.get('k', 60, fetcher), cache.get('k', 60, fetcher)]);
    expect(calls).toBe(1);
  });
});

describe('normalizers', () => {
  it('game-day TTL is short near game time', () => {
    const g = (start: string, status: 'scheduled' | 'final' = 'scheduled') =>
      ({ start, status }) as Parameters<typeof scheduleTtl>[0][number];
    expect(scheduleTtl([g('2026-09-28T21:00:00Z')], NOW.getTime())).toBe(120);
    expect(scheduleTtl([g('2026-10-02T21:00:00Z')], NOW.getTime())).toBe(1800);
    expect(scheduleTtl([g('2026-09-28T15:00:00Z', 'final')], NOW.getTime())).toBe(120);
  });

  it('nhl season id rolls over in July', () => {
    expect(nhlSeason(new Date('2026-09-28'))).toBe('20262027');
    expect(nhlSeason(new Date('2027-03-01'))).toBe('20262027');
  });

  it('mlb wild card text', () => {
    const s = normalizeMlbStanding({
      records: [
        {
          division: { id: 204 },
          teamRecords: [
            { team: { id: 143 }, divisionRank: '2', wildCardRank: '5', gamesBack: '6.0', wildCardGamesBack: '1.5', wins: 80, losses: 70 },
          ],
        },
      ],
    });
    expect(s?.summary).toBe('2nd NL East, 6.0 GB');
    expect(s?.playoff).toEqual({ status: 'bubble', text: '1.5 GB of final Wild Card' });
  });

  it('espn string scores and ties', () => {
    const g = normalizeEspnEvent(
      {
        id: '1',
        date: '2026-05-01T23:30Z',
        competitions: [
          {
            competitors: [
              { id: '10739', homeAway: 'home', score: '2', team: { id: '10739' } },
              { id: '5', homeAway: 'away', score: '2', team: { id: '5', abbreviation: 'X' } },
            ],
            status: { type: { state: 'post', name: 'STATUS_FULL_TIME' } },
          },
        ],
      },
      { team: 'union', league: 'MLS', espnId: '10739' },
    );
    expect(g?.result).toBe('T');
    expect(g?.home).toBe(true);
  });

  it('standings with no games played omit the playoff line', () => {
    const groups = flattenStandings({
      children: [{ name: 'Eastern Conference', standings: { entries: [{ team: { id: '10739' }, stats: [{ name: 'rank', value: 1 }] }] } }],
    });
    const cfg = { espnId: '10739', league: 'MLS', playoff: () => ({ status: 'in', text: 'x' }) } as any;
    const s = standingFromGroups(groups, cfg);
    expect(s?.summary).toBe('Eastern Conference');
    expect(s?.playoff).toBeUndefined();
  });
});
