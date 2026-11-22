import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config/environment.js';
import * as telemetry from '../controllers/telemetryController.js';
import { authenticateDevice } from '../middlewares/deviceAuthMiddleware.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { historyQuery, latestQuery, telemetryBody } from '../validators/telemetryValidator.js';

const router = Router();

// Devices are excluded from the global limiter (app.js) and limited per device id instead.
const deviceLimiter = rateLimit({
  windowMs: 60_000,
  max: config.rateLimit.devicePerMinute,
  keyGenerator: (req) => `device:${req.get('x-device-id') ?? req.ip}`,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  message: { success: false, message: 'Too many telemetry requests', code: 'RATE_LIMITED' },
});

router.post('/', deviceLimiter, authenticateDevice, validate({ body: telemetryBody }), telemetry.postTelemetry);

// TODO(Phase 2): dashboard reads require user JWT auth.
router.get('/latest', validate({ query: latestQuery }), telemetry.getLatest);
router.get('/history', validate({ query: historyQuery }), telemetry.getHistory);

export default router;
