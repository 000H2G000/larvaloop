import { config } from '../config/environment.js';
import { Alert } from '../models/Alert.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

const RANK = { info: 0, warning: 1, critical: 2 };

/**
 * Opens an alert, or updates the one already open for this device + type.
 * One open alert per persistent condition (deduplication); a higher severity escalates it.
 */
export const raiseAlert = async (device, { alertType, severity, message, value = null }) => {
  const existing = await Alert.findOne({ deviceId: device.deviceId, alertType, open: true });

  if (!existing) {
    try {
      const alert = await Alert.create({
        device: device._id,
        deviceId: device.deviceId,
        trayCode: device.trayCode,
        alertType,
        severity,
        message,
        triggerValue: value,
        peakValue: value,
        lastValue: value,
      });
      logger.warn({ deviceId: device.deviceId, alertType, severity }, 'Alert raised');
      // Phase 4: emit `alert:new` over Socket.IO here.
      return alert;
    } catch (err) {
      // Two readings raced to open the same alert; the unique partial index kept one.
      if (err?.code === 11000) return Alert.findOne({ deviceId: device.deviceId, alertType, open: true });
      throw err;
    }
  }

  const update = { lastValue: value };
  if (value != null && (existing.peakValue == null || Math.abs(value) > Math.abs(existing.peakValue))) update.peakValue = value;
  if (RANK[severity] > RANK[existing.severity]) {
    Object.assign(update, { severity, message, status: 'active', acknowledgedAt: null });
    logger.warn({ deviceId: device.deviceId, alertType, severity }, 'Alert escalated');
  }
  return Alert.findByIdAndUpdate(existing._id, update, { new: true });
};

export const resolveOpenAlert = async (device, alertType) => {
  const alert = await Alert.findOneAndUpdate(
    { deviceId: device.deviceId, alertType, open: true },
    { status: 'resolved', open: false, resolvedAt: new Date(), resolvedBy: 'system' },
    { new: true },
  );
  if (alert) logger.info({ deviceId: device.deviceId, alertType }, 'Alert resolved');
  // Phase 4: emit `alert:resolved` over Socket.IO here.
  return alert;
};

const hasOpen = (openTypes, type) => openTypes.has(type);

/**
 * Applies the alert rules to one reading. Thresholds come from config (defaults match the firmware).
 * Hysteresis: an open alert only resolves once the value is back past threshold - hysteresis.
 */
export const evaluateReading = async (device, reading) => {
  const { temperature: T, humidity: H } = config.thresholds;
  const open = await Alert.find({ deviceId: device.deviceId, open: true }).select('alertType');
  const openTypes = new Set(open.map((a) => a.alertType));
  const tasks = [];

  // Flame: always critical.
  if (reading.flameDetected) {
    tasks.push(raiseAlert(device, { alertType: 'flame', severity: 'critical', message: 'Flame detected at the tray' }));
  } else if (hasOpen(openTypes, 'flame')) {
    tasks.push(resolveOpenAlert(device, 'flame'));
  }

  // Sensor error: DHT22 returned no value.
  const sensorFailed = reading.temperature == null || reading.humidity == null;
  if (sensorFailed) {
    tasks.push(raiseAlert(device, { alertType: 'sensor_error', severity: 'warning', message: 'DHT22 temperature/humidity reading failed' }));
  } else if (hasOpen(openTypes, 'sensor_error')) {
    tasks.push(resolveOpenAlert(device, 'sensor_error'));
  }

  // Temperature. Missing values never resolve or raise anything.
  const t = reading.temperature;
  if (t != null) {
    if (t >= T.critical) {
      tasks.push(raiseAlert(device, { alertType: 'temperature', severity: 'critical', message: `Temperature ${t} °C ≥ ${T.critical} °C (critical)`, value: t }));
    } else if (t >= T.warning) {
      tasks.push(raiseAlert(device, { alertType: 'temperature', severity: 'warning', message: `Temperature ${t} °C ≥ ${T.warning} °C`, value: t }));
    } else if (hasOpen(openTypes, 'temperature') && t < T.warning - T.hysteresis) {
      tasks.push(resolveOpenAlert(device, 'temperature'));
    }
  }

  // Humidity: outside [min, max].
  const h = reading.humidity;
  if (h != null) {
    if (h < H.min || h > H.max) {
      const side = h < H.min ? `below ${H.min}` : `above ${H.max}`;
      tasks.push(raiseAlert(device, { alertType: 'humidity', severity: 'warning', message: `Humidity ${h} % ${side} %`, value: h }));
    } else if (hasOpen(openTypes, 'humidity') && h >= H.min + H.hysteresis && h <= H.max - H.hysteresis) {
      tasks.push(resolveOpenAlert(device, 'humidity'));
    }
  }

  await Promise.all(tasks);
};

// ---------- Dashboard ----------

export const listAlerts = async ({ status, alertType, trayCode, page, limit }) => {
  const filter = {};
  if (status === 'open') filter.open = true;
  else if (status !== 'all') filter.status = status;
  if (alertType) filter.alertType = alertType;
  if (trayCode) filter.trayCode = trayCode.toUpperCase();

  const [items, total] = await Promise.all([
    Alert.find(filter)
      .sort({ open: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Alert.countDocuments(filter),
  ]);
  return { items, total };
};

export const acknowledgeAlert = async (id) => {
  const alert = await Alert.findById(id);
  if (!alert) throw ApiError.notFound('Alert not found');
  if (alert.status !== 'active') throw ApiError.conflict(`Alert is already ${alert.status}`, { code: 'ALERT_NOT_ACTIVE' });
  alert.status = 'acknowledged';
  alert.acknowledgedAt = new Date();
  return alert.save();
};

/** Manual resolve. If the condition persists, the next reading opens a new alert. */
export const resolveAlert = async (id) => {
  const alert = await Alert.findById(id);
  if (!alert) throw ApiError.notFound('Alert not found');
  if (alert.status === 'resolved') throw ApiError.conflict('Alert is already resolved', { code: 'ALERT_RESOLVED' });
  Object.assign(alert, { status: 'resolved', open: false, resolvedAt: new Date(), resolvedBy: 'user' });
  return alert.save();
};
