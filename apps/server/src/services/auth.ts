/**
 * Authentication service
 * Handles password hashing, JWT generation/verification
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { getDb } from '../db/index.js';
import { logger } from '../logger.js';
import { DROIDOS_VERSION } from '@droidos/shared';
import { v4 as uuidv4 } from 'uuid';
import type { User } from '@droidos/shared';

export interface TokenPayload {
  sub: string; // user id
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

function getJwtSecret(): string {
  // 1. Prefer explicit env var
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

  // 2. Try to load from DB settings (persisted across restarts)
  try {
    const db = getDb();
    const row = db.prepare("SELECT value FROM settings WHERE key = 'jwt_secret'").get() as any;
    if (row?.value) {
      process.env.JWT_SECRET = row.value; // cache in process env
      return row.value;
    }

    // 3. Generate new secret and persist it
    const newSecret = generateSecret(64);
    db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('jwt_secret', ?, ?)").run(
      newSecret,
      new Date().toISOString(),
    );
    process.env.JWT_SECRET = newSecret;
    logger.info('JWT secret auto-generated and persisted in database');
    return newSecret;
  } catch (err) {
    // Fallback: use a stable default (not secure but won't crash)
    const fallback = 'droidos-fallback-secret-change-me';
    process.env.JWT_SECRET = fallback;
    return fallback;
  }
}

export function generateSecret(length = 64): string {
  return randomBytes(length).toString('hex');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: Omit<TokenPayload, 'iat' | 'exp'>, ttlSeconds = 86400): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: ttlSeconds });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as TokenPayload;
  } catch {
    return null;
  }
}

// Rate limiting – simple in-memory store
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || entry.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true; // allowed
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return false; // blocked
  }

  entry.count++;
  return true;
}

export function clearRateLimit(ip: string) {
  loginAttempts.delete(ip);
}

export interface CreateUserOptions {
  username: string;
  password: string;
  email?: string;
}

export async function createUser(options: CreateUserOptions): Promise<User> {
  const db = getDb();
  const id = uuidv4();
  const passwordHash = await hashPassword(options.password);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, username, password_hash, email, role, created_at)
    VALUES (?, ?, ?, ?, 'admin', ?)
  `).run(id, options.username, passwordHash, options.email ?? null, now);

  logger.info({ username: options.username }, 'User created');

  return {
    id,
    username: options.username,
    email: options.email,
    role: 'admin',
    createdAt: now,
  };
}

export async function loginUser(
  username: string,
  password: string,
): Promise<{ user: User; token: string } | null> {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM users WHERE username = ? AND is_active = 1')
    .get(username) as any;

  if (!row) return null;

  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) return null;

  // Update last login
  db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(
    new Date().toISOString(),
    row.id,
  );

  const user: User = {
    id: row.id,
    username: row.username,
    email: row.email ?? undefined,
    role: 'admin',
    createdAt: row.created_at,
    lastLoginAt: new Date().toISOString(),
  };

  const token = signToken({ sub: row.id, username: row.username, role: row.role });
  return { user, token };
}

export function getUserById(id: string): User | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(id) as any;
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email ?? undefined,
    role: 'admin',
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at ?? undefined,
  };
}

export function isSetupComplete(): boolean {
  try {
    const db = getDb();
    const row = db.prepare("SELECT value FROM settings WHERE key = 'setup_completed'").get() as any;
    return row?.value === 'true';
  } catch {
    return false;
  }
}

export function markSetupComplete() {
  const db = getDb();
  db.prepare("UPDATE settings SET value = 'true', updated_at = ? WHERE key = 'setup_completed'")
    .run(new Date().toISOString());
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
  const db = getDb();
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as any;
  if (!row) return false;

  const valid = await verifyPassword(currentPassword, row.password_hash);
  if (!valid) return false;

  const newHash = await hashPassword(newPassword);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, userId);
  return true;
}
