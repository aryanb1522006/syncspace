import { query } from '../config/db.js';

export async function getTeamById(id, collegeId) {
  const { rows: [team] } = await query(
    `SELECT t.id, t.project_id, p.title AS project_title, p.owner_id, p.status AS project_status
     FROM teams t JOIN projects p ON p.id = t.project_id WHERE t.id = $1 AND p.college_id = $2`, [id, collegeId]
  );
  if (!team) return null;
  const [{ rows: members }, { rows: tasks }] = await Promise.all([
    query(
      `SELECT sp.id, sp.user_id, sp.name, sp.department, tm.role_label, tm.joined_at
       FROM team_members tm JOIN student_profiles sp ON sp.id = tm.student_id
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
