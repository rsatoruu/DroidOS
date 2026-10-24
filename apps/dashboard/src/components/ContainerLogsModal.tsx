import { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Copy,
  Check,
  RefreshCw,
  Search,
  Download,
  Terminal,
} from 'lucide-react';
import { api } from '../lib/api';

interface Props {
  containerName: string;
  appTitle?: string;
  onClose: () => void;
}

export function ContainerLogsModal({ containerName, appTitle, onClose }: Props) {
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      const clean = containerName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      const res = await api.get(`/docker/containers/${clean}/logs?tail=250`);
      setLogs(res.data?.data?.logs || 'No logs received from container.');
    } catch {
      try {
        const res2 = await api.get(`/apps/${containerName}/logs?lines=250`);
        setLogs(res2.data?.data?.log || 'No logs available.');
      } catch {
        setLogs(`[${new Date().toISOString()}] Unable to retrieve logs for ${containerName}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [containerName, autoRefresh]);

  const handleCopy = () => {
    navigator.clipboard.writeText(logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLogs = search
    ? logs
        .split('\n')
        .filter((line) => line.toLowerCase().includes(search.toLowerCase()))
        .join('\n')
    : logs;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="card w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border-slate-700/60 bg-surface-900/95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700/60 bg-surface-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Container Logs: {appTitle || containerName}
              </h2>
              <p className="text-xs text-slate-400 font-mono">{containerName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                autoRefresh
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-surface-800 border-surface-700 text-slate-400'
              }`}
              title="Toggle Auto Refresh every 3s"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Live' : 'Paused'}
            </button>

            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-700 transition-colors"
              title="Copy all logs"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-2.5 border-b border-surface-700/40 bg-surface-850 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Filter logs by keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full bg-transparent border-none text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
          />
        </div>

        {/* Console Log Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-black/80 font-mono text-xs text-slate-300 leading-relaxed space-y-0.5 selection:bg-brand-500/40 selection:text-white">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading container logs...</div>
          ) : filteredLogs ? (
            filteredLogs.split('\n').map((line, i) => (
              <div
                key={i}
                className={`py-0.5 px-1 rounded hover:bg-white/5 break-all ${
                  line.includes('error') || line.includes('ERROR') || line.includes('fatal')
                    ? 'text-red-400'
                    : line.includes('warn') || line.includes('WARN')
                    ? 'text-amber-400'
                    : line.includes('INFO') || line.includes('info')
                    ? 'text-blue-300'
                    : 'text-slate-300'
                }`}
              >
                {line}
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-500">No logs matching filter.</div>
          )}
        </div>
      </div>
    </div>
  );
}
