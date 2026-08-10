import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { pool, query, withTransaction } from '../src/config/db.js';

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
