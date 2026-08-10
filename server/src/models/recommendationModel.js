import { query } from '../config/db.js';
import { getProjectById } from './projectModel.js';
import { getStudentByUserId } from './studentModel.js';

export async function getStudentRecommendationContext(userId, collegeId) {
  const profile = await getStudentByUserId(userId);
  if (!profile) return null;

  const [{ rows: studentSkills }, { rows: projects }, { rows: applications }, { rows: memberships }] = await Promise.all([
    query('SELECT skill_id AS "skillId", proficiency FROM student_skills WHERE student_id = $1', [profile.id]),
    query(
      `SELECT p.id, p.title, p.description, p.domain, p.team_size AS "teamSize",
        p.commitment_hours_per_week AS "commitmentHoursPerWeek", p.deadline, p.status,
        COALESCE((SELECT COUNT(*) FROM teams t JOIN team_members tm ON tm.team_id = t.id
          WHERE t.project_id = p.id), 0)::int AS "memberCount",
        COALESCE((SELECT json_agg(json_build_object('skillId', s.id, 'name', s.name,
          'importance', ps.importance)) FROM project_skills ps JOIN skills s ON s.id = ps.skill_id
          WHERE ps.project_id = p.id), '[]') AS skills
       FROM projects p WHERE p.college_id = $1`,
      [collegeId]
    ),
    query('SELECT project_id FROM applications WHERE student_id = $1', [profile.id]),
    query(`SELECT t.project_id FROM team_members tm JOIN teams t ON t.id = tm.team_id WHERE tm.student_id = $1`, [profile.id])
  ]);

  return {
    student: {
      id: profile.id,
      skills: studentSkills,
      interests: profile.interests,
      availabilityHoursPerWeek: profile.availability_hours_per_week,
      applicationProjectIds: applications.map((row) => row.project_id),
      membershipProjectIds: memberships.map((row) => row.project_id)
    },
    projects
  };
}

export async function getTeammateRecommendationContext(projectId, collegeId) {
  const project = await getProjectById(projectId, collegeId);
  if (!project) return null;

  const [{ rows: currentTeamSkills }, { rows: candidates }] = await Promise.all([
    query(
      `SELECT DISTINCT ss.skill_id AS "skillId"
       FROM teams t JOIN team_members tm ON tm.team_id = t.id
       JOIN student_skills ss ON ss.student_id = tm.student_id
       WHERE t.project_id = $1`,
      [projectId]
    ),
    query(
      `SELECT sp.id, sp.name, sp.department, sp.year, sp.bio,
        sp.availability_hours_per_week AS "availabilityHoursPerWeek",
        COALESCE((SELECT json_agg(json_build_object('skillId', s.id, 'name', s.name,
          'proficiency', ss.proficiency)) FROM student_skills ss JOIN skills s ON s.id = ss.skill_id
          WHERE ss.student_id = sp.id), '[]') AS skills,
        EXISTS (SELECT 1 FROM applications a WHERE a.student_id = sp.id AND a.project_id = $1) AS "hasApplication",
        EXISTS (SELECT 1 FROM teams t JOIN team_members tm ON tm.team_id = t.id
          WHERE t.project_id = $1 AND tm.student_id = sp.id) AS "isMember"
       FROM student_profiles sp JOIN users u ON u.id = sp.user_id
       WHERE u.college_id = $2 AND u.role = 'student'`,
      [projectId, collegeId]
    )
  ]);

  return { project, currentTeamSkills, candidates };
}
