// Normalized data model shared by the Worker (producer) and the web app (consumer).
// Every upstream (MLB Stats API, NHL API, ESPN) is mapped into these shapes.

export type TeamId = 'phillies' | 'eagles' | 'sixers' | 'flyers' | 'union';
export type League = 'MLB' | 'NFL' | 'NBA' | 'NHL' | 'MLS';

export type GameStatus = 'scheduled' | 'live' | 'final' | 'postponed' | 'canceled';
export type SeasonType = 'preseason' | 'regular' | 'postseason';
/** OTL = overtime/shootout loss (NHL). T = tie/draw (NFL, MLS). */
export type GameResult = 'W' | 'L' | 'T' | 'OTL';

export interface TeamRef {
  id: string;
  name: string;
  abbrev: string;
  logo?: string;
}

export interface Venue {
  name: string;
  city?: string;
  /** True only for the three Philly outdoor venues we fetch weather for. */
  outdoor: boolean;
}

export interface GameWeather {
  /** ISO start of the forecast period used. */
  forecastFor: string;
  tempF: number;
  wind: string;
  windDirection: string;
  precipChance: number | null;
  shortForecast: string;
  icon?: string;
}

export interface Game {
  /** `${team}:${upstreamId}` */
  id: string;
  upstreamId: string;
  team: TeamId;
  league: League;
  /** ISO timestamp (UTC). */
  start: string;
  /** Start time not yet set (NFL flex, MLB doubleheader game 2, etc). */
  timeTBD: boolean;
  status: GameStatus;
  /** Human status: "Final/OT", "Top 5th", "Postponed". */
  statusDetail?: string;
  seasonType: SeasonType;
  home: boolean;
  opponent: TeamRef;
  /** Present once the game has started. */
  score?: { us: number; them: number };
  result?: GameResult;
  venue: Venue;
  broadcasts: string[];
  /** "NLDS Game 2", "Week 4", "Doubleheader G2" */
  note?: string;
  weather?: GameWeather;
}

export interface Standing {
  /** "1st NL East" / "4th Eastern Conference" */
  summary: string;
  record: string;
  rank?: number;
  group?: string;
  points?: number;
  /** Where the team sits relative to the postseason cut. */
  playoff?: {
    status: 'clinched' | 'in' | 'bubble' | 'out' | 'eliminated';
    text: string;
  };
}

export interface Injury {
  status: string;
  detail?: string;
  returnDate?: string;
}

export interface Player {
  id: string;
  name: string;
  number?: string;
  position: string;
  /** Positional group, e.g. "Pitchers", "Forwards", "Offense". */
  group?: string;
  injury?: Injury;
}

/** Detail card for one player: who they are and how their latest season is going. */
export interface PlayerProfile {
  id: string;
  team: TeamId;
  name: string;
  number?: string;
  position: string;
  headshot?: string;
  /** Ordered facts: Age, Height, Weight, Born, College, Draft, Bats/Throws… (only those known). */
  bio: { label: string; value: string }[];
  /** Latest season with stats, e.g. { title: '2026 season', stats: [{ label: 'AVG', value: '.287' }] }. */
  season: { title: string; stats: { label: string; value: string }[] } | null;
  injury?: Injury;
}

export interface BoxScoreLine {
  team: TeamRef;
  home: boolean;
  periods: (number | null)[];
  total: number;
  /** Extra columns keyed by `BoxScore.extraLabels` (H/E for MLB, SOG for NHL). */
  extra?: Record<string, string>;
}

export interface BoxScore {
  gameId: string;
  league: League;
  start: string;
  statusDetail: string;
  periodLabels: string[];
  extraLabels: string[];
  lines: BoxScoreLine[];
  /** e.g. { label: 'W', value: 'Wheeler (15-6)' } or { label: 'Passing', value: 'J. Hurts 245 YDS' } */
  highlights: { label: string; value: string }[];
  scoring: { period: string; time?: string; team: string; text: string }[];
}

export interface ProbablePitcher {
  id: string;
  name: string;
  hand?: string;
  line?: string; // "12-7, 3.21 ERA"
}

export interface ProbablePitchersMatchup {
  gameId: string;
  start: string;
  home: boolean;
  opponent: TeamRef;
  us: ProbablePitcher | null;
  them: ProbablePitcher | null;
}

export interface TableRow {
  rank: number;
  team: TeamRef;
  played: number;
  points: number;
  record: string; // W-L-T
  goalDiff?: number;
  isUs: boolean;
}

export type TeamExtras =
  | { kind: 'probables'; matchups: ProbablePitchersMatchup[] }
  | { kind: 'injuries'; players: Player[] }
  | { kind: 'table'; group: string; playoffSpots: number; rows: TableRow[] }
  | { kind: 'none' };

/** Wraps a section of data with freshness info so the UI can show "stale" hints. */
export interface Sourced<T> {
  data: T | null;
  stale: boolean;
  fetchedAt: string | null;
  error?: string;
}

export interface TeamSummary {
  team: TeamId;
  nextGame: Game | null;
  lastGame: Game | null;
  /** Oldest -> newest, last 5 completed games. */
  form: GameResult[];
  standing: Standing | null;
  stale: boolean;
  error?: string;
}

export interface HomePayload {
  generatedAt: string;
  teams: TeamSummary[];
  /** All Philly games from the start of today through the next 7 days, sorted by start. */
  week: Game[];
  /** Completed Philly games from the previous 7 days, sorted by start. */
  recent: Game[];
}

export interface TeamPayload {
  generatedAt: string;
  team: TeamId;
  schedule: Sourced<Game[]>;
  standing: Sourced<Standing>;
  roster: Sourced<Player[]>;
  lastBox: Sourced<BoxScore>;
  extras: Sourced<TeamExtras>;
}
