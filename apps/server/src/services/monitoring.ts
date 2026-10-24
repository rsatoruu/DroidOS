/**
 * System monitoring service
 * Collects CPU, memory, storage, network using available APIs
 * Reports 'unavailable' honestly when data cannot be read
 */
import os from 'node:os';
import { stat, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { SystemMetrics, CpuMetrics, MemoryMetrics, StorageMetrics, NetworkMetrics, DeviceInfo } from '@droidos/shared';
import { DROIDOS_VERSION } from '@droidos/shared';
import { isTermux } from './environment.js';

const execFileAsync = promisify(execFile);

interface PrevNetStats {
  rx: number;
  tx: number;
  time: number;
}

let prevNet: PrevNetStats | null = null;

export async function collectMetrics(dataDir: string): Promise<SystemMetrics> {
  const [cpu, memory, storage, network] = await Promise.all([
    getCpuMetrics(),
    getMemoryMetrics(),
    getStorageMetrics(dataDir),
    getNetworkMetrics(),
  ]);

  const device: DeviceInfo = {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    uptime: os.uptime(),
    nodeVersion: process.version,
    droidosVersion: DROIDOS_VERSION,
    termuxDetected: isTermux(),
    androidDetected: isTermux(),
  };

  return { cpu, memory, storage, network, device, timestamp: new Date().toISOString() };
}

async function getCpuMetrics(): Promise<CpuMetrics> {
  try {
    // Try reading /proc/stat (Linux/Android)
    if (existsSync('/proc/stat')) {
      const content = await readFile('/proc/stat', 'utf-8');
      const line = content.split('\n')[0]!;
      const parts = line.split(/\s+/).slice(1).map(Number);
      const [user = 0, nice = 0, system = 0, idle = 0, iowait = 0] = parts;
      const total = user + nice + system + idle + iowait;
      const active = user + nice + system;
      const usage = total > 0 ? Math.round((active / total) * 100) : 0;
      return { usage, available: true };
    }

    // Fallback: use Node.js cpuUsage (process-level only)
    const cpus = os.cpus();
    if (cpus.length > 0) {
      let totalIdle = 0;
      let totalTick = 0;
      for (const cpu of cpus) {
        for (const val of Object.values(cpu.times)) totalTick += val;
        totalIdle += cpu.times.idle;
      }
      const usage = Math.round(100 - (totalIdle / totalTick) * 100);
      return { usage, available: true, note: 'Approximate measurement from cpu.times snapshot' };
    }

    return { usage: null, available: false, note: 'CPU metrics not available in this environment' };
  } catch {
    return { usage: null, available: false, note: 'CPU metrics unavailable' };
  }
}

async function getMemoryMetrics(): Promise<MemoryMetrics> {
  try {
    if (existsSync('/proc/meminfo')) {
      const content = await readFile('/proc/meminfo', 'utf-8');
      const lines = content.split('\n');
      const vals: Record<string, number> = {};
      for (const line of lines) {
        const m = line.match(/^(\w+):\s+(\d+)\s*kB/);
        if (m) vals[m[1]!] = parseInt(m[2]!, 10) * 1024;
      }
      return {
        total: vals['MemTotal'] ?? null,
        used: vals['MemTotal'] && vals['MemAvailable'] ? vals['MemTotal'] - vals['MemAvailable'] : null,
        free: vals['MemFree'] ?? null,
        available: true,
      };
    }

    // Fallback to os module
    const total = os.totalmem();
    const free = os.freemem();
    return { total, used: total - free, free, available: true };
  } catch {
    return { total: null, used: null, free: null, available: false, note: 'Memory metrics unavailable' };
  }
}

async function getStorageMetrics(dataDir: string): Promise<StorageMetrics[]> {
  const results: StorageMetrics[] = [];

  for (const [label, path] of [['Data Directory', dataDir], ['Home', os.homedir()]] as [string, string][]) {
    // 1. Try native statfs first (Node.js 18.15+)
    try {
      const { statfs } = await import('node:fs/promises');
      const stats = await statfs(path);
      const total = Number(stats.bsize) * Number(stats.blocks);
      const free = Number(stats.bsize) * Number(stats.bfree);
      const used = total - free;
      if (total > 0) {
        results.push({ path, label, total, used, free, available: true });
        continue;
      }
    } catch {}

    // 2. Fallback to df command (Termux/Linux)
    try {
      const { stdout } = await execFileAsync('df', ['-k', path], { timeout: 3000 });
      const lines = stdout.trim().split('\n');
      if (lines.length >= 2) {
        const parts = lines[1]!.split(/\s+/);
        const total = parseInt(parts[1]!, 10) * 1024;
        const used = parseInt(parts[2]!, 10) * 1024;
        const free = parseInt(parts[3]!, 10) * 1024;
        results.push({ path, label, total, used, free, available: true });
        continue;
      }
    } catch {}
    results.push({ path, label, total: null, used: null, free: null, available: false });
  }

  return results;
}

async function getNetworkMetrics(): Promise<NetworkMetrics> {
  let rxTotal: number | null = null;
  let txTotal: number | null = null;

  try {
    // 1. Linux / Android / Termux: /proc/net/dev
    if (existsSync('/proc/net/dev')) {
      const content = await readFile('/proc/net/dev', 'utf-8');
      let rx = 0;
      let tx = 0;
      for (const line of content.split('\n').slice(2)) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 10 && !parts[0]!.startsWith('lo')) {
          rx += parseInt(parts[1]!, 10);
          tx += parseInt(parts[9]!, 10);
        }
      }
      rxTotal = rx;
      txTotal = tx;
    } else if (process.platform === 'win32') {
      // 2. Windows: netstat.exe -e
      const { stdout } = await execFileAsync('netstat.exe', ['-e'], { timeout: 3000 });
      const match = stdout.match(/Bytes\s+(\d+)\s+(\d+)/i);
      if (match) {
        rxTotal = Number(match[1]);
        txTotal = Number(match[2]);
      }
    }
  } catch {}

  if (rxTotal !== null && txTotal !== null) {
    const now = Date.now();
    let rxRate: number | null = null;
    let txRate: number | null = null;

    if (prevNet) {
      const elapsed = (now - prevNet.time) / 1000;
      if (elapsed > 0) {
        rxRate = Math.max(0, (rxTotal - prevNet.rx) / elapsed);
        txRate = Math.max(0, (txTotal - prevNet.tx) / elapsed);
      }
    }
    prevNet = { rx: rxTotal, tx: txTotal, time: now };
    return { rxBytes: rxTotal, txBytes: txTotal, rxRate, txRate, available: true };
  }

  return { rxBytes: null, txBytes: null, rxRate: null, txRate: null, available: false };
}

export async function checkDiskSpace(path: string): Promise<{ path: string; total: number | null; used: number | null; free: number | null; available: boolean }> {
  try {
    const { stdout } = await execFileAsync('df', ['-k', path], { timeout: 3000 });
    const lines = stdout.trim().split('\n');
    if (lines.length >= 2) {
      const parts = lines[1]!.split(/\s+/);
      return {
        path,
        total: parseInt(parts[1]!, 10) * 1024,
        used: parseInt(parts[2]!, 10) * 1024,
        free: parseInt(parts[3]!, 10) * 1024,
        available: true,
      };
    }
  } catch {}
  return { path, total: null, used: null, free: null, available: false };
}
