import { useState, useEffect, useRef } from 'react';
import {
  FileText, RefreshCw, Download, Search, Trash2,
  ChevronDown, Loader2, AlertCircle, CheckCircle2,
  Info, XCircle, Filter,
} from 'lucide-react';
import { api } from '../lib/api';
import type { AppInstance } from '@droidos/shared';

type LogLevel = 'all' | 'info' | 'warn' | 'error' | 'debug';

interface LogLine {
  id: string;
  raw: string;
  level: 'info' | 'warn' | 'error' | 'debug' | 'unknown';
  timestamp?: string;
  message: string;
}

function detectLevel(line: string): LogLine['level'] {
  const l = line.toLowerCase();
  if (l.includes('error') || l.includes('err:') || l.includes('fatal') || l.includes('exception')) return 'error';
  if (l.includes('warn') || l.includes('warning')) return 'warn';
  if (l.includes('debug') || l.includes('verbose') || l.includes('trace')) return 'debug';
  if (l.includes('info') || l.includes('started') || l.includes('listening') || l.includes('ready')) return 'info';
  return 'unknown';
}

function parseLine(raw: string, idx: number): LogLine {
  const level = detectLevel(raw);
  const tsMatch = raw.match(/(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})/);
  const timestamp = tsMatch ? tsMatch[1] : undefined;
  const message = tsMatch ? raw.replace(tsMatch[0]!, '').trim() : raw.trim();
  return {
    id: `${idx}-${Math.random().toString(36).slice(2, 6)}`,
    raw,
    level,
    timestamp,
    message: message || raw,
  };
}

const LEVEL_ICON: Record<LogLine['level'], React.ReactNode> = {
  error: <XCircle className="w-3 h-3 text-red-400 shrink-0" />,
  warn: <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />,
  info: <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />,
  debug: <Info className="w-3 h-3 text-sky-400 shrink-0" />,
  unknown: <span className="w-3 h-3 shrink-0" />,
};

const LEVEL_CLASS: Record<LogLine['level'], string> = {
  error: 'text-red-300',
  warn: 'text-amber-300',
  info: 'text-emerald-300',
  debug: 'text-sky-300',
  unknown: 'text-slate-300',
};

export function LogsPage() {
  const [apps, setApps] = useState<{ id: string; name: string }[]>([]);
  const [selectedApp, setSelectedApp] = useState<string>('');
  const [rawLog, setRawLog] = useState<string>('');
  const [parsedLines, setParsedLines] = useState<LogLine[]>([]);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<LogLevel>('all');
  const [lines, setLines] = useState(200);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.get('/apps').then((res) => {
      const data: AppInstance[] = res.data?.data ?? [];
      const list = data.map((a) => ({ id: a.id, name: a.definition.name }));
      setApps(list);
      if (list.length > 0) setSelectedApp(list[0]!.id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedApp) fetchLogs();
  }, [selectedApp, lines]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh && selectedApp) {
      intervalRef.current = setInterval(fetchLogs, 5000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, selectedApp]);

  const fetchLogs = async () => {
    if (!selectedApp) return;
    setLoading(true);
    try {
      const res = await api.get(`/apps/${selectedApp}/logs`, { params: { lines } });
      const log: string = res.data?.data?.log ?? '';
      setRawLog(log);
      const lineArr = log.split('\n').filter((l) => l.trim());
      setParsedLines(lineArr.map(parseLine));
      setLastRefreshed(new Date());
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {
      setRawLog('');
      setParsedLines([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLines = parsedLines.filter((line) => {
    const matchLevel = levelFilter === 'all' || line.level === levelFilter;
    const matchSearch = !search || line.raw.toLowerCase().includes(search.toLowerCase());
    return matchLevel && matchSearch;
  });

  const handleDownload = () => {
    const blob = new Blob([rawLog], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedApp}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const levelCounts = parsedLines.reduce<Record<string, number>>(
    (acc, l) => { acc[l.level] = (acc[l.level] ?? 0) + 1; return acc; },
    {},
  );

  const selectedAppName = apps.find((a) => a.id === selectedApp)?.name ?? selectedApp;

  return (
    <div className="space-y-4 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-400" />
            App Logs
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time log viewer for all running applications.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {lastRefreshed && (
            <span className="text-[11px] text-slate-500 hidden sm:block">
              Updated {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              autoRefresh
                ? 'bg-brand-600/20 border-brand-500/40 text-brand-300'
                : 'bg-surface-800 border-surface-600 text-slate-400 hover:text-slate-200'
            }`}
          >
            {autoRefresh ? 'Pause Live' : 'Go Live'}
          </button>
          <button
            onClick={fetchLogs}
            disabled={loading || !selectedApp}
            className="btn-secondary text-xs py-1.5 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleDownload}
            disabled={!rawLog}
            className="btn-secondary text-xs py-1.5 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative min-w-[200px]">
          <select
            value={selectedApp}
            onChange={(e) => setSelectedApp(e.target.value)}
            className="input-field text-sm w-full appearance-none pr-8 bg-surface-700"
          >
            <option value="">Select App</option>
            {apps.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2.5 top-2.5 text-slate-500 pointer-events-none" />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          {(['all', 'info', 'warn', 'error', 'debug'] as LogLevel[]).map((lv) => (
            <button
              key={lv}
              onClick={() => setLevelFilter(lv)}
              className={`text-xs px-2.5 py-1 rounded-md border font-medium whitespace-nowrap transition-colors ${
                levelFilter === lv
                  ? 'bg-brand-600 border-brand-500 text-white'
                  : 'bg-surface-800 border-surface-600 text-slate-400 hover:text-slate-200'
              }`}
            >
              {lv === 'all' ? `All (${parsedLines.length})` : `${lv} (${levelCounts[lv] ?? 0})`}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search log lines..."
            className="input-field text-sm pl-9 w-full"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>

        <select
          value={lines}
          onChange={(e) => setLines(parseInt(e.target.value))}
          className="input-field text-xs bg-surface-700 min-w-[130px]"
        >
          <option value={50}>Last 50 lines</option>
          <option value={100}>Last 100 lines</option>
          <option value={200}>Last 200 lines</option>
          <option value={500}>Last 500 lines</option>
          <option value={1000}>Last 1000 lines</option>
        </select>
      </div>

      <div className="card p-0 overflow-hidden bg-[#0d1117] border-surface-600 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-surface-700 select-none">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="text-xs font-mono text-slate-400 ml-2">{selectedAppName} — logs</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
            {autoRefresh && <span className="text-brand-400 animate-pulse">LIVE</span>}
            <span>{filteredLines.length} lines</span>
          </div>
        </div>

        <div className="p-4 min-h-[400px] max-h-[600px] overflow-y-auto font-mono text-[12px] space-y-0.5">
          {!selectedApp ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-600 gap-2">
              <FileText className="w-8 h-8 opacity-30" />
              <span className="text-slate-500">Select an app to view its logs</span>
            </div>
          ) : loading && parsedLines.length === 0 ? (
            <div className="flex items-center gap-2 text-brand-400 py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading logs...</span>
            </div>
          ) : filteredLines.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-600 gap-2">
              <FileText className="w-8 h-8 opacity-20" />
              <span className="text-slate-500">No log lines match your filters.</span>
            </div>
          ) : (
            filteredLines.map((line) => (
              <div key={line.id} className="flex items-start gap-2 group py-0.5 hover:bg-white/5 px-1 rounded">
                {LEVEL_ICON[line.level]}
                <div className="flex-1 min-w-0">
                  {line.timestamp && (
                    <span className="text-slate-600 mr-2">{line.timestamp}</span>
                  )}
                  <span className={LEVEL_CLASS[line.level]}>{line.message || line.raw}</span>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {parsedLines.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-slate-500 px-1">
          <span>{parsedLines.length} total lines</span>
          {levelCounts['error'] ? <span className="text-red-400">{levelCounts['error']} errors</span> : null}
          {levelCounts['warn'] ? <span className="text-amber-400">{levelCounts['warn']} warnings</span> : null}
          {levelCounts['info'] ? <span className="text-emerald-400">{levelCounts['info']} info</span> : null}
        </div>
      )}
    </div>
  );
}
