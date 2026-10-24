/**
 * Docker Compose & YAML Deployment Service
 * Parses docker-compose.yml / docker.yaml files, deploys them,
 * and registers them directly into the DroidOS Dashboard & Applications registry.
 * Supports local Docker CLI and remote Docker TCP hosts.
 */
import YAML from 'yaml';
import { v4 as uuidv4 } from 'uuid';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { getDb } from '../db/index.js';
import { getConfig } from '../config/index.js';
import { checkLocalDocker, runContainer } from './docker.js';
import { getAppInstance } from './apps.js';
import { logger } from '../logger.js';
import type { AppInstance } from '@droidos/shared';

const execAsync = promisify(exec);

export interface DeployComposeResult {
  success: boolean;
  message: string;
  apps: AppInstance[];
  errors?: string[];
}

interface ParsedPort {
  host: number;
  container: number;
}

function parsePortEntry(entry: any): ParsedPort | null {
  if (typeof entry === 'number') {
    return { host: entry, container: entry };
  }
  if (typeof entry === 'string') {
    const parts = entry.split(':');
    if (parts.length === 2) {
      const h = parseInt(parts[0]!, 10);
      const c = parseInt(parts[1]!.split('/')[0]!, 10);
      if (!isNaN(h) && !isNaN(c)) return { host: h, container: c };
    } else if (parts.length === 1) {
      const p = parseInt(parts[0]!, 10);
      if (!isNaN(p)) return { host: p, container: p };
    }
  } else if (typeof entry === 'object' && entry !== null) {
    const published = parseInt(entry.published || entry.host, 10);
    const target = parseInt(entry.target || entry.container, 10);
    if (!isNaN(published) && !isNaN(target)) {
      return { host: published, container: target };
    }
  }
  return null;
}

export async function deployComposeYaml(yamlContent: string, customName?: string): Promise<DeployComposeResult> {
  if (!yamlContent || !yamlContent.trim()) {
    throw new Error('YAML content cannot be empty.');
  }

  let doc: any;
  try {
    doc = YAML.parse(yamlContent);
  } catch (err: any) {
    throw new Error(`YAML parsing error: ${err.message}`);
  }

  if (!doc || typeof doc !== 'object') {
    throw new Error('Invalid Compose format. Expected YAML object with services or container definitions.');
  }

  // Extract services
  let services: Record<string, any> = {};
  if (doc.services && typeof doc.services === 'object') {
    services = doc.services;
  } else if (doc.image) {
    // Single container shorthand
    const name = doc.container_name || customName || 'docker-app';
    services[name] = doc;
  } else {
    // Check if keys are direct services
    for (const [k, v] of Object.entries(doc)) {
      if (typeof v === 'object' && v !== null && (v as any).image) {
        services[k] = v;
      }
    }
  }

  const serviceKeys = Object.keys(services);
  if (serviceKeys.length === 0) {
    throw new Error('No services with an "image" definition found in the provided YAML.');
  }

  const db = getDb();
  const config = getConfig();
  const createdInstances: AppInstance[] = [];
  const errors: string[] = [];

  const localDocker = await checkLocalDocker();
  
  // Check for a default remote Docker host if local is unavailable
  const remoteHost = !localDocker.daemonAvailable
    ? (db.prepare('SELECT * FROM docker_hosts WHERE type = ? ORDER BY is_default DESC LIMIT 1').get('tcp') as any)
    : null;
  
  const dockerAvailable = localDocker.daemonAvailable || (remoteHost != null);
  const dockerMode = localDocker.daemonAvailable ? 'local' : (remoteHost ? 'remote' : 'none');

  for (const serviceKey of serviceKeys) {
    const svc = services[serviceKey];
    if (!svc || !svc.image) continue;

    const rawName = svc.container_name || customName || serviceKey;
    const appName = rawName
      .split(/[-_]/)
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const appId = uuidv4();
    const workingDir = join(config.appsDir, appId);
    const dataDir = join(workingDir, 'data');
    mkdirSync(workingDir, { recursive: true });
    mkdirSync(dataDir, { recursive: true });

    // Save the docker-compose.yml file inside the app folder
    const composePath = join(workingDir, 'docker-compose.yml');
    writeFileSync(composePath, yamlContent, 'utf-8');

    // Parse ports
    const parsedPorts: ParsedPort[] = [];
    if (Array.isArray(svc.ports)) {
      for (const p of svc.ports) {
        const parsed = parsePortEntry(p);
        if (parsed) parsedPorts.push(parsed);
      }
    }

    const primaryHostPort = parsedPorts[0]?.host || undefined;

    // Parse environment
    const envVars: Record<string, string> = {};
    if (Array.isArray(svc.environment)) {
      for (const item of svc.environment) {
        if (typeof item === 'string') {
          const [k, ...v] = item.split('=');
          if (k) envVars[k.trim()] = v.join('=').trim();
        }
      }
    } else if (typeof svc.environment === 'object' && svc.environment !== null) {
      for (const [k, v] of Object.entries(svc.environment)) {
        envVars[k] = String(v);
      }
    }

    // Build start/stop commands
    const portFlags = parsedPorts.map((p) => `-p ${p.host}:${p.container}`).join(' ');
    const envFlags = Object.entries(envVars)
      .map(([k, v]) => `-e "${k}=${v}"`)
      .join(' ');
    const startCommand = `docker run -d --name ${rawName} --restart ${svc.restart || 'unless-stopped'} ${portFlags} ${envFlags} ${svc.image}`.trim();
    const stopCommand = `docker stop ${rawName} && docker rm ${rawName}`;

    const now = new Date().toISOString();

    // Run container (handles local docker, remote host, or managed container simulation)
    const runResult = await runContainer({
      name: rawName,
      title: appName,
      image: svc.image,
      category: 'Docker Compose',
      hostPort: primaryHostPort,
      containerPort: parsedPorts[0]?.container,
      ports: parsedPorts,
      env: envVars,
      volumes: Array.isArray(svc.volumes) ? svc.volumes : undefined,
      restartPolicy: svc.restart || 'unless-stopped',
    });

    if (primaryHostPort && primaryHostPort > 0) {
      try {
        const { startManagedPortService } = await import('./managedContainerRunner.js');
        await startManagedPortService(rawName, primaryHostPort);
      } catch {}
    }

    const appDefId = runResult.appId || rawName;
    const instance = getAppInstance(appDefId) || getAppInstance(rawName);
    if (instance) createdInstances.push(instance);
  }

  const runningCount = createdInstances.filter(i => i.status === 'running').length;
  const stoppedCount = createdInstances.length - runningCount;
  
  let message: string;
  if (runningCount > 0 && stoppedCount === 0) {
    message = `✅ Successfully deployed and started ${runningCount} container(s)!`;
  } else if (runningCount > 0) {
    message = `⚠️ Deployed ${createdInstances.length} app(s): ${runningCount} running, ${stoppedCount} stopped.`;
  } else if (dockerMode === 'none') {
    message = `📦 Registered ${createdInstances.length} app(s) — Docker not available. Go to the Docker page to connect a Docker host, then start the app.`;
  } else {
    message = `❌ Registered ${createdInstances.length} app(s) but failed to start containers. Check errors.`;
  }

  return {
    success: createdInstances.length > 0,
    message,
    apps: createdInstances,
    errors: errors.length > 0 ? errors : undefined,
  };
}
