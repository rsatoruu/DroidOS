/**
 * Fastify application builder
 * Registers all plugins, routes, and middleware
 */
import Fastify, { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import fastifyMultipart from '@fastify/multipart';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { DroidOSConfig } from './config/index.js';
import { logger } from './logger.js';
import { authRoutes } from './routes/auth.js';
import { appRoutes } from './routes/apps.js';
import { dockerRoutes } from './routes/docker.js';
import { fileRoutes } from './routes/files.js';
import { monitoringRoutes } from './routes/monitoring.js';
import { systemRoutes } from './routes/system.js';
import { wsRoutes } from './routes/ws.js';
import { authMiddleware } from './middleware/auth.js';

export async function buildApp(config: DroidOSConfig): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false, // Using custom logger
    trustProxy: true,
    bodyLimit: 50 * 1024 * 1024, // 50MB
  });

  // Error handler
  app.setErrorHandler((error: any, request, reply) => {
    logger.error({ err: error, url: request.url }, 'Request error');
    const status = error.statusCode ?? 500;
    reply.status(status).send({
      success: false,
      error: status >= 500 ? 'Internal server error' : (error.message || 'Unknown error'),
    });
  });

  // CORS
  await app.register(fastifyCors, {
    origin: (origin, callback) => {
      // Allow same-origin and localhost
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all for LAN; hardened by auth
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Cookie support for session tokens
  await app.register(fastifyCookie, {
    secret: config.jwtSecret || 'droidos-secret-change-me',
  });

  // WebSocket support
  await app.register(fastifyWebsocket);

  // Multipart form support for file uploads
  await app.register(fastifyMultipart, {
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max upload
  });

  // Serve built dashboard static files
  const dashboardDist = join(config.dashboardDistDir);
  if (existsSync(dashboardDist)) {
    await app.register(fastifyStatic, {
      root: dashboardDist,
      prefix: '/',
      decorateReply: false,
    });
    // SPA fallback: serve index.html for all non-API and non-WS routes
    app.setNotFoundHandler(async (request, reply) => {
      if (!request.url.startsWith('/api') && !request.url.startsWith('/ws')) {
        const indexPath = join(dashboardDist, 'index.html');
        if (existsSync(indexPath)) {
          const { readFileSync } = await import('node:fs');
          return reply.type('text/html').send(readFileSync(indexPath, 'utf-8'));
        }
      }
      reply.status(404).send({ success: false, error: 'Not found' });
    });
  } else {
    // No built dashboard – serve placeholder
    app.get('/', async (request, reply) => {
      reply.type('text/html').send(`
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>DroidOS</title>
<style>body{background:#0f0f1a;color:#e2e8f0;font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}</style>
</head>
<body>
<div style="text-align:center;max-width:400px;padding:2rem">
  <h1 style="color:#7c3aed;font-size:2rem;margin-bottom:0.5rem">🤖 DroidOS</h1>
  <p style="color:#94a3b8">Server is running. Dashboard not yet built.</p>
  <p style="margin-top:1rem">Run <code style="background:#1e1b4b;padding:0.2rem 0.5rem;border-radius:4px">npm run build:dashboard</code> to build the frontend.</p>
  <p style="margin-top:2rem"><a href="/api/health" style="color:#7c3aed">API Health Check →</a></p>
</div>
</body></html>`);
    });
  }

  // Decorate request with config
  app.decorateRequest('config', null);
  app.addHook('onRequest', async (request) => {
    (request as any).config = config;
  });

  // API routes
  await app.register(
    async (api) => {
      // Health check (no auth)
      await api.register(systemRoutes, { prefix: '/system' });
      await api.register(authRoutes, { prefix: '/auth' });

      // Protected routes
      await api.register(
        async (protected_) => {
          protected_.addHook('onRequest', authMiddleware);
          await protected_.register(appRoutes, { prefix: '/apps' });
          await protected_.register(dockerRoutes, { prefix: '/docker' });
          await protected_.register(fileRoutes, { prefix: '/files' });
          await protected_.register(monitoringRoutes, { prefix: '/monitoring' });
        },
      );
    },
    { prefix: '/api' },
  );

  // WebSocket routes
  await app.register(wsRoutes, { prefix: '/ws' });

  return app;
}
