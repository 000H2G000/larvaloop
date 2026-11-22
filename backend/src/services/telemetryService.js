import { config } from '../config/environment.js';
import { Device } from '../models/Device.js';
import { SensorReading } from '../models/SensorReading.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { evaluateReading } from './alertService.js';
import { markSeen } from './deviceService.js';

/**
 * Stores one ESP32 reading, updates the device and evaluates alerts.
 * Returns { reading, duplicate }.
 */
export const ingestTelemetry = async (device, payload) => {
  if (payload.deviceId !== device.deviceId) {
    throw ApiError.forbidden('deviceId in body does not match the authenticated device', { code: 'DEVICE_MISMATCH' });
  }
  if (payload.trayCode.toUpperCase() !== device.trayCode) {
    throw ApiError.badRequest(`Device ${device.deviceId} is registered to tray ${device.trayCode}`, { code: 'TRAY_MISMATCH' });
  }

  // Optional `sequence`: a resend of the last reading is acknowledged but not stored twice.
  if (payload.sequence != null && payload.sequence === device.lastSequence) {
    await markSeen(device, payload);
    return { reading: null, duplicate: true };
  }

  const reading = await SensorReading.create({
    device: device._id,
    deviceId: device.deviceId,
    trayCode: device.trayCode,
    temperature: payload.temperature,
    humidity: payload.humidity,
    flameDetected: payload.flameDetected,
    servoAngle: payload.servoAngle,
    systemStatus: payload.systemStatus,
    sequence: payload.sequence ?? null,
    recordedAt: new Date(),
  });

  await markSeen(device, payload);
  // Alert evaluation failing must not lose the reading or make the device retry.
  await evaluateReading(device, reading).catch((err) => logger.error({ err: err.message }, 'Alert evaluation failed'));
  // Phase 4: emit `sensor:update` over Socket.IO here.

  return { reading, duplicate: false };
};

/** Latest reading per device, with the device's connection state and the alert thresholds. */
export const getLatest = async ({ trayCode, deviceId }) => {
  const filter = {};
  if (trayCode) filter.trayCode = trayCode.toUpperCase();
  if (deviceId) filter.deviceId = deviceId;
  const devices = await Device.find(filter).sort({ deviceId: 1 });
  const items = await Promise.all(
    devices.map(async (device) => ({
      device,
      reading: await SensorReading.findOne({ device: device._id }).sort({ recordedAt: -1 }),
    })),
  );
  return { items, thresholds: config.thresholds, offlineAfterSeconds: config.deviceOfflineAfterMs / 1000 };
};

/** Readings in a time window, oldest first (for charts). Defaults to the last hour. */
export const getHistory = async ({ trayCode, deviceId, from, to, limit }) => {
  const end = to ?? new Date();
  const start = from ?? new Date(end.getTime() - 60 * 60 * 1000);
  const filter = { recordedAt: { $gte: start, $lte: end } };
  if (trayCode) filter.trayCode = trayCode.toUpperCase();
  if (deviceId) filter.deviceId = deviceId;

  // Newest `limit` readings in the window, returned in chronological order.
  const readings = await SensorReading.find(filter)
    .sort({ recordedAt: -1 })
    .limit(limit)
    .select('-device -sequence')
    .lean();
  return { readings: readings.reverse(), from: start, to: end };
};
