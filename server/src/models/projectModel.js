import { query, withTransaction } from '../config/db.js';

const projectSelect = `
  SELECT p.*, p.owner_id AS "ownerId", p.team_size AS "teamSize",
    p.commitment_hours_per_week AS "commitmentHoursPerWeek", p.created_at AS "createdAt",
    sp.id AS "ownerProfileId", sp.name AS owner_name,
    COALESCE(json_agg(DISTINCT jsonb_build_object('id', s.id, 'name', s.name, 'category', s.category,
      'importance', ps.importance)) FILTER (WHERE s.id IS NOT NULL), '[]') AS skills,
    COUNT(DISTINCT tm.student_id)::int AS "memberCount",
    COUNT(DISTINCT a.id)::int AS "applicationCount",
    (COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'pending'))::int AS "pendingApplicationCount"
  FROM projects p
  JOIN users u ON u.id = p.owner_id
  LEFT JOIN student_profiles sp ON sp.user_id = u.id
  LEFT JOIN project_skills ps ON ps.project_id = p.id
  LEFT JOIN skills s ON s.id = ps.skill_id
  LEFT JOIN teams t ON t.project_id = p.id
  LEFT JOIN team_members tm ON tm.team_id = t.id
  LEFT JOIN applications a ON a.project_id = p.id`;

export async function getProjectById(id, collegeId) {
  const { rows } = await query(
    `${projectSelect} WHERE p.id = $1 AND p.college_id = $2 GROUP BY p.id, u.id, sp.id`,
    [id, collegeId]
  );
  return rows[0] ?? null;
}

export async function listProjects({ skill, domain, collegeId, ownerId }) {
  const params = [collegeId];
  const filters = ['p.college_id = $1'];
  if (ownerId) {
    params.push(ownerId);
    filters.push(`p.owner_id = $${params.length}`);
  }
  if (domain) {
    params.push(domain);
    filters.push(`LOWER(p.domain) = LOWER($${params.length})`);
  }
  if (skill) {
    params.push(`%${skill}%`);
    filters.push(`EXISTS (SELECT 1 FROM project_skills fps JOIN skills fs ON fs.id = fps.skill_id
      WHERE fps.project_id = p.id
        AND (fs.name ILIKE $${params.length} OR fs.category ILIKE $${params.length}))`);
  }
  const { rows } = await query(
    `${projectSelect} WHERE ${filters.join(' AND ')} GROUP BY p.id, u.id, sp.id ORDER BY p.created_at DESC`,
    params
  );
  return rows;
}

export async function listPublicProjects({ skill, collegeId, limit = 6 }) {
  // Reuse the PostgreSQL query that already powers the authenticated project
  // catalogue, then expose only the fields needed by the public landing page.
  const projects = await listProjects({ skill, collegeId });
  const now = Date.now();

  return projects
    .filter((project) => project.status === 'open' && new Date(project.deadline).getTime() > now)
    .slice(0, limit)
    .map((project) => ({
      id: project.id,
      title: project.title,
      description: project.description,
      domain: project.domain,
      teamSize: project.teamSize,
      deadline: project.deadline,
      skills: project.skills,
      memberCount: project.memberCount
    }));
}

export function createProject(ownerId, collegeId, input) {
  return withTransaction(async (client) => {
    const { rows: [project] } = await client.query(
      `INSERT INTO projects (college_id, owner_id, title, description, domain, team_size,
        commitment_hours_per_week, deadline, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [collegeId, ownerId, input.title, input.description, input.domain, input.teamSize,
        input.commitmentHoursPerWeek, input.deadline, input.status ?? 'open']
    );
    for (const skill of input.skills) {
      await client.query('INSERT INTO project_skills (project_id, skill_id, importance) VALUES ($1,$2,$3)',
        [project.id, skill.skillId, skill.importance]);
    }
    return project;
  }).then(({ id }) => getProjectById(id, collegeId));
}

export function updateProject(id, collegeId, input) {
  return withTransaction(async (client) => {
    const columnMap = { title: 'title', description: 'description', domain: 'domain', teamSize: 'team_size',
      commitmentHoursPerWeek: 'commitment_hours_per_week', deadline: 'deadline', status: 'status' };
    const fields = Object.entries(columnMap).filter(([key]) => input[key] !== undefined);
    if (fields.length) {
      const assignments = fields.map(([, column], index) => `${column} = $${index + 1}`).join(', ');
      await client.query(`UPDATE projects SET ${assignments} WHERE id = $${fields.length + 1} AND college_id = $${fields.length + 2}`,
        [...fields.map(([key]) => input[key]), id, collegeId]);
    }
    if (input.skills) {
      await client.query(
        'DELETE FROM project_skills WHERE project_id = $1 AND EXISTS (SELECT 1 FROM projects WHERE id = $1 AND college_id = $2)',
        [id, collegeId]
      );
      for (const skill of input.skills) {
        await client.query('INSERT INTO project_skills (project_id, skill_id, importance) VALUES ($1,$2,$3)',
          [id, skill.skillId, skill.importance]);
      }
    }
  }).then(() => getProjectById(id, collegeId));
}

export const deleteProject = async (id, collegeId) => {
  const { rowCount } = await query('DELETE FROM projects WHERE id = $1 AND college_id = $2', [id, collegeId]);
  return rowCount > 0;
};
export async function getProjectContactsForViewer(projectId, viewerUserId, collegeId) {
  const { rows } = await query(
    `WITH accessible AS (
       SELECT p.id, p.owner_id, p.created_at, t.id AS team_id
       FROM projects p
       LEFT JOIN teams t ON t.project_id = p.id
       WHERE p.id = $1
         AND p.college_id = $3
         AND (
           p.owner_id = $2
           OR EXISTS (
             SELECT 1
             FROM team_members access_tm
             JOIN student_profiles access_sp ON access_sp.id = access_tm.student_id
             WHERE access_tm.team_id = t.id AND access_sp.user_id = $2
           )
         )
     )
     SELECT owner_profile.id AS "profileId", owner_user.id AS "userId",
       COALESCE(owner_profile.name, split_part(owner_user.email, '@', 1)) AS name,
       owner_user.email, 'Creator'::text AS "roleLabel", accessible.created_at AS "joinedAt", 0 AS "sortOrder"
     FROM accessible
     JOIN users owner_user ON owner_user.id = accessible.owner_id
     LEFT JOIN student_profiles owner_profile ON owner_profile.user_id = owner_user.id
     UNION ALL
     SELECT member_profile.id AS "profileId", member_user.id AS "userId",
       member_profile.name, member_user.email, COALESCE(tm.role_label, 'Collaborator') AS "roleLabel",
       tm.joined_at AS "joinedAt", 1 AS "sortOrder"
     FROM accessible
     JOIN team_members tm ON tm.team_id = accessible.team_id
     JOIN student_profiles member_profile ON member_profile.id = tm.student_id
     JOIN users member_user ON member_user.id = member_profile.user_id
     WHERE member_user.id <> accessible.owner_id
     ORDER BY "sortOrder", "joinedAt", "profileId"`,
    [projectId, viewerUserId, collegeId]
  );
  return rows;
}
