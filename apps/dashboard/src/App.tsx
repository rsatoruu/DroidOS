import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import { Layout } from './components/Layout';
import { SetupPage } from './pages/Setup';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { AppsPage } from './pages/Apps';
import { AppDetailPage } from './pages/AppDetail';
import { FilesPage } from './pages/Files';
import { DockerPage } from './pages/Docker';
import { MonitoringPage } from './pages/Monitoring';
import { SettingsPage } from './pages/Settings';
import { AppStorePage } from './pages/AppStore';
import { TerminalPage } from './pages/Terminal';
import { LogsPage } from './pages/Logs';
import { useState, useEffect } from 'react';
import { api } from './lib/api';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const [checkingSetup, setCheckingSetup] = useState(true);
  const { setSetupRequired, setupRequired } = useAuthStore();

  useEffect(() => {
    // Check if setup is required
    api.get('/auth/status')
      .then((res) => {
        setSetupRequired(res.data?.data?.setupRequired === true);
      })
      .catch(() => {})
      .finally(() => {
        setCheckingSetup(false);
      });
  }, []);

  if (checkingSetup) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-12 h-12 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center animate-pulse">
            <span className="text-2xl">🤖</span>
          </div>
          <span className="text-xs font-medium tracking-wide">Starting DroidOS...</span>
        </div>
      </div>
    );
  }

  if (setupRequired) {
    return <SetupPage />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="store" element={<AppStorePage />} />
        <Route path="apps" element={<AppsPage />} />
        <Route path="apps/:id" element={<AppDetailPage />} />
        <Route path="files" element={<FilesPage />} />
        <Route path="terminal" element={<TerminalPage />} />
        <Route path="logs" element={<LogsPage />} />
        <Route path="docker" element={<DockerPage />} />
        <Route path="monitoring" element={<MonitoringPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
