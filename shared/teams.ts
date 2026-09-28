import type { League, TeamId } from './types';

export interface TeamMeta {
  id: TeamId;
  name: string;
  shortName: string;
  league: League;
  abbrev: string;
  logo: string;
  /**
   * `accent`: a fill-safe variant (white text on it, or as text on white, passes contrast).
   * `dot`: the recognizable brand hue for small swatches.
   */
  colors: { primary: string; secondary: string; accent: string; dot: string };
  /** Label for the team-specific extras tab, if any. */
  extrasLabel?: string;
}

export const TEAMS: Record<TeamId, TeamMeta> = {
  phillies: {
    id: 'phillies',
    name: 'Philadelphia Phillies',
    shortName: 'Phillies',
    league: 'MLB',
    abbrev: 'PHI',
    logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/phi.png',
    colors: { primary: '#E81828', secondary: '#002D72', accent: '#C8102E', dot: '#C8102E' },
    extrasLabel: 'Probables',
  },
  eagles: {
    id: 'eagles',
    name: 'Philadelphia Eagles',
    shortName: 'Eagles',
    league: 'NFL',
    abbrev: 'PHI',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png',
    colors: { primary: '#004C54', secondary: '#A5ACAF', accent: '#004C54', dot: '#004C54' },
    extrasLabel: 'Injuries',
  },
  sixers: {
    id: 'sixers',
    name: 'Philadelphia 76ers',
    shortName: 'Sixers',
    league: 'NBA',
    abbrev: 'PHI',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/phi.png',
    colors: { primary: '#006BB6', secondary: '#ED174C', accent: '#006BB6', dot: '#006BB6' },
  },
  flyers: {
    id: 'flyers',
    name: 'Philadelphia Flyers',
    shortName: 'Flyers',
    league: 'NHL',
    abbrev: 'PHI',
    logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/phi.png',
    colors: { primary: '#F74902', secondary: '#000000', accent: '#C23E00', dot: '#E04E0B' },
  },
  union: {
    id: 'union',
    name: 'Philadelphia Union',
    shortName: 'Union',
    league: 'MLS',
    abbrev: 'PHI',
    logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/10739.png',
    colors: { primary: '#071B2C', secondary: '#B19B69', accent: '#071B2C', dot: '#B19B69' },
    extrasLabel: 'MLS Table',
  },
};

export const TEAM_IDS: TeamId[] = ['phillies', 'eagles', 'sixers', 'flyers', 'union'];

export function isTeamId(x: unknown): x is TeamId {
  return typeof x === 'string' && (TEAM_IDS as string[]).includes(x);
}
