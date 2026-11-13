import { query, withTransaction } from '../config/db.js';
import { AppError } from '../utils/AppError.js';

export async function linkedinAccount(studentId) {
  const { rows: [account] } = await query('SELECT name, picture_url AS "pictureUrl", connected_at AS "connectedAt" FROM linkedin_identity_connections WHERE student_id = $1', [studentId]);
  return account ?? null;
}
export async function saveLinkedinAccount(studentId, requestId, account) {
  try {
    await withTransaction(async (client) => {
      await client.query('SELECT id FROM student_profiles WHERE id = $1 FOR UPDATE', [studentId]);
      const { rowCount } = await client.query("SELECT id FROM integration_oauth_requests WHERE id = $1 AND student_id = $2 AND provider = 'linkedin' AND consumed_at IS NOT NULL AND expires_at > NOW()", [requestId, studentId]);
      if (!rowCount) throw new AppError(409, 'The LinkedIn connection was cancelled. Start again.');
      await client.query(`INSERT INTO linkedin_identity_connections (student_id, subject, name, picture_url) VALUES ($1, $2, $3, $4)
        ON CONFLICT (student_id) DO UPDATE SET subject = EXCLUDED.subject, name = EXCLUDED.name, picture_url = EXCLUDED.picture_url, connected_at = NOW()`, [studentId, account.subject, account.name, account.pictureUrl]);
    });
  } catch (error) {
    if (error.code === '23505') throw new AppError(409, 'This LinkedIn account is already connected to another SyncSpace profile.');
    throw error;
  }
}
export async function useLinkedinDetails(studentId, fields) {
  await withTransaction(async (client) => {
    await client.query('SELECT id FROM student_profiles WHERE id = $1 FOR UPDATE', [studentId]);
    const { rows: [account] } = await client.query('SELECT * FROM linkedin_identity_connections WHERE student_id = $1', [studentId]);
    if (!account) throw new AppError(409, 'Connect LinkedIn first.');
    if (fields.includes('photo') && !account.picture_url) throw new AppError(400, 'This account has no available photo.');
    await client.query(`UPDATE student_profiles SET name = CASE WHEN $2 THEN $3 ELSE name END,
      avatar_url = CASE WHEN $4 THEN $5 ELSE avatar_url END, avatar_source = CASE WHEN $4 THEN 'linkedin' ELSE avatar_source END WHERE id = $1`, [studentId, fields.includes('name'), account.name, fields.includes('photo'), account.picture_url]);
  });
}
export async function removeLinkedinAccount(studentId) {
  await withTransaction(async (client) => {
    await client.query('SELECT id FROM student_profiles WHERE id = $1 FOR UPDATE', [studentId]);
    await client.query("DELETE FROM integration_oauth_requests WHERE student_id = $1 AND provider = 'linkedin'", [studentId]);
    await client.query('DELETE FROM linkedin_identity_connections WHERE student_id = $1', [studentId]);
    await client.query("UPDATE student_profiles SET avatar_url = NULL, avatar_source = NULL WHERE id = $1 AND avatar_source = 'linkedin'", [studentId]);
  });
}
