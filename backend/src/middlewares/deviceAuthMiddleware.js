import { Device } from '../models/Device.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyApiKey } from '../utils/deviceKeys.js';

/**
 * Device authentication: X-Device-Id + X-Api-Key headers (per-device key).
 * Separate from dashboard/user auth. Sets req.device.
 */
export const authenticateDevice = asyncHandler(async (req, _res, next) => {
  const deviceId = req.get('x-device-id')?.trim();
  const apiKey = req.get('x-api-key')?.trim();
  if (!deviceId || !apiKey) {
    throw ApiError.unauthorized('Missing X-Device-Id or X-Api-Key header', { code: 'DEVICE_AUTH_REQUIRED' });
  }

  const device = await Device.findOne({ deviceId }).select('+apiKeyHash');
  // Same error for unknown device and wrong key, so device ids cannot be probed.
  if (!device || !verifyApiKey(apiKey, device.apiKeyHash)) {
    throw ApiError.unauthorized('Invalid device credentials', { code: 'DEVICE_AUTH_INVALID' });
  }
  if (!device.isActive) throw ApiError.forbidden('Device is disabled', { code: 'DEVICE_DISABLED' });

  req.device = device;
  next();
});
