import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { Shell } from './components/Shell';
import './index.css';
import { FavoriteProvider } from './lib/favorite';
import { Home } from './pages/Home';
import { SchedulePage, StandingsPage, TeamsPage, WeatherPage } from './pages/Overview';
import { TeamPage } from './pages/Team';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FavoriteProvider>
      <HashRouter>
        <Shell>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/standings" element={<StandingsPage />} />
            <Route path="/weather" element={<WeatherPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/team/:id" element={<TeamPage />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </Shell>
      </HashRouter>
    </FavoriteProvider>
  </StrictMode>,
);
