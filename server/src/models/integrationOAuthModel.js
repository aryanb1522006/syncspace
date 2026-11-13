import { query, withTransaction } from '../config/db.js';
import { createHash, timingSafeEqual } from 'node:crypto';
import { AppError } from '../utils/AppError.js';

export const oauthChallenge = (value) => createHash('sha256').update(value).digest('base64url');
export async function createOAuthRequest({ id, studentId, provider, browserChallenge, verifierCiphertext, nonce, returnOrigin }) {
  await withTransaction(async (client) => {
    await client.query('SELECT id FROM student_profiles WHERE id = $1 FOR UPDATE', [studentId]);
    await client.query('DELETE FROM integration_oauth_requests WHERE expires_at < NOW()');
    await client.query(`INSERT INTO integration_oauth_requests (id, student_id, provider, browser_challenge, verifier_ciphertext, nonce, return_origin)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`, [id, studentId, provider, browserChallenge, verifierCiphertext ?? null, nonce ?? null, returnOrigin]);
  });
}

export async function getOAuthReturn(id, provider, userId) {
  const { rows: [row] } = await query(`SELECT r.return_origin FROM integration_oauth_requests r
    JOIN student_profiles sp ON sp.id = r.student_id
    WHERE r.id = $1 AND r.provider = $2 AND sp.user_id = $3 AND r.expires_at > NOW() AND r.consumed_at IS NULL`, [id, provider, userId]);
  if (!row) throw new AppError(400, 'This account connection expired or was already used. Start again from your profile.');
  return row.return_origin;
}

export async function claimOAuthRequest({ id, studentId, provider, verifier }) {
  return withTransaction(async (client) => {
    await client.query('SELECT id FROM student_profiles WHERE id = $1 FOR UPDATE', [studentId]);
    const { rows: [row] } = await client.query(`SELECT * FROM integration_oauth_requests
      WHERE id = $1 AND student_id = $2 AND provider = $3 AND expires_at > NOW() AND consumed_at IS NULL FOR UPDATE`, [id, studentId, provider]);
    if (!row) throw new AppError(400, 'This account connection expired or was already used. Start again from your profile.');
    const actual = Buffer.from(oauthChallenge(verifier));
    const expected = Buffer.from(row.browser_challenge);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new AppError(403, 'Finish this account connection in the browser where you started it.');
    await client.query('UPDATE integration_oauth_requests SET consumed_at = NOW(), verifier_ciphertext = NULL WHERE id = $1', [id]);
    return row;
  });
}
