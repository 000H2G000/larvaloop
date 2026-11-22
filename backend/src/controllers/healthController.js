import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { getHealthStatus } from '../services/healthService.js';

export const getHealth = asyncHandler(async (_req, res) => {
  const health = await getHealthStatus();
  // 503 when a hard dependency (MongoDB) is down so load balancers / uptime monitors notice.
  const statusCode = health.status === 'ok' ? 200 : 503;
  ApiResponse.send(res, { statusCode, message: `Service is ${health.status}`, data: health });
});
