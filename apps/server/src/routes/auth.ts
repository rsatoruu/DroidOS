/**
 * Auth routes – login, logout, setup, profile
 */
import type { FastifyInstance } from 'fastify';
import {
  loginUser,
  createUser,
  isSetupComplete,
  markSetupComplete,
  checkRateLimit,
  clearRateLimit,
  getUserById,
  changePassword,
  generateSecret,
} from '../services/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../logger.js';
import { LoginSchema, SetupAdminSchema, ChangePasswordSchema } from '@droidos/shared';
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getDb } from '../db/index.js';

export async function authRoutes(app: FastifyInstance) {
  // Health / setup status
  app.get('/status', async (request, reply) => {
    const setupDone = isSetupComplete();
    reply.send({
      success: true,
      data: { setupRequired: !setupDone },
    });
  });

  // First-run setup
  app.post('/setup', async (request, reply) => {
    if (isSetupComplete()) {
      reply.status(409).send({ success: false, error: 'Setup already completed' });
      return;
    }

    const parse = SetupAdminSchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({ success: false, error: parse.error.message });
      return;
    }

    const { username, password, email } = parse.data;

    // Check no users exist yet
    const db = getDb();
    const count = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c;
    if (count > 0) {
      reply.status(409).send({ success: false, error: 'Admin user already exists' });
      return;
    }

    try {
      // Generate JWT secret if not set
      if (!process.env.JWT_SECRET) {
        const secret = generateSecret();
        process.env.JWT_SECRET = secret;
        // Write to .env file in data dir
        const config = (request as any).config;
        const envPath = join(config.dataDir, '.env');
        if (!existsSync(envPath)) {
          writeFileSync(envPath, `JWT_SECRET=${secret}\n`, { mode: 0o600 });
          logger.info('JWT secret generated and saved');
        }
      }

      const user = await createUser({ username, password, email });
      markSetupComplete();

      logger.info({ username }, 'First-run setup completed');
      reply.status(201).send({ success: true, data: { message: 'Setup complete', userId: user.id } });
    } catch (err: any) {
      logger.error({ err }, 'Setup failed');
      reply.status(500).send({ success: false, error: 'Setup failed' });
    }
  });

  // Login
  app.post('/login', async (request, reply) => {
    const ip = request.ip ?? 'unknown';
    if (!checkRateLimit(ip)) {
      reply.status(429).send({ success: false, error: 'Too many login attempts. Try again in 15 minutes.' });
      return;
    }

    const parse = LoginSchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({ success: false, error: 'Invalid request' });
      return;
    }

    const { username, password } = parse.data;
    const result = await loginUser(username, password);

    if (!result) {
      logger.warn({ username, ip }, 'Failed login attempt');
      reply.status(401).send({ success: false, error: 'Invalid username or password' });
      return;
    }

    clearRateLimit(ip);
    logger.info({ username, ip }, 'Successful login');

    const config = (request as any).config;
    const expiresAt = new Date(Date.now() + config.sessionTtl * 1000).toISOString();

    // Set session cookie
    reply.setCookie('droidos_session', result.token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: config.sessionTtl,
      path: '/',
    });

    reply.send({
      success: true,
      data: {
        token: result.token,
        user: result.user,
        expiresAt,
      },
    });
  });

  // Logout
  app.post('/logout', async (request, reply) => {
    reply.clearCookie('droidos_session', { path: '/' });
    reply.send({ success: true, data: { message: 'Logged out' } });
  });

  // Get current user (protected)
  app.get('/me', { preHandler: [authMiddleware] }, async (request, reply) => {
    const payload = (request as any).user;
    const user = getUserById(payload.sub);
    if (!user) {
      reply.status(404).send({ success: false, error: 'User not found' });
      return;
    }
    reply.send({ success: true, data: user });
  });

  // Change password (protected)
  app.post('/change-password', { preHandler: [authMiddleware] }, async (request, reply) => {
    const parse = ChangePasswordSchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({ success: false, error: parse.error.message });
      return;
    }

    const payload = (request as any).user;
    const { currentPassword, newPassword } = parse.data;

    const ok = await changePassword(payload.sub, currentPassword, newPassword);
    if (!ok) {
      reply.status(400).send({ success: false, error: 'Current password is incorrect' });
      return;
    }

    logger.info({ userId: payload.sub }, 'Password changed');
    reply.send({ success: true, data: { message: 'Password changed successfully' } });
  });
}
