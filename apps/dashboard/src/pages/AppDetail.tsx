import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Play, Square, RotateCcw, RefreshCw, Download, Trash2, Loader2, Terminal } from 'lucide-react';
import { api } from '../lib/api';
import type { AppInstance } from '@droidos/shared';
import { useAuthStore } from '../store/auth';

export function AppDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [app, setApp] = useState<AppInstance | null>(null);
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { token } = useAuthStore();
  const logsRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchApp = async () => {
    try {
      const res = await api.get(`/apps/${id}`);
      setApp(res.data.data);
    } catch {}
  };

  const fetchLogs = async () => {
    try {
      const res = await api.get(`/apps/${id}/logs?lines=500`);
      setLogs(res.data.data?.log ?? '');
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchApp();
    fetchLogs();
    const iv = setInterval(fetchApp, 5000);

    // WebSocket log stream
    if (token) {
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/apps/${id}/logs?token=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onmessage = (ev) => {
        const data = JSON.parse(ev.data);
        if (data.type === 'app:log') {
          setLogs((prev) => prev + data.data.message + '\n');
          // Auto-scroll
          setTimeout(() => {
            if (logsRef.current) {
              logsRef.current.scrollTop = logsRef.current.scrollHeight;
            }
          }, 50);
        }
      };
      ws.onerror = () => {};
    }

    return () => {
      clearInterval(iv);
      wsRef.current?.close();
    };
  }, [id, token]);

  const action = async (act: 'start' | 'stop' | 'restart') => {
    setActionLoading(act);
    try {
      await api.post(`/apps/${id}/${act}`);
      await fetchApp();
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-7 w-48 rounded" />
        <div className="card h-40 skeleton" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p>Application not found.</p>
        <Link to="/apps" className="text-brand-400 text-sm mt-2 inline-block">← Back to Apps</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/apps" className="text-slate-400 hover:text-slate-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-white">{app.definition.name}</h1>
            <span className={
              app.status === 'running' ? 'badge-running' :
              app.status === 'error' ? 'badge-error' : 'badge-stopped'
            }>
              {app.status === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              {app.status}
            </span>
          </div>
          <p className="text-sm text-slate-400">{app.definition.description || 'No description'}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {app.status === 'running' ? (
            <>
              <button className="btn-secondary" onClick={() => action('restart')} disabled={!!actionLoading}>
                {actionLoading === 'restart' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Restart
              </button>
              <button className="btn-danger" onClick={() => action('stop')} disabled={!!actionLoading}>
                {actionLoading === 'stop' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                Stop
              </button>
            </>
          ) : (
            <button className="btn-primary" onClick={() => action('start')} disabled={!!actionLoading}>
              {actionLoading === 'start' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Start
            </button>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Runtime', value: app.definition.runtime },
          { label: 'PID', value: app.pid ?? 'N/A' },
          { label: 'Port', value: app.port ?? 'N/A' },
          { label: 'Restarts', value: app.restartCount },
        ].map(({ label, value }) => (
          <div key={label} className="card">
            <div className="text-xs text-slate-500 mb-1">{label}</div>
            <div className="font-mono text-sm text-slate-200">{String(value)}</div>
          </div>
        ))}
      </div>

      {/* Working directory */}
      <div className="card">
        <div className="text-xs text-slate-500 mb-1">Working Directory</div>
        <div className="font-mono text-xs text-slate-300 break-all">{app.definition.workingDir}</div>
        <div className="text-xs text-slate-500 mt-2 mb-1">Start Command</div>
        <div className="font-mono text-xs text-slate-300">{app.definition.startCommand}</div>
      </div>

      {/* Logs */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title flex items-center gap-2">
            <Terminal className="w-4 h-4 text-brand-400" />
            Logs
          </h2>
          <div className="flex items-center gap-2">
            <button className="btn-ghost text-xs py-1 px-2" onClick={fetchLogs}>
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div
          ref={logsRef}
          className="bg-surface-900 rounded-lg p-3 h-72 overflow-y-auto font-mono text-xs text-emerald-300 leading-relaxed"
        >
          {logs || <span className="text-slate-600">No logs available. Start the application to see output.</span>}
        </div>
      </div>
    </div>
  );
}
