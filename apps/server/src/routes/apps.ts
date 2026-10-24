/**
 * Application REST routes
 */
import type { FastifyInstance } from 'fastify';
import { CreateAppSchema, UpdateAppSchema } from '@droidos/shared';
import {
  listApps, getApp, createApp, updateApp, deleteApp,
  getAppInstance, getAppLogs,
} from '../services/apps.js';
import {
  startContainer, stopContainer, restartContainer, getContainerLogs as getDockerLogs,
} from '../services/docker.js';
import { getProcessManager } from '../services/processManager.js';
import { getConfig } from '../config/index.js';
import { logger } from '../logger.js';

export async function appRoutes(app: FastifyInstance) {
  const config = getConfig();
  const pm = getProcessManager(config.logsDir);

  // List all apps
  app.get('/', async (request, reply) => {
    const definitions = listApps();
    const instances = definitions.map((d) => getAppInstance(d.id)).filter(Boolean);
    reply.send({ success: true, data: instances });
  });

  // Get single app
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const instance = getAppInstance(id);
    if (!instance) {
      reply.status(404).send({ success: false, error: 'App not found' });
      return;
    }
    reply.send({ success: true, data: instance });
  });

  // Create app
  app.post('/', async (request, reply) => {
    const parse = CreateAppSchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({ success: false, error: parse.error.message });
      return;
    }
    try {
      const app_ = createApp(parse.data);
      reply.status(201).send({ success: true, data: getAppInstance(app_.id) });
    } catch (err: any) {
      logger.error({ err }, 'Failed to create app');
      reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Update app
  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parse = UpdateAppSchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({ success: false, error: parse.error.message });
      return;
    }
    const updated = updateApp(id, parse.data);
    if (!updated) {
      reply.status(404).send({ success: false, error: 'App not found' });
      return;
    }
    reply.send({ success: true, data: getAppInstance(id) });
  });

  // Delete app
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await deleteApp(id);
    if (!deleted) {
      reply.status(404).send({ success: false, error: 'App not found' });
      return;
    }
    reply.send({ success: true, data: { message: 'App deleted' } });
  });

  // Start app
  app.post('/:id/start', async (request, reply) => {
    const { id } = request.params as { id: string };
    const definition = getApp(id);
    if (!definition) {
      reply.status(404).send({ success: false, error: 'App not found' });
      return;
    }
    const isDocker = definition.runtime === 'docker' || definition.category === 'Docker' || definition.startCommand.trim().startsWith('docker');
    if (isDocker) {
      try {
        const safeName = definition.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
        await startContainer(safeName);
        if (definition.port && definition.port > 0) {
          try {
            const { startManagedPortService } = await import('../services/managedContainerRunner.js');
            await startManagedPortService(definition.name, definition.port);
          } catch {}
        }
        reply.send({ success: true, data: getAppInstance(id) });
        return;
      } catch (err: any) {
        reply.status(500).send({ success: false, error: err.message });
        return;
      }
    }
    try {
      const instance = await pm.startApp(definition);
      reply.send({ success: true, data: instance });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Stop app
  app.post('/:id/stop', async (request, reply) => {
    const { id } = request.params as { id: string };
    const definition = getApp(id);
    const isDocker = definition && (definition.runtime === 'docker' || definition.category === 'Docker' || definition.startCommand.trim().startsWith('docker'));
    if (isDocker && definition) {
      try {
        const safeName = definition.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
        await stopContainer(safeName);
        if (definition.port && definition.port > 0) {
          try {
            const { stopManagedPortService } = await import('../services/managedContainerRunner.js');
            await stopManagedPortService(definition.port);
          } catch {}
        }
        reply.send({ success: true, data: { message: 'Container stopped' } });
        return;
      } catch (err: any) {
        reply.status(500).send({ success: false, error: err.message });
        return;
      }
    }
    try {
      await pm.stopApp(id);
      reply.send({ success: true, data: { message: 'App stopped' } });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Restart app
  app.post('/:id/restart', async (request, reply) => {
    const { id } = request.params as { id: string };
    const definition = getApp(id);
    if (!definition) {
      reply.status(404).send({ success: false, error: 'App not found' });
      return;
    }
    const isDocker = definition.runtime === 'docker' || definition.category === 'Docker' || definition.startCommand.trim().startsWith('docker');
    if (isDocker) {
      try {
        const safeName = definition.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
        await restartContainer(safeName);
        if (definition.port && definition.port > 0) {
          try {
            const { stopManagedPortService, startManagedPortService } = await import('../services/managedContainerRunner.js');
            await stopManagedPortService(definition.port);
            await startManagedPortService(definition.name, definition.port);
          } catch {}
        }
        reply.send({ success: true, data: getAppInstance(id) });
        return;
      } catch (err: any) {
        reply.status(500).send({ success: false, error: err.message });
        return;
      }
    }
    try {
      const instance = await pm.restartApp(definition);
      reply.send({ success: true, data: instance });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Get app logs
  app.get('/:id/logs', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { lines } = (request.query as any);
    const definition = getApp(id);
    const isDocker = definition && (definition.runtime === 'docker' || definition.category === 'Docker' || definition.startCommand.trim().startsWith('docker'));
    if (isDocker && definition) {
      const safeName = definition.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      const log = await getDockerLogs(safeName, parseInt(lines ?? '200', 10));
      reply.send({ success: true, data: { log, appId: id } });
      return;
    }
    const log = await getAppLogs(id, parseInt(lines ?? '200', 10));
    reply.send({ success: true, data: { log, appId: id } });
  });

  // Update app environment
  app.put('/:id/env', async (request, reply) => {
    const { id } = request.params as { id: string };
    const envVars = request.body as Record<string, string>;
    const updated = updateApp(id, { envVars });
    if (!updated) {
      reply.status(404).send({ success: false, error: 'App not found' });
      return;
    }
    reply.send({ success: true, data: { message: 'Environment updated' } });
  });
}
