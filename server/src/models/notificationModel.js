import { query } from '../config/db.js';

export async function listNotifications(userId) {
  const { rows } = await query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [userId]
  );
  return rows;
}

export async function markNotificationRead(id, userId) {
  const { rows } = await query(
    'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *', [id, userId]
  );
  return rows[0] ?? null;
}
