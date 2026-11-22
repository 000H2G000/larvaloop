import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as telemetryService from '../services/telemetryService.js';

export const postTelemetry = asyncHandler(async (req, res) => {
  const { reading, duplicate } = await telemetryService.ingestTelemetry(req.device, req.body);
  if (duplicate) {
    return ApiResponse.ok(res, { deviceId: req.device.deviceId, duplicate: true }, 'Duplicate telemetry ignored');
  }
  ApiResponse.created(res, { deviceId: reading.deviceId, recordedAt: reading.recordedAt }, 'Telemetry received successfully');
});

export const getLatest = asyncHandler(async (req, res) => {
  ApiResponse.ok(res, await telemetryService.getLatest(req.query));
});

export const getHistory = asyncHandler(async (req, res) => {
  ApiResponse.ok(res, await telemetryService.getHistory(req.query));
});
