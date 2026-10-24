// Shared constants for DroidOS

export const DROIDOS_VERSION = '0.1.0';
export const DROIDOS_NAME = 'DroidOS';

export const DEFAULT_PORT = 8080;
export const DEFAULT_HOST = '0.0.0.0';
export const LAN_HOST = '0.0.0.0';

export const SESSION_COOKIE_NAME = 'droidos_session';
export const SESSION_TTL_SECONDS = 86400; // 24 hours

export const APP_RUNTIME_TYPES = ['node', 'python', 'shell', 'static', 'custom', 'native', 'docker'] as const;
export type AppRuntimeType = (typeof APP_RUNTIME_TYPES)[number];

export const APP_STATUS = ['running', 'stopped', 'error', 'installing', 'unknown'] as const;
export type AppStatus = (typeof APP_STATUS)[number];

export const DOCKER_HOST_TYPES = ['socket', 'tcp', 'ssh'] as const;
export type DockerHostType = (typeof DOCKER_HOST_TYPES)[number];

export const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export const WS_EVENTS = {
  // Monitoring
  METRICS_UPDATE: 'metrics:update',
  // App events
  APP_STATUS_CHANGE: 'app:status',
  APP_LOG: 'app:log',
  // Terminal
  TERMINAL_DATA: 'terminal:data',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_CLOSE: 'terminal:close',
  // Notifications
  NOTIFICATION: 'notification',
} as const;
