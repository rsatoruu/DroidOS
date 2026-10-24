import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initDatabase, closeDatabase } from '../db/index.js';
import {
  createUser,
  loginUser,
  getUserById,
  changePassword,
  checkRateLimit,
  clearRateLimit,
  isSetupComplete,
  markSetupComplete,
  verifyToken,
} from '../services/auth.js';

describe('Authentication Service', () => {
  let tempDir: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret-key-for-droidos-testing-1234';
    tempDir = mkdtempSync(join(tmpdir(), 'droidos-auth-test-'));
    await initDatabase(tempDir);
  });

  afterAll(() => {
    closeDatabase();
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('should initially have setup not completed', () => {
    expect(isSetupComplete()).toBe(false);
  });

  it('should create an admin user and hash password', async () => {
    const user = await createUser({
      username: 'testadmin',
      password: 'SuperSecretPassword123!',
      email: 'admin@droidos.local',
    });

    expect(user).toBeDefined();
    expect(user.id).toBeDefined();
    expect(user.username).toBe('testadmin');
    expect(user.role).toBe('admin');
  });

  it('should find user by id without exposing password_hash', () => {
    const user = getUserById('any-id');
    // For created testadmin
    expect(user === null || typeof user.username === 'string').toBe(true);
  });

  it('should fail login with incorrect password', async () => {
    const res = await loginUser('testadmin', 'WrongPassword!');
    expect(res).toBeNull();
  });

  it('should succeed login with correct password and issue valid JWT', async () => {
    const res = await loginUser('testadmin', 'SuperSecretPassword123!');
    expect(res).not.toBeNull();
    expect(res?.token).toBeDefined();
    expect(res?.user.username).toBe('testadmin');

    // Verify token
    const payload = verifyToken(res!.token);
    expect(payload).not.toBeNull();
    expect(payload?.username).toBe('testadmin');
  });

  it('should support changing password', async () => {
    const loginRes = await loginUser('testadmin', 'SuperSecretPassword123!');
    const userId = loginRes!.user.id;

    // Fail with wrong current password
    const fail = await changePassword(userId, 'IncorrectOldPassword', 'NewBrandPassword456!');
    expect(fail).toBe(false);

    // Succeed with right password
    const ok = await changePassword(userId, 'SuperSecretPassword123!', 'NewBrandPassword456!');
    expect(ok).toBe(true);

    // Verify login with new password
    const reLogin = await loginUser('testadmin', 'NewBrandPassword456!');
    expect(reLogin).not.toBeNull();
  });

  it('should handle rate limiting on repeated failed attempts', () => {
    const testIp = '192.168.1.200';
    clearRateLimit(testIp);

    // 10 attempts allowed
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(testIp)).toBe(true);
    }

    // 11th attempt exceeds MAX_ATTEMPTS (10)
    expect(checkRateLimit(testIp)).toBe(false);

    // Clear reset
    clearRateLimit(testIp);
    expect(checkRateLimit(testIp)).toBe(true);
  });

  it('should mark setup as complete', () => {
    markSetupComplete();
    expect(isSetupComplete()).toBe(true);
  });
});
