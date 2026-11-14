import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { mkdtemp, copyFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pool } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { runMigrations } from '../src/config/migrate.js';
after(() => pool.end());

test('migrations handle an existing LinkedIn column and concurrent startup without duplicate schema changes', { skip: process.env.RUN_DB_TESTS !== 'true' }, async () => {
  const schema = `migration_${randomUUID().replaceAll('-', '')}`;
  const directory = await mkdtemp(path.join(os.tmpdir(), 'syncspace-migration-test-'));
  const testPool = new pg.Pool({ connectionString: env.databaseUrl, options: `-c search_path=${schema},public`, max: 2 });
  try {
    await pool.query(`CREATE SCHEMA "${schema}"`);
    const migrationPath = new URL('../migrations/', import.meta.url);
    const files = (await readdir(migrationPath)).filter((file) => file.endsWith('.sql')).sort();
    for (const file of files.filter((file) => file < '009')) await copyFile(new URL(file, migrationPath), path.join(directory, file));
    await runMigrations(testPool, directory);
    await testPool.query('ALTER TABLE student_profiles ADD COLUMN linkedin_url TEXT');
    for (const file of files.filter((file) => file >= '009' && file < '012')) await copyFile(new URL(file, migrationPath), path.join(directory, file));
    await runMigrations(testPool, directory);
    const college = (await testPool.query("INSERT INTO colleges (name, slug) VALUES ('Upgrade fixture', 'upgrade-fixture') RETURNING id")).rows[0];
    const user = (await testPool.query("INSERT INTO users (college_id, email, password_hash) VALUES ($1, 'upgrade@test.edu', 'fixture') RETURNING id", [college.id])).rows[0];
    const profile = (await testPool.query("INSERT INTO student_profiles (user_id, name, avatar_url, avatar_source) VALUES ($1, 'Existing member', 'https://media.licdn.com/photo', 'linkedin') RETURNING id", [user.id])).rows[0];
    await testPool.query("INSERT INTO linkedin_identity_connections (student_id, subject, name, picture_url) VALUES ($1, 'upgrade-subject', 'Existing member', 'https://media.licdn.com/photo')", [profile.id]);
    for (const file of files.filter((file) => file >= '012')) await copyFile(new URL(file, migrationPath), path.join(directory, file));
    await Promise.all([runMigrations(testPool, directory), runMigrations(testPool, directory)]);
    const completed = (await testPool.query('SELECT name_applied_at, photo_applied_at FROM linkedin_identity_connections WHERE student_id = $1', [profile.id])).rows[0];
    assert.ok(completed.name_applied_at, 'upgrade recognizes an existing matching name');
    assert.ok(completed.photo_applied_at, 'upgrade recognizes an existing saved photo');
    const { rows: [history] } = await testPool.query('SELECT COUNT(*)::int AS count FROM schema_migrations');
    assert.equal(history.count, files.length);
    assert.equal((await testPool.query("SELECT COUNT(*)::int AS count FROM pg_attribute WHERE attrelid = 'student_profiles'::regclass AND attname = 'linkedin_url'")).rows[0].count, 1);
    assert.equal((await testPool.query("SELECT relrowsecurity FROM pg_class WHERE oid = 'integration_oauth_requests'::regclass")).rows[0].relrowsecurity, true);
    for (const name of ['profile_connections', 'skill_evidence', 'skill_decisions']) assert.equal((await testPool.query('SELECT relrowsecurity FROM pg_class WHERE oid = $1::regclass', [name])).rows[0].relrowsecurity, true);
  } finally {
    await testPool.end();
    await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('syncspace-migration-test-'));
    await rm(directory, { recursive: true, force: true });
  }
});
