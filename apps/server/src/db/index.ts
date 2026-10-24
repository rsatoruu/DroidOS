/**
 * SQLite database initialization and migration system
 */
import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { logger } from '../logger.js';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) throw new Error('Database not initialized. Call initDatabase() first.');
  return _db;
}

export async function initDatabase(dataDir: string): Promise<void> {
  const dbPath = join(dataDir, 'data', 'droidos.db');
  const dbDir = dirname(dbPath);

  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  logger.info(`Initializing database at ${dbPath}`);
  _db = new Database(dbPath);

  // WAL mode for better concurrent performance
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.pragma('synchronous = NORMAL');

  runMigrations(_db);
  logger.info('Database initialized successfully');
}

function runMigrations(db: Database.Database) {
  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const migrations: Record<string, string> = {
    '001_initial': `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        email TEXT,
        role TEXT NOT NULL DEFAULT 'admin',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_login_at TEXT,
        is_active INTEGER NOT NULL DEFAULT 1
      );

      -- App definitions
      CREATE TABLE IF NOT EXISTS app_definitions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        version TEXT NOT NULL DEFAULT '1.0.0',
        icon TEXT,
        category TEXT NOT NULL DEFAULT 'Custom',
        runtime TEXT NOT NULL,
        working_dir TEXT NOT NULL,
        start_command TEXT NOT NULL,
        stop_command TEXT,
        env_vars TEXT NOT NULL DEFAULT '{}',
        port INTEGER,
        health_check_url TEXT,
        health_check_interval INTEGER DEFAULT 30,
        restart_policy TEXT NOT NULL DEFAULT 'on-failure',
        max_restarts INTEGER NOT NULL DEFAULT 3,
        data_dir TEXT,
        dependencies TEXT DEFAULT '[]',
        install_script TEXT,
        uninstall_script TEXT,
        upgrade_script TEXT,
        startup_timeout_seconds INTEGER NOT NULL DEFAULT 30,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- App runtime state
      CREATE TABLE IF NOT EXISTS app_instances (
        id TEXT PRIMARY KEY,
        definition_id TEXT NOT NULL REFERENCES app_definitions(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'stopped',
        pid INTEGER,
        started_at TEXT,
        stopped_at TEXT,
        restart_count INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        health_status TEXT NOT NULL DEFAULT 'unknown',
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Docker host profiles
      CREATE TABLE IF NOT EXISTS docker_hosts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL DEFAULT 'tcp',
        host TEXT NOT NULL,
        port INTEGER,
        tls_enabled INTEGER NOT NULL DEFAULT 0,
        ssh_user TEXT,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Dashboard settings (key-value)
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Installation history
      CREATE TABLE IF NOT EXISTS install_history (
        id TEXT PRIMARY KEY,
        app_id TEXT,
        action TEXT NOT NULL,
        status TEXT NOT NULL,
        log TEXT,
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        finished_at TEXT
      );

      -- Audit log
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        resource TEXT,
        resource_id TEXT,
        details TEXT,
        ip TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Backup metadata
      CREATE TABLE IF NOT EXISTS backups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        size INTEGER,
        type TEXT NOT NULL DEFAULT 'manual',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        verified INTEGER NOT NULL DEFAULT 0
      );
    `,
    '002_settings_defaults': `
      INSERT OR IGNORE INTO settings (key, value) VALUES
        ('setup_completed', 'false'),
        ('lan_enabled', 'false'),
        ('theme', 'dark'),
        ('dashboard_name', 'DroidOS');
    `,
  };

  const applied = new Set(
    (db.prepare('SELECT name FROM migrations').all() as { name: string }[]).map((r) => r.name),
  );

  const insertMigration = db.prepare('INSERT INTO migrations (name) VALUES (?)');

  for (const [name, sql] of Object.entries(migrations)) {
    if (applied.has(name)) continue;
    logger.debug(`Running migration: ${name}`);
    db.exec(sql);
    insertMigration.run(name);
    logger.debug(`Migration applied: ${name}`);
  }
}

export function closeDatabase() {
  _db?.close();
  _db = null;
}
