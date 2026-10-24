/**
 * System routes – health check, environment info, setup status
 */
import type { FastifyInstance } from 'fastify';
import { DROIDOS_VERSION, DROIDOS_NAME } from '@droidos/shared';
import { detectEnvironment } from '../services/environment.js';
import { isSetupComplete } from '../services/auth.js';
import { logger } from '../logger.js';
import { getDb } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

export async function systemRoutes(app: FastifyInstance) {
  // Public health check
  app.get('/health', async (request, reply) => {
    reply.send({
      success: true,
      data: {
        status: 'ok',
        version: DROIDOS_VERSION,
        name: DROIDOS_NAME,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        setupRequired: !isSetupComplete(),
      },
    });
  });

  // Environment info (public for setup wizard)
  app.get('/environment', async (request, reply) => {
    try {
      const env = await detectEnvironment();
      reply.send({ success: true, data: env });
    } catch (err) {
      logger.error({ err }, 'Failed to detect environment');
      reply.status(500).send({ success: false, error: 'Failed to detect environment' });
    }
  });

  // Settings (protected)
  app.get('/settings', { preHandler: [authMiddleware] }, async (request, reply) => {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    for (const row of rows) settings[row.key] = row.value;
    reply.send({ success: true, data: settings });
  });

  app.patch('/settings', { preHandler: [authMiddleware] }, async (request, reply) => {
    const body = request.body as Record<string, string>;
    const db = getDb();
    const allowedKeys = ['theme', 'dashboard_name', 'lan_enabled'];

    const update = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)');
    const tx = db.transaction((entries: [string, string][]) => {
      for (const [key, value] of entries) {
        if (allowedKeys.includes(key)) {
          update.run(key, value, new Date().toISOString());
        }
      }
    });
    tx(Object.entries(body));

    reply.send({ success: true, data: { message: 'Settings updated' } });
  });

  // Terminal command execution (protected)
  app.post('/exec', { preHandler: [authMiddleware] }, async (request, reply) => {
    const { command, cwd } = (request.body as { command: string; cwd?: string }) || {};

    if (!command || typeof command !== 'string' || !command.trim()) {
      reply.status(400).send({ success: false, error: 'Command string is required' });
      return;
    }

    const startTime = Date.now();
    const config = (request as any).config;
    const workingDir = cwd || config?.dataDir || process.cwd();

    try {
      const { exec } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const execAsync = promisify(exec);

      let cmdToRun = command.trim();

      const lower = cmdToRun.toLowerCase();

      // Intercept docker ps in terminal when host docker daemon is not present
      if (lower.startsWith('docker ps') || lower.startsWith('docker container ls')) {
        try {
          const { checkLocalDocker, listAllContainers } = await import('../services/docker.js');
          const dockerStat = await checkLocalDocker();
          if (!dockerStat.daemonAvailable) {
            const containers = await listAllContainers();
            if (containers.length === 0) {
              reply.send({
                success: true,
                data: {
                  stdout: 'CONTAINER ID   IMAGE                         STATUS         PORTS\n(No containers currently installed. Go to App Store or click "Deploy docker.yaml" to install)',
                  stderr: '',
                  exitCode: 0,
                  durationMs: Date.now() - startTime,
                },
              });
              return;
            }
            let table = 'CONTAINER ID   IMAGE                         STATUS         PORTS\n';
            for (const c of containers) {
              const portStr = c.ports?.map((p) => `0.0.0.0:${p.publicPort}->${p.privatePort}/tcp`).join(', ') || 'N/A';
              table += `${c.id.padEnd(14)} ${c.image.padEnd(29)} ${c.status.padEnd(14)} ${portStr}\n`;
            }
            reply.send({
              success: true,
              data: {
                stdout: table,
                stderr: '',
                exitCode: 0,
                durationMs: Date.now() - startTime,
              },
            });
            return;
          }
        } catch {}
      }

      // On Windows PowerShell, translate common Linux/Termux commands for seamless UX
      if (process.platform === 'win32') {
        if (lower === 'uptime') {
          cmdToRun = `(Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime | ForEach-Object { "$($_.Days) days, $($_.Hours) hours, $($_.Minutes) minutes, $($_.Seconds) seconds" }`;
        } else if (lower.startsWith('free')) {
          cmdToRun = `Get-CimInstance Win32_OperatingSystem | Select-Object @{N='Total_MB';E={[math]::Round($_.TotalVisibleMemorySize/1024,1)}}, @{N='Used_MB';E={[math]::Round(($_.TotalVisibleMemorySize-$_.FreePhysicalMemory)/1024,1)}}, @{N='Free_MB';E={[math]::Round($_.FreePhysicalMemory/1024,1)}} | Format-List`;
        } else if (lower.startsWith('df')) {
          cmdToRun = `Get-PSDrive -PSProvider FileSystem | Select-Object Root, @{N='Used_GB';E={[math]::Round($_.Used/1GB,2)}}, @{N='Free_GB';E={[math]::Round($_.Free/1GB,2)}} | Format-Table`;
        } else if (lower.startsWith('termux-wake-lock')) {
          cmdToRun = `Write-Output "Wake lock active: host power management active"`;
        } else if (lower.startsWith('pkg list-installed')) {
          cmdToRun = `Write-Output "Node.js $(node -v) / npm $(npm -v) / Windows Packages"`;
        } else if (lower === 'ls -la' || lower === 'ls -l' || lower === 'ls -a') {
          cmdToRun = `Get-ChildItem -Force | Format-Table Mode, LastWriteTime, Length, Name`;
        } else if (lower.startsWith('uname')) {
          cmdToRun = `[System.Environment]::OSVersion.VersionString`;
        } else if (lower === 'ifconfig' || lower === 'ip a' || lower.includes('ip a 2>/dev/null')) {
          cmdToRun = `ipconfig`;
        } else if (lower.includes('; python3 --version || python --version')) {
          cmdToRun = `node -v; try { python --version } catch { Write-Output "python not in PATH" }`;
        }
      }

      const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/sh');

      const { stdout, stderr } = await execAsync(cmdToRun, {
        cwd: workingDir,
        shell,
        timeout: 30000,
        maxBuffer: 5 * 1024 * 1024,
      });

      const durationMs = Date.now() - startTime;
      reply.send({
        success: true,
        data: {
          stdout,
          stderr,
          exitCode: 0,
          durationMs,
        },
      });
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      reply.send({
        success: true,
        data: {
          stdout: err.stdout || '',
          stderr: err.stderr || err.message || 'Execution failed',
          exitCode: err.code || 1,
          durationMs,
        },
      });
    }
  });
}
