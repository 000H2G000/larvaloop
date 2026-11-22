import pino from 'pino';
import { config } from '../config/environment.js';

// Fields that must never reach the logs.
const redact = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'req.body.password',
  'req.body.apiKey',
  '*.password',
  '*.apiKey',
  '*.token',
  '*.mongodbUri',
];

export const logger = pino({
  level: config.isTest ? 'silent' : config.logLevel,
  redact: { paths: redact, censor: '[REDACTED]' },
  ...(config.isProduction
    ? {}
    : { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } } }),
});
