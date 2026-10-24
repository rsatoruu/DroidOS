import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Wifi,
  Clock,
  Server,
  AppWindow,
  AlertTriangle,
  CheckCircle2,
  Zap,
  FileCode,
  Container,
  ExternalLink,
  Plus,
  ShoppingBag,
  Play,
  Square,
  RefreshCw,
  BarChart2,
  Terminal,
  Files,
  Settings,
  LayoutDashboard,
  Globe,
  Database,
  Lock,
  Shield,
  Film,
  Music,
  Cloud,
  Code2,
  Home,
  Radio,
  ArrowDown,
  ArrowUp,
  Gauge,
  Trash2,
  MoreVertical,
  Search,
  FileText,
  Sparkles,
  Layers,
} from 'lucide-react';
import { api } from '../lib/api';
import type { SystemMetrics, AppInstance } from '@droidos/shared';
import { CasaInstallModal } from '../components/CasaInstallModal';
import { ContainerLogsModal } from '../components/ContainerLogsModal';

function formatBytes(bytes: number | null): string {
  if (bytes === null) return 'N/A';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// Quick access shortcuts like CasaOS dock
const QUICK_APPS = [
  { label: 'App Store', to: '/store', icon: ShoppingBag, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
  { label: 'Docker', to: '/docker', icon: Container, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  { label: 'Files', to: '/files', icon: Files, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  { label: 'Terminal', to: '/terminal', icon: Terminal, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { label: 'Monitor', to: '/monitoring', icon: BarChart2, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  { label: 'Settings', to: '/settings', icon: Settings, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
];

function getAppIcon(name: string, category?: string, icon?: string): React.ReactNode {
  if (icon && (icon.startsWith('http://') || icon.startsWith('https://'))) {
    return <img src={icon} alt={name} className="w-7 h-7 rounded-lg object-contain" />;
  }
  const n = name.toLowerCase();
  const c = (category || '').toLowerCase();
  if (n.includes('cloud') || n.includes('next')) return <Globe className="w-6 h-6 text-sky-400" />;
  if (n.includes('docker') || c.includes('docker') || n.includes('portainer')) return <Container className="w-6 h-6 text-blue-400" />;
  if (n.includes('git')) return <Code2 className="w-6 h-6 text-orange-400" />;
  if (n.includes('jellyfin') || n.includes('plex') || n.includes('media')) return <Film className="w-6 h-6 text-purple-400" />;
  if (n.includes('qbittorrent') || n.includes('torrent') || n.includes('transmission')) return <ArrowDown className="w-6 h-6 text-teal-400" />;
  if (n.includes('redis') || n.includes('mongo') || n.includes('postgres') || n.includes('mysql')) return <Database className="w-6 h-6 text-indigo-400" />;
  if (n.includes('vault') || n.includes('auth') || n.includes('bitwarden')) return <Lock className="w-6 h-6 text-cyan-400" />;
  if (n.includes('nginx') || n.includes('proxy')) return <Globe className="w-6 h-6 text-emerald-400" />;
  if (n.includes('wireguard') || n.includes('vpn') || n.includes('adguard')) return <Shield className="w-6 h-6 text-emerald-400" />;
  if (n.includes('uptime') || n.includes('monitor')) return <BarChart2 className="w-6 h-6 text-rose-400" />;
  if (n.includes('file') || n.includes('storage')) return <Files className="w-6 h-6 text-amber-400" />;
  if (n.includes('music') || n.includes('navi')) return <Music className="w-6 h-6 text-pink-400" />;
  if (n.includes('home')) return <Home className="w-6 h-6 text-amber-400" />;
  if (n.includes('rss') || n.includes('fresh')) return <Radio className="w-6 h-6 text-orange-400" />;
  return <AppWindow className="w-6 h-6 text-brand-400" />;
}

interface AppCardProps {
  app: AppInstance;
  onAction: (id: string, action: 'start' | 'stop' | 'restart') => void;
  onDelete: (id: string, name: string) => void;
  onOpenLogs: (name: string, title: string) => void;
  onReconfigure: (app: AppInstance) => void;
}

function CasaAppCard({ app, onAction, onDelete, onOpenLogs, onReconfigure }: AppCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [actioning, setActioning] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const isRunning = app.status === 'running';
  const targetId = app.definitionId || app.definition?.id || app.id;
  const webUrl = app.port ? `http://${window.location.hostname}:${app.port}` : null;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    setActioning(true);
    setMenuOpen(false);
    await onAction(targetId, action);
    setActioning(false);
  };

  const handleOpenTerminal = () => {
    setMenuOpen(false);
    navigate(`/terminal?container=${encodeURIComponent(app.definition.name)}`);
  };

  return (
    <div
      className={`group relative card p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-slate-500/50 bg-gradient-to-b from-surface-800/90 to-surface-900/90 ${
        app.status === 'error' ? 'border-red-800/40' : 'border-surface-700/60'
      }`}
    >
      {/* Top row: App icon, Title, Status & 3-dots */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          {/* Clickable Icon to launch Web UI */}
          <div
            onClick={() => webUrl && isRunning && window.open(webUrl, '_blank')}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105 shadow-inner ${
              webUrl && isRunning ? 'cursor-pointer hover:brightness-110' : ''
            } ${
              isRunning
                ? 'bg-slate-800/90 border-slate-700/80'
                : app.status === 'error'
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-slate-900/80 border-slate-800/80 opacity-75'
            }`}
          >
            {getAppIcon(app.definition.name, app.definition.category, app.definition.icon)}
          </div>

          {/* 3-dots menu button */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-700/60 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-8 z-30 w-44 rounded-xl bg-surface-800 border border-surface-600/80 shadow-2xl py-1 text-xs animate-in fade-in-50 zoom-in-95">
                {webUrl && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      window.open(webUrl, '_blank');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-slate-200 hover:bg-surface-700 hover:text-white text-left transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-brand-400" />
                    Open Web UI
                  </button>
                )}

                {isRunning ? (
                  <button
                    onClick={() => handleAction('stop')}
                    disabled={actioning}
                    className="w-full flex items-center gap-2 px-3 py-2 text-slate-200 hover:bg-surface-700 hover:text-red-400 text-left transition-colors"
                  >
                    <Square className="w-3.5 h-3.5 text-red-400" />
                    Stop Container
                  </button>
                ) : (
                  <button
                    onClick={() => handleAction('start')}
                    disabled={actioning}
                    className="w-full flex items-center gap-2 px-3 py-2 text-slate-200 hover:bg-surface-700 hover:text-emerald-400 text-left transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    Start Container
                  </button>
                )}

                <button
                  onClick={() => handleAction('restart')}
                  disabled={actioning}
                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-200 hover:bg-surface-700 hover:text-brand-300 text-left transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-brand-400" />
                  Restart
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenLogs(app.definition.name, app.definition.name);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-200 hover:bg-surface-700 hover:text-white text-left transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  Container Logs
                </button>

                <button
                  onClick={handleOpenTerminal}
                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-200 hover:bg-surface-700 hover:text-white text-left transition-colors"
                >
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  Exec Terminal
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onReconfigure(app);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-200 hover:bg-surface-700 hover:text-white text-left transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  Settings
                </button>

                <div className="border-t border-surface-700 my-1" />

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(targetId, app.definition.name);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 text-left transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Uninstall
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Title and tags */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h3
              onClick={() => webUrl && isRunning && window.open(webUrl, '_blank')}
              className={`text-sm font-bold text-white truncate hover:text-brand-300 transition-colors ${
                webUrl && isRunning ? 'cursor-pointer' : ''
              }`}
              title={app.definition.name}
            >
              {app.definition.name}
            </h3>
          </div>

          <p className="text-[11px] text-slate-400 truncate font-mono">
            {app.definition.description?.replace(/^Docker:\s*/, '') || app.definition.category}
          </p>
        </div>
      </div>

      {/* Bottom row: Status badge & Web Link */}
      <div className="mt-4 pt-3 border-t border-surface-700/50 flex items-center justify-between">
        {/* Status indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isRunning
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                : app.status === 'error'
                ? 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]'
                : 'bg-slate-500'
            }`}
          />
          <span className="text-[11px] font-medium capitalize text-slate-300">
            {isRunning ? 'Running' : app.status}
          </span>
        </div>

        {/* Web Port Button */}
        {webUrl ? (
          <a
            href={webUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
              isRunning
                ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30 hover:bg-brand-500/25'
                : 'bg-surface-800 text-slate-500 border border-surface-700 cursor-not-allowed'
            }`}
          >
            :{app.port}
            {isRunning && <ExternalLink className="w-3 h-3 ml-0.5" />}
          </a>
        ) : (
          <span className="text-[11px] text-slate-600 font-mono">No Port</span>
        )}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [apps, setApps] = useState<AppInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingDocker, setSyncingDocker] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Modals
  const [showCasaModal, setShowCasaModal] = useState(false);
  const [casaInitialData, setCasaInitialData] = useState<any>(null);
  const [logsModalTarget, setLogsModalTarget] = useState<{ name: string; title: string } | null>(null);
  const [deletingApp, setDeletingApp] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);

  // Live Clock & Greeting
  const [currentTime, setCurrentTime] = useState(new Date());

  // Search filter
  const [appSearch, setAppSearch] = useState('');

  const plusMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) {
        setPlusMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      const [metricsRes, appsRes] = await Promise.all([
        api.get('/monitoring/metrics'),
        api.get('/apps'),
      ]);
      setMetrics(metricsRes.data.data);
      setApps(appsRes.data.data ?? []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSyncDocker = async () => {
    setSyncingDocker(true);
    setSyncMessage(null);
    try {
      const res = await api.post('/docker/sync');
      const data = res.data?.data;
      setSyncMessage(`✓ Synced ${data?.total ?? 0} container(s)! (${data?.added ?? 0} added, ${data?.updated ?? 0} updated)`);
      await fetchData();
      setTimeout(() => setSyncMessage(null), 5000);
    } catch (err: any) {
      setSyncMessage('Failed to sync Docker containers.');
      setTimeout(() => setSyncMessage(null), 5000);
    } finally {
      setSyncingDocker(false);
    }
  };

  const handleAppAction = async (id: string, action: 'start' | 'stop' | 'restart') => {
    try {
      await api.post(`/apps/${id}/${action}`);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || `Failed to ${action} app`);
    }
  };

  const confirmAppDelete = async () => {
    if (!deletingApp) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/apps/${deletingApp.id}`);
      setDeletingApp(null);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete application');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleReconfigure = (app: AppInstance) => {
    setCasaInitialData({
      name: app.definition.name,
      image: app.definition.description?.replace(/^Docker:\s*/, '') || '',
      port: app.port,
      containerPort: app.port,
      icon: app.definition.icon,
      category: app.definition.category,
      env: app.definition.envVars,
    });
    setShowCasaModal(true);
  };

  const runningApps = apps.filter((a) => a.status === 'running');
  const errorApps = apps.filter((a) => a.status === 'error');

  const memUsed = metrics?.memory.used;
  const memTotal = metrics?.memory.total;
  const memPercent = memUsed && memTotal ? Math.round((memUsed / memTotal) * 100) : 0;

  const storage = metrics?.storage?.[0];
  const storagePercent =
    storage?.used && storage?.total
      ? Math.round((storage.used / storage.total) * 100)
      : 0;

  const rxBytes = metrics?.network?.rxBytes || 0;
  const txBytes = metrics?.network?.txBytes || 0;
  const totalQuota = rxBytes + txBytes;

  const getGreeting = () => {
    const hours = currentTime.getHours();
    if (hours < 12) return 'Selamat Pagi / Good Morning';
    if (hours < 17) return 'Selamat Siang / Good Afternoon';
    return 'Selamat Malam / Good Evening';
  };

  const filteredApps = apps.filter((app) => {
    if (!appSearch) return true;
    const q = appSearch.toLowerCase();
    return (
      app.definition.name.toLowerCase().includes(q) ||
      (app.definition.description || '').toLowerCase().includes(q) ||
      (app.definition.category || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-7 animate-fade-in pb-12">
      {/* CasaOS Top Banner with Live Clock & System Status */}
      <div className="relative rounded-3xl p-6 md:p-8 bg-gradient-to-r from-surface-900 via-surface-850 to-surface-900 border border-surface-700/60 shadow-2xl overflow-hidden">
        {/* Glow effects */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Greeting & Time */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-400" /> CasaOS Home Server
              </span>
              <span className="text-xs text-slate-400">· {metrics?.device.hostname ?? 'DroidOS'}</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {getGreeting()}
            </h1>

            <div className="flex items-center gap-4 mt-2 text-slate-300">
              <div className="text-xl md:text-2xl font-mono font-bold text-brand-300">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div className="text-xs text-slate-400 border-l border-slate-700 pl-4">
                {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Mini System Resource Gauges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-950/60 p-4 rounded-2xl border border-surface-700/50 backdrop-blur-md">
            {/* CPU */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5 text-brand-400" /> CPU</span>
                <span className="font-bold text-white font-mono">{metrics?.cpu.available ? `${metrics.cpu.usage ?? 0}%` : 'N/A'}</span>
              </div>
              <div className="progress-bar w-24">
                <div
                  className="progress-fill bg-brand-500"
                  style={{ width: `${Math.min(100, Math.max(0, metrics?.cpu.usage ?? 0))}%` }}
                />
              </div>
            </div>

            {/* RAM */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="flex items-center gap-1"><MemoryStick className="w-3.5 h-3.5 text-violet-400" /> RAM</span>
                <span className="font-bold text-white font-mono">{memPercent}%</span>
              </div>
              <div className="progress-bar w-24">
                <div
                  className="progress-fill bg-violet-500"
                  style={{ width: `${Math.min(100, Math.max(0, memPercent))}%` }}
                />
              </div>
            </div>

            {/* Storage */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="flex items-center gap-1"><HardDrive className="w-3.5 h-3.5 text-cyan-400" /> Disk</span>
                <span className="font-bold text-white font-mono">{storagePercent}%</span>
              </div>
              <div className="progress-bar w-24">
                <div
                  className="progress-fill bg-cyan-500"
                  style={{ width: `${Math.min(100, Math.max(0, storagePercent))}%` }}
                />
              </div>
            </div>

            {/* Network Speed */}
            <div className="flex flex-col justify-center">
              <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-0.5">
                <Wifi className="w-3 h-3 text-emerald-400" /> Traffic
              </div>
              <div className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                <ArrowDown className="w-3 h-3" />
                {metrics?.network?.available && metrics?.network?.rxRate !== null ? formatBytes(metrics.network.rxRate) : '0 B'}/s
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Dock */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {QUICK_APPS.map((qa) => (
          <Link
            key={qa.to}
            to={qa.to}
            className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border transition-all duration-200 hover:scale-105 ${qa.bg} hover:border-slate-500 shadow-sm`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${qa.color}`}>
              <qa.icon className="w-5 h-5" />
            </div>
            <span className="text-xs text-slate-200 font-semibold">{qa.label}</span>
          </Link>
        ))}
      </div>

      {/* Sync Banner notification */}
      {syncMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center justify-between animate-in fade-in">
          <span>{syncMessage}</span>
          <button onClick={() => setSyncMessage(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* CASAOS APPS SECTION */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Container className="w-5 h-5 text-brand-400" />
              Apps
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-surface-800 text-slate-300 border border-surface-700">
              {apps.length}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search apps..."
                value={appSearch}
                onChange={(e) => setAppSearch(e.target.value)}
                className="input py-1.5 pl-8 pr-3 text-xs w-36 sm:w-48 bg-surface-800/80 border-surface-700 rounded-xl"
              />
            </div>

            {/* Sync Docker Button */}
            <button
              onClick={handleSyncDocker}
              disabled={syncingDocker}
              className="btn-secondary text-xs py-2 px-3 rounded-xl flex items-center gap-1.5"
              title="Scan and import all running Docker containers into Dashboard"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${syncingDocker ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync Docker</span>
            </button>

            {/* CasaOS '+' Button */}
            <div className="relative" ref={plusMenuRef}>
              <button
                onClick={() => setPlusMenuOpen(!plusMenuOpen)}
                className="btn-primary text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-brand-500/25"
              >
                <Plus className="w-4 h-4" />
                <span className="font-semibold">Install</span>
              </button>

              {plusMenuOpen && (
                <div className="absolute right-0 top-11 z-40 w-60 rounded-2xl bg-surface-850 border border-surface-700 shadow-2xl p-2 animate-in fade-in-50 zoom-in-95 space-y-1">
                  <button
                    onClick={() => {
                      setPlusMenuOpen(false);
                      setCasaInitialData(null);
                      setShowCasaModal(true);
                    }}
                    className="w-full flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-surface-700/80 text-left transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                      <Container className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-brand-300">
                        Install a customized app
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Deploy Docker image with ports, volumes, env
                      </div>
                    </div>
                  </button>

                  <Link
                    to="/store"
                    onClick={() => setPlusMenuOpen(false)}
                    className="w-full flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-surface-700/80 text-left transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-brand-300">
                        CasaOS App Store
                      </div>
                      <div className="text-[11px] text-slate-400">
                        1-click install Plex, Nextcloud, AdGuard, etc.
                      </div>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Empty state or Grid */}
        {apps.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center border-dashed border-slate-700 bg-surface-900/40 rounded-3xl">
            <div className="w-16 h-16 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center mb-4 text-brand-400">
              <Container className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">No Docker Containers Yet</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed">
              Install preconfigured self-hosted containers from the CasaOS App Store, or deploy a customized Docker image directly!
            </p>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => {
                  setCasaInitialData(null);
                  setShowCasaModal(true);
                }}
                className="btn-primary text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-lg shadow-brand-500/20"
              >
                <Container className="w-4 h-4" /> Install Customized App
              </button>
              <Link
                to="/store"
                className="btn-secondary text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5"
              >
                <ShoppingBag className="w-4 h-4" /> Open App Store
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredApps.map((app) => (
              <CasaAppCard
                key={app.id}
                app={app}
                onAction={handleAppAction}
                onDelete={(id, name) => setDeletingApp({ id, name })}
                onOpenLogs={(name, title) => setLogsModalTarget({ name, title })}
                onReconfigure={handleReconfigure}
              />
            ))}

            {/* Quick Add Card (CasaOS Style) */}
            <div
              onClick={() => {
                setCasaInitialData(null);
                setShowCasaModal(true);
              }}
              className="card border-dashed border-slate-700/80 hover:border-brand-500/60 flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all hover:scale-[1.02] bg-surface-900/30 min-h-[170px]"
            >
              <div className="w-12 h-12 rounded-2xl bg-surface-800 border border-surface-700 flex items-center justify-center text-slate-400 mb-2 group-hover:text-brand-300">
                <Plus className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-200">Add Container</span>
              <span className="text-[11px] text-slate-500 mt-0.5">Install customized app</span>
            </div>
          </div>
        )}
      </div>

      {/* Network Traffic Meter */}
      <div className="card p-5 border-surface-600/60 bg-gradient-to-br from-[#0e131f] to-surface-900 shadow-xl rounded-3xl">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Network & Bandwidth Meter
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                </span>
              </h2>
              <p className="text-xs text-slate-400">Real-time container traffic & transfer quota</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono bg-surface-800/80 px-3 py-1.5 rounded-lg border border-surface-700">
            <Gauge className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-slate-400">Total Transferred:</span>
            <span className="text-white font-bold">{formatBytes(totalQuota)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Download Speed */}
          <div className="p-3.5 rounded-xl bg-surface-800/60 border border-emerald-500/30 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <ArrowDown className="w-3.5 h-3.5" /> Download Speed
              </span>
              <span className="text-[10px] text-slate-500 font-mono">RX</span>
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-mono tracking-tight my-1">
              {metrics?.network?.available && metrics?.network?.rxRate !== null
                ? `${formatBytes(metrics.network.rxRate)}/s`
                : '0 B/s'}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-700/40 pt-2 mt-1">
              <span>Total Received</span>
              <span className="text-slate-200 font-mono font-medium">{formatBytes(rxBytes || null)}</span>
            </div>
          </div>

          {/* Upload Speed */}
          <div className="p-3.5 rounded-xl bg-surface-800/60 border border-cyan-500/30 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                <ArrowUp className="w-3.5 h-3.5" /> Upload Speed
              </span>
              <span className="text-[10px] text-slate-500 font-mono">TX</span>
            </div>
            <div className="text-2xl font-bold text-cyan-400 font-mono tracking-tight my-1">
              {metrics?.network?.available && metrics?.network?.txRate !== null
                ? `${formatBytes(metrics.network.txRate)}/s`
                : '0 B/s'}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-700/40 pt-2 mt-1">
              <span>Total Sent</span>
              <span className="text-slate-200 font-mono font-medium">{formatBytes(txBytes || null)}</span>
            </div>
          </div>

          {/* Total Quota */}
          <div className="p-3.5 rounded-xl bg-surface-800/60 border border-violet-500/30 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1.5 text-violet-400 font-semibold">
                <Gauge className="w-3.5 h-3.5" /> Total Kuota
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Traffic</span>
            </div>
            <div className="text-2xl font-bold text-violet-300 font-mono tracking-tight my-1">
              {formatBytes(totalQuota)}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-700/40 pt-2 mt-1">
              <span>RX / TX Share</span>
              <span className="text-slate-200 font-mono font-medium">
                {totalQuota > 0
                  ? `${Math.round((rxBytes / totalQuota) * 100)}% / ${Math.round((txBytes / totalQuota) * 100)}%`
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CasaOS Install Modal */}
      {showCasaModal && (
        <CasaInstallModal
          onClose={() => setShowCasaModal(false)}
          onSuccess={() => {
            fetchData();
          }}
          initialData={casaInitialData}
        />
      )}

      {/* Container Logs Modal */}
      {logsModalTarget && (
        <ContainerLogsModal
          containerName={logsModalTarget.name}
          appTitle={logsModalTarget.title}
          onClose={() => setLogsModalTarget(null)}
        />
      )}

      {/* Delete / Uninstall Confirmation Modal */}
      {deletingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-surface-800 border border-red-500/30 rounded-2xl shadow-2xl p-6 overflow-hidden space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Uninstall Container</h3>
                <p className="text-xs text-slate-400">Permanently stop and remove container</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Are you sure you want to uninstall <strong className="text-white">"{deletingApp.name}"</strong>? The container and its runtime instances will be removed.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-surface-700">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setDeletingApp(null)}
                className="btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={confirmAppDelete}
                className="btn-primary text-xs py-2 px-4 bg-red-600 hover:bg-red-500 text-white font-semibold shadow-lg shadow-red-500/20 flex items-center gap-1.5"
              >
                {deleteLoading ? (
                  <>Removing...</>
                ) : (
                  <><Trash2 className="w-3.5 h-3.5" /> Confirm Uninstall</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
