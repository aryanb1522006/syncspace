import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { decryptToken, encryptToken, parseEncryptionKey } from '../src/services/tokenCrypto.js';

const key = randomBytes(32);

test('access tokens round-trip and are never stored in plaintext', () => {
  const stored = encryptToken('gho_exampletoken', key);
  assert.ok(!stored.includes('gho_exampletoken'));
  assert.notEqual(encryptToken('gho_exampletoken', key), stored, 'a fresh IV is used every time');
  assert.equal(decryptToken(stored, key), 'gho_exampletoken');
});

test('tampered ciphertext or a wrong key fails instead of yielding a wrong token', () => {
  const stored = encryptToken('gho_exampletoken', key);
  const parts = stored.split('.');
  parts[3] = Buffer.from('tampered').toString('base64url');
  assert.throws(() => decryptToken(parts.join('.'), key), /could not be decrypted/);
  assert.throws(() => decryptToken(stored, randomBytes(32)), /could not be decrypted/);
  assert.throws(() => decryptToken('garbage', key), /invalid/);
});

test('encryption keys must decode to 32 bytes (hex or base64)', () => {
  assert.equal(parseEncryptionKey(randomBytes(32).toString('hex')).length, 32);
  assert.equal(parseEncryptionKey(randomBytes(32).toString('base64')).length, 32);
  assert.equal(parseEncryptionKey(''), null);
  assert.throws(() => parseEncryptionKey('too-short'), /32 bytes/);
});
