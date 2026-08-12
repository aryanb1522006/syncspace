import {
  PILOT_CLEANUP_WHERE_SQL,
  pilotCleanupQueryParameters
} from '../src/services/pilotCleanup.js';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const confirmed = args.has('--confirm=REMOVE_TEST_PROJECTS');

if (args.has('--help')) {
  console.log(`Usage:
  pnpm --filter ./server db:cleanup:pilot
  pnpm --filter ./server db:cleanup:pilot -- --apply --confirm=REMOVE_TEST_PROJECTS

The default mode is read-only and prints every matching project plus cascade counts.
Apply mode deletes only known seeded, QA, and smoke projects.`);
  process.exit(0);
}

if (apply && !confirmed) {
  throw new Error('Apply mode requires --confirm=REMOVE_TEST_PROJECTS');
}

const { pool } = await import('../src/config/db.js');
const parameters = pilotCleanupQueryParameters();

const previewSql = `
  SELECT p.id, p.title, p.status, p.created_at AS "createdAt", u.email AS "ownerEmail",
    (SELECT COUNT(*)::int FROM project_skills ps WHERE ps.project_id = p.id) AS "skillCount",
    (SELECT COUNT(*)::int FROM applications a WHERE a.project_id = p.id) AS "applicationCount",
    (SELECT COUNT(*)::int FROM teams t WHERE t.project_id = p.id) AS "teamCount",
    (SELECT COUNT(*)::int FROM tasks task
      JOIN teams t ON t.id = task.team_id
      WHERE t.project_id = p.id) AS "taskCount"
  FROM projects p
  JOIN users u ON u.id = p.owner_id
  WHERE ${PILOT_CLEANUP_WHERE_SQL}
  ORDER BY p.id`;

const client = await pool.connect();

try {
  const { rows: candidates } = await client.query(previewSql, parameters);

  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    candidateCount: candidates.length,
    candidates
  }, null, 2));

  if (!apply) {
    console.log('Dry run only. No project was deleted.');
  } else if (candidates.length === 0) {
    console.log('No known test projects were found.');
  } else {
    await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout = '15s'");

    const deleteSql = `
      WITH targets AS (
        SELECT p.id
        FROM projects p
        JOIN users u ON u.id = p.owner_id
        WHERE ${PILOT_CLEANUP_WHERE_SQL}
        ORDER BY p.id
        FOR UPDATE OF p
      )
      DELETE FROM projects p
      USING targets
      WHERE p.id = targets.id
      RETURNING p.id, p.title`;

    const { rows: deleted } = await client.query(deleteSql, parameters);
    await client.query('COMMIT');

    console.log(JSON.stringify({
      status: 'deleted',
      deletedCount: deleted.length,
      deleted
    }, null, 2));
  }
} catch (error) {
  if (apply) await client.query('ROLLBACK').catch(() => {});
  throw error;
} finally {
  client.release();
  await pool.end();
}
