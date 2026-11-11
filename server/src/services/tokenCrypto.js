// tokenCrypto.js
//
// Encrypts third-party OAuth access tokens at rest with AES-256-GCM
// (authenticated encryption: a modified ciphertext fails to decrypt
// instead of yielding a wrong token). The 32-byte key comes from
// TOKEN_ENCRYPTION_KEY (base64 or hex) and is never stored in the
// database. Stored format: v1.<iv>.<authTag>.<ciphertext>, base64url.

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { AppError } from '../utils/AppError.js';

const VERSION = 'v1';

export function parseEncryptionKey(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes (base64 or 64 hex characters)');
  return key;
}

export function encryptToken(plaintext, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), ciphertext]
    .map((part) => (typeof part === 'string' ? part : part.toString('base64url')))
    .join('.');
}

export function decryptToken(stored, key) {
  const [version, iv, tag, ciphertext] = String(stored ?? '').split('.');
  if (version !== VERSION || !iv || !tag || !ciphertext) throw new AppError(500, 'Stored access token is invalid');
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    throw new AppError(500, 'Stored access token could not be decrypted');
  }
}
