/**
 * DroidOS Server – Entry Point
 * Fastify-based REST + WebSocket server for the DroidOS platform
 */
import 'dotenv/config';
import { buildApp } from './app.js';
import { getConfig } from './config/index.js';
import { initDatabase } from './db/index.js';
import { logger } from './logger.js';
import { DROIDOS_NAME, DROIDOS_VERSION } from '@droidos/shared';

async function main() {
  const config = getConfig();

  logger.info(`Starting ${DROIDOS_NAME} v${DROIDOS_VERSION}`);
  logger.info(`Node.js ${process.version} | PID ${process.pid}`);

  // Initialize SQLite database and run migrations
  await initDatabase(config.dataDir);

  // Initialize simulated container services (e.g. 9router on port 20128, headroom on 8787)
  const { initManagedContainerServices } = await import('./services/managedContainerRunner.js');
  await initManagedContainerServices();

  // Build Fastify application
  const app = await buildApp(config);

  // Start listening
  try {
    const address = await app.listen({
      port: config.port,
      host: config.host,
    });
    logger.info(`Server listening at ${address}`);
    logger.info(`Dashboard: http://${config.host === '0.0.0.0' ? 'localhost' : config.host}:${config.port}`);
    if (config.host === '0.0.0.0') {
      logger.info('LAN access enabled – open from another device on the same network');
    }
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
