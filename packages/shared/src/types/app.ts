import type { AppRuntimeType, AppStatus } from '../constants.js';

export interface AppDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  icon?: string;
  category: string;
  runtime: AppRuntimeType;
  workingDir: string;
  startCommand: string;
  stopCommand?: string;
  envVars: Record<string, string>;
  port?: number;
  healthCheckUrl?: string;
  healthCheckInterval?: number; // seconds
  restartPolicy: 'never' | 'always' | 'on-failure';
  maxRestarts: number;
  dataDir?: string;
  dependencies?: string[];
  installScript?: string;
  uninstallScript?: string;
  upgradeScript?: string;
  startupTimeoutSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface AppInstance {
  id: string;
  definitionId: string;
  definition: AppDefinition;
  status: AppStatus;
  pid?: number;
  startedAt?: string;
  stoppedAt?: string;
  restartCount: number;
  lastError?: string;
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
  port?: number;
  uptime?: number; // seconds
}

export interface AppLog {
  id: string;
  appId: string;
  timestamp: string;
  level: 'stdout' | 'stderr';
  message: string;
}

export interface AppInstallProgress {
  appId: string;
  step: string;
  progress: number; // 0-100
  log: string;
  error?: string;
  done: boolean;
}

export interface CreateAppDto {
  name: string;
  description?: string;
  version?: string;
  icon?: string;
  category?: string;
  runtime: AppRuntimeType;
  workingDir?: string;
  startCommand: string;
  stopCommand?: string;
  envVars?: Record<string, string>;
  port?: number;
  healthCheckUrl?: string;
  restartPolicy?: 'never' | 'always' | 'on-failure';
  maxRestarts?: number;
  dataDir?: string;
  startupTimeoutSeconds?: number;
  installScript?: string;
}
