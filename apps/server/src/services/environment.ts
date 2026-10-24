/**
 * Environment detection service
 * Detects Termux, Android, Docker, available runtimes
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import { DROIDOS_VERSION } from '@droidos/shared';
import type { DeviceInfo } from '@droidos/shared';

const execFileAsync = promisify(execFile);

export interface EnvironmentInfo {
  device: DeviceInfo;
  runtimes: RuntimeAvailability;
  docker: DockerAvailability;
  storage: StorageInfo;
  network: NetworkInfo;
}

export interface RuntimeAvailability {
  node: { available: boolean; version?: string };
  python: { available: boolean; version?: string };
  python3: { available: boolean; version?: string };
  git: { available: boolean; version?: string };
}

export interface DockerAvailability {
  cliAvailable: boolean;
  daemonAvailable: boolean;
  version?: string;
  error?: string;
}

export interface StorageInfo {
  home: { path: string; available: boolean; free?: number; total?: number };
}

export interface NetworkInfo {
  interfaces: NetworkInterface[];
  lanAddresses: string[];
}

export interface NetworkInterface {
  name: string;
  address: string;
  family: string;
}

async function getCommandVersion(cmd: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(cmd, args, { timeout: 3000 });
    return stdout.trim().split('\n')[0] ?? null;
  } catch {
    return null;
  }
}

export function isTermux(): boolean {
  // Check for Termux-specific env var or path
  return (
    !!process.env.TERMUX_VERSION ||
    existsSync('/data/data/com.termux') ||
    (process.env.HOME ?? '').includes('com.termux') ||
    (process.env.PREFIX ?? '').includes('com.termux')
  );
}

export function isAndroid(): boolean {
  // Check for Android-specific paths
  return (
    isTermux() ||
    existsSync('/proc/version') && false // fallback – can't reliably detect without reading
  );
}

export async function detectEnvironment(): Promise<EnvironmentInfo> {
  const [nodeVer, pythonVer, python3Ver, gitVer] = await Promise.all([
    getCommandVersion('node', ['--version']),
    getCommandVersion('python', ['--version']),
    getCommandVersion('python3', ['--version']),
    getCommandVersion('git', ['--version']),
  ]);

  const runtimes: RuntimeAvailability = {
    node: { available: !!nodeVer, version: nodeVer ?? undefined },
    python: { available: !!pythonVer, version: pythonVer ?? undefined },
    python3: { available: !!python3Ver, version: python3Ver ?? undefined },
    git: { available: !!gitVer, version: gitVer ?? undefined },
  };

  // Docker detection
  let docker: DockerAvailability = { cliAvailable: false, daemonAvailable: false };
  try {
    const dockerVer = await getCommandVersion('docker', ['--version']);
    if (dockerVer) {
      docker.cliAvailable = true;
      // Try daemon connectivity
      try {
        const { stdout } = await execFileAsync('docker', ['info', '--format', '{{.ServerVersion}}'], { timeout: 5000 });
        docker.daemonAvailable = true;
        docker.version = stdout.trim();
      } catch (err: any) {
        docker.daemonAvailable = false;
        docker.error = 'Docker daemon is not available in this environment. Docker CLI is present but no daemon is running. On unrooted Android/Termux, a local Docker daemon cannot run.';
      }
    }
  } catch {
    docker = {
      cliAvailable: false,
      daemonAvailable: false,
      error: 'Docker CLI not found. Install Docker or configure a remote Docker host.',
    };
  }

  // Network interfaces
  const netInterfaces = os.networkInterfaces();
  const interfaces: NetworkInterface[] = [];
  const lanAddresses: string[] = [];

  for (const [name, addrs] of Object.entries(netInterfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        interfaces.push({ name, address: addr.address, family: 'IPv4' });
        lanAddresses.push(addr.address);
      }
    }
  }

  const device: DeviceInfo = {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    uptime: os.uptime(),
    nodeVersion: process.version,
    droidosVersion: DROIDOS_VERSION,
    termuxDetected: isTermux(),
    androidDetected: isTermux(), // Best we can do without root
  };

  return {
    device,
    runtimes,
    docker,
    storage: {
      home: { path: os.homedir(), available: true },
    },
    network: { interfaces, lanAddresses },
  };
}
