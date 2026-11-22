import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as alertService from '../services/alertService.js';

export const listAlerts = asyncHandler(async (req, res) => {
  const { items, total } = await alertService.listAlerts(req.query);
  ApiResponse.paginated(res, items, { page: req.query.page, limit: req.query.limit, total });
});

export const acknowledgeAlert = asyncHandler(async (req, res) => {
  ApiResponse.ok(res, await alertService.acknowledgeAlert(req.params.id), 'Alert acknowledged');
});

export const resolveAlert = asyncHandler(async (req, res) => {
  ApiResponse.ok(res, await alertService.resolveAlert(req.params.id), 'Alert resolved');
});
