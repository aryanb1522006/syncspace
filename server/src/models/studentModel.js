import { query, withTransaction } from '../config/db.js';

export async function getStudentById(id) {
  const { rows } = await query(
    `SELECT sp.*, u.email, u.role, u.college_id,
       COALESCE(json_agg(json_build_object('id', s.id, 'name', s.name, 'category', s.category,
         'proficiency', ss.proficiency)) FILTER (WHERE s.id IS NOT NULL), '[]') AS skills
     FROM student_profiles sp
     JOIN users u ON u.id = sp.user_id
     LEFT JOIN student_skills ss ON ss.student_id = sp.id
     LEFT JOIN skills s ON s.id = ss.skill_id
     WHERE sp.id = $1
     GROUP BY sp.id, u.id`,
    [id]
  );
  return rows[0] ?? null;
}

export async function getStudentByUserId(userId) {
  const { rows } = await query('SELECT id FROM student_profiles WHERE user_id = $1', [userId]);
  return rows[0] ? getStudentById(rows[0].id) : null;
}
export async function canViewStudentContact(viewerUserId, targetStudentId, collegeId) {
  const { rows } = await query(
    `SELECT 1
     FROM student_profiles target
     JOIN users target_user ON target_user.id = target.user_id
     WHERE target.id = $2
       AND target_user.college_id = $3
       AND (
         target.user_id = $1
         OR EXISTS (
           SELECT 1
           FROM teams t
           JOIN projects p ON p.id = t.project_id
           WHERE p.college_id = $3
             AND (
               p.owner_id = $1
               OR EXISTS (
                 SELECT 1 FROM team_members viewer_tm
                 JOIN student_profiles viewer_sp ON viewer_sp.id = viewer_tm.student_id
                 WHERE viewer_tm.team_id = t.id AND viewer_sp.user_id = $1
               )
             )
             AND (
               p.owner_id = target.user_id
               OR EXISTS (
                 SELECT 1 FROM team_members target_tm
                 WHERE target_tm.team_id = t.id AND target_tm.student_id = target.id
               )
             )
         )
       )
     LIMIT 1`,
    [viewerUserId, targetStudentId, collegeId]
  );
  return rows.length > 0;
}


export async function updateStudent(id, updates) {
  const fields = Object.entries(updates).filter(([, value]) => value !== undefined);
  if (!fields.length) return getStudentById(id);
  const assignments = fields.map(([key], index) => `${key} = $${index + 1}`).join(', ');
  await query(`UPDATE student_profiles SET ${assignments} WHERE id = $${fields.length + 1}`, [
    ...fields.map(([, value]) => value), id
  ]);
  return getStudentById(id);
}

export async function replaceStudentSkills(studentId, skills) {
  await withTransaction(async (client) => {
    await client.query('DELETE FROM student_skills WHERE student_id = $1', [studentId]);
    for (const skill of skills) {
      await client.query(
        'INSERT INTO student_skills (student_id, skill_id, proficiency) VALUES ($1, $2, $3)',
        [studentId, skill.skillId, skill.proficiency]
      );
    }
  });
  return getStudentById(studentId);
}

export const setResumePath = async (studentId, resumePath) => {
  await query('UPDATE student_profiles SET resume_path = $1 WHERE id = $2', [resumePath, studentId]);
};

export const listSkillDictionary = async () => {
  const { rows } = await query('SELECT id, name, category, aliases FROM skills ORDER BY name');
  return rows;
};
