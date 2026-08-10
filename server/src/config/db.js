import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

const ssl = (() => {
  if (env.databaseSslMode === 'disable') return false;
  if (env.databaseSslMode === 'require') return { rejectUnauthorized: false };
  if (env.databaseSslMode === 'verify-full') {
    return { rejectUnauthorized: true, ...(env.databaseSslCa ? { ca: env.databaseSslCa } : {}) };
  }
  throw new Error('DATABASE_SSL_MODE must be disable, require, or verify-full');
})();

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl,
  max: env.databasePoolMax,
  idleTimeoutMillis: env.databaseIdleTimeoutMs,
  connectionTimeoutMillis: env.databaseConnectionTimeoutMs,
  statement_timeout: env.databaseStatementTimeoutMs,
  application_name: 'syncspace-api'
});

pool.on('error', (error) => {
  import('./logger.js').then(({ logger }) => logger.error({ err: error }, 'Unexpected PostgreSQL pool error'));
});

export const query = (text, params = []) => pool.query(text, params);

export async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
