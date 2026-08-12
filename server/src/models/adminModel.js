import { query, withTransaction } from '../config/db.js';

export async function listAdminProjects(collegeId) {
  const { rows } = await query(
    `SELECT p.id, p.title, p.domain, p.status, p.deadline,
       p.created_at AS "createdAt", p.owner_id AS "ownerId",
       COALESCE(sp.name, u.email) AS "ownerName", u.email AS "ownerEmail",
       COUNT(DISTINCT a.id)::int AS "applicationCount",
       (COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'pending'))::int AS "pendingApplicationCount",
       COUNT(DISTINCT tm.student_id)::int AS "memberCount",
       COUNT(DISTINCT t.id)::int AS "teamCount"
     FROM projects p
     JOIN users u ON u.id = p.owner_id
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     LEFT JOIN applications a ON a.project_id = p.id
     LEFT JOIN teams t ON t.project_id = p.id
     LEFT JOIN team_members tm ON tm.team_id = t.id
     WHERE p.college_id = $1
     GROUP BY p.id, u.id, sp.id
     ORDER BY p.created_at DESC`,
    [collegeId]
  );
  return rows;
}

export async function listAdminAuditLogs(collegeId, limit = 20) {
  const { rows } = await query(
    `SELECT log.id, log.action, log.target_type AS "targetType", log.target_id AS "targetId",
       log.reason, log.metadata, log.created_at AS "createdAt", actor.email AS "adminEmail"
     FROM admin_audit_logs log
     LEFT JOIN users actor ON actor.id = log.admin_user_id
     WHERE log.college_id = $1
     ORDER BY log.created_at DESC
     LIMIT $2`,
    [collegeId, limit]
  );
  return rows;
}

export function deleteProjectAsAdmin({ projectId, collegeId, adminUserId, confirmation, reason }) {
  return withTransaction(async (client) => {
    const { rows: [project] } = await client.query(
      `SELECT p.id, p.title, p.domain, p.status, p.owner_id AS "ownerId",
         u.email AS "ownerEmail", COALESCE(sp.name, u.email) AS "ownerName"
       FROM projects p
       JOIN users u ON u.id = p.owner_id
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       WHERE p.id = $1 AND p.college_id = $2
       FOR UPDATE OF p`,
      [projectId, collegeId]
    );

    if (!project) return { status: 'not_found' };
    if (confirmation !== project.title) return { status: 'confirmation_mismatch', project };

    const { rows: [audit] } = await client.query(
      `INSERT INTO admin_audit_logs
         (college_id, admin_user_id, action, target_type, target_id, reason, metadata)
       VALUES ($1, $2, 'project.delete', 'project', $3, $4, $5::jsonb)
       RETURNING id, action, target_type AS "targetType", target_id AS "targetId",
         reason, metadata, created_at AS "createdAt"`,
      [collegeId, adminUserId, project.id, reason, JSON.stringify(project)]
    );

    await client.query('DELETE FROM projects WHERE id = $1 AND college_id = $2', [project.id, collegeId]);
    return { status: 'deleted', project, audit };
  });
}
