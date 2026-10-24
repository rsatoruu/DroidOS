/**
 * WebSocket routes – real-time metrics, app logs, terminal
 */
import type { FastifyInstance } from 'fastify';
import { collectMetrics } from '../services/monitoring.js';
import { getProcessManager } from '../services/processManager.js';
import { verifyToken } from '../services/auth.js';
import { getConfig } from '../config/index.js';
import { logger } from '../logger.js';

export async function wsRoutes(app: FastifyInstance) {
  const config = getConfig();

  // Metrics stream
  app.get('/metrics', { websocket: true }, (socket, request) => {
    // Authenticate via token query param
    const token = (request.query as any).token;
    if (!token || !verifyToken(token)) {
      socket.close(4001, 'Unauthorized');
      return;
    }

    logger.debug('Metrics WebSocket connected');
    let interval: ReturnType<typeof setInterval>;

    const sendMetrics = async () => {
      if (socket.readyState !== 1) return; // OPEN
      try {
        const metrics = await collectMetrics(config.dataDir);
        socket.send(JSON.stringify({ type: 'metrics:update', data: metrics }));
      } catch {}
    };

    sendMetrics(); // immediate first update
    interval = setInterval(sendMetrics, 3000);

    socket.on('close', () => {
      clearInterval(interval);
      logger.debug('Metrics WebSocket closed');
    });
  });

  // App log stream
  app.get('/apps/:id/logs', { websocket: true }, (socket, request) => {
    const token = (request.query as any).token;
    if (!token || !verifyToken(token)) {
      socket.close(4001, 'Unauthorized');
      return;
    }

    const { id } = request.params as { id: string };
    const pm = getProcessManager();

    logger.debug({ appId: id }, 'App log WebSocket connected');

    const handler = (event: { appId: string; level: string; message: string }) => {
      if (event.appId === id && socket.readyState === 1) {
        socket.send(JSON.stringify({ type: 'app:log', data: event }));
      }
    };

    pm.on('app:log', handler);

    socket.on('close', () => {
      pm.off('app:log', handler);
      logger.debug({ appId: id }, 'App log WebSocket closed');
    });
  });

  // App status stream
  app.get('/apps/status', { websocket: true }, (socket, request) => {
    const token = (request.query as any).token;
    if (!token || !verifyToken(token)) {
      socket.close(4001, 'Unauthorized');
      return;
    }

    const pm = getProcessManager();

    const handler = (event: { appId: string; status: string }) => {
      if (socket.readyState === 1) {
        socket.send(JSON.stringify({ type: 'app:status', data: event }));
      }
    };

    pm.on('app:status', handler);

    socket.on('close', () => {
      pm.off('app:status', handler);
    });
  });
}
