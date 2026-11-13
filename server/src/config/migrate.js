import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pool } from './db.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(currentDir, '../../migrations');

export async function runMigrations(database = pool, directory = migrationsDir) {
  const client = await database.connect();
  try {
  // A session lock covers discovery and every transaction. Concurrent API
  // instances cannot both decide to apply the same pending file.
  await client.query("SELECT pg_advisory_lock(hashtext('syncspace-schema-migrations'))");
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const files = (await readdir(directory)).filter((file) => file.endsWith('.sql')).sort();
  const { rows } = await client.query('SELECT filename FROM schema_migrations');
  const applied = new Set(rows.map(({ filename }) => filename));

  for (const filename of files) {
    if (applied.has(filename)) continue;
    const sql = await readFile(path.join(directory, filename), 'utf8');
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
      await client.query('COMMIT');
      console.log(`Applied ${filename}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
  } finally {
    try { await client.query("SELECT pg_advisory_unlock(hashtext('syncspace-schema-migrations'))"); }
    finally { client.release(); }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runMigrations()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exitCode = 1;
  });
