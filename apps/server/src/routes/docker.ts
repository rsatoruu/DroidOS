/**
 * Docker integration routes
 * Supports local Docker detection, remote Docker host management, and container operations
 */
import type { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { CreateDockerHostSchema } from '@droidos/shared';
import {
  checkLocalDocker,
  listAllContainers,
  runContainer,
  stopContainer,
  startContainer,
  restartContainer,
  removeContainer,
  getContainerLogs,
  getRemoteContainers,
  triggerDockerInstall,
  getDockerInstallStatus,
  syncContainersWithApps,
} from '../services/docker.js';
import { deployComposeYaml } from '../services/compose.js';
import { logger } from '../logger.js';

export async function dockerRoutes(app: FastifyInstance) {
  // Deploy from docker-compose.yml / docker.yaml
  app.post('/compose', async (request, reply) => {
    const body = request.body as any;
    if (!body || !body.yaml) {
      reply.status(400).send({ success: false, error: 'YAML configuration content is required' });
      return;
    }

    try {
      const result = await deployComposeYaml(body.yaml, body.name);
      reply.status(201).send({ success: true, data: result });
    } catch (err: any) {
      logger.error({ err }, 'Failed to deploy compose YAML');
      reply.status(400).send({ success: false, error: err.message });
    }
  });

  // Local Docker availability
  app.get('/local/status', async (request, reply) => {
    const status = await checkLocalDocker();
    reply.send({ success: true, data: status });
  });

  // Automated Docker Installation (Mobile Server / Termux / Host)
  app.post('/install', async (request, reply) => {
    const job = await triggerDockerInstall();
    reply.send({ success: true, data: job });
  });

  app.get('/install/status', async (request, reply) => {
    const job = getDockerInstallStatus();
    reply.send({ success: true, data: job });
  });

  // Sync Docker containers with Dashboard apps
  app.post('/sync', async (request, reply) => {
    try {
      const result = await syncContainersWithApps();
      reply.send({ success: true, data: result });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  });

  // List all active/inactive containers (local or remote)
  app.get('/containers', async (request, reply) => {
    try {
      const containers = await listAllContainers();
      reply.send({ success: true, data: containers });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Run a Docker container (pull & run)
  app.post('/containers/run', async (request, reply) => {
    const body = request.body as any;
    if (!body || !body.image) {
      reply.status(400).send({ success: false, error: 'Docker image is required (e.g. nginx:alpine)' });
      return;
    }

    try {
      const result = await runContainer({
        name: body.name || body.image.split(':')[0].replace(/[^a-zA-Z0-9_-]/g, '-'),
        image: body.image,
        title: body.title,
        icon: body.icon,
        category: body.category || 'Docker',
        hostPort: body.hostPort ? parseInt(body.hostPort, 10) : (body.port ? parseInt(body.port, 10) : undefined),
        containerPort: body.containerPort ? parseInt(body.containerPort, 10) : (body.port ? parseInt(body.port, 10) : undefined),
        ports: body.ports,
        env: body.env || body.envVars,
        volumes: body.volumes,
        restartPolicy: body.restartPolicy,
        network: body.network,
        command: body.command,
        privileged: body.privileged,
        hostId: body.hostId,
      });

      logger.info({ name: result.name, id: result.id }, 'Docker container started successfully');
      reply.status(201).send({ success: true, data: result });
    } catch (err: any) {
      logger.error({ err }, 'Failed to run Docker container');
      reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Stop container
  app.post('/containers/:id/stop', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await stopContainer(id);
      reply.send({ success: true, data: { message: `Container ${id} stopped` } });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Start container
  app.post('/containers/:id/start', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await startContainer(id);
      reply.send({ success: true, data: { message: `Container ${id} started` } });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Restart container
  app.post('/containers/:id/restart', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await restartContainer(id);
      reply.send({ success: true, data: { message: `Container ${id} restarted` } });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Remove container
  app.delete('/containers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await removeContainer(id);
      reply.send({ success: true, data: { message: `Container ${id} removed` } });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Container logs
  app.get('/containers/:id/logs', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { tail } = request.query as { tail?: string };
    try {
      const logs = await getContainerLogs(id, tail ? parseInt(tail, 10) : 100);
      reply.send({ success: true, data: { logs } });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  });

  // List Docker host profiles
  app.get('/hosts', async (request, reply) => {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM docker_hosts ORDER BY created_at DESC').all();
    reply.send({ success: true, data: rows });
  });

  // Create Docker host profile
  app.post('/hosts', async (request, reply) => {
    const parse = CreateDockerHostSchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({ success: false, error: parse.error.message });
      return;
    }

    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();
    const data = parse.data;

    // Validate host is not a dangerous internal address when using TCP
    if (data.type === 'tcp' && !isAllowedDockerHost(data.host)) {
      reply.status(400).send({ success: false, error: 'Invalid or disallowed Docker host address' });
      return;
    }

    db.prepare(`
      INSERT INTO docker_hosts (id, name, type, host, port, tls_enabled, ssh_user, is_default, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name,
      data.type,
      data.host,
      data.port ?? null,
      data.tlsEnabled ? 1 : 0,
      data.sshUser ?? null,
      data.isDefault ? 1 : 0,
      now
    );

    logger.info({ hostId: id, name: data.name }, 'Docker host profile created');
    reply.status(201).send({ success: true, data: { id, ...data, createdAt: now } });
  });

  // Delete Docker host profile
  app.delete('/hosts/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const result = db.prepare('DELETE FROM docker_hosts WHERE id = ?').run(id);
    if (result.changes === 0) {
      reply.status(404).send({ success: false, error: 'Host not found' });
      return;
    }
    reply.send({ success: true, data: { message: 'Host deleted' } });
  });

  // List containers for a remote host
  app.get('/hosts/:id/containers', async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const host = db.prepare('SELECT * FROM docker_hosts WHERE id = ?').get(id) as any;
    if (!host) {
      reply.status(404).send({ success: false, error: 'Host not found' });
      return;
    }
    try {
      const containers = await getRemoteContainers(host);
      reply.send({ success: true, data: containers });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  });
}

/** SSRF protection – allowlist of valid Docker host patterns */
function isAllowedDockerHost(host: string): boolean {
  const blocked = ['169.254.', 'metadata.google', 'metadata.aws', '100.100.100.200'];
  for (const b of blocked) {
    if (host.toLowerCase().includes(b)) return false;
  }
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
  return ipRegex.test(host) || hostnameRegex.test(host);
}
