import { query, withTransaction } from '../config/db.js';
import { AppError } from '../utils/AppError.js';

export async function linkedinAccount(studentId) {
  const { rows: [account] } = await query(`SELECT c.name, c.picture_url AS "pictureUrl", c.connected_at AS "connectedAt",
    (c.name_applied_at IS NOT NULL OR c.name = p.name) AS "nameApplied",
    (c.photo_applied_at IS NOT NULL OR COALESCE(c.picture_url = p.avatar_url, FALSE)) AS "photoApplied"
    FROM linkedin_identity_connections c JOIN student_profiles p ON p.id = c.student_id WHERE c.student_id = $1`, [studentId]);
  return account ?? null;
}
export async function saveLinkedinAccount(studentId, requestId, account) {
  try {
    await withTransaction(async (client) => {
      await client.query('SELECT id FROM student_profiles WHERE id = $1 FOR UPDATE', [studentId]);
      const { rowCount } = await client.query("SELECT id FROM integration_oauth_requests WHERE id = $1 AND student_id = $2 AND provider = 'linkedin' AND consumed_at IS NOT NULL AND expires_at > NOW()", [requestId, studentId]);
      if (!rowCount) throw new AppError(409, 'The LinkedIn connection was cancelled. Start again.');
      await client.query(`INSERT INTO linkedin_identity_connections AS current (student_id, subject, name, picture_url) VALUES ($1, $2, $3, $4)
        ON CONFLICT (student_id) DO UPDATE SET
          name_applied_at = CASE WHEN current.subject = EXCLUDED.subject AND current.name = EXCLUDED.name THEN current.name_applied_at ELSE NULL END,
          photo_applied_at = CASE WHEN current.subject = EXCLUDED.subject AND current.picture_url IS NOT DISTINCT FROM EXCLUDED.picture_url THEN current.photo_applied_at ELSE NULL END,
          subject = EXCLUDED.subject, name = EXCLUDED.name, picture_url = EXCLUDED.picture_url, connected_at = NOW()`, [studentId, account.subject, account.name, account.pictureUrl]);
      await client.query(`UPDATE linkedin_identity_connections c SET
        name_applied_at = COALESCE(c.name_applied_at, CASE WHEN c.name = p.name THEN NOW() END),
        photo_applied_at = COALESCE(c.photo_applied_at, CASE WHEN c.picture_url = p.avatar_url THEN NOW() END)
        FROM student_profiles p WHERE p.id = c.student_id AND c.student_id = $1`, [studentId]);
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
    await client.query(`UPDATE linkedin_identity_connections SET
      name_applied_at = CASE WHEN $2 THEN NOW() ELSE name_applied_at END,
      photo_applied_at = CASE WHEN $3 THEN NOW() ELSE photo_applied_at END WHERE student_id = $1`, [studentId, fields.includes('name'), fields.includes('photo')]);
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
