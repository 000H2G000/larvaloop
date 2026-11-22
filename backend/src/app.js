import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { config } from './config/environment.js';
import { logger } from './utils/logger.js';
import routes from './routes/index.js';
import { notFoundMiddleware } from './middlewares/notFoundMiddleware.js';
import { errorMiddleware } from './middlewares/errorMiddleware.js';

export const createApp = () => {
  const app = express();

  // Needed for correct client IPs (rate limiting) behind a reverse proxy.
  if (config.isProduction) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      origin: config.cors.origins,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Id', 'X-Api-Key'],
      credentials: true,
    }),
  );

  app.use(
    pinoHttp({
      logger,
      // Health checks are noisy; log them at debug level only.
      customLogLevel: (req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return req.url.startsWith('/api/v1/health') ? 'debug' : 'info';
      },
    }),
  );

  app.use(
    '/api',
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
      // Device ingestion has its own per-device limiter (telemetryRoutes.js).
      skip: (req) => req.method === 'POST' && req.path === '/v1/telemetry',
      message: { success: false, message: 'Too many requests, please try again later', code: 'RATE_LIMITED' },
    }),
  );

  app.use(express.json({ limit: '100kb' }));

  app.use('/api/v1', routes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};

export default createApp;
