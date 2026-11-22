import { config } from '../config/environment.js';
import { getDatabaseState, isDatabaseConnected } from '../config/database.js';
import { checkHealth as checkVision } from './fastapiService.js';

/**
 * MongoDB is a hard dependency (drives ok/degraded and the 503).
 * The vision service is optional: it is reported but does not degrade the API.
 */
export const getHealthStatus = async () => ({
  status: isDatabaseConnected() ? 'ok' : 'degraded',
  service: 'acorn2protein-backend',
  environment: config.env,
  uptimeSeconds: Math.round(process.uptime()),
  timestamp: new Date().toISOString(),
  dependencies: {
    mongodb: getDatabaseState(),
    vision: (await checkVision()).status,
  },
});
