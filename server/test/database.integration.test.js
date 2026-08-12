import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { pool, query, withTransaction } from '../src/config/db.js';
import { getProjectContactsForViewer } from '../src/models/projectModel.js';
import { canViewStudentContact, getStudentByUserId } from '../src/models/studentModel.js';
import { deleteProjectAsAdmin } from '../src/models/adminModel.js';

const enabled = process.env.RUN_DB_TESTS === 'true';

after(async () => {
  await pool.end();
});

test('migrations, seed data, college isolation, and rollback work in PostgreSQL', { skip: !enabled }, async () => {
  const { rows: [migrationCount] } = await query('SELECT COUNT(*)::int AS count FROM schema_migrations');
  const { rows: [collegeCount] } = await query('SELECT COUNT(*)::int AS count FROM colleges');
  const { rows: [skillCount] } = await query('SELECT COUNT(*)::int AS count FROM skills');
  assert.ok(migrationCount.count >= 4, 'expected every numbered migration to be recorded');
  assert.ok(collegeCount.count >= 2, 'expected both seeded colleges');
  assert.ok(skillCount.count >= 50, 'expected the complete skill dictionary');

  const { rows: projects } = await query(
    `SELECT p.id, p.college_id, u.college_id AS owner_college_id
     FROM projects p JOIN users u ON u.id = p.owner_id`
  );
  assert.ok(projects.length >= 4, 'expected seeded projects');
  assert.ok(projects.every((project) => Number(project.college_id) === Number(project.owner_college_id)));

  const { rows: tenantConstraints } = await query(
    `SELECT conname FROM pg_constraint
     WHERE conname IN ('projects_owner_same_college_fk', 'users_id_college_id_unique')`
  );
  assert.equal(tenantConstraints.length, 2, 'expected database-level tenant constraints');

  const slug = `rollback-${Date.now()}`;
  await assert.rejects(
    () => withTransaction(async (client) => {
      await client.query('INSERT INTO colleges (name, slug) VALUES ($1, $2)', ['Rollback College', slug]);
      throw new Error('force rollback');
    }),
    /force rollback/
  );
  const { rows: [rolledBack] } = await query('SELECT COUNT(*)::int AS count FROM colleges WHERE slug = $1', [slug]);
  assert.equal(rolledBack.count, 0);
});
test('accepted team relationships gate profile email and project contacts', { skip: !enabled }, async () => {
  const { rows: people } = await query(
    `SELECT u.id AS user_id, u.email, u.college_id, sp.id AS profile_id
     FROM users u
     JOIN student_profiles sp ON sp.user_id = u.id
     WHERE u.email = ANY($1::text[])`,
    [['arjun@northstar.edu', 'isha@northstar.edu', 'kabir@northstar.edu']]
  );
  const byEmail = new Map(people.map((person) => [person.email, person]));
  const owner = byEmail.get('arjun@northstar.edu');
  const collaborator = byEmail.get('isha@northstar.edu');
  const unrelated = byEmail.get('kabir@northstar.edu');
  assert.ok(owner && collaborator && unrelated, 'expected seeded pilot identities');
  const collaboratorProfile = await getStudentByUserId(collaborator.user_id);
  assert.equal(Number(collaboratorProfile.id), Number(collaborator.profile_id), 'user id should resolve the stable profile record');

  let projectId;
  try {
    const { rows: [project] } = await query(
      `INSERT INTO projects
         (college_id, owner_id, title, description, domain, team_size, commitment_hours_per_week, deadline)
       VALUES ($1, $2, $3, $4, $5, 4, 6, NOW() + INTERVAL '14 days')
       RETURNING id`,
      [owner.college_id, owner.user_id, `Phase 12 contact test ${Date.now()}`, 'Temporary authorization fixture', 'Civic Tech']
    );
    projectId = project.id;
    const { rows: [team] } = await query('INSERT INTO teams (project_id) VALUES ($1) RETURNING id', [projectId]);
    await query(
      'INSERT INTO team_members (team_id, student_id, role_label) VALUES ($1, $2, $3)',
      [team.id, collaborator.profile_id, 'Collaborator']
    );

    assert.equal(await canViewStudentContact(owner.user_id, collaborator.profile_id, owner.college_id), true);
    assert.equal(await canViewStudentContact(collaborator.user_id, owner.profile_id, owner.college_id), true);
    assert.equal(await canViewStudentContact(unrelated.user_id, owner.profile_id, owner.college_id), false);

    const collaboratorContacts = await getProjectContactsForViewer(projectId, collaborator.user_id, owner.college_id);
    assert.deepEqual(collaboratorContacts.map((contact) => contact.email).sort(), ['arjun@northstar.edu', 'isha@northstar.edu']);
    assert.deepEqual(await getProjectContactsForViewer(projectId, unrelated.user_id, owner.college_id), []);
  } finally {
    if (projectId) await query('DELETE FROM projects WHERE id = $1', [projectId]);
  }
});

test('admin project deletion is title-confirmed, tenant-scoped, and audit logged', { skip: !enabled }, async () => {
  const { rows: [admin] } = await query(
    `SELECT id, college_id FROM users WHERE email = 'arjun@northstar.edu'`
  );
  assert.ok(admin, 'expected seeded administrator fixture');
  const title = `Admin deletion test ${Date.now()}`;
  let projectId;
  let auditId;
  try {
    const { rows: [project] } = await query(
      `INSERT INTO projects
         (college_id, owner_id, title, description, domain, team_size, commitment_hours_per_week, deadline)
       VALUES ($1, $2, $3, 'Temporary admin deletion fixture', 'Civic Tech', 3, 4, NOW() + INTERVAL '7 days')
       RETURNING id`,
      [admin.college_id, admin.id, title]
    );
    projectId = project.id;

    const mismatch = await deleteProjectAsAdmin({
      projectId, collegeId: admin.college_id, adminUserId: admin.id,
      confirmation: 'wrong title', reason: 'Testing confirmation protection'
    });
    assert.equal(mismatch.status, 'confirmation_mismatch');
    const { rows: [stillPresent] } = await query('SELECT COUNT(*)::int AS count FROM projects WHERE id = $1', [projectId]);
    assert.equal(stillPresent.count, 1);

    const wrongTenant = await deleteProjectAsAdmin({
      projectId, collegeId: Number(admin.college_id) + 1, adminUserId: admin.id,
      confirmation: title, reason: 'Testing tenant isolation protection'
    });
    assert.equal(wrongTenant.status, 'not_found');
    const { rows: [stillTenantScoped] } = await query('SELECT COUNT(*)::int AS count FROM projects WHERE id = $1', [projectId]);
    assert.equal(stillTenantScoped.count, 1);

    const deleted = await deleteProjectAsAdmin({
      projectId, collegeId: admin.college_id, adminUserId: admin.id,
      confirmation: title, reason: 'Temporary project created by integration test'
    });
    assert.equal(deleted.status, 'deleted');
    auditId = deleted.audit.id;
    projectId = null;

    const { rows: [audit] } = await query(
      'SELECT action, target_id, reason, metadata FROM admin_audit_logs WHERE id = $1', [auditId]
    );
    assert.equal(audit.action, 'project.delete');
    assert.equal(Number(audit.target_id), Number(deleted.project.id));
    assert.equal(audit.metadata.title, title);
  } finally {
    if (projectId) await query('DELETE FROM projects WHERE id = $1', [projectId]);
    if (auditId) await query('DELETE FROM admin_audit_logs WHERE id = $1', [auditId]);
  }
});
