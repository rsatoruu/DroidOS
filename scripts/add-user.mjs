import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync, mkdirSync } from 'node:fs';

const termuxHome = process.env.DROIDOS_DATA_DIR || process.env.DATA_DIR || join(homedir(), '.droidos');
const dbDir = join(termuxHome, 'data');
if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });
const dbPath = join(dbDir, 'droidos.db');

console.log('Connecting to database at:', dbPath);
const db = new Database(dbPath);

// Ensure tables exist
db.exec(`
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
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const username = process.argv[2] || 'ramad';
const password = process.argv[3] || 'ramad123@';
const passwordHash = await bcrypt.hash(password, 12);
const now = new Date().toISOString();

const existing = db.prepare('SELECT id, username FROM users WHERE username = ?').get(username);
if (existing) {
  db.prepare('UPDATE users SET password_hash = ?, is_active = 1 WHERE id = ?').run(passwordHash, existing.id);
  console.log(`User "${username}" updated with new password.`);
} else {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO users (id, username, password_hash, role, is_active, created_at)
    VALUES (?, ?, ?, 'admin', 1, ?)
  `).run(id, username, passwordHash, now);
  console.log(`User "${username}" successfully created.`);
}

// Ensure setup_completed is marked true so user can login directly
db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('setup_completed', 'true', ?)").run(now);
console.log('Setup status verified (completed = true).');

const allUsers = db.prepare('SELECT id, username, role, is_active FROM users').all();
console.log('All users in DroidOS database:', allUsers);
