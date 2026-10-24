import { useEffect, useState } from 'react';
import {
  Container,
  Plus,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  RefreshCw,
  AlertCircle,
  Play,
  Square,
  RotateCcw,
  Trash2,
  FileText,
  Layers,
  Zap,
  Terminal,
} from 'lucide-react';
import { api } from '../lib/api';
import type { DockerContainer } from '@droidos/shared';
import { CasaInstallModal } from '../components/CasaInstallModal';

interface LocalDockerStatus {
  cliAvailable: boolean;
  daemonAvailable: boolean;
  version?: string;
  error?: string;
}

interface DockerHost {
  id: string;
  name: string;
  type: string;
  host: string;
  port?: number;
  createdAt: string;
}

export function DockerPage() {
  const [localStatus, setLocalStatus] = useState<LocalDockerStatus | null>(null);
  const [hosts, setHosts] = useState<DockerHost[]>([]);
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddHost, setShowAddHost] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const [activeLogs, setActiveLogs] = useState<{ id: string; logs: string } | null>(null);

  // Form states
  const [form, setForm] = useState({ name: '', type: 'tcp', host: '', port: '2376' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const [runForm, setRunForm] = useState({ name: '', image: '', port: '' });
  const [runLoading, setRunLoading] = useState(false);
  const [runError, setRunError] = useState('');

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [showInstallModal, setShowInstallModal] = useState(false);
  const [installLogs, setInstallLogs] = useState<string[]>([]);
  const [installStatus, setInstallStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [installError, setInstallError] = useState('');

  const startAutoInstall = async () => {
    setShowInstallModal(true);
    setInstallStatus('running');
    setInstallError('');
    setInstallLogs(['[DroidOS] Initializing Docker automated installer...']);

    try {
      await api.post('/docker/install');
      const interval = setInterval(async () => {
        try {
          const res = await api.get('/docker/install/status');
          const data = res.data?.data;
          if (data) {
            setInstallLogs(data.logs || []);
            setInstallStatus(data.status);
            if (data.status === 'success' || data.status === 'error') {
              clearInterval(interval);
              if (data.status === 'error') setInstallError(data.error || 'Installation encountered an error');
              await fetch_();
            }
          }
        } catch {
          clearInterval(interval);
        }
      }, 1000);
    } catch (err: any) {
      setInstallStatus('error');
      setInstallError(err.response?.data?.error || 'Failed to start Docker installation');
    }
  };

  const fetch_ = async () => {
    setLoading(true);
    try {
      const [localRes, hostsRes, containersRes] = await Promise.allSettled([
        api.get('/docker/local/status'),
        api.get('/docker/hosts'),
        api.get('/docker/containers'),
      ]);

      if (localRes.status === 'fulfilled') setLocalStatus(localRes.value.data?.data);
      if (hostsRes.status === 'fulfilled') setHosts(hostsRes.value.data?.data ?? []);
      if (containersRes.status === 'fulfilled') setContainers(containersRes.value.data?.data ?? []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetch_();
  }, []);

  const handleContainerAction = async (id: string, action: 'start' | 'stop' | 'restart' | 'delete') => {
    setActionLoading(`${id}-${action}`);
    try {
      if (action === 'delete') {
        if (!confirm(`Are you sure you want to delete container ${id}?`)) return;
        await api.delete(`/docker/containers/${id}`);
      } else {
        await api.post(`/docker/containers/${id}/${action}`);
      }
      await fetch_();
    } catch (err: any) {
      alert(err.response?.data?.error || `Failed to ${action} container`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewLogs = async (id: string) => {
    try {
      const res = await api.get(`/docker/containers/${id}/logs`);
      setActiveLogs({ id, logs: res.data?.data?.logs || 'No logs available' });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to fetch logs');
    }
  };

  const handleRunSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunError('');
    setRunLoading(true);
    try {
      await api.post('/docker/containers/run', {
        name: runForm.name || undefined,
        image: runForm.image,
        port: runForm.port ? parseInt(runForm.port, 10) : undefined,
      });
      setShowRunModal(false);
      setRunForm({ name: '', image: '', port: '' });
      await fetch_();
    } catch (err: any) {
      setRunError(err.response?.data?.error || 'Failed to run container');
    } finally {
      setRunLoading(false);
    }
  };

  const addHost = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      await api.post('/docker/hosts', {
        name: form.name,
        type: form.type,
        host: form.host,
        port: form.port ? parseInt(form.port, 10) : undefined,
      });
      setShowAddHost(false);
      setForm({ name: '', type: 'tcp', host: '', port: '2376' });
      await fetch_();
    } catch (err: any) {
      setFormError(err.response?.data?.error ?? 'Failed to add host');
    } finally {
      setFormLoading(false);
    }
  };

  const deleteHost = async (id: string) => {
    if (!confirm('Remove this Docker host?')) return;
    await api.delete(`/docker/hosts/${id}`);
    await fetch_();
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Container className="w-6 h-6 text-blue-400" />
            Docker Environment
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage local and remote Docker containers, run images, and monitor service stacks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-xs" onClick={fetch_} title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {!localStatus?.daemonAvailable && (
            <button
              className="btn-primary text-xs flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-500/20"
              onClick={startAutoInstall}
            >
              <Zap className="w-3.5 h-3.5 text-yellow-300" /> Auto-Install Docker
            </button>
          )}
          <button className="btn-secondary text-xs" onClick={() => setShowAddHost(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Remote Host
          </button>
          <button className="btn-primary text-xs" onClick={() => setShowRunModal(true)}>
            <Play className="w-3.5 h-3.5" /> Run Container
          </button>
        </div>
      </div>

      {/* Local Docker status card */}
      <div className="card">
        <h2 className="section-title mb-3 flex items-center gap-2">
          <Container className="w-4 h-4 text-blue-400" />
          Local Docker Engine Status
        </h2>
        {loading ? (
          <div className="skeleton h-14 rounded" />
        ) : localStatus?.daemonAvailable ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-emerald-300">Docker Daemon Online</div>
              <div className="text-xs text-slate-400">Engine Version: {localStatus.version}</div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="text-sm font-semibold flex items-center justify-between">
                <span>Local Docker Daemon Unavailable</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Not Installed
                </span>
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">{localStatus?.error}</div>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  onClick={startAutoInstall}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/25 transition-all"
                >
                  <Zap className="w-3.5 h-3.5 text-yellow-300" />
                  ⚡ Otomatis Install Docker (Mobile Server & PC)
                </button>
                <span className="text-xs text-slate-400">
                  Termux (Root/Unroot), Windows, atau Linux langsung otomatis di-setup.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Docker Containers Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title flex items-center gap-2 m-0">
            <Layers className="w-4 h-4 text-brand-400" />
            Containers ({containers.length})
          </h2>
          <button onClick={() => setShowRunModal(true)} className="btn-ghost text-xs text-brand-400 hover:underline">
            + Run Image
          </button>
        </div>

        {containers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-500">
            <Container className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-sm">No Docker containers running</p>
            <p className="text-xs mt-1">Browse the App Store to install official Docker apps or run an image above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-700/50 text-slate-400 uppercase text-[10px] tracking-wider border-b border-surface-600">
                <tr>
                  <th className="p-3">Container Name</th>
                  <th className="p-3">Image</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Ports</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/50">
                {containers.map((c) => {
                  const isRunning = c.state === 'running' || c.status?.toLowerCase().startsWith('up');
                  return (
                    <tr key={c.id} className="hover:bg-surface-700/30 transition-colors">
                      <td className="p-3 font-semibold text-white flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                        {c.name || c.id}
                      </td>
                      <td className="p-3 font-mono text-slate-300">{c.image}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            isRunning ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {c.status || c.state}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-400">
                        {c.ports?.map((p) => `${p.publicPort ? `${p.publicPort}:` : ''}${p.privatePort}`).join(', ') || '—'}
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <button
                          onClick={() => handleViewLogs(c.id)}
                          className="btn-ghost py-1 px-2 text-slate-400 hover:text-slate-200"
                          title="View Logs"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        {isRunning ? (
                          <button
                            onClick={() => handleContainerAction(c.id, 'stop')}
                            disabled={actionLoading === `${c.id}-stop`}
                            className="btn-ghost py-1 px-2 text-amber-400 hover:text-amber-300"
                            title="Stop"
                          >
                            <Square className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleContainerAction(c.id, 'start')}
                            disabled={actionLoading === `${c.id}-start`}
                            className="btn-ghost py-1 px-2 text-emerald-400 hover:text-emerald-300"
                            title="Start"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleContainerAction(c.id, 'restart')}
                          disabled={actionLoading === `${c.id}-restart`}
                          className="btn-ghost py-1 px-2 text-blue-400 hover:text-blue-300"
                          title="Restart"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleContainerAction(c.id, 'delete')}
                          disabled={actionLoading === `${c.id}-delete`}
                          className="btn-ghost py-1 px-2 text-red-400 hover:text-red-300"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Remote hosts card */}
      <div className="card">
        <h2 className="section-title mb-3">Remote Docker Hosts</h2>
        {hosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-slate-500">
            <Container className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm">No remote Docker hosts configured</p>
            <p className="text-xs mt-1">Connect your NAS, PC, or Raspberry Pi to manage containers remotely.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {hosts.map((host) => (
              <div key={host.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-700/60 border border-surface-600">
                <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/20 flex items-center justify-center">
                  <Container className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-200">{host.name}</div>
                  <div className="text-xs text-slate-400 font-mono">
                    {host.type.toUpperCase()} · {host.host}{host.port ? `:${host.port}` : ''}
                  </div>
                </div>
                <button
                  className="btn-ghost text-xs py-1 px-2 text-red-400 hover:text-red-300"
                  onClick={() => deleteHost(host.id)}
                  title="Remove Host"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CasaOS Run / Install Container Modal */}
      {showRunModal && (
        <CasaInstallModal
          onClose={() => setShowRunModal(false)}
          onSuccess={() => {
            setShowRunModal(false);
            fetch_();
          }}
        />
      )}

      {/* Logs Modal */}
      {activeLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setActiveLogs(null)} />
          <div className="relative w-full max-w-2xl bg-surface-800 border border-surface-600 rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-surface-700">
              <h2 className="text-sm font-semibold text-white font-mono">Logs: {activeLogs.id}</h2>
              <button onClick={() => setActiveLogs(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto font-mono text-xs text-slate-300 bg-[#0d1117] flex-1 whitespace-pre-wrap leading-relaxed">
              {activeLogs.logs}
            </div>
          </div>
        </div>
      )}

      {/* Add Remote Host Modal */}
      {showAddHost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAddHost(false)} />
          <div className="relative w-full max-w-md bg-surface-800 border border-surface-600 rounded-xl shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-surface-700">
              <h2 className="text-base font-semibold text-white">Add Remote Docker Host</h2>
              <button onClick={() => setShowAddHost(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={addHost} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-900/30 border border-red-800/50 text-red-300 text-xs">
                  {formError}
                </div>
              )}
              <div>
                <label className="label">Profile Name</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Home Server"
                  required
                />
              </div>
              <div>
                <label className="label">Connection Type</label>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="tcp">TCP Socket (Default 2375/2376)</option>
                  <option value="ssh">SSH</option>
                </select>
              </div>
              <div>
                <label className="label">Host / IP Address</label>
                <input
                  className="input"
                  value={form.host}
                  onChange={(e) => setForm({ ...form, host: e.target.value })}
                  placeholder="192.168.1.100"
                  required
                />
              </div>
              <div>
                <label className="label">Port</label>
                <input
                  className="input"
                  type="number"
                  value={form.port}
                  onChange={(e) => setForm({ ...form, port: e.target.value })}
                  placeholder="2375"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddHost(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={formLoading}>
                  {formLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Adding...
                    </>
                  ) : (
                    'Add Host'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Docker Auto-Install Live Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => installStatus !== 'running' && setShowInstallModal(false)} />
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-slide-up">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    Docker Automated Installation
                    {installStatus === 'running' && (
                      <span className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 rounded-full font-medium">
                        <Loader2 className="w-3 h-3 animate-spin" /> In Progress
                      </span>
                    )}
                    {installStatus === 'success' && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Installed
                      </span>
                    )}
                    {installStatus === 'error' && (
                      <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-full font-medium">
                        <AlertTriangle className="w-3 h-3" /> Error
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400">Mobile Server (Termux), Windows & Linux installer</p>
                </div>
              </div>
              <button
                onClick={() => setShowInstallModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Terminal Log Stream */}
            <div className="p-4 bg-black/90 font-mono text-xs overflow-y-auto max-h-96 flex flex-col gap-1 text-slate-300">
              {installLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`leading-relaxed ${
                    log.includes('ERROR') || log.includes('failed')
                      ? 'text-red-400'
                      : log.includes('success') || log.includes('Ready') || log.includes('Installed')
                        ? 'text-emerald-400'
                        : log.includes('Warning')
                          ? 'text-amber-400'
                          : 'text-slate-300'
                  }`}
                >
                  {log}
                </div>
              ))}
              {installStatus === 'running' && (
                <div className="flex items-center gap-2 text-blue-400 pt-2 text-[11px] animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Running installer command on system...
                </div>
              )}
            </div>

            {installError && (
              <div className="p-3 bg-red-500/10 border-t border-red-500/20 text-red-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{installError}</span>
              </div>
            )}

            <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">
                {installStatus === 'running' ? 'Please do not close this window while installing...' : 'Completed'}
              </span>
              <button
                onClick={() => setShowInstallModal(false)}
                disabled={installStatus === 'running'}
                className="btn-secondary py-1.5 px-4 text-xs disabled:opacity-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
