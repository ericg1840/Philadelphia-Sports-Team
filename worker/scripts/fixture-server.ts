// Local API server on :8787 that runs the Worker's handler in Node.
//   npm run fixtures                 -> synthetic upstream data (works offline)
//   UPSTREAM=live npm run fixtures   -> real upstream APIs, no wrangler needed
//   FIXTURE_FAIL=site.api.espn.com   -> simulate an upstream outage
import { createServer } from 'node:http';
import { DataCache } from '../src/cache';
import { createFetchJson } from '../src/context';
import { handle } from '../src/index';
import { fixtureFetch } from './fixtures';

const port = Number(process.env.PORT ?? 8787);
const live = process.env.UPSTREAM === 'live';
const failHosts = (process.env.FIXTURE_FAIL ?? '').split(',').filter(Boolean);
const cache = new DataCache();
const fetchJson = live ? createFetchJson() : fixtureFetch(new Date(), { failHosts });

createServer(async (req, res) => {
  const request = new Request(`http://localhost:${port}${req.url}`, {
    method: req.method,
    headers: req.headers as Record<string, string>,
  });
  const response = await handle(request, { ALLOWED_ORIGIN: '*' }, { cache, fetchJson });
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(await response.text());
}).listen(port, () => {
  console.log(`philly-sports API (${live ? 'live upstreams' : 'fixtures'}) on http://localhost:${port}`);
});
