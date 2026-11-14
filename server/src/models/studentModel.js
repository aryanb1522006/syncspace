import { query, withTransaction } from '../config/db.js';
import { saveSkillDecision } from './profileIntelligenceModel.js';
import { AppError } from '../utils/AppError.js';

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
// Internal SQL fragment; arguments are fixed aliases/parameter positions from
// our models, never request input. Profiles and recommendations share this rule.
export function contactAudienceSql(target = 'target', viewer = '$1', college = '$3') {
  return `(
         ${target}.user_id = ${viewer}
         OR EXISTS (
           SELECT 1
           FROM teams t
           JOIN projects p ON p.id = t.project_id
           WHERE p.college_id = ${college}
             AND (
               p.owner_id = ${viewer}
               OR EXISTS (
                 SELECT 1 FROM team_members viewer_tm
                 JOIN student_profiles viewer_sp ON viewer_sp.id = viewer_tm.student_id
                 WHERE viewer_tm.team_id = t.id AND viewer_sp.user_id = ${viewer}
               )
             )
             AND (
               p.owner_id = ${target}.user_id
               OR EXISTS (
                 SELECT 1 FROM team_members target_tm
                 WHERE target_tm.team_id = t.id AND target_tm.student_id = ${target}.id
               )
             )
         )
       )`;
}

export async function canViewStudentContact(viewerUserId, targetStudentId, collegeId) {
  const { rows } = await query(
    `SELECT 1
     FROM student_profiles target
     JOIN users target_user ON target_user.id = target.user_id
     WHERE target.id = $2
       AND target_user.college_id = $3
       AND ${contactAudienceSql()}
     LIMIT 1`,
    [viewerUserId, targetStudentId, collegeId]
  );
  return rows.length > 0;
}

export async function getSharedProfileLinks(studentId) {
  const { rows: [profile] } = await query(
    `SELECT CASE WHEN sp.linkedin_url ~ '^https://(www[.])?linkedin[.]com/in/[A-Za-z0-9_-]{3,100}/?$'
         THEN sp.linkedin_url END AS "linkedinUrl",
       CASE WHEN pc.username ~ '^[A-Za-z0-9]([A-Za-z0-9-]{0,37}[A-Za-z0-9])?$'
         THEN 'https://github.com/' || pc.username END AS "githubUrl"
     FROM student_profiles sp
     LEFT JOIN profile_connections pc ON pc.student_id = sp.id AND pc.source = 'github' AND pc.status = 'active'
     WHERE sp.id = $1 AND sp.share_profile_links`,
    [studentId]
  );
  return profile ?? null;
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
    await client.query('SELECT id FROM student_profiles WHERE id = $1 FOR UPDATE', [studentId]);
    const { rows: removed } = await client.query(
      'DELETE FROM student_skills WHERE student_id = $1 AND NOT (skill_id = ANY($2::bigint[])) RETURNING skill_id',
      [studentId, skills.map((skill) => skill.skillId)]
    );
    for (const { skill_id } of removed) await saveSkillDecision(client, studentId, skill_id, 'rejected');
    for (const skill of skills) {
      await client.query(
        `INSERT INTO student_skills (student_id, skill_id, proficiency) VALUES ($1, $2, $3)
         ON CONFLICT (student_id, skill_id) DO UPDATE SET proficiency = EXCLUDED.proficiency`,
        [studentId, skill.skillId, skill.proficiency]
      );
    }
  });
  return getStudentById(studentId);
}

export async function editStudentSkill(studentId, skillId, remove) {
  await withTransaction(async (client) => {
    await client.query('SELECT id FROM student_profiles WHERE id = $1 FOR UPDATE', [studentId]);
    if (remove) {
      await client.query(
        'DELETE FROM student_skills WHERE student_id = $1 AND skill_id = $2',
        [studentId, skillId]
      );
      // An absent skill may currently be waiting for a GitHub sync to finish.
      const { rowCount } = await client.query('SELECT id FROM skills WHERE id = $1', [skillId]);
      if (rowCount) await saveSkillDecision(client, studentId, skillId, 'rejected');
      return;
    }
    const { rowCount } = await client.query(
      `INSERT INTO student_skills (student_id, skill_id, proficiency)
       SELECT $1, id, 3 FROM skills WHERE id = $2
       ON CONFLICT (student_id, skill_id) DO NOTHING`,
      [studentId, skillId]
    );
    if (!rowCount) {
      const { rowCount: exists } = await client.query('SELECT id FROM skills WHERE id = $1', [skillId]);
      if (!exists) throw new AppError(404, 'Skill not found');
    }
  });
  return getStudentById(studentId);
}

export const listSkillDictionary = async () => {
  const { rows } = await query('SELECT id, name, category, aliases FROM skills ORDER BY name');
  return rows;
};
