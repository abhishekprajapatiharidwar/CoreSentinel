import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import Processes from './pages/Processes';
import PortsNetwork from './pages/PortsNetwork';
import HardwareMonitor from './pages/HardwareMonitor';
import ResourceLimiter from './pages/ResourceLimiter';
import Alerts from './pages/Alerts';
import Services from './pages/Services';
import StartupApps from './pages/StartupApps';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import { useSystemData } from './hooks/useSystemData';
import { useAppStore } from './store/appStore';
import Notification from './components/UI/Notification';
import ContextMenu from './components/UI/ContextMenu';

function AppContent() {
  useSystemData();
  const theme = useAppStore(s => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }, [theme]);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/processes" element={<Processes />} />
        <Route path="/ports" element={<PortsNetwork />} />
        <Route path="/hardware" element={<HardwareMonitor />} />
        <Route path="/limiter" element={<ResourceLimiter />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/services" element={<Services />} />
        <Route path="/startup" element={<StartupApps />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      <Notification />
      <ContextMenu />
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
