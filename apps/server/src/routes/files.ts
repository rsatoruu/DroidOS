/**
 * File manager routes – browse, upload, download, delete, rename, move
 * Implements strict path traversal protection
 */
import type { FastifyInstance } from 'fastify';
import { resolve, join, relative, basename, dirname } from 'node:path';
import { stat, readdir, readFile, writeFile, mkdir, rename, rm, copyFile } from 'node:fs/promises';
import { existsSync, createReadStream } from 'node:fs';
import { getConfig } from '../config/index.js';
import { logger } from '../logger.js';
import { homedir } from 'node:os';

// Allowed root directories for file browsing
function getAllowedRoots(config: ReturnType<typeof getConfig>): string[] {
  const roots = [config.dataDir, config.appsDir];
  const home = homedir();
  if (!roots.includes(home)) roots.push(home);
  return roots.map((r) => resolve(r));
}

/** Path traversal protection – ensures resolved path stays within an allowed root */
function validatePath(requestedPath: string, allowedRoots: string[]): string {
  const resolved = resolve(requestedPath);
  const normalizedResolved = resolved.replace(/\\/g, '/');
  for (const root of allowedRoots) {
    const normalizedRoot = resolve(root).replace(/\\/g, '/');
    if (normalizedResolved.startsWith(normalizedRoot + '/') || normalizedResolved === normalizedRoot) {
      return resolved;
    }
  }
  throw new Error(`Access denied: ${requestedPath} is outside allowed directories`);
}

export async function fileRoutes(app: FastifyInstance) {
  const config = getConfig();

  // List directory
  app.get('/list', async (request, reply) => {
    const { path: reqPath } = request.query as { path?: string };
    const roots = getAllowedRoots(config);
    const targetPath = reqPath ? reqPath : config.dataDir;

    let safePath: string;
    try {
      safePath = validatePath(targetPath, roots);
    } catch {
      reply.status(403).send({ success: false, error: 'Access denied' });
      return;
    }

    try {
      const entries = await readdir(safePath, { withFileTypes: true });
      const items = await Promise.all(
        entries.map(async (entry) => {
          const fullPath = join(safePath, entry.name);
          let size = 0;
          let mtime = '';
          try {
            const s = await stat(fullPath);
            size = s.size;
            mtime = s.mtime.toISOString();
          } catch {}
          return {
            name: entry.name,
            path: fullPath,
            relativePath: relative(config.dataDir, fullPath),
            isDirectory: entry.isDirectory(),
            isFile: entry.isFile(),
            size,
            mtime,
          };
        }),
      );
      reply.send({
        success: true,
        data: {
          path: safePath,
          parent: dirname(safePath),
          items: items.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
          }),
          allowedRoots: roots,
        },
      });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Download file
  app.get('/download', async (request, reply) => {
    const { path: reqPath } = request.query as { path?: string };
    if (!reqPath) {
      reply.status(400).send({ success: false, error: 'path is required' });
      return;
    }

    const roots = getAllowedRoots(config);
    let safePath: string;
    try {
      safePath = validatePath(reqPath, roots);
    } catch {
      reply.status(403).send({ success: false, error: 'Access denied' });
      return;
    }

    try {
      const s = await stat(safePath);
      if (!s.isFile()) {
        reply.status(400).send({ success: false, error: 'Not a file' });
        return;
      }
      reply.header('Content-Disposition', `attachment; filename="${basename(safePath)}"`);
      reply.header('Content-Length', s.size);
      const stream = createReadStream(safePath);
      return reply.send(stream);
    } catch {
      reply.status(404).send({ success: false, error: 'File not found' });
    }
  });

  // Read text file
  app.get('/read', async (request, reply) => {
    const { path: reqPath } = request.query as { path?: string };
    if (!reqPath) {
      reply.status(400).send({ success: false, error: 'path is required' });
      return;
    }
    const roots = getAllowedRoots(config);
    let safePath: string;
    try {
      safePath = validatePath(reqPath, roots);
    } catch {
      reply.status(403).send({ success: false, error: 'Access denied' });
      return;
    }
    try {
      const content = await readFile(safePath, 'utf-8');
      reply.send({ success: true, data: { content, path: safePath } });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Write text file
  app.put('/write', async (request, reply) => {
    const { path: reqPath, content } = request.body as { path: string; content: string };
    const roots = getAllowedRoots(config);
    let safePath: string;
    try {
      safePath = validatePath(reqPath, roots);
    } catch {
      reply.status(403).send({ success: false, error: 'Access denied' });
      return;
    }
    try {
      await writeFile(safePath, content, 'utf-8');
      reply.send({ success: true, data: { message: 'File saved' } });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Create folder
  app.post('/mkdir', async (request, reply) => {
    const { path: reqPath } = request.body as { path: string };
    const roots = getAllowedRoots(config);
    let safePath: string;
    try {
      safePath = validatePath(reqPath, roots);
    } catch {
      reply.status(403).send({ success: false, error: 'Access denied' });
      return;
    }
    try {
      await mkdir(safePath, { recursive: true });
      reply.send({ success: true, data: { message: 'Folder created' } });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Rename
  app.post('/rename', async (request, reply) => {
    const { from, to } = request.body as { from: string; to: string };
    const roots = getAllowedRoots(config);
    try {
      const safeFrom = validatePath(from, roots);
      const safeTo = validatePath(to, roots);
      await rename(safeFrom, safeTo);
      reply.send({ success: true, data: { message: 'Renamed' } });
    } catch (err: any) {
      if (err.message.includes('Access denied')) {
        reply.status(403).send({ success: false, error: 'Access denied' });
      } else {
        reply.status(500).send({ success: false, error: err.message });
      }
    }
  });

  // Delete
  app.delete('/delete', async (request, reply) => {
    const { paths } = request.body as { paths: string[] };
    if (!Array.isArray(paths) || paths.length === 0) {
      reply.status(400).send({ success: false, error: 'paths must be a non-empty array' });
      return;
    }
    const roots = getAllowedRoots(config);
    try {
      for (const p of paths) {
        const safePath = validatePath(p, roots);
        await rm(safePath, { recursive: true, force: true });
      }
      reply.send({ success: true, data: { message: `Deleted ${paths.length} item(s)` } });
    } catch (err: any) {
      if (err.message.includes('Access denied')) {
        reply.status(403).send({ success: false, error: 'Access denied' });
      } else {
        reply.status(500).send({ success: false, error: err.message });
      }
    }
  });

  // Upload file (multipart)
  app.post('/upload', async (request, reply) => {
    const { path: destDir } = request.query as { path?: string };
    if (!destDir) {
      reply.status(400).send({ success: false, error: 'path query parameter is required' });
      return;
    }
    const roots = getAllowedRoots(config);
    let safeDir: string;
    try {
      safeDir = validatePath(destDir, roots);
    } catch {
      reply.status(403).send({ success: false, error: 'Access denied' });
      return;
    }

    try {
      const parts = request.files();
      const uploaded: string[] = [];

      for await (const part of parts) {
        const safeName = basename(part.filename).replace(/[^a-zA-Z0-9._\-]/g, '_');
        const destPath = join(safeDir, safeName);
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) {
          chunks.push(chunk);
        }
        await writeFile(destPath, Buffer.concat(chunks));
        uploaded.push(safeName);
      }

      reply.send({ success: true, data: { uploaded } });
    } catch (err: any) {
      reply.status(500).send({ success: false, error: err.message });
    }
  });

  // Storage info
  app.get('/storage', async (request, reply) => {
    // Report on known data directory
    try {
      const { checkDiskSpace } = await import('../services/monitoring.js');
      const space = await checkDiskSpace(config.dataDir);
      reply.send({ success: true, data: space });
    } catch (err: any) {
      reply.send({ success: true, data: { available: false, error: err.message } });
    }
  });
}
