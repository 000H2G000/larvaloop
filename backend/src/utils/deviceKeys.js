import crypto from 'node:crypto';
import { config } from '../config/environment.js';

/** 32 random bytes, URL-safe. Shown once at registration, then only its HMAC is stored. */
export const generateApiKey = () => `a2p_${crypto.randomBytes(32).toString('base64url')}`;

export const hashApiKey = (apiKey) =>
  crypto.createHmac('sha256', config.deviceApiKeySecret).update(apiKey).digest('hex');

export const verifyApiKey = (apiKey, storedHash) => {
  if (!apiKey || !storedHash) return false;
  const a = Buffer.from(hashApiKey(apiKey), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
