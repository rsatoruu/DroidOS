/**
 * Monitoring REST routes
 */
import type { FastifyInstance } from 'fastify';
import { collectMetrics } from '../services/monitoring.js';
import { getConfig } from '../config/index.js';
import { getProcessManager } from '../services/processManager.js';
import { listApps } from '../services/apps.js';

export async function monitoringRoutes(app: FastifyInstance) {
  const config = getConfig();

  // Full system metrics snapshot
  app.get('/metrics', async (request, reply) => {
    try {
      const metrics = await collectMetrics(config.dataDir);
      reply.send({ success: true, data: metrics });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Running processes summary
  app.get('/processes', async (request, reply) => {
    const pm = getProcessManager();
    const running = pm.getRunningApps();
    const apps = listApps().filter((a) => running.includes(a.id));
    reply.send({
      success: true,
      data: apps.map((a) => ({
        appId: a.id,
        name: a.name,
        pid: pm.getPid(a.id),
        status: pm.getStatus(a.id),
        port: a.port,
      })),
    });
  });
}
