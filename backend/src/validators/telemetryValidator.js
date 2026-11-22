import { z } from 'zod';
import { SYSTEM_STATUSES } from '../models/SensorReading.js';

const code = z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/, 'Letters, digits, _ and - only');

/** Payload sent by the ESP32 (docs/device-protocol.md). null = sensor read failed. */
export const telemetryBody = z
  .object({
    deviceId: code,
    trayCode: code,
    temperature: z.number().min(-40).max(80).nullable(), // DHT22 range
    humidity: z.number().min(0).max(100).nullable(),
    flameDetected: z.boolean(),
    servoAngle: z.number().int().min(0).max(180), // SG90 range
    systemStatus: z.enum(SYSTEM_STATUSES),
    sequence: z.number().int().nonnegative().optional(),
    firmwareVersion: z.string().max(40).optional(),
  })
  .strict();

const range = {
  trayCode: code.optional(),
  deviceId: code.optional(),
};

export const latestQuery = z.object(range);

export const historyQuery = z
  .object({
    ...range,
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    limit: z.coerce.number().int().min(1).max(5000).default(1000),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: '"from" must be before "to"', path: ['from'] });
