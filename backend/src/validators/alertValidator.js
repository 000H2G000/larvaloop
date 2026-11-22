import { z } from 'zod';
import mongoose from 'mongoose';
import { ALERT_TYPES } from '../models/Alert.js';

export const alertIdParams = z.object({
  id: z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid id'),
});

export const listAlertsQuery = z.object({
  // open = active + acknowledged
  status: z.enum(['open', 'active', 'acknowledged', 'resolved', 'all']).default('open'),
  alertType: z.enum(ALERT_TYPES).optional(),
  trayCode: z.string().trim().max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
