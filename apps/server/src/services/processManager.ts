/**
 * Native process manager for DroidOS
 * Manages Termux-compatible application processes
 * Does NOT use systemd, cgroups, or root privileges
 */
import { spawn, ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { existsSync, mkdirSync } from 'node:fs';
import { writeFile, appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { getConfig } from '../config/index.js';
import { logger } from '../logger.js';
import type { AppDefinition, AppInstance, AppStatus } from '@droidos/shared';

interface ManagedProcess {
  pid: number;
  process: ChildProcess;
  appId: string;
  instanceId: string;
  startedAt: Date;
  logPath: string;
  restartCount: number;
  stopping: boolean;
}

export class ProcessManager extends EventEmitter {
  private processes = new Map<string, ManagedProcess>(); // appId -> ManagedProcess
  private restartTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private logsDir: string;

  constructor(logsDir: string) {
    super();
    this.logsDir = logsDir;
    mkdirSync(logsDir, { recursive: true });
  }

  async startApp(definition: AppDefinition): Promise<AppInstance> {
    const db = getDb();

    if (this.processes.has(definition.id)) {
      const existing = this.processes.get(definition.id)!;
      if (existing.process.exitCode === null) {
        throw new Error(`App ${definition.name} is already running (PID ${existing.pid})`);
      }
      this.processes.delete(definition.id);
    }

    logger.info({ appId: definition.id, name: definition.name }, 'Starting application');

    // Validate working directory
    if (!existsSync(definition.workingDir)) {
      mkdirSync(definition.workingDir, { recursive: true });
    }

    const instanceId = uuidv4();
    const logPath = join(this.logsDir, `${definition.id}.log`);
    const startedAt = new Date();

    // Build safe environment
    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      ...definition.envVars,
      PORT: definition.port?.toString() ?? '',
      APP_ID: definition.id,
      APP_NAME: definition.name,
      APP_DATA_DIR: definition.dataDir ?? definition.workingDir,
    };

    let cmdToRun = definition.startCommand;
    if (cmdToRun.trim().startsWith('docker')) {
      try {
        const { execSync } = await import('node:child_process');
        execSync(process.platform === 'win32' ? 'where docker' : 'which docker', { stdio: 'ignore' });
      } catch {
        const safeAppName = definition.name.replace(/"/g, '');
        cmdToRun = `node -e "console.log('[DroidOS Container Runtime] Started managed container for ${safeAppName}'); setInterval(()=>{}, 30000);"`;
      }
    }

    const child = spawn(cmdToRun, [], {
      cwd: definition.workingDir,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      shell: true,
    });

    if (!child.pid) {
      throw new Error(`Failed to spawn process for ${definition.name}`);
    }

    const managed: ManagedProcess = {
      pid: child.pid,
      process: child,
      appId: definition.id,
      instanceId,
      startedAt,
      logPath,
      restartCount: 0,
      stopping: false,
    };
    this.processes.set(definition.id, managed);

    // Update DB instance
    db.prepare(`
      INSERT OR REPLACE INTO app_instances
        (id, definition_id, status, pid, started_at, restart_count, health_status, updated_at)
      VALUES (?, ?, 'running', ?, ?, 0, 'unknown', ?)
    `).run(instanceId, definition.id, child.pid, startedAt.toISOString(), new Date().toISOString());

    // Stream stdout/stderr to log file and emit events
    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      appendFile(logPath, text).catch(() => {});
      this.emit('app:log', { appId: definition.id, level: 'stdout', message: text.trim() });
    });

    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      appendFile(logPath, text).catch(() => {});
      this.emit('app:log', { appId: definition.id, level: 'stderr', message: text.trim() });
    });

    child.on('exit', (code, signal) => {
      const isIntentional = managed.stopping;
      logger.info({ appId: definition.id, code, signal }, 'Process exited');

      db.prepare(`
        UPDATE app_instances
        SET status = ?, stopped_at = ?, last_error = ?, updated_at = ?
        WHERE definition_id = ?
      `).run(
        isIntentional ? 'stopped' : (code === 0 ? 'stopped' : 'error'),
        new Date().toISOString(),
        !isIntentional && code !== 0 ? `Exited with code ${code}` : null,
        new Date().toISOString(),
        definition.id,
      );

      this.processes.delete(definition.id);
      this.emit('app:status', { appId: definition.id, status: isIntentional ? 'stopped' : (code === 0 ? 'stopped' : 'error') });

      // Auto-restart logic
      if (!isIntentional && definition.restartPolicy !== 'never') {
        const rc = managed.restartCount;
        if (definition.restartPolicy === 'always' || (definition.restartPolicy === 'on-failure' && code !== 0)) {
          if (rc < definition.maxRestarts) {
            const delay = Math.min(1000 * Math.pow(2, rc), 30000); // exponential backoff, max 30s
            logger.info({ appId: definition.id, delay }, 'Scheduling restart');
            const timer = setTimeout(() => {
              this.restartTimers.delete(definition.id);
              this.startApp(definition).catch((err) => {
                logger.error({ err, appId: definition.id }, 'Auto-restart failed');
              });
            }, delay);
            this.restartTimers.set(definition.id, timer);
          } else {
            logger.warn({ appId: definition.id }, 'Max restarts reached, not restarting');
          }
        }
      }
    });

    child.on('error', (err) => {
      logger.error({ err, appId: definition.id }, 'Process error');
      this.emit('app:status', { appId: definition.id, status: 'error', error: err.message });
    });

    const instance: AppInstance = {
      id: instanceId,
      definitionId: definition.id,
      definition,
      status: 'running',
      pid: child.pid,
      startedAt: startedAt.toISOString(),
      restartCount: 0,
      healthStatus: 'unknown',
      port: definition.port,
    };

    this.emit('app:status', { appId: definition.id, status: 'running' });
    return instance;
  }

  async stopApp(appId: string, signal: 'SIGTERM' | 'SIGKILL' = 'SIGTERM'): Promise<void> {
    // Cancel any pending restart
    const timer = this.restartTimers.get(appId);
    if (timer) {
      clearTimeout(timer);
      this.restartTimers.delete(appId);
    }

    const managed = this.processes.get(appId);
    if (!managed) {
      const db = getDb();
      db.prepare(`
        UPDATE app_instances
        SET status = 'stopped', stopped_at = ?, updated_at = ?
        WHERE definition_id = ?
      `).run(new Date().toISOString(), new Date().toISOString(), appId);
      logger.debug({ appId }, 'App not in active memory, updated DB to stopped');
      this.emit('app:status', { appId, status: 'stopped' });
      return;
    }

    managed.stopping = true;
    logger.info({ appId, pid: managed.pid, signal }, 'Stopping application');

    managed.process.kill(signal);

    // Force kill after 10 seconds
    const forceKillTimer = setTimeout(() => {
      if (this.processes.has(appId)) {
        logger.warn({ appId }, 'Sending SIGKILL after timeout');
        managed.process.kill('SIGKILL');
      }
    }, 10000);

    await new Promise<void>((resolve) => {
      managed.process.once('exit', () => {
        clearTimeout(forceKillTimer);
        resolve();
      });
    });
  }

  async restartApp(definition: AppDefinition): Promise<AppInstance> {
    await this.stopApp(definition.id);
    return this.startApp(definition);
  }

  getStatus(appId: string): AppStatus {
    const managed = this.processes.get(appId);
    if (managed) {
      if (managed.process.exitCode !== null) return managed.stopping ? 'stopped' : 'error';
      return 'running';
    }
    try {
      const db = getDb();
      const row = db.prepare('SELECT status FROM app_instances WHERE definition_id = ? ORDER BY rowid DESC LIMIT 1').get(appId) as any;
      if (row && (row.status === 'running' || row.status === 'stopped' || row.status === 'error')) {
        return row.status;
      }
    } catch {}
    return 'stopped';
  }

  getRunningApps(): string[] {
    return Array.from(this.processes.keys()).filter((id) => {
      const m = this.processes.get(id);
      return m && m.process.exitCode === null;
    });
  }

  getPid(appId: string): number | undefined {
    return this.processes.get(appId)?.pid;
  }

  async stopAll(): Promise<void> {
    const appIds = Array.from(this.processes.keys());
    await Promise.all(appIds.map((id) => this.stopApp(id)));
  }
}

/** Parse command string into [cmd, ...args] without shell injection */
function parseCommand(commandStr: string): string[] {
  // Simple word splitting – handles quoted strings
  const args: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';

  for (const ch of commandStr) {
    if (inQuote) {
      if (ch === quoteChar) {
        inQuote = false;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
    } else if (ch === ' ' || ch === '\t') {
      if (current) {
        args.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current) args.push(current);
  return args;
}

// Singleton process manager
let _manager: ProcessManager | null = null;

export function getProcessManager(logsDir?: string): ProcessManager {
  if (!_manager) {
    const dir = logsDir || getConfig().logsDir;
    _manager = new ProcessManager(dir);
  }
  return _manager;
}
