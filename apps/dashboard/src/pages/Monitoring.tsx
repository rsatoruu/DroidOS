import { useEffect, useState } from 'react';
import { Activity, Cpu, MemoryStick, HardDrive, Wifi, RefreshCw, Info } from 'lucide-react';
import { api } from '../lib/api';
import type { SystemMetrics } from '@droidos/shared';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function formatBytes(b: number | null): string {
  if (b === null) return 'N/A';
  if (b === 0) return '0 B';
  const k = 1024;
  const s = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${s[i]}`;
}

interface ChartPoint { time: string; value: number }

export function MonitoringPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [cpuHistory, setCpuHistory] = useState<ChartPoint[]>([]);
  const [memHistory, setMemHistory] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const res = await api.get('/monitoring/metrics');
      const m: SystemMetrics = res.data.data;
      setMetrics(m);

      const t = new Date().toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

      if (m.cpu.available && m.cpu.usage !== null) {
        setCpuHistory((h) => [...h.slice(-29), { time: t, value: m.cpu.usage! }]);
      }

      if (m.memory.available && m.memory.total && m.memory.used) {
        const pct = Math.round((m.memory.used / m.memory.total) * 100);
        setMemHistory((h) => [...h.slice(-29), { time: t, value: pct }]);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchMetrics();
    const iv = setInterval(fetchMetrics, 3000);
    return () => clearInterval(iv);
  }, []);

  const memPercent = metrics?.memory.total && metrics?.memory.used
    ? Math.round((metrics.memory.used / metrics.memory.total) * 100)
    : null;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">System Monitoring</h1>
        <button className="btn-ghost text-xs" onClick={fetchMetrics}><RefreshCw className="w-3.5 h-3.5" /></button>
      </div>

      {/* Device info */}
      {metrics && (
        <div className="card">
          <h2 className="section-title mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-brand-400" />
            Device Information
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            {[
              { k: 'Hostname', v: metrics.device.hostname },
              { k: 'Platform', v: `${metrics.device.platform}/${metrics.device.arch}` },
              { k: 'Node.js', v: metrics.device.nodeVersion },
              { k: 'Termux', v: metrics.device.termuxDetected ? 'Detected' : 'Not detected' },
            ].map(({ k, v }) => (
              <div key={k}>
                <div className="text-xs text-slate-500 mb-0.5">{k}</div>
                <div className="font-medium text-slate-200">{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CPU chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title flex items-center gap-2">
            <Cpu className="w-4 h-4 text-brand-400" />
            CPU Usage
          </h2>
          <div className="text-2xl font-bold text-white">
            {metrics?.cpu.available ? `${metrics.cpu.usage ?? 0}%` : 'N/A'}
          </div>
        </div>
        {!metrics?.cpu.available ? (
          <div className="text-xs text-slate-500 italic">{metrics?.cpu.note ?? 'CPU metrics not available'}</div>
        ) : cpuHistory.length > 1 ? (
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={cpuHistory}>
              <defs>
                <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} unit="%" />
              <Tooltip
                contentStyle={{ background: '#0f0f1a', border: '1px solid #252244', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8', fontSize: 11 }}
                itemStyle={{ color: '#a78bfa', fontSize: 11 }}
              />
              <Area type="monotone" dataKey="value" stroke="#7c3aed" fill="url(#cpuGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-28 flex items-center justify-center text-slate-600 text-sm">Collecting data...</div>
        )}
      </div>

      {/* Memory chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title flex items-center gap-2">
            <MemoryStick className="w-4 h-4 text-violet-400" />
            Memory
          </h2>
          <div>
            <div className="text-2xl font-bold text-white">
              {metrics?.memory.available ? formatBytes(metrics.memory.used) : 'N/A'}
            </div>
            {memPercent !== null && (
              <div className="text-xs text-slate-500 text-right">{memPercent}% used</div>
            )}
          </div>
        </div>
        {!metrics?.memory.available ? (
          <div className="text-xs text-slate-500 italic">Memory metrics not available</div>
        ) : (
          <>
            <div className="progress-bar mb-3">
              <div
                className={`progress-fill ${memPercent && memPercent > 85 ? 'bg-red-500' : memPercent && memPercent > 60 ? 'bg-amber-500' : 'bg-violet-500'}`}
                style={{ width: `${memPercent ?? 0}%` }}
              />
            </div>
            {memHistory.length > 1 && (
              <ResponsiveContainer width="100%" height={100}>
                <AreaChart data={memHistory}>
                  <defs>
                    <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" hide />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip
                    contentStyle={{ background: '#0f0f1a', border: '1px solid #252244', borderRadius: 8 }}
                    labelStyle={{ color: '#94a3b8', fontSize: 11 }}
                    itemStyle={{ color: '#c4b5fd', fontSize: 11 }}
                    formatter={(v: number) => [`${v}%`, 'Memory']}
                  />
                  <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="url(#memGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
              <span>Used: {formatBytes(metrics?.memory.used ?? null)}</span>
              <span>Total: {formatBytes(metrics?.memory.total ?? null)}</span>
            </div>
          </>
        )}
      </div>

      {/* Storage */}
      <div className="card">
        <h2 className="section-title mb-4 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          Storage
        </h2>
        {metrics?.storage.map((s, i) => (
          <div key={i} className="mb-4 last:mb-0">
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <div className="text-sm font-medium text-slate-200">{s.label}</div>
                <div className="text-xs text-slate-500 font-mono">{s.path}</div>
              </div>
              <div className="text-sm text-slate-300">
                {s.available ? `${formatBytes(s.used)} / ${formatBytes(s.total)}` : 'N/A'}
              </div>
            </div>
            {s.available && s.total && s.used && (
              <div className="progress-bar">
                <div
                  className="progress-fill bg-cyan-500"
                  style={{ width: `${Math.round((s.used / s.total) * 100)}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Network */}
      <div className="card">
        <h2 className="section-title mb-3 flex items-center gap-2">
          <Wifi className="w-4 h-4 text-emerald-400" />
          Network
        </h2>
        {!metrics?.network.available ? (
          <div className="text-xs text-slate-500 italic">Network metrics not available</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-slate-500">Total Received</div>
              <div className="text-sm font-medium text-slate-200">{formatBytes(metrics.network.rxBytes)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Total Sent</div>
              <div className="text-sm font-medium text-slate-200">{formatBytes(metrics.network.txBytes)}</div>
            </div>
            {metrics.network.rxRate !== null && (
              <>
                <div>
                  <div className="text-xs text-slate-500">RX Rate</div>
                  <div className="text-sm font-medium text-slate-200">{formatBytes(metrics.network.rxRate)}/s</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">TX Rate</div>
                  <div className="text-sm font-medium text-slate-200">{formatBytes(metrics.network.txRate)}/s</div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
