import { createServer } from 'node:http';
import { app } from './app.js';
import { pool } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { initSocketServer } from './sockets/index.js';

const httpServer = createServer(app);
initSocketServer(httpServer);

const server = httpServer.listen(env.port, () => {
  logger.info({ port: env.port }, 'SyncSpace API listening');
});

let shuttingDown = false;
const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Graceful shutdown started');
  const forceExit = setTimeout(() => {
    logger.error('Graceful shutdown timed out');
    process.exit(1);
  }, env.shutdownTimeoutMs).unref();
  server.close(async () => {
    await pool.end();
    clearTimeout(forceExit);
    logger.info('Graceful shutdown complete');
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
