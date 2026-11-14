import { query } from '../config/db.js';
import { getProjectById } from './projectModel.js';

export async function getStudentRecommendationContext(userId, collegeId) {
  const [{ rows: [student] }, { rows: projects }] = await Promise.all([
    query(
      `SELECT sp.id, sp.bio, sp.interests, sp.availability_hours_per_week AS "availabilityHoursPerWeek",
        COALESCE((SELECT json_agg(json_build_object('skillId', s.id, 'name', s.name, 'proficiency', ss.proficiency,
          'evidenceSources', ARRAY(SELECT DISTINCT se.source::text FROM skill_evidence se
            WHERE se.student_id = sp.id AND se.skill_id = s.id ORDER BY 1)) ORDER BY s.id)
          FROM student_skills ss JOIN skills s ON s.id = ss.skill_id WHERE ss.student_id = sp.id), '[]') AS skills,
        COALESCE((SELECT string_agg(pc.profile_text, ' ' ORDER BY pc.source) FROM profile_connections pc
          WHERE pc.student_id = sp.id AND pc.status = 'active' AND pc.profile_text <> ''), '') AS "externalProfileText"
       FROM student_profiles sp JOIN users u ON u.id = sp.user_id
       WHERE sp.user_id = $1 AND u.college_id = $2`, [userId, collegeId]
    ),
    query(
      `SELECT p.id, p.owner_id AS "ownerId", p.title, p.description, p.domain, p.team_size AS "teamSize",
        p.commitment_hours_per_week AS "commitmentHoursPerWeek", p.deadline, p.status,
        p.description_embedding AS "descriptionEmbedding", p.embedding_model AS "embeddingModel",
        p.description_summary AS "descriptionSummary",
        owner_profile.name AS "ownerName",
        COALESCE((SELECT COUNT(*) FROM teams t JOIN team_members tm ON tm.team_id = t.id
          WHERE t.project_id = p.id), 0)::int AS "memberCount",
        COALESCE((SELECT json_agg(json_build_object('skillId', s.id, 'name', s.name,
          'importance', ps.importance)) FROM project_skills ps JOIN skills s ON s.id = ps.skill_id
          WHERE ps.project_id = p.id), '[]') AS skills
       FROM projects p
       JOIN student_profiles viewer ON viewer.user_id = $1
       LEFT JOIN student_profiles owner_profile ON owner_profile.user_id = p.owner_id
       WHERE p.college_id = $2 AND p.owner_id <> $1 AND p.status = 'open' AND p.deadline > NOW()
         AND NOT EXISTS (SELECT 1 FROM applications a WHERE a.project_id = p.id AND a.student_id = viewer.id)
         AND NOT EXISTS (SELECT 1 FROM teams t JOIN team_members tm ON tm.team_id = t.id
           WHERE t.project_id = p.id AND tm.student_id = viewer.id)`,
      [userId, collegeId]
    )
  ]);

  return student ? { student, projects } : null;
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
          'proficiency', ss.proficiency))
          FROM student_skills ss JOIN skills s ON s.id = ss.skill_id
          WHERE ss.student_id = sp.id), '[]') AS skills,
        EXISTS (SELECT 1 FROM applications a WHERE a.student_id = sp.id AND a.project_id = $1) AS "hasApplication",
        EXISTS (SELECT 1 FROM teams t JOIN team_members tm ON tm.team_id = t.id
          WHERE t.project_id = $1 AND tm.student_id = sp.id) AS "isMember"
       FROM student_profiles sp JOIN users u ON u.id = sp.user_id
       WHERE u.college_id = $2 AND u.id <> $3`,
      [projectId, collegeId, project.owner_id]
    )
  ]);

  return { project, currentTeamSkills, candidates };
}
