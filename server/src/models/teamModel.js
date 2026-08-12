import { query } from '../config/db.js';

export async function listAccessibleTeams(userId, collegeId) {
  const { rows } = await query(
    `SELECT t.id, t.project_id AS "projectId", p.title AS "projectTitle", p.domain,
      p.status AS "projectStatus", p.team_size AS "teamSize", p.owner_id AS "ownerId",
      COUNT(DISTINCT tm.student_id)::int AS "memberCount"
     FROM teams t
     JOIN projects p ON p.id = t.project_id
     LEFT JOIN team_members tm ON tm.team_id = t.id
     WHERE p.college_id = $2 AND (
       p.owner_id = $1 OR EXISTS (
         SELECT 1 FROM team_members access_tm
         JOIN student_profiles access_sp ON access_sp.id = access_tm.student_id
         WHERE access_tm.team_id = t.id AND access_sp.user_id = $1
       )
     )
     GROUP BY t.id, p.id
     ORDER BY t.created_at DESC`,
    [userId, collegeId]
  );
  return rows;
}

export async function getTeamById(id, collegeId) {
  const { rows: [team] } = await query(
    `SELECT t.id, t.project_id, t.project_id AS "projectId", p.title AS project_title,
       p.title AS "projectTitle", p.owner_id, p.owner_id AS "ownerId", p.status AS project_status,
       p.status AS "projectStatus", p.team_size AS "teamSize", p.domain,
       owner_user.email AS "ownerEmail", owner_user.id AS "ownerUserId", owner_profile.id AS "ownerProfileId",
       owner_profile.name AS "ownerName"
     FROM teams t JOIN projects p ON p.id = t.project_id
     JOIN users owner_user ON owner_user.id = p.owner_id
     LEFT JOIN student_profiles owner_profile ON owner_profile.user_id = owner_user.id
     WHERE t.id = $1 AND p.college_id = $2`, [id, collegeId]
  );
  if (!team) return null;
  const [{ rows: members }, { rows: tasks }] = await Promise.all([
    query(
      `SELECT sp.id, sp.id AS "profileId", sp.user_id, sp.user_id AS "userId", sp.name, sp.department,
         u.email, tm.role_label, tm.joined_at
       FROM team_members tm JOIN student_profiles sp ON sp.id = tm.student_id
       JOIN users u ON u.id = sp.user_id
       WHERE tm.team_id = $1 ORDER BY tm.joined_at`, [id]
    ),
    query(
      `SELECT ta.*, sp.name AS assignee_name FROM tasks ta
       LEFT JOIN student_profiles sp ON sp.id = ta.assigned_to
       WHERE ta.team_id = $1 ORDER BY ta.due_date NULLS LAST, ta.created_at`, [id]
    )
  ]);
  return { ...team, members, tasks };
}

export async function canAccessTeam(teamId, userId, collegeId) {
  const { rows } = await query(
    `SELECT 1 FROM teams t JOIN projects p ON p.id = t.project_id
     WHERE t.id = $1 AND p.college_id = $3 AND (p.owner_id = $2 OR EXISTS (
       SELECT 1 FROM team_members tm JOIN student_profiles sp ON sp.id = tm.student_id
       WHERE tm.team_id = t.id AND sp.user_id = $2))`,
    [teamId, userId, collegeId]
  );
  return rows.length > 0;
}

export async function isTeamMember(teamId, studentId) {
  const { rows } = await query('SELECT 1 FROM team_members WHERE team_id = $1 AND student_id = $2', [teamId, studentId]);
  return rows.length > 0;
}
