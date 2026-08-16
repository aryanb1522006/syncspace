import { query, withTransaction } from '../config/db.js';

const querySelect = `
  SELECT pq.id, pq.project_id AS "projectId", pq.asker_id AS "askerUserId",
    COALESCE(sp.name, split_part(u.email, '@', 1)) AS "askerName",
    pq.question, pq.response, pq.status, pq.created_at AS "createdAt",
    pq.answered_at AS "answeredAt"
  FROM project_queries pq
  JOIN users u ON u.id = pq.asker_id
  LEFT JOIN student_profiles sp ON sp.user_id = u.id`;

export async function createProjectQuery({ project, askerUserId, collegeId, question }) {
  const id = await withTransaction(async (client) => {
    const { rows: [created] } = await client.query(
      `INSERT INTO project_queries (college_id, project_id, asker_id, question)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [collegeId, project.id, askerUserId, question]
    );
    await client.query(
      'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
      [project.owner_id, `New query on ${project.title}.`]
    );
    return created.id;
  });
  const { rows: [created] } = await query(`${querySelect} WHERE pq.id = $1`, [id]);
  return created;
}

export async function listProjectQueries({ projectId, viewerUserId, collegeId }) {
  const { rows } = await query(
    `${querySelect}
     JOIN projects p ON p.id = pq.project_id AND p.college_id = pq.college_id
     WHERE pq.project_id = $1 AND pq.college_id = $3
       AND (p.owner_id = $2 OR pq.asker_id = $2)
     ORDER BY (pq.status = 'open') DESC, pq.created_at DESC`,
    [projectId, viewerUserId, collegeId]
  );
  return rows;
}

export async function answerProjectQuery({ queryId, projectId, ownerUserId, collegeId, response }) {
  const answeredId = await withTransaction(async (client) => {
    const { rows: [answered] } = await client.query(
      `UPDATE project_queries pq
       SET response = $1, status = 'answered', answered_at = NOW()
       FROM projects p
       WHERE pq.id = $2 AND pq.project_id = $3 AND pq.college_id = $5
         AND pq.status = 'open'
         AND p.id = pq.project_id AND p.college_id = pq.college_id AND p.owner_id = $4
       RETURNING pq.id, pq.asker_id, p.title`,
      [response, queryId, projectId, ownerUserId, collegeId]
    );
    if (!answered) return null;
    await client.query(
      'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
      [answered.asker_id, `Your query on ${answered.title} has been answered.`]
    );
    return answered.id;
  });
  if (!answeredId) return null;
  const { rows: [answered] } = await query(`${querySelect} WHERE pq.id = $1`, [answeredId]);
  return answered;
}
