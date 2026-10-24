import { useState } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import type { AppRuntimeType } from '@droidos/shared';
import { APP_RUNTIME_TYPES } from '@droidos/shared';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function CreateAppModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'Custom',
    runtime: 'node' as AppRuntimeType,
    workingDir: '',
    startCommand: '',
    port: '',
    restartPolicy: 'on-failure' as const,
    envVars: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Parse env vars
    let envVars: Record<string, string> = {};
    if (form.envVars.trim()) {
      for (const line of form.envVars.trim().split('\n')) {
        const [k, ...v] = line.split('=');
        if (k) envVars[k.trim()] = v.join('=').trim();
      }
    }

    try {
      await api.post('/apps', {
        name: form.name,
        description: form.description,
        category: form.category,
        runtime: form.runtime,
        workingDir: form.workingDir || `~/.droidos/apps/${form.name.toLowerCase().replace(/\s+/g, '-')}`,
        startCommand: form.startCommand,
        port: form.port ? parseInt(form.port, 10) : undefined,
        restartPolicy: form.restartPolicy,
        envVars,
      });
      onCreated();
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to create app');
    } finally {
      setLoading(false);
    }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface-800 border border-surface-500 rounded-xl shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-surface-600">
          <h2 className="text-base font-semibold text-white">Add Application</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/30 border border-red-800/50 text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">App Name *</label>
              <input className="input" value={form.name} onChange={set('name')} required placeholder="My Node App" />
            </div>

            <div>
              <label className="label">Category</label>
              <input className="input" value={form.category} onChange={set('category')} placeholder="Custom" />
            </div>

            <div>
              <label className="label">Runtime *</label>
              <select className="input" value={form.runtime} onChange={set('runtime')}>
                {APP_RUNTIME_TYPES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="label">Working Directory</label>
              <input className="input" value={form.workingDir} onChange={set('workingDir')} placeholder="/data/data/com.termux/files/home/myapp" />
            </div>

            <div className="col-span-2">
              <label className="label">Start Command *</label>
              <input className="input" value={form.startCommand} onChange={set('startCommand')} required placeholder="node server.js" />
            </div>

            <div>
              <label className="label">Port</label>
              <input className="input" type="number" min="1" max="65535" value={form.port} onChange={set('port')} placeholder="3000" />
            </div>

            <div>
              <label className="label">Restart Policy</label>
              <select className="input" value={form.restartPolicy} onChange={set('restartPolicy')}>
                <option value="never">Never</option>
                <option value="on-failure">On Failure</option>
                <option value="always">Always</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="label">Description</label>
              <input className="input" value={form.description} onChange={set('description')} placeholder="Brief description" />
            </div>

            <div className="col-span-2">
              <label className="label">Environment Variables (KEY=VALUE per line)</label>
              <textarea
                className="input font-mono text-xs min-h-[80px] resize-y"
                value={form.envVars}
                onChange={set('envVars')}
                placeholder={'NODE_ENV=production\nPORT=3000'}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create App'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
