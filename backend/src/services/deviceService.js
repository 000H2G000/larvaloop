import { config } from '../config/environment.js';
import { Device } from '../models/Device.js';
import { generateApiKey, hashApiKey } from '../utils/deviceKeys.js';
import { logger } from '../utils/logger.js';
import { raiseAlert, resolveOpenAlert } from './alertService.js';

export const listDevices = () => Device.find().sort({ deviceId: 1 });

/** Creates a device, or rotates its key. Returns the plain key once; only its hash is stored. */
export const registerDevice = async ({ deviceId, trayCode, name }) => {
  const apiKey = generateApiKey();
  const device = await Device.findOneAndUpdate(
    { deviceId },
    { $set: { trayCode, name: name ?? deviceId, apiKeyHash: hashApiKey(apiKey), isActive: true } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return { device, apiKey };
};

/** Called on every accepted reading. */
export const markSeen = async (device, { sequence, firmwareVersion }) => {
  const wasOffline = device.connectionStatus !== 'online';
  const update = { lastSeen: new Date(), connectionStatus: 'online' };
  if (sequence != null) update.lastSequence = sequence;
  if (firmwareVersion) update.firmwareVersion = firmwareVersion;
  await Device.updateOne({ _id: device._id }, update);
  if (wasOffline) {
    logger.info({ deviceId: device.deviceId }, 'Device online');
    await resolveOpenAlert(device, 'device_offline');
    // Phase 4: emit `device:status` over Socket.IO here.
  }
};

const checkOffline = async () => {
  const cutoff = new Date(Date.now() - config.deviceOfflineAfterMs);
  const stale = await Device.find({ connectionStatus: 'online', lastSeen: { $lt: cutoff } });
  for (const device of stale) {
    await Device.updateOne({ _id: device._id, connectionStatus: 'online' }, { connectionStatus: 'offline' });
    const seconds = Math.round((Date.now() - device.lastSeen.getTime()) / 1000);
    await raiseAlert(device, {
      alertType: 'device_offline',
      severity: 'warning',
      message: `No data from ${device.deviceId} for ${seconds} s`,
    });
    logger.warn({ deviceId: device.deviceId, seconds }, 'Device offline');
  }
};

let timer = null;

export const startOfflineMonitor = () => {
  if (timer) return;
  const every = Math.min(10_000, config.deviceOfflineAfterMs / 2);
  timer = setInterval(() => checkOffline().catch((err) => logger.error({ err: err.message }, 'Offline check failed')), every);
  timer.unref();
};

export const stopOfflineMonitor = () => {
  clearInterval(timer);
  timer = null;
};
