import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Play, Square, RotateCcw, Trash2, Terminal,
  AppWindow, Loader2, Search, ExternalLink,
} from 'lucide-react';
import { api } from '../lib/api';
import type { AppInstance } from '@droidos/shared';
import { CreateAppModal } from '../components/CreateAppModal';

export function AppsPage() {
  const [apps, setApps] = useState<AppInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchApps = async () => {
    try {
      const res = await api.get('/apps');
      setApps(res.data.data ?? []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchApps();
    const iv = setInterval(fetchApps, 5000);
    return () => clearInterval(iv);
  }, []);

  const action = async (id: string, act: 'start' | 'stop' | 'restart' | 'delete') => {
    setActionLoading(`${id}-${act}`);
    try {
      if (act === 'delete') {
        if (!confirm('Delete this application? This cannot be undone.')) return;
        await api.delete(`/apps/${id}`);
      } else {
        await api.post(`/apps/${id}/${act}`);
      }
      await fetchApps();
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = apps.filter(
    (a) =>
      a.definition.name.toLowerCase().includes(search.toLowerCase()) ||
      a.definition.category.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Applications</h1>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> Add App
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          className="input pl-9"
          placeholder="Search applications..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card h-24 skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <AppWindow className="w-12 h-12 mb-3 opacity-20" />
          <p className="font-medium">No applications</p>
          <p className="text-sm mt-1">Create your first app to get started</p>
          <button className="btn-primary mt-4" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> Add App
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((app) => (
            <div key={app.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
              {/* App icon/initial */}
              <div className="w-11 h-11 rounded-xl bg-brand-600/20 border border-brand-500/20 flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-brand-300">
                  {app.definition.name[0]?.toUpperCase()}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    to={`/apps/${app.id}`}
                    className="font-semibold text-slate-100 hover:text-brand-300 transition-colors"
                  >
                    {app.definition.name}
                  </Link>
                  <span className={
                    app.status === 'running' ? 'badge-running' :
                    app.status === 'error' ? 'badge-error' :
                    app.status === 'installing' ? 'badge-installing' : 'badge-stopped'
                  }>
                    {app.status === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                    {app.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5 truncate">
                  {app.definition.category} · {app.definition.runtime}
                  {app.pid && ` · PID ${app.pid}`}
                  {app.port && ` · :${app.port}`}
                </div>
                {app.definition.description && (
                  <div className="text-xs text-slate-400 mt-1 truncate">{app.definition.description}</div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {app.port && app.status === 'running' && (
                  <a
                    href={`http://localhost:${app.port}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost py-1.5 px-2 text-xs"
                    title="Open app"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <Link to={`/apps/${app.id}`} className="btn-ghost py-1.5 px-2 text-xs" title="View logs">
                  <Terminal className="w-3.5 h-3.5" />
                </Link>
                {app.status === 'running' ? (
                  <>
                    <button
                      className="btn-ghost py-1.5 px-2 text-xs"
                      onClick={() => action(app.id, 'restart')}
                      disabled={!!actionLoading}
                      title="Restart"
                    >
                      {actionLoading === `${app.id}-restart` ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      className="btn-danger py-1.5 px-2 text-xs"
                      onClick={() => action(app.id, 'stop')}
                      disabled={!!actionLoading}
                      title="Stop"
                    >
                      {actionLoading === `${app.id}-stop` ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    className="btn-primary py-1.5 px-2 text-xs"
                    onClick={() => action(app.id, 'start')}
                    disabled={!!actionLoading}
                    title="Start"
                  >
                    {actionLoading === `${app.id}-start` ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
                <button
                  className="btn-ghost py-1.5 px-2 text-xs text-red-400 hover:text-red-300"
                  onClick={() => action(app.id, 'delete')}
                  disabled={!!actionLoading}
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateAppModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchApps(); }}
        />
      )}
    </div>
  );
}
