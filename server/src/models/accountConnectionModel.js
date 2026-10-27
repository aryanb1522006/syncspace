import { query, withTransaction } from '../config/db.js';
import { env } from '../config/env.js';
import { decryptAccount, encryptAccount, matchesChallenge } from '../services/accountCrypto.js';
import { AppError } from '../utils/AppError.js';

export async function listAccounts(userId) {
  const { rows } = await query(`SELECT provider, display_name AS "displayName", username, status,
    connected_at AS "connectedAt", refreshed_at AS "refreshedAt", expires_at AS "expiresAt", preview
    FROM external_accounts WHERE user_id = $1 ORDER BY provider`, [userId]);
  return rows;
}

export async function createConnectionTransaction(transaction) {
  await withTransaction(async (client) => {
    await client.query('DELETE FROM account_connection_transactions WHERE expires_at < NOW()');
    await client.query(`INSERT INTO account_connection_transactions
      (id, user_id, provider, state_hash, browser_challenge, return_origin, protocol_secrets)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`, [transaction.id, transaction.userId, transaction.provider, transaction.stateHash, transaction.browserChallenge, transaction.returnOrigin, transaction.protocolSecrets]);
  });
}

export async function claimConnectionCallback(provider, stateHash) {
  const { rows: [transaction] } = await query(`UPDATE account_connection_transactions SET status = 'exchanging'
    WHERE provider = $1 AND state_hash = $2 AND status = 'pending' AND expires_at > NOW() RETURNING *`, [provider, stateHash]);
  if (!transaction) throw new AppError(400, 'This connection request expired or was already used. Start again from your profile.');
  return transaction;
}

export async function finishConnectionCallback(id, result) {
  const { rowCount } = await query(`UPDATE account_connection_transactions SET status = 'ready', result = $2, protocol_secrets = NULL
    WHERE id = $1 AND status = 'exchanging' AND expires_at > NOW()`, [id, result]);
  if (!rowCount) throw new AppError(400, 'This connection request has expired');
}

export async function failConnectionCallback(id) {
  await query(`UPDATE account_connection_transactions SET status = 'failed', result = NULL, protocol_secrets = NULL WHERE id = $1`, [id]);
}

export async function completeConnection(userId, id, verifier) {
  try {
    return await withTransaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock($1::bigint)', [userId]);
      const { rows: [transaction] } = await client.query('SELECT * FROM account_connection_transactions WHERE id = $1 AND user_id = $2 FOR UPDATE', [id, userId]);
      if (!transaction || new Date(transaction.expires_at) <= new Date() || !matchesChallenge(verifier, transaction.browser_challenge)) throw new AppError(400, 'This connection request does not belong to this browser or has expired');
      if (transaction.status !== 'ready') throw new AppError(409, transaction.status === 'complete' ? 'This connection request was already used' : 'Connection was not authorized. Please start again.');
      const result = decryptAccount(transaction.result, env.externalAccountsKey, `transaction:${id}`);
      const { profile, accessToken, expiresAt } = result;
      const { rows: [existing] } = await client.query('SELECT * FROM external_accounts WHERE user_id = $1 AND provider = $2', [userId, transaction.provider]);
      if (existing && existing.provider_account_id !== profile.accountId) throw new AppError(409, 'Disconnect your current account before connecting a different account');
      const preview = { ...profile, repositories: [], proposedSkills: [] };
      const credentials = encryptAccount({ accessToken }, env.externalAccountsKey, `account:${userId}:${transaction.provider}`);
      await client.query(`INSERT INTO external_accounts (user_id, provider, provider_account_id, display_name, username, credentials, expires_at, preview)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id, provider) DO UPDATE SET credentials = EXCLUDED.credentials,
          display_name = EXCLUDED.display_name, username = EXCLUDED.username, expires_at = EXCLUDED.expires_at,
          preview = EXCLUDED.preview, status = 'connected', refreshed_at = NULL`,
      [userId, transaction.provider, profile.accountId, profile.name, profile.username, credentials, expiresAt, JSON.stringify(preview)]);
      await client.query(`UPDATE account_connection_transactions SET status = 'complete', result = NULL, protocol_secrets = NULL WHERE id = $1`, [id]);
      return { provider: transaction.provider };
    });
  } catch (error) {
    if (error.code === '23505') throw new AppError(409, 'This external account is already connected to another SyncSpace account');
    throw error;
  }
}

export async function reserveAccountRefresh(userId, provider) {
  const { rows: [account] } = await query(`UPDATE external_accounts SET refreshed_at = NOW()
    WHERE user_id = $1 AND provider = $2 AND (refreshed_at IS NULL OR refreshed_at < NOW() - INTERVAL '60 seconds') RETURNING *`, [userId, provider]);
  if (account) return account;
  const { rows } = await query('SELECT id FROM external_accounts WHERE user_id = $1 AND provider = $2', [userId, provider]);
  throw new AppError(rows.length ? 429 : 404, rows.length ? 'Wait one minute before refreshing again' : 'Connect this account first');
}

export async function saveAccountPreview(account, preview) {
  const { rowCount } = await query(`UPDATE external_accounts SET preview = $2, status = 'connected'
    WHERE id = $1 AND credentials = $3`, [account.id, JSON.stringify(preview), account.credentials]);
  if (!rowCount) throw new AppError(409, 'The connection changed. Reload your profile.');
}

export async function markReconnect(account) {
  await query(`UPDATE external_accounts SET status = 'reconnect' WHERE id = $1 AND credentials = $2`, [account.id, account.credentials]);
}

export async function acceptAccountImport(userId, provider, input) {
  return withTransaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock($1::bigint)', [userId]);
    const { rows: [account] } = await client.query(`SELECT * FROM external_accounts WHERE user_id = $1 AND provider = $2 FOR UPDATE`, [userId, provider]);
    if (!account) throw new AppError(404, 'Connect this account first');
    const { rows: [profile] } = await client.query('SELECT * FROM student_profiles WHERE user_id = $1 FOR UPDATE', [userId]);
    if (!profile) throw new AppError(404, 'Student profile not found');
    const preview = account.preview;
    const sources = { ...profile.import_sources };
    const changes = {};
    for (const field of input.fields) {
      const value = preview[field];
      if (!value) throw new AppError(400, `The provider did not supply ${field}`);
      const column = { name: 'name', bio: 'bio', avatarUrl: 'avatar_url', profileUrl: 'github_url' }[field];
      if (field === 'profileUrl' && provider !== 'github') throw new AppError(400, 'LinkedIn profile links must be entered manually');
      changes[column] = value;
      sources[column] = { provider, value, importedAt: new Date().toISOString() };
    }
    if (provider === 'github') {
      const selected = input.repositoryIds.map((id) => preview.repositories?.find((repo) => repo.id === id));
      if (selected.some((repo) => !repo)) throw new AppError(400, 'Refresh and select repositories from your own import preview');
      changes.portfolio = JSON.stringify(selected.map((repo) => ({ ...repo, provider })));
      sources.portfolio = { provider, importedAt: new Date().toISOString() };
    } else if (input.repositoryIds.length || input.skills.length) {
      throw new AppError(400, 'LinkedIn does not supply portfolio projects or skills');
    }
    for (const skill of input.skills) {
      if (!preview.proposedSkills?.some((item) => Number(item.skillId) === skill.skillId)) throw new AppError(400, 'Only suggested skills can be accepted from this preview');
      await client.query(`INSERT INTO student_skills (student_id, skill_id, proficiency) VALUES ($1, $2, $3)
        ON CONFLICT (student_id, skill_id) DO NOTHING`, [profile.id, skill.skillId, skill.proficiency]);
    }
    if (input.skills.length) sources.github_skills = { provider, skillIds: input.skills.map((skill) => skill.skillId), importedAt: new Date().toISOString() };
    changes.import_sources = JSON.stringify(sources);
    const entries = Object.entries(changes);
    await client.query(`UPDATE student_profiles SET ${entries.map(([key], index) => `${key} = $${index + 1}`).join(', ')}, updated_at = NOW() WHERE id = $${entries.length + 1}`, [...entries.map(([, value]) => value), profile.id]);
  });
}

export async function disconnectAccount(userId, provider, removeImported) {
  await withTransaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock($1::bigint)', [userId]);
    await client.query('DELETE FROM external_accounts WHERE user_id = $1 AND provider = $2', [userId, provider]);
    await client.query('DELETE FROM account_connection_transactions WHERE user_id = $1 AND provider = $2', [userId, provider]);
    const { rows: [profile] } = await client.query('SELECT * FROM student_profiles WHERE user_id = $1 FOR UPDATE', [userId]);
    if (!profile) return;
    const sources = { ...profile.import_sources };
    const changes = {};
    for (const [column, source] of Object.entries(sources)) {
      if (source.provider !== provider) continue;
      if (removeImported) {
        if (column === 'portfolio') changes.portfolio = '[]';
        else if (['bio', 'avatar_url', 'github_url'].includes(column) && profile[column] === source.value) changes[column] = column === 'bio' ? '' : null;
        // Names and reviewed skills stay as editable profile facts. Users can change/remove these separately.
      }
      delete sources[column];
    }
    changes.import_sources = JSON.stringify(sources);
    const entries = Object.entries(changes);
    await client.query(`UPDATE student_profiles SET ${entries.map(([key], index) => `${key} = $${index + 1}`).join(', ')} WHERE id = $${entries.length + 1}`, [...entries.map(([, value]) => value), profile.id]);
  });
}
