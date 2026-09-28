import type { Venue } from '../../shared/types';

export interface OutdoorVenue {
  key: string;
  name: string;
  city: string;
  lat: number;
  lon: number;
  match: RegExp;
}

/** The only venues we fetch weather for. */
export const OUTDOOR_VENUES: OutdoorVenue[] = [
  {
    key: 'cbp',
    name: 'Citizens Bank Park',
    city: 'Philadelphia',
    lat: 39.9061,
    lon: -75.1665,
    match: /citizens\s*bank\s*park/i,
  },
  {
    key: 'linc',
    name: 'Lincoln Financial Field',
    city: 'Philadelphia',
    lat: 39.9008,
    lon: -75.1675,
    match: /lincoln\s*financial|^the linc$/i,
  },
  {
    key: 'subaru',
    name: 'Subaru Park',
    city: 'Chester',
    lat: 39.8328,
    lon: -75.3789,
    match: /subaru\s*park|talen\s*energy\s*stadium/i,
  },
];

export function findOutdoorVenue(name: string | undefined): OutdoorVenue | undefined {
  if (!name) return undefined;
  return OUTDOOR_VENUES.find((v) => v.match.test(name.trim()));
}

export function makeVenue(name: string | undefined, city?: string): Venue {
  const outdoor = findOutdoorVenue(name);
  return {
    name: outdoor?.name ?? name ?? 'TBD',
    city: outdoor?.city ?? city,
    outdoor: !!outdoor,
  };
}
