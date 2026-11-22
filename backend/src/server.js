import http from 'node:http';
import { config } from './config/environment.js';
import { logger } from './utils/logger.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { createApp } from './app.js';
import { failInterruptedAnalyses } from './services/imageService.js';
import { startOfflineMonitor, stopOfflineMonitor } from './services/deviceService.js';

const app = createApp();
const server = http.createServer(app); // Socket.IO will attach to this server in Phase 4.

let shuttingDown = false;

const shutdown = async (signal, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Shutting down');
  stopOfflineMonitor();

  // Force exit if connections refuse to drain.
  const force = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
  force.unref();

  server.close(async () => {
    try {
      await disconnectDatabase();
    } finally {
      process.exit(exitCode);
    }
  });
};

const start = async () => {
  try {
    await connectDatabase();
    await failInterruptedAnalyses();
    startOfflineMonitor();
  } catch (err) {
    logger.fatal({ err: err.message }, 'Could not connect to MongoDB. Check MONGODB_URI and that MongoDB is running.');
    process.exit(1);
  }

  server.listen(config.port, () => {
    logger.info({ port: config.port, env: config.env }, 'ACORN2PROTEIN backend listening');
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  shutdown('uncaughtException', 1);
});

start();
