import { query, withTransaction } from '../config/db.js';

export const findUserByEmail = async (email) => {
  const { rows } = await query(
    `SELECT u.*, json_build_object('id', sp.id, 'name', sp.name) AS profile
     FROM users u
     JOIN student_profiles sp ON sp.user_id = u.id
     WHERE u.email = $1`,
    [email.toLowerCase()]
  );
  return rows[0] ?? null;
};

export const findUserById = async (id) => {
  const { rows } = await query('SELECT id, college_id, email, role, created_at FROM users WHERE id = $1', [id]);
  return rows[0] ?? null;
};

export function createUserWithProfile({ email, passwordHash, role, collegeId, name, department, year }) {
  return withTransaction(async (client) => {
    const { rows: [user] } = await client.query(
      `INSERT INTO users (college_id, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id, college_id, email, role, created_at`,
      [collegeId, email.toLowerCase(), passwordHash, role]
    );
    const { rows: [profile] } = await client.query(
      `INSERT INTO student_profiles (user_id, name, department, year)
       VALUES ($1, $2, $3, $4) RETURNING id, name`,
      [user.id, name, department ?? null, year ?? null]
    );
    return { ...user, profile };
  });
}
