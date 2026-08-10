import { query, withTransaction } from '../config/db.js';

const projectSelect = `
  SELECT p.*, u.email AS owner_email, sp.name AS owner_name,
    COALESCE(json_agg(DISTINCT jsonb_build_object('id', s.id, 'name', s.name, 'category', s.category,
      'importance', ps.importance)) FILTER (WHERE s.id IS NOT NULL), '[]') AS skills,
    COUNT(DISTINCT tm.student_id)::int AS member_count
  FROM projects p
  JOIN users u ON u.id = p.owner_id
  LEFT JOIN student_profiles sp ON sp.user_id = u.id
  LEFT JOIN project_skills ps ON ps.project_id = p.id
  LEFT JOIN skills s ON s.id = ps.skill_id
  LEFT JOIN teams t ON t.project_id = p.id
  LEFT JOIN team_members tm ON tm.team_id = t.id`;

export async function getProjectById(id, collegeId) {
  const { rows } = await query(
    `${projectSelect} WHERE p.id = $1 AND p.college_id = $2 GROUP BY p.id, u.id, sp.id`,
    [id, collegeId]
  );
  return rows[0] ?? null;
}

export async function listProjects({ skill, domain, collegeId }) {
  const params = [collegeId];
  const filters = ['p.college_id = $1'];
  if (domain) {
    params.push(domain);
    filters.push(`LOWER(p.domain) = LOWER($${params.length})`);
  }
  if (skill) {
    params.push(`%${skill}%`);
    filters.push(`EXISTS (SELECT 1 FROM project_skills fps JOIN skills fs ON fs.id = fps.skill_id
      WHERE fps.project_id = p.id AND fs.name ILIKE $${params.length})`);
  }
  const { rows } = await query(
    `${projectSelect} WHERE ${filters.join(' AND ')} GROUP BY p.id, u.id, sp.id ORDER BY p.created_at DESC`,
    params
  );
  return rows;
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
