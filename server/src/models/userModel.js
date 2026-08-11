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

export function findOrCreateGoogleUser({ email, googleSubject, name, collegeId }) {
  return withTransaction(async (client) => {
    const { rows: [matched] } = await client.query(
      `SELECT * FROM users WHERE google_subject = $1 OR email = $2 FOR UPDATE`,
      [googleSubject, email.toLowerCase()]
    );

    let user;
    if (matched) {
      const { rows: [updated] } = await client.query(
        `UPDATE users
         SET google_subject = $1, email_verified = TRUE, auth_provider = 'google'
         WHERE id = $2 RETURNING *`,
        [googleSubject, matched.id]
      );
      user = updated;
    } else {
      const { rows: [created] } = await client.query(
        `INSERT INTO users
          (college_id, email, password_hash, role, auth_provider, email_verified, google_subject)
         VALUES ($1, $2, NULL, 'student', 'google', TRUE, $3)
         RETURNING *`,
        [collegeId, email.toLowerCase(), googleSubject]
      );
      user = created;
      await client.query(
        `INSERT INTO student_profiles (user_id, name) VALUES ($1, $2)`,
        [user.id, name]
      );
    }

    const { rows: [profile] } = await client.query(
      `SELECT id, name FROM student_profiles WHERE user_id = $1`, [user.id]
    );
    return { ...user, profile };
  });
}
