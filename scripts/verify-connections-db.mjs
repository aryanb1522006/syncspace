import { spawnSync } from 'node:child_process';
if (!process.env.DATABASE_URL || !process.env.RUN_DB_TESTS) throw new Error('Set DATABASE_URL to a disposable migrated and seeded local/staging database and RUN_DB_TESTS=true');
const result = spawnSync(process.execPath, ['--test', 'server/test/accountConnections.integration.test.js', 'server/test/linkedinConnection.integration.test.js'], { stdio: 'inherit', env: { ...process.env, RUN_DB_TESTS: 'true' } });
if (result.status !== 0) process.exit(result.status ?? 1);
console.log('CONNECTION DATABASE VERIFIED');
