/**
 * DroidOS configuration loader
 * Reads from environment variables with sensible defaults.
 * Handles Termux/Android specific paths.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { DEFAULT_HOST, DEFAULT_PORT } from '@droidos/shared';

export interface DroidOSConfig {
  port: number;
  host: string;
  lanHost: string;
  dataDir: string;
  jwtSecret: string;
  sessionTtl: number;
  logLevel: string;
  logDir: string;
  nodeEnv: string;
  enableTerminal: boolean;
  enableFileManager: boolean;
  enableMonitoring: boolean;
  // Derived
  appsDir: string;
  logsDir: string;
  backupsDir: string;
  configDir: string;
  cacheDir: string;
  dbPath: string;
  dashboardDistDir: string;
}

let _config: DroidOSConfig | null = null;

function resolveDataDir(): string {
  // Prefer explicit env var
  if (process.env.DROIDOS_DATA_DIR) return resolve(process.env.DROIDOS_DATA_DIR);
  if (process.env.DATA_DIR) return resolve(process.env.DATA_DIR);

  // Detect Termux or user home
  const termuxHome = process.env.HOME ?? homedir();
  return join(termuxHome, '.droidos');
}

function ensureDirs(config: DroidOSConfig) {
  for (const dir of [
    config.dataDir,
    config.appsDir,
    config.logsDir,
    config.backupsDir,
    config.configDir,
    config.cacheDir,
    config.logDir,
  ]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

function resolveDashboardDist(): string {
  if (process.env.DASHBOARD_DIST_DIR) return resolve(process.env.DASHBOARD_DIST_DIR);
  const candidates = [
    resolve(process.cwd(), 'apps', 'dashboard', 'dist'),
    resolve(process.cwd(), '..', 'dashboard', 'dist'),
    resolve(process.cwd(), 'dashboard', 'dist'),
    resolve(process.cwd(), 'dist'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

export function getConfig(): DroidOSConfig {
  if (_config) return _config;

  const dataDir = resolveDataDir();
  const logDir = process.env.LOG_DIR ? resolve(process.env.LOG_DIR) : join(dataDir, 'logs');

  const config: DroidOSConfig = {
    port: parseInt(process.env.PORT ?? process.env.DROIDOS_PORT ?? String(DEFAULT_PORT), 10),
    host: process.env.HOST ?? process.env.DROIDOS_HOST ?? '0.0.0.0',
    lanHost: process.env.LAN_HOST ?? '0.0.0.0',
    dataDir,
    jwtSecret: process.env.JWT_SECRET ?? '',
    sessionTtl: parseInt(process.env.SESSION_TTL ?? '86400', 10),
    logLevel: process.env.LOG_LEVEL ?? 'info',
    logDir,
    nodeEnv: process.env.NODE_ENV ?? 'production',
    enableTerminal: process.env.ENABLE_TERMINAL !== 'false',
    enableFileManager: process.env.ENABLE_FILE_MANAGER !== 'false',
    enableMonitoring: process.env.ENABLE_MONITORING !== 'false',
    appsDir: join(dataDir, 'apps'),
    logsDir: join(dataDir, 'logs'),
    backupsDir: join(dataDir, 'backups'),
    configDir: join(dataDir, 'config'),
    cacheDir: join(dataDir, 'cache'),
    dbPath: join(dataDir, 'data', 'droidos.db'),
    dashboardDistDir: resolveDashboardDist(),
  };

  ensureDirs(config);
  _config = config;
  return config;
}

export function resetConfig() {
  _config = null;
}
