import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config/environment.js';
import { Image } from '../models/Image.js';
import { ImageAnalysis } from '../models/ImageAnalysis.js';
import { IMAGES_SUBDIR } from '../middlewares/uploadMiddleware.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import * as fastapi from './fastapiService.js';

const ANNOTATED_SUBDIR = 'annotated';
const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 120_000;

/** Resolves a stored relative path and refuses anything outside UPLOAD_DIR. */
const resolveUpload = (relativePath) => {
  const absolute = path.resolve(config.uploads.dir, relativePath);
  if (!absolute.startsWith(config.uploads.dir + path.sep)) throw ApiError.notFound('File not found');
  return absolute;
};

// ---------- Images ----------

export const createImage = async ({ file, trayCode, source, capturedAt }) =>
  Image.create({
    trayCode,
    source,
    capturedAt,
    filename: file.filename,
    originalName: file.originalname?.slice(0, 200),
    imagePath: path.join(IMAGES_SUBDIR, file.filename),
    mimeType: file.mimetype,
    sizeBytes: file.size,
  });

export const listImages = async ({ page, limit, trayCode }) => {
  const filter = trayCode ? { trayCode: trayCode.toUpperCase() } : {};
  const [items, total] = await Promise.all([
    Image.find(filter)
      .sort({ capturedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('latestAnalysis', 'status larvaeCount lengthMm calibrated confidence completedAt'),
    Image.countDocuments(filter),
  ]);
  return { items, total };
};

export const getImage = async (id) => {
  const image = await Image.findById(id).populate('latestAnalysis');
  if (!image) throw ApiError.notFound('Image not found');
  return image;
};

export const getImageFile = async (id) => {
  const image = await Image.findById(id);
  if (!image) throw ApiError.notFound('Image not found');
  return { absolutePath: resolveUpload(image.imagePath), mimeType: image.mimeType };
};

// ---------- Analysis ----------

export const getLatestAnalysis = async (imageId) => {
  const image = await Image.findById(imageId).select('latestAnalysis');
  if (!image) throw ApiError.notFound('Image not found');
  if (!image.latestAnalysis) throw ApiError.notFound('This image has not been analysed yet', { code: 'NO_ANALYSIS' });
  return ImageAnalysis.findById(image.latestAnalysis);
};

export const getAnnotatedFile = async (imageId) => {
  const analysis = await getLatestAnalysis(imageId);
  if (!analysis.annotatedImagePath) throw ApiError.notFound('No annotated image for this analysis');
  return { absolutePath: resolveUpload(analysis.annotatedImagePath), mimeType: 'image/jpeg' };
};

const setStatus = (analysis, status, extra = {}) =>
  Promise.all([
    ImageAnalysis.updateOne({ _id: analysis._id }, { status, ...extra }),
    Image.updateOne({ _id: analysis.image }, { analysisStatus: status }),
  ]);

const saveAnnotated = async (analysisId, dataUrl) => {
  const match = /^data:image\/jpeg;base64,(.+)$/.exec(dataUrl ?? '');
  if (!match) return null;
  const relative = path.join(ANNOTATED_SUBDIR, `${analysisId}.jpg`);
  await fs.mkdir(path.join(config.uploads.dir, ANNOTATED_SUBDIR), { recursive: true });
  await fs.writeFile(resolveUpload(relative), Buffer.from(match[1], 'base64'));
  return relative;
};

const storeResult = async (analysis, result) => {
  const annotatedImagePath = await saveAnnotated(analysis._id, result.annotatedImage);
  await setStatus(analysis, 'completed', {
    larvaeCount: result.larvaeCount ?? null,
    calibrated: result.calibrated ?? null,
    mmPerPx: result.mmPerPx ?? null,
    lengthMm: result.lengthMm ?? {},
    detections: result.detections ?? [],
    confidence: result.meanConfidence ?? null,
    modelVersion: result.modelVersion ?? null,
    processingTimeMs: result.processingTimeMs ?? null,
    notes: result.notes ?? [],
    annotatedImagePath,
    completedAt: new Date(),
  });
  logger.info({ analysisId: String(analysis._id), larvae: result.larvaeCount }, 'Image analysis completed');
  // Phase 4: emit `image:analysis:completed` over Socket.IO here.
};

/** Follows a FastAPI job in the background. Never throws: failures are stored on the analysis. */
const trackJob = async (analysis) => {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  try {
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const job = await fastapi.getJob(analysis.jobId);
      if (job.status === 'completed') return await storeResult(analysis, job.result);
      if (job.status === 'failed') return await setStatus(analysis, 'failed', { error: job.error ?? 'Analysis failed' });
      if (job.status === 'processing') await setStatus(analysis, 'processing');
    }
    await setStatus(analysis, 'failed', { error: 'Analysis timed out' });
  } catch (err) {
    logger.warn({ err: err.message, analysisId: String(analysis._id) }, 'Image analysis tracking failed');
    await setStatus(analysis, 'failed', { error: err.message }).catch(() => {});
  }
};

/** Starts an analysis and returns immediately; the result arrives via GET /images/:id/analysis. */
export const startAnalysis = async (imageId) => {
  const image = await Image.findById(imageId);
  if (!image) throw ApiError.notFound('Image not found');
  if (['pending', 'processing'].includes(image.analysisStatus)) {
    throw ApiError.conflict('An analysis is already running for this image', { code: 'ANALYSIS_IN_PROGRESS' });
  }

  const analysis = await ImageAnalysis.create({ image: image._id, trayCode: image.trayCode, status: 'pending' });
  image.latestAnalysis = analysis._id;
  image.analysisStatus = 'pending';
  await image.save();

  try {
    analysis.jobId = await fastapi.submitAnalysis({
      absolutePath: resolveUpload(image.imagePath),
      mimeType: image.mimeType,
      filename: image.filename,
    });
    await analysis.save();
  } catch (err) {
    await setStatus(analysis, 'failed', { error: err.message });
    throw err;
  }

  trackJob(analysis); // intentionally not awaited
  return analysis;
};

/** Analyses left pending by a restart can never finish; mark them failed on boot. */
export const failInterruptedAnalyses = async () => {
  const stale = await ImageAnalysis.find({ status: { $in: ['pending', 'processing'] } }).select('_id image');
  for (const a of stale) await setStatus(a, 'failed', { error: 'Interrupted by a server restart' });
  if (stale.length) logger.warn({ count: stale.length }, 'Marked interrupted image analyses as failed');
};
