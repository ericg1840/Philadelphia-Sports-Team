# Philly Sports

A personal, upcoming-focused dashboard for the Phillies, Eagles, Sixers, Flyers and Union.
It's an installable PWA (Vite + React + Tailwind + lucide-react) backed by a small Cloudflare
Worker that proxies, normalizes and caches the upstream sports APIs.

```
shared/   Normalized data model (types.ts) + team metadata/colors (teams.ts), used by both sides
worker/   Cloudflare Worker: /api/home, /api/team/:id
web/      React PWA (home screen + team pages)
```

## What's on screen

- **Home**: your favorite team gets the hero card in its colors (next game, live countdown,
  venue, TV, game-time weather, last result, W/L form, standings/playoff line). Below that is a
  **This week** strip of every Philly game in the next 7 days. Days with more than one game get a
  count, and games whose times overlap get a **Clash** flag. Under the strip are compact cards for
  the other four teams, soonest game first.
- **Team pages** (`#/team/phillies` and so on): full schedule with results (scrolls to the next
  game; preseason hidden once the regular season exists), roster with number/position/injury
  status, last-game box score, and team extras:
  - Phillies: probable pitchers with season line
  - Eagles: injury report sorted by severity
  - Union: Eastern Conference table with the playoff line drawn in
- **Favorite team**: gear icon on the home screen, or the star on a team page. Stored in
  `localStorage`. It sets the app's accent colors.
- **Weather**: National Weather Service hourly forecast (daily as a fallback) for home games at
  Citizens Bank Park, Lincoln Financial Field and Subaru Park only. Shows temperature, wind and
  rain chance.

## Data and caching (Worker)

| Team     | Source                              |
|----------|-------------------------------------|
| Phillies | MLB Stats API (`statsapi.mlb.com`)  |
| Flyers   | NHL API (`api-web.nhle.com`), injuries overlaid from ESPN |
| Eagles / Sixers / Union | ESPN site API (`site.api.espn.com`) |
| Weather  | `api.weather.gov`                   |

Each league adapter (`worker/src/adapters/*`) maps the upstream JSON into the shared `Game`,
`Standing`, `Player`, `BoxScore` and `TeamExtras` shapes.

`worker/src/cache.ts` decides freshness itself, so an expired entry can still be served:

- **TTLs**: schedules refresh every 2 min when a game is live, starts within 3h, or ended within
  the last 6h, and every 30 min otherwise. Standings 10 min on game day, otherwise 1h. Rosters
  6h. Final box scores 24h. Forecasts 30 min. NWS grid lookups 30 days.
- **Layers**: in-isolate memory, then the Cache API, then optional **KV** (durable). KV writes are
  throttled to at most one per key every 10 min, which keeps it inside the free tier.
- **Failures**: if an upstream errors or times out (8s), the last good copy is served with
  `stale: true`. The UI shows a small "showing cached data" note. One team's outage never breaks
  the others, and weather errors never fail a request.
- Concurrent requests for the same key are de-duplicated.

The browser side keeps the last response in `localStorage` for instant, offline-capable opens.
The service worker also caches `/api/*` with NetworkFirst.

## Local development

```bash
npm run install:all

# API: runs the Worker handler in Node on :8787
npm run dev:fixtures                     # synthetic data shaped like each upstream (works offline)
UPSTREAM=live npm run dev:fixtures       # real upstream APIs
FIXTURE_FAIL=site.api.espn.com npm run dev:fixtures   # simulate an outage
# or the real Workers runtime:
npm run dev:worker                       # wrangler dev

npm run dev                              # web app on :5173, talks to http://localhost:8787
npm test                                 # worker tests (normalizers, payloads, stale fallback)
```

Add `?now=2026-10-04T16:00:00Z` to any API call to see what a given moment looks like.

## Deploy

**Worker**

```bash
cd worker
npx wrangler kv namespace create STALE_KV   # optional but recommended; paste the id into wrangler.toml
npx wrangler deploy
```

Set `ALLOWED_ORIGIN` in `wrangler.toml` to your Pages origin (for example
`https://ericg1840.github.io`).

**Frontend (GitHub Pages)**

1. Repo settings → Pages → Source: *GitHub Actions*.
2. Repo settings → Variables: `API_BASE` = your Worker URL.
3. Push to `main`. `.github/workflows/deploy.yml` tests, builds with the right base path and
   publishes the site. To deploy the Worker from CI as well, set variable `DEPLOY_WORKER=true` and
   secret `CLOUDFLARE_API_TOKEN`.

The app uses hash routing, so deep links work on GitHub Pages or Cloudflare Pages without
rewrites. For Cloudflare Pages, build `web/` with `npm run build`, output `web/dist`, and leave
`BASE_PATH` unset.

## Caveats

- ESPN's endpoints are unofficial and can change without notice. Upstream parsing is defensive and
  lives in one adapter per source.
- The upstream shapes were written from the APIs' documented and observed formats. The build
  sandbox had no network access to them, so the first `UPSTREAM=live` run is the real check.
