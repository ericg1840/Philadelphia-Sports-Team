import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { isTeamId, TEAMS } from '../../../shared/teams';
import type { TeamId } from '../../../shared/types';

const STORAGE_KEY = 'favoriteTeam';
const DEFAULT: TeamId = 'phillies';

interface FavoriteCtx {
  favorite: TeamId;
  setFavorite: (t: TeamId) => void;
}

const Ctx = createContext<FavoriteCtx>({ favorite: DEFAULT, setFavorite: () => {} });

function read(): TeamId {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isTeamId(v) ? v : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

/** Sets the --team-* CSS variables that Tailwind's `team` colors resolve to. */
export function applyTeamTheme(el: HTMLElement, team: TeamId) {
  const c = TEAMS[team].colors;
  el.style.setProperty('--team-primary', c.primary);
  el.style.setProperty('--team-secondary', c.secondary);
  el.style.setProperty('--team-accent', c.accent);
}

export function FavoriteProvider({ children }: { children: ReactNode }) {
  const [favorite, setFav] = useState<TeamId>(read);

  useEffect(() => {
    applyTeamTheme(document.documentElement, favorite);
  }, [favorite]);

  const setFavorite = (t: TeamId) => {
    setFav(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // ignore
    }
  };

  return <Ctx.Provider value={{ favorite, setFavorite }}>{children}</Ctx.Provider>;
}

export const useFavorite = () => useContext(Ctx);

/** Inline style that scopes the team theme to a subtree (e.g. a team page). */
export function teamStyle(team: TeamId): React.CSSProperties {
  const c = TEAMS[team].colors;
  return {
    '--team-primary': c.primary,
    '--team-secondary': c.secondary,
    '--team-accent': c.accent,
  } as React.CSSProperties;
}
