import { query } from '../config/db.js';

const contactColumns = `whatsapp_number AS "whatsappNumber",
  discord_username AS "discordUsername", contact_email AS "contactEmail"`;

export async function getOwnTeamContacts(userId, collegeId) {
  const { rows: [contacts] } = await query(
    `SELECT ${contactColumns}
     FROM users u JOIN student_profiles sp ON sp.user_id = u.id
     LEFT JOIN student_team_contacts ON student_id = sp.id
     WHERE u.id = $1 AND u.college_id = $2`, [userId, collegeId]
  );
  return contacts ?? null;
}

export async function saveOwnTeamContacts(userId, collegeId, { whatsappNumber, discordUsername, contactEmail }) {
  const { rows: [contacts] } = await query(
    `INSERT INTO student_team_contacts (student_id, whatsapp_number, discord_username, contact_email)
     SELECT sp.id, $3, $4, $5 FROM student_profiles sp JOIN users u ON u.id = sp.user_id
     WHERE u.id = $1 AND u.college_id = $2
     ON CONFLICT (student_id) DO UPDATE SET
       whatsapp_number = EXCLUDED.whatsapp_number,
       discord_username = EXCLUDED.discord_username,
       contact_email = EXCLUDED.contact_email
     RETURNING ${contactColumns}`,
    [userId, collegeId, whatsappNumber || null, discordUsername || null, contactEmail || null]
  );
  return contacts ?? null;
}

export async function getTeamContacts(teamId, userId, collegeId) {
  const { rows } = await query(
    `WITH allowed_team AS (
       SELECT t.id, t.group_invite_url, p.owner_id
       FROM teams t JOIN projects p ON p.id = t.project_id
       WHERE t.id = $1 AND p.college_id = $3 AND (
         p.owner_id = $2 OR EXISTS (
           SELECT 1 FROM team_members tm JOIN student_profiles sp ON sp.id = tm.student_id
           WHERE tm.team_id = t.id AND sp.user_id = $2
         )
       )
     )
     SELECT t.group_invite_url AS "groupInviteUrl", COALESCE(json_agg(
       json_build_object('studentId', sp.id, 'name', sp.name, 'role', people.role,
         'whatsappNumber', c.whatsapp_number, 'discordUsername', c.discord_username,
         'contactEmail', c.contact_email) ORDER BY people.sort_order, sp.name
     ) FILTER (WHERE c.student_id IS NOT NULL), '[]') AS contacts
     FROM allowed_team t
     LEFT JOIN LATERAL (
       SELECT sp.id AS student_id, 'Creator' AS role, 0 AS sort_order
       FROM student_profiles sp WHERE sp.user_id = t.owner_id AND sp.user_id <> $2
       UNION ALL
       SELECT tm.student_id, COALESCE(tm.role_label, 'Collaborator'), 1
       FROM team_members tm JOIN student_profiles sp ON sp.id = tm.student_id
       WHERE tm.team_id = t.id AND sp.user_id NOT IN ($2, t.owner_id)
     ) people ON TRUE
     LEFT JOIN student_profiles sp ON sp.id = people.student_id
     LEFT JOIN student_team_contacts c ON c.student_id = sp.id
       AND COALESCE(c.whatsapp_number, c.discord_username, c.contact_email) IS NOT NULL
     GROUP BY t.id, t.group_invite_url`, [teamId, userId, collegeId]
  );
  return rows[0] ?? null;
}

export async function saveGroupInvite(teamId, userId, collegeId, groupInviteUrl) {
  const { rows: [team] } = await query(
    `UPDATE teams t SET group_invite_url = $4 FROM projects p
     WHERE t.id = $1 AND p.id = t.project_id AND p.owner_id = $2 AND p.college_id = $3
     RETURNING t.group_invite_url AS "groupInviteUrl"`, [teamId, userId, collegeId, groupInviteUrl || null]
  );
  return team ?? null;
}
