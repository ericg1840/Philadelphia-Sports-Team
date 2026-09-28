import { CalendarDays, CloudSun, LayoutGrid, Settings, Shield, Star, Trophy } from 'lucide-react';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { TEAM_IDS, TEAMS } from '../../../shared/teams';
import { useFavorite } from '../lib/favorite';
import { cx } from './bits';
import { SettingsSheet } from './Settings';

const todayLabel = () =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

function Wordmark({ size = 'lg' }: { size?: 'lg' | 'md' }) {
  return (
    <div className="leading-tight">
      <div className={cx('font-display font-black tracking-tight', size === 'lg' ? 'text-[30px]' : 'text-[26px]')}>
        Philly<span className="text-team">.</span>
      </div>
      <div className="text-[13px] text-muted">{todayLabel()}</div>
    </div>
  );
}

const NAV = [
  { to: '/', label: 'Dashboard', short: 'Home', icon: LayoutGrid, end: true },
  { to: '/schedule', label: 'Schedule', short: 'Schedule', icon: CalendarDays },
  { to: '/standings', label: 'Standings', short: 'Standings', icon: Trophy },
  { to: '/weather', label: 'Weather', short: 'Weather', icon: CloudSun },
];

const navItem = ({ isActive }: { isActive: boolean }) =>
  cx(
    'flex h-11 items-center gap-3 rounded-[10px] px-3 text-[15px] transition',
    isActive ? 'bg-team-soft font-semibold text-team' : 'font-medium text-ink-2 hover:bg-line-2',
  );

function Sidebar({ onSettings }: { onSettings: () => void }) {
  const { favorite } = useFavorite();
  return (
    <nav aria-label="Main" className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col gap-7 overflow-y-auto border-r border-line bg-surface px-5 py-8 lg:flex">
      <div className="px-3">
        <Wordmark />
      </div>
      <div className="flex flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={navItem}>
            <Icon size={20} aria-hidden />
            {label}
          </NavLink>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <div className="px-3 pb-1.5 text-xs font-bold uppercase tracking-[0.08em] text-muted">Teams</div>
        {TEAM_IDS.map((t) => (
          <NavLink key={t} to={`/team/${t}`} className={navItem}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: TEAMS[t].colors.dot }} />
            <span className="flex-1">{TEAMS[t].shortName}</span>
            {t === favorite && <Star size={15} aria-label="Favorite" style={{ color: TEAMS[t].colors.accent, fill: TEAMS[t].colors.accent }} />}
          </NavLink>
        ))}
      </div>
      <div className="flex-1" />
      <button type="button" onClick={onSettings} className={navItem({ isActive: false })}>
        <Settings size={20} aria-hidden />
        Favorite team
      </button>
    </nav>
  );
}

function MobileHeader({ onSettings }: { onSettings: () => void }) {
  const { pathname } = useLocation();
  if (pathname.startsWith('/team/')) return null;
  return (
    <header className="flex items-center justify-between px-4 pb-1 pt-5 lg:hidden">
      <Wordmark size="md" />
      <button
        type="button"
        onClick={onSettings}
        aria-label="Choose favorite team"
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-team"
      >
        <Star size={20} className="fill-current" aria-hidden />
      </button>
    </header>
  );
}

function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {[...NAV, { to: '/teams', label: 'Teams', short: 'Teams', icon: Shield, end: false }].map(({ to, short, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cx('flex h-[64px] flex-col items-center justify-center gap-1 text-[11px]', isActive ? 'font-bold text-team' : 'font-medium text-muted')
          }
        >
          <Icon size={22} aria-hidden />
          {short}
        </NavLink>
      ))}
    </nav>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(false);
  return (
    <OpenSettings.Provider value={() => setSettings(true)}>
    <div className="flex min-h-dvh">
      <Sidebar onSettings={() => setSettings(true)} />
      <div className="min-w-0 flex-1 pb-[calc(80px+env(safe-area-inset-bottom))] lg:pb-0">
        <MobileHeader onSettings={() => setSettings(true)} />
        {children}
      </div>
      <BottomNav />
      <SettingsSheet open={settings} onClose={() => setSettings(false)} />
    </div>
    </OpenSettings.Provider>
  );
}

const OpenSettings = createContext<() => void>(() => {});
/** Lets pages open the favorite-team sheet (the dashboard's top-bar button). */
export const useOpenSettings = () => useContext(OpenSettings);
