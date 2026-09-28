// National Weather Service forecasts for the three outdoor Philly venues.
// NWS flow: /points/{lat},{lon} -> forecastHourly / forecast URLs (stable per location).
import type { Game, GameWeather } from '../../shared/types';
import type { Ctx } from './context';
import { HOUR, MINUTE } from './util';
import { findOutdoorVenue, type OutdoorVenue } from './venues';

const NWS = 'https://api.weather.gov';

interface Period {
  startTime: string;
  endTime: string;
  temperature: number;
  temperatureUnit: string;
  windSpeed: string;
  windDirection: string;
  probabilityOfPrecipitation?: { value: number | null };
  shortForecast: string;
  icon?: string;
}

async function points(ctx: Ctx, v: OutdoorVenue) {
  const r = await ctx.cache.get(`nws-points:${v.key}`, 30 * 24 * HOUR, async () => {
    const d = await ctx.fetchJson(`${NWS}/points/${v.lat},${v.lon}`);
    const p = d?.properties;
    if (!p?.forecastHourly) throw new Error('NWS points lookup missing forecast URLs');
    return { hourly: p.forecastHourly as string, daily: p.forecast as string };
  });
  return r.data;
}

function slimPeriods(d: any): Period[] {
  return ((d?.properties?.periods ?? []) as any[]).map((p) => ({
    startTime: p.startTime,
    endTime: p.endTime,
    temperature: p.temperature,
    temperatureUnit: p.temperatureUnit,
    windSpeed: p.windSpeed,
    windDirection: p.windDirection,
    probabilityOfPrecipitation: p.probabilityOfPrecipitation,
    shortForecast: p.shortForecast,
    icon: p.icon,
  }));
}

async function forecast(ctx: Ctx, v: OutdoorVenue, kind: 'hourly' | 'daily'): Promise<Period[]> {
  const ttl = kind === 'hourly' ? 30 * MINUTE : HOUR;
  const r = await ctx.cache.get(`nws-${kind}:${v.key}`, ttl, async () => {
    const urls = await points(ctx, v);
    return slimPeriods(await ctx.fetchJson(kind === 'hourly' ? urls.hourly : urls.daily));
  });
  return r.data;
}

export function pickPeriod(periods: Period[], at: number): Period | undefined {
  return periods.find((p) => Date.parse(p.startTime) <= at && at < Date.parse(p.endTime));
}

export function toWeather(p: Period): GameWeather {
  const tempF = p.temperatureUnit === 'C' ? Math.round((p.temperature * 9) / 5 + 32) : p.temperature;
  return {
    forecastFor: p.startTime,
    tempF,
    wind: p.windSpeed,
    windDirection: p.windDirection,
    precipChance: p.probabilityOfPrecipitation?.value ?? null,
    shortForecast: p.shortForecast,
    icon: p.icon,
  };
}

/** NWS forecasts reach ~7 days out; hourly covers ~6.5 of those. */
const MAX_LEAD_MS = 7 * 24 * HOUR * 1000;

export async function weatherFor(ctx: Ctx, game: Game): Promise<GameWeather | undefined> {
  if (!game.venue.outdoor || game.status !== 'scheduled') return undefined;
  const v = findOutdoorVenue(game.venue.name);
  if (!v) return undefined;
  const at = Date.parse(game.start);
  if (at - ctx.now.getTime() > MAX_LEAD_MS || at < ctx.now.getTime() - 3 * HOUR * 1000) return undefined;
  const hourly = pickPeriod(await forecast(ctx, v, 'hourly'), at);
  if (hourly) return toWeather(hourly);
  const daily = pickPeriod(await forecast(ctx, v, 'daily'), at);
  return daily ? toWeather(daily) : undefined;
}

/** Attach forecasts in place; weather failures never fail the request. */
export async function attachWeather(ctx: Ctx, games: Game[]): Promise<void> {
  await Promise.all(
    games.map(async (g) => {
      try {
        const w = await weatherFor(ctx, g);
        if (w) g.weather = w;
      } catch (e) {
        console.warn(`weather failed for ${g.id}`, e);
      }
    }),
  );
}
