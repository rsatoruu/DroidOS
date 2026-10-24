import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { initDatabase, closeDatabase } from '../db/index.js';
import type { DroidOSConfig } from '../config/index.js';

describe('Fastify REST API Endpoints', () => {
  let app: FastifyInstance;
  let baseUrl: string;
  let tempDir: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-api-secret-key-9999999999';
    tempDir = mkdtempSync(join(tmpdir(), 'droidos-api-test-'));
    await initDatabase(tempDir);

    const testConfig: DroidOSConfig = {
      port: 0, // Random port
      host: '127.0.0.1',
      lanHost: '0.0.0.0',
      dataDir: tempDir,
      jwtSecret: process.env.JWT_SECRET,
      sessionTtl: 86400,
      logLevel: 'silent',
      logDir: join(tempDir, 'logs'),
      nodeEnv: 'test',
      enableTerminal: true,
      enableFileManager: true,
      enableMonitoring: true,
      appsDir: join(tempDir, 'apps'),
      logsDir: join(tempDir, 'logs'),
      backupsDir: join(tempDir, 'backups'),
      configDir: join(tempDir, 'config'),
      cacheDir: join(tempDir, 'cache'),
      dbPath: join(tempDir, 'data', 'droidos.db'),
      dashboardDistDir: join(tempDir, 'non-existent-dist'),
    };

    app = await buildApp(testConfig);
    const address = await app.listen({ port: 0, host: '127.0.0.1' });
    baseUrl = address;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    closeDatabase();
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('GET /api/system/health should return ok and setup status', async () => {
    const res = await fetch(`${baseUrl}/api/system/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
    expect(body.data.version).toBeDefined();
    expect(body.data.uptime).toBeGreaterThanOrEqual(0);
  });

  it('GET /api/system/environment should return environment details', async () => {
    const res = await fetch(`${baseUrl}/api/system/environment`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.device.nodeVersion).toBe(process.version);
  });

  it('GET /api/auth/status should indicate setup required initially', async () => {
    const res = await fetch(`${baseUrl}/api/auth/status`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(typeof body.data.setupRequired).toBe('boolean');
  });

  it('POST /api/auth/setup should create initial admin', async () => {
    const res = await fetch(`${baseUrl}/api/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'masteradmin',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        email: 'master@droidos.local',
      }),
    });

    expect([201, 409]).toContain(res.status);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
  });

  it('POST /api/auth/login should authenticate and return session cookie', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'masteradmin',
        password: 'SecurePassword123!',
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.token).toBeDefined();
    expect(body.data.user.username).toBe('masteradmin');
  });
});
