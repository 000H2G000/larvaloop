import 'dotenv/config';
import path from 'node:path';
import { z } from 'zod';

const PLACEHOLDER = 'replace_with_secure_secret';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('1d'),

  FASTAPI_BASE_URL: z.string().url().default('http://localhost:8000'),
  FASTAPI_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),

  UPLOAD_DIR: z.string().default('uploads'),
  UPLOAD_MAX_MB: z.coerce.number().positive().default(10),

  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  SOCKET_CORS_ORIGIN: z.string().default('http://localhost:3000'),

  DEVICE_API_KEY_SECRET: z.string().min(16, 'DEVICE_API_KEY_SECRET must be at least 16 characters'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  // Per-device ingestion limit (requests per minute); devices are excluded from the global limiter.
  DEVICE_RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(60),

  // Alert thresholds. Defaults match the ESP32 firmware (28 / 30 °C, 1 °C hysteresis).
  TEMP_WARNING_C: z.coerce.number().default(28),
  TEMP_CRITICAL_C: z.coerce.number().default(30),
  TEMP_HYSTERESIS_C: z.coerce.number().min(0).default(1),
  HUMIDITY_MIN_PCT: z.coerce.number().min(0).max(100).default(40),
  HUMIDITY_MAX_PCT: z.coerce.number().min(0).max(100).default(80),
  HUMIDITY_HYSTERESIS_PCT: z.coerce.number().min(0).default(2),
  // The firmware sends every 5 s; 6 missed readings = offline.
  DEVICE_OFFLINE_AFTER_S: z.coerce.number().int().positive().default(30),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Logger is not available yet (it depends on this module), so use stderr directly.
  // Only variable names and messages are printed, never values.
  const details = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`Invalid environment configuration:\n${details}`);
  process.exit(1);
}

const env = parsed.data;

if (env.NODE_ENV === 'production') {
  const insecure = [env.JWT_SECRET, env.DEVICE_API_KEY_SECRET].some((s) => s === PLACEHOLDER);
  if (insecure) {
    console.error('Refusing to start in production with placeholder secrets.');
    process.exit(1);
  }
}

const splitOrigins = (value) =>
  value
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

export const config = Object.freeze({
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  mongodbUri: env.MONGODB_URI,
  jwt: { secret: env.JWT_SECRET, expiresIn: env.JWT_EXPIRES_IN },
  fastapi: { baseUrl: env.FASTAPI_BASE_URL.replace(/\/+$/, ''), timeoutMs: env.FASTAPI_TIMEOUT_MS },
  uploads: { dir: path.resolve(env.UPLOAD_DIR), maxBytes: Math.round(env.UPLOAD_MAX_MB * 1024 * 1024) },
  cors: { origins: splitOrigins(env.CORS_ORIGIN) },
  socket: { corsOrigins: splitOrigins(env.SOCKET_CORS_ORIGIN) },
  deviceApiKeySecret: env.DEVICE_API_KEY_SECRET,
  logLevel: env.LOG_LEVEL,
  rateLimit: { windowMs: env.RATE_LIMIT_WINDOW_MS, max: env.RATE_LIMIT_MAX, devicePerMinute: env.DEVICE_RATE_LIMIT_PER_MIN },
  thresholds: Object.freeze({
    temperature: { warning: env.TEMP_WARNING_C, critical: env.TEMP_CRITICAL_C, hysteresis: env.TEMP_HYSTERESIS_C },
    humidity: { min: env.HUMIDITY_MIN_PCT, max: env.HUMIDITY_MAX_PCT, hysteresis: env.HUMIDITY_HYSTERESIS_PCT },
  }),
  deviceOfflineAfterMs: env.DEVICE_OFFLINE_AFTER_S * 1000,
});
