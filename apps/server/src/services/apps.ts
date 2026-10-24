/**
 * App management service – CRUD + lifecycle operations
 */
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { getProcessManager } from './processManager.js';
import { logger } from '../logger.js';
import type { AppDefinition, AppInstance, CreateAppDto } from '@droidos/shared';
import { getConfig } from '../config/index.js';
import { existsSync, mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

function rowToDefinition(row: any): AppDefinition {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    version: row.version,
    icon: row.icon ?? undefined,
    category: row.category,
    runtime: row.runtime,
    workingDir: row.working_dir,
    startCommand: row.start_command,
    stopCommand: row.stop_command ?? undefined,
    envVars: JSON.parse(row.env_vars ?? '{}'),
    port: row.port ?? undefined,
    healthCheckUrl: row.health_check_url ?? undefined,
    healthCheckInterval: row.health_check_interval ?? 30,
    restartPolicy: row.restart_policy,
    maxRestarts: row.max_restarts,
    dataDir: row.data_dir ?? undefined,
    dependencies: JSON.parse(row.dependencies ?? '[]'),
    installScript: row.install_script ?? undefined,
    uninstallScript: row.uninstall_script ?? undefined,
    upgradeScript: row.upgrade_script ?? undefined,
    startupTimeoutSeconds: row.startup_timeout_seconds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listApps(): AppDefinition[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM app_definitions ORDER BY created_at DESC').all();
  return (rows as any[]).map(rowToDefinition);
}

export function getApp(id: string): AppDefinition | null {
  const db = getDb();
  let row = db.prepare('SELECT * FROM app_definitions WHERE id = ?').get(id);
  if (!row) {
    row = db.prepare(`
      SELECT d.* FROM app_definitions d
      JOIN app_instances i ON d.id = i.definition_id
      WHERE i.id = ?
    `).get(id);
  }
  return row ? rowToDefinition(row) : null;
}

export function createApp(dto: CreateAppDto): AppDefinition {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  const config = getConfig();

  // Create app working dir and data dir if needed
  const workingDir = dto.workingDir || join(config.appsDir, id);
  const dataDir = dto.dataDir || join(config.appsDir, id, 'data');

  if (!existsSync(workingDir)) mkdirSync(workingDir, { recursive: true });
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  db.prepare(`
    INSERT INTO app_definitions (
      id, name, description, version, icon, category, runtime,
      working_dir, start_command, stop_command, env_vars, port,
      health_check_url, restart_policy, max_restarts, data_dir,
      startup_timeout_seconds, install_script, created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    id, dto.name, dto.description ?? '', dto.version ?? '1.0.0',
    dto.icon ?? null, dto.category ?? 'Custom', dto.runtime,
    workingDir, dto.startCommand, dto.stopCommand ?? null,
    JSON.stringify(dto.envVars ?? {}), dto.port ?? null,
    dto.healthCheckUrl ?? null,
    dto.restartPolicy ?? 'on-failure', dto.maxRestarts ?? 3,
    dataDir, dto.startupTimeoutSeconds ?? 30,
    dto.installScript ?? null,
    now, now,
  );

  // Create initial instance record
  const instanceId = uuidv4();
  db.prepare(`
    INSERT INTO app_instances (id, definition_id, status, health_status, updated_at)
    VALUES (?, ?, 'stopped', 'unknown', ?)
  `).run(instanceId, id, now);

  logger.info({ appId: id, name: dto.name }, 'App definition created');
  return getApp(id)!;
}

export function updateApp(id: string, dto: Partial<CreateAppDto>): AppDefinition | null {
  const existing = getApp(id);
  if (!existing) return null;

  const db = getDb();
  const now = new Date().toISOString();

  const updates: string[] = [];
  const values: any[] = [];

  const fieldMap: Record<string, string> = {
    name: 'name', description: 'description', version: 'version',
    icon: 'icon', category: 'category', runtime: 'runtime',
    workingDir: 'working_dir', startCommand: 'start_command', stopCommand: 'stop_command',
    port: 'port', healthCheckUrl: 'health_check_url', restartPolicy: 'restart_policy',
    maxRestarts: 'max_restarts', dataDir: 'data_dir',
    startupTimeoutSeconds: 'startup_timeout_seconds', installScript: 'install_script',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if ((dto as any)[key] !== undefined) {
      updates.push(`${col} = ?`);
      values.push((dto as any)[key]);
    }
  }

  if (dto.envVars !== undefined) {
    updates.push('env_vars = ?');
    values.push(JSON.stringify(dto.envVars));
  }

  if (updates.length === 0) return existing;

  updates.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE app_definitions SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  return getApp(id);
}

export async function deleteApp(id: string): Promise<boolean> {
  const definition = getApp(id);
  const defId = definition ? definition.id : id;

  const pm = getProcessManager();
  await pm.stopApp(defId).catch(() => {});

  // Remove associated Docker container if registered
  try {
    const { removeContainer } = await import('./docker.js');
    await removeContainer(defId);
  } catch {}

  const db = getDb();
  db.prepare('DELETE FROM app_instances WHERE definition_id = ? OR id = ?').run(defId, id);
  const result = db.prepare('DELETE FROM app_definitions WHERE id = ?').run(defId);

  return result.changes > 0 || !!definition;
}

export function getAppInstance(appId: string): AppInstance | null {
  const definition = getApp(appId);
  if (!definition) return null;

  const defId = definition.id;
  const pm = getProcessManager();
  const db = getDb();
  let row = db.prepare('SELECT * FROM app_instances WHERE definition_id = ? ORDER BY rowid DESC LIMIT 1').get(defId) as any;

  if (!row) {
    const newId = uuidv4();
    db.prepare('INSERT INTO app_instances (id, definition_id, status, health_status, updated_at) VALUES (?, ?, ?, ?, ?)').run(
      newId, defId, 'stopped', 'unknown', new Date().toISOString()
    );
    row = { id: newId, definition_id: defId, status: 'stopped' };
  }

  const isDocker = definition.runtime === 'docker' || definition.category === 'Docker' || definition.startCommand.trim().startsWith('docker');
  const liveStatus = isDocker ? (row.status as any || 'stopped') : pm.getStatus(defId);
  const pid = isDocker ? undefined : pm.getPid(defId);

  return {
    id: defId,
    definitionId: defId,
    definition,
    status: liveStatus,
    pid,
    startedAt: row.started_at ?? undefined,
    stoppedAt: row.stopped_at ?? undefined,
    restartCount: row.restart_count ?? 0,
    lastError: row.last_error ?? undefined,
    healthStatus: row.health_status ?? 'unknown',
    port: definition.port,
  };
}

export async function getAppLogs(appId: string, lines = 200): Promise<string> {
  const config = getConfig();
  const logPath = join(config.logsDir, `${appId}.log`);

  if (!existsSync(logPath)) return '';

  try {
    const content = await readFile(logPath, 'utf-8');
    const allLines = content.split('\n');
    return allLines.slice(-lines).join('\n');
  } catch {
    return '';
  }
}
