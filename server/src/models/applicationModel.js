import { query, withTransaction } from '../config/db.js';
import { AppError } from '../utils/AppError.js';

export async function createApplication(userId, projectId, collegeId) {
  return withTransaction(async (client) => {
    const { rows: [student] } = await client.query('SELECT id FROM student_profiles WHERE user_id = $1', [userId]);
    if (!student) throw new AppError(404, 'Student profile not found');
    const { rows: [project] } = await client.query(
      `SELECT p.*, COALESCE((SELECT COUNT(*) FROM teams t JOIN team_members tm ON tm.team_id = t.id
        WHERE t.project_id = p.id), 0)::int AS member_count
       FROM projects p WHERE p.id = $1 AND p.college_id = $2 FOR UPDATE`,
      [projectId, collegeId]
    );
    if (!project) throw new AppError(404, 'Project not found');
    if (project.status !== 'open') throw new AppError(409, 'This project is not accepting applications');
    if (new Date(project.deadline).getTime() <= Date.now()) throw new AppError(409, 'The project deadline has passed');
    if (project.member_count >= project.team_size) throw new AppError(409, 'The project team is full');

    const { rows: existingMembership } = await client.query(
      `SELECT 1 FROM teams t JOIN team_members tm ON tm.team_id = t.id
       WHERE t.project_id = $1 AND tm.student_id = $2`, [projectId, student.id]
    );
    if (existingMembership.length) throw new AppError(409, 'You are already a member of this team');

    const { rows: [application] } = await client.query(
      `INSERT INTO applications (student_id, project_id) VALUES ($1, $2) RETURNING *`,
      [student.id, projectId]
    );
    await client.query('INSERT INTO notifications (user_id, message) VALUES ($1, $2)', [
      project.owner_id, `New application received for ${project.title}.`
    ]);
    return application;
  });
}

export async function listProjectApplications(projectId, ownerId) {
  const { rows: [project] } = await query('SELECT owner_id FROM projects WHERE id = $1', [projectId]);
  if (!project) throw new AppError(404, 'Project not found');
  if (Number(project.owner_id) !== Number(ownerId)) throw new AppError(403, 'Only the project owner can view applications');
  const { rows } = await query(
    `SELECT a.*, sp.name, sp.department, sp.year, sp.bio, sp.availability_hours_per_week,
      COALESCE(json_agg(json_build_object('id', s.id, 'name', s.name, 'proficiency', ss.proficiency))
        FILTER (WHERE s.id IS NOT NULL), '[]') AS skills
     FROM applications a JOIN student_profiles sp ON sp.id = a.student_id
     LEFT JOIN student_skills ss ON ss.student_id = sp.id LEFT JOIN skills s ON s.id = ss.skill_id
     WHERE a.project_id = $1 GROUP BY a.id, sp.id ORDER BY a.applied_at DESC`,
    [projectId]
  );
  return rows;
}

export const applicationWorkflowRepository = {
  transaction: (work) => withTransaction(async (client) => work({
    async getApplicationForUpdate(id) {
      const { rows } = await client.query(
        `SELECT a.*, p.owner_id, p.title AS project_title, p.team_size,
          sp.user_id AS student_user_id
         FROM applications a JOIN projects p ON p.id = a.project_id
         JOIN student_profiles sp ON sp.id = a.student_id
         WHERE a.id = $1 FOR UPDATE`, [id]
      );
      return rows[0] ?? null;
    },
    async updateApplicationStatus(id, status) {
      await client.query('UPDATE applications SET status = $1 WHERE id = $2', [status, id]);
    },
    async getOrCreateTeam(projectId) {
      const { rows } = await client.query(
        `INSERT INTO teams (project_id) VALUES ($1)
         ON CONFLICT (project_id) DO UPDATE SET project_id = EXCLUDED.project_id RETURNING id`, [projectId]
      );
      await client.query('SELECT id FROM teams WHERE id = $1 FOR UPDATE', [rows[0].id]);
      return rows[0];
    },
    async countTeamMembers(teamId) {
      const { rows: [record] } = await client.query('SELECT COUNT(*)::int AS count FROM team_members WHERE team_id = $1', [teamId]);
      return record.count;
    },
    async addTeamMember(teamId, studentId) {
      await client.query('INSERT INTO team_members (team_id, student_id) VALUES ($1, $2)', [teamId, studentId]);
    },
    async updateProjectStatus(projectId, status) {
      await client.query('UPDATE projects SET status = $1 WHERE id = $2', [status, projectId]);
    },
    async createNotification(userId, message) {
      await client.query('INSERT INTO notifications (user_id, message) VALUES ($1, $2)', [userId, message]);
    }
  }))
};
