import { query } from '../config/db.js';
import { getProjectById } from './projectModel.js';
import { getStudentByUserId } from './studentModel.js';

export async function getStudentRecommendationContext(userId, collegeId) {
  const profile = await getStudentByUserId(userId);
  if (!profile) return null;

  const [
    { rows: studentSkills }, { rows: projects }, { rows: applications }, { rows: memberships }, { rows: connections }
  ] = await Promise.all([
    query(
      `SELECT ss.skill_id AS "skillId", ss.proficiency, s.name,
        ARRAY(SELECT DISTINCT se.source::text FROM skill_evidence se
          WHERE se.student_id = ss.student_id AND se.skill_id = ss.skill_id ORDER BY 1) AS "evidenceSources"
       FROM student_skills ss JOIN skills s ON s.id = ss.skill_id
       WHERE ss.student_id = $1`,
      [profile.id]
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
       LEFT JOIN student_profiles owner_profile ON owner_profile.user_id = p.owner_id
       WHERE p.college_id = $1`,
      [collegeId]
    ),
    query('SELECT project_id FROM applications WHERE student_id = $1', [profile.id]),
    query(`SELECT t.project_id FROM team_members tm JOIN teams t ON t.id = tm.team_id WHERE tm.student_id = $1`, [profile.id]),
    // Text from connected GitHub / LinkedIn sources (repository descriptions,
    // headline, summary); used only for the semantic similarity signal.
    query(
      "SELECT profile_text FROM profile_connections WHERE student_id = $1 AND status = 'active' AND profile_text <> '' ORDER BY source",
      [profile.id]
    )
  ]);

  return {
    student: {
      id: profile.id,
      bio: profile.bio,
      skills: studentSkills,
      interests: profile.interests,
      externalProfileText: connections.map((row) => row.profile_text).join(' '),
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
          'proficiency', ss.proficiency,
          'evidenceSources', ARRAY(SELECT DISTINCT se.source::text FROM skill_evidence se
            WHERE se.student_id = sp.id AND se.skill_id = s.id ORDER BY 1)))
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
