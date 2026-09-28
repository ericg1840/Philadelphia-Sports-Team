import { Settings } from 'lucide-react';
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { SettingsSheet } from './components/Settings';
import './index.css';
import { FavoriteProvider } from './lib/favorite';
import { Home } from './pages/Home';
import { TeamPage } from './pages/Team';

function Shell() {
  const [settings, setSettings] = useState(false);
  const { pathname } = useLocation();
  const home = pathname === '/';
  const today = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-4 pt-4">
      {home && (
        <header className="mb-4 flex items-center justify-between">
          <Link to="/" className="leading-tight">
            <div className="text-xl font-black tracking-tight">
              Philly<span className="text-team-accent">.</span>
            </div>
            <div className="text-xs text-zinc-500">{today}</div>
          </Link>
          <button onClick={() => setSettings(true)} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-900" aria-label="Settings">
            <Settings size={20} />
          </button>
        </header>
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/team/:id" element={<TeamPage />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <SettingsSheet open={settings} onClose={() => setSettings(false)} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FavoriteProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </FavoriteProvider>
  </StrictMode>,
);
