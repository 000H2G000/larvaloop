import { z } from 'zod';
import mongoose from 'mongoose';
import { IMAGE_SOURCES } from '../models/Image.js';

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid id');
const trayCode = z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/, 'Letters, digits, _ and - only');

export const imageIdParams = z.object({ id: objectId });

export const uploadImageBody = z.object({
  trayCode: trayCode.optional(),
  source: z.enum(IMAGE_SOURCES).optional(),
  capturedAt: z.coerce.date().optional(),
});

export const listImagesQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  trayCode: trayCode.optional(),
});
