import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as deviceService from '../services/deviceService.js';

export const listDevices = asyncHandler(async (_req, res) => {
  ApiResponse.ok(res, await deviceService.listDevices());
});
