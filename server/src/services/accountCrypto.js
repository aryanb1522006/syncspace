import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { AppError } from '../utils/AppError.js';

export const digest = (value) => createHash('sha256').update(value).digest('base64url');
export const randomSecret = () => randomBytes(32).toString('base64url');
export function matchesChallenge(value, challenge) {
  const actual = Buffer.from(digest(value));
  const expected = Buffer.from(challenge);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function keyBytes(key) {
  const bytes = Buffer.from(key ?? '', 'base64');
  if (bytes.length !== 32) throw new AppError(503, 'Account connections are not configured');
  return bytes;
}

export function encryptAccount(value, key, context) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyBytes(key), iv);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptAccount(value, key, context) {
  try {
    const [version, iv, tag, ciphertext] = value.split('.');
    if (version !== 'v1') throw new Error('Unsupported format');
    const decipher = createDecipheriv('aes-256-gcm', keyBytes(key), Buffer.from(iv, 'base64url'));
    decipher.setAAD(Buffer.from(context));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8'));
  } catch {
    throw new AppError(503, 'This connection needs to be reconnected');
  }
}
