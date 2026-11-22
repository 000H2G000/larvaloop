import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config/environment.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

/**
 * HTTP client for the FastAPI computer vision service (backend.md §7).
 * Timeouts on every call; idempotent reads are retried on network errors and 5xx.
 */

const RETRYABLE = (status) => status >= 500 || status === 429;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const request = async (urlPath, { method = 'GET', body, retries = 0, timeoutMs = config.fastapi.timeoutMs } = {}) => {
  const url = `${config.fastapi.baseUrl}${urlPath}`;
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(url, { method, body, signal: AbortSignal.timeout(timeoutMs) });
    } catch (err) {
      if (attempt < retries) {
        await sleep(500 * 2 ** attempt);
        continue;
      }
      const reason = err.name === 'TimeoutError' ? 'timed out' : 'is unreachable';
      throw ApiError.serviceUnavailable(`Vision service ${reason}`, { code: 'VISION_UNAVAILABLE' });
    }

    if (RETRYABLE(res.status) && attempt < retries) {
      await sleep(500 * 2 ** attempt);
      continue;
    }

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      logger.warn({ status: res.status, url: urlPath, message: json?.message }, 'Vision service error');
      throw ApiError.badGateway(json?.message ?? `Vision service returned HTTP ${res.status}`, { code: 'VISION_ERROR' });
    }
    return json.data;
  }
};

export const checkHealth = async () => {
  try {
    const data = await request('/health', { timeoutMs: 2000 });
    return { status: 'up', modelVersion: data.modelVersion ?? null };
  } catch {
    return { status: 'down', modelVersion: null };
  }
};

/** Uploads the stored image and returns the FastAPI job id. Not retried, to avoid duplicate jobs. */
export const submitAnalysis = async ({ absolutePath, mimeType, filename }) => {
  const bytes = await fs.readFile(absolutePath);
  const form = new FormData();
  form.append('image', new Blob([bytes], { type: mimeType }), filename ?? path.basename(absolutePath));
  const data = await request('/api/v1/images/analyze', { method: 'POST', body: form });
  if (!data?.jobId) throw ApiError.badGateway('Vision service returned no job id', { code: 'VISION_ERROR' });
  return data.jobId;
};

export const getJob = (jobId) => request(`/api/v1/jobs/${encodeURIComponent(jobId)}`, { retries: 2 });
