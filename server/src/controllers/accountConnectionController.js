import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import * as accounts from '../models/accountConnectionModel.js';
import { getStudentByUserId, listSkillDictionary } from '../models/studentModel.js';
import { decryptAccount, digest, encryptAccount, randomSecret } from '../services/accountCrypto.js';
import { authorizationUrl, exchangeProviderCode, fetchGithubRepositories, fetchProviderProfile, providerConfig, suggestGithubSkills } from '../services/accountProviders.js';
import { AppError } from '../utils/AppError.js';

export async function connectionList(req, res) {
  const enabled = (provider) => { try { providerConfig(provider); return true; } catch { return false; } };
  res.set('Cache-Control', 'no-store').json({ accounts: await accounts.listAccounts(req.user.id), providers: { github: enabled('github'), linkedin: enabled('linkedin') } });
}

export async function connectionStart(req, res) {
  const provider = req.params.provider;
  providerConfig(provider);
  const origin = req.headers.origin ?? env.clientOrigins[0];
  if (!env.clientOrigins.includes(origin)) throw new AppError(400, 'Start this connection from SyncSpace');
  const id = randomUUID();
  const state = randomSecret();
  const nonce = randomSecret();
  const codeVerifier = randomSecret();
  await accounts.createConnectionTransaction({ id, userId: req.user.id, provider, stateHash: digest(state), browserChallenge: req.body.browserChallenge,
    returnOrigin: origin, protocolSecrets: encryptAccount({ nonce, codeVerifier }, env.externalAccountsKey, `protocol:${id}`) });
  res.set('Cache-Control', 'no-store').json({ transactionId: id, authorizationUrl: authorizationUrl(provider, { state, nonce, verifier: digest(codeVerifier) }) });
}

export async function connectionCallback(req, res) {
  res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
  if (typeof req.query.state !== 'string' || req.query.state.length > 200) throw new AppError(400, 'Invalid connection state');
  const transaction = await accounts.claimConnectionCallback(req.params.provider, digest(req.query.state));
  // The deployed client uses HashRouter, so return to the profile inside the fragment.
  const returnUrl = new URL('/', transaction.return_origin);
  const params = new URLSearchParams({ connection: transaction.id });
  try {
    if (req.query.error || typeof req.query.code !== 'string' || req.query.code.length > 2000) throw new AppError(400, 'Connection was not authorized');
    const secrets = decryptAccount(transaction.protocol_secrets, env.externalAccountsKey, `protocol:${transaction.id}`);
    const result = await exchangeProviderCode(transaction.provider, req.query.code, secrets);
    await accounts.finishConnectionCallback(transaction.id, encryptAccount(result, env.externalAccountsKey, `transaction:${transaction.id}`));
  } catch {
    await accounts.failConnectionCallback(transaction.id);
    params.set('connection_error', 'authorization_failed');
  }
  returnUrl.hash = `/profile?${params}`;
  res.redirect(303, returnUrl.href);
}

export async function connectionComplete(req, res) {
  const result = await accounts.completeConnection(req.user.id, req.body.transactionId, req.body.verifier);
  res.set('Cache-Control', 'no-store').json({ ...result, accounts: await accounts.listAccounts(req.user.id) });
}

export async function refreshConnection(req, res) {
  const provider = req.params.provider;
  const account = await accounts.reserveAccountRefresh(req.user.id, provider);
  try {
    if (account.expires_at && new Date(account.expires_at) <= new Date()) throw new AppError(409, 'Reconnect this account to import again');
    const { accessToken } = decryptAccount(account.credentials, env.externalAccountsKey, `account:${req.user.id}:${provider}`);
    const profile = await fetchProviderProfile(provider, accessToken);
    if (profile.accountId !== account.provider_account_id) throw new AppError(409, 'Reconnect this account to import again');
    const repositories = provider === 'github' ? await fetchGithubRepositories(accessToken, profile.username) : [];
    const proposedSkills = provider === 'github' ? suggestGithubSkills(repositories, await listSkillDictionary()) : [];
    const preview = { ...profile, repositories, proposedSkills, fetchedAt: new Date().toISOString() };
    await accounts.saveAccountPreview(account, preview);
    res.set('Cache-Control', 'no-store').json({ preview, accounts: await accounts.listAccounts(req.user.id) });
  } catch (error) {
    if (error.status === 409 || error.status === 503) await accounts.markReconnect(account);
    throw error;
  }
}

export async function importConnection(req, res) {
  await accounts.acceptAccountImport(req.user.id, req.params.provider, req.body);
  res.json({ student: await getStudentByUserId(req.user.id) });
}

export async function removeConnection(req, res) {
  await accounts.disconnectAccount(req.user.id, req.params.provider, req.body.removeImported);
  res.json({ student: await getStudentByUserId(req.user.id), accounts: await accounts.listAccounts(req.user.id) });
}
