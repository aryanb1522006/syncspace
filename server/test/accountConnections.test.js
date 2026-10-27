import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { decryptAccount, digest, encryptAccount, matchesChallenge, randomSecret } from '../src/services/accountCrypto.js';
import { authorizationUrl, exchangeProviderCode, fetchGithubRepositories, normalizeGithubProfile, normalizeLinkedinProfile, providerJson, safeAvatar, suggestGithubSkills, validateLinkedinToken } from '../src/services/accountProviders.js';

const key = Buffer.alloc(32, 7).toString('base64');
const config = { githubClientId: 'github-client', githubClientSecret: 'github-secret', linkedinClientId: 'linkedin-client', linkedinClientSecret: 'linkedin-secret', externalAccountsKey: key, apiPublicUrl: 'http://localhost:4000' };
const json = (value, status = 200) => new Response(JSON.stringify(value), { status });

test('credentials are authenticated, randomized and bound to one account context', () => {
  const payload = { accessToken: 'secret-token' };
  const encrypted = encryptAccount(payload, key, 'user:1');
  assert.ok(!encrypted.includes('secret-token'));
  assert.notEqual(encrypted, encryptAccount(payload, key, 'user:1'));
  assert.deepEqual(decryptAccount(encrypted, key, 'user:1'), payload);
  assert.throws(() => decryptAccount(encrypted, key, 'user:2'), { status: 503 });
  assert.throws(() => decryptAccount(`${encrypted.slice(0, -4)}aaaa`, key, 'user:1'), { status: 503 });
});

test('browser challenge rejects incorrect verifiers and authorization requests use least privilege', () => {
  const verifier = randomSecret();
  assert.equal(matchesChallenge(verifier, digest(verifier)), true);
  assert.equal(matchesChallenge(randomSecret(), digest(verifier)), false);
  const github = new URL(authorizationUrl('github', { state: 'state', nonce: 'nonce', verifier: digest(verifier) }, config));
  assert.equal(github.searchParams.get('scope'), '');
  assert.equal(github.searchParams.get('code_challenge_method'), 'S256');
  const linkedin = new URL(authorizationUrl('linkedin', { state: 'state', nonce: 'nonce' }, config));
  assert.equal(linkedin.searchParams.get('scope'), 'openid profile');
  assert.equal(linkedin.searchParams.get('nonce'), 'nonce');
  assert.throws(() => authorizationUrl('github', {}, {}), { status: 503 });
  assert.throws(() => authorizationUrl('attacker', {}, config), { status: 400 });
});

test('provider profile normalization validates stable identity and safe image hosts', () => {
  const profile = normalizeGithubProfile({ id: 42, login: 'student', name: 'Student', avatar_url: 'https://avatars.githubusercontent.com/u/42' });
  assert.equal(profile.profileUrl, 'https://github.com/student');
  assert.equal(profile.accountId, '42');
  assert.throws(() => normalizeGithubProfile({ id: 42, login: '../attacker' }), { status: 502 });
  assert.equal(normalizeLinkedinProfile({ sub: 'li-42', name: 'Student' }).profileUrl, null);
  assert.throws(() => normalizeLinkedinProfile({}), { status: 502 });
  assert.equal(safeAvatar('https://attacker.test/tracker', 'github'), null);
  assert.equal(safeAvatar('javascript:alert(1)', 'linkedin'), null);
});

test('GitHub token exchange revalidates identity and sends the matching PKCE verifier', async () => {
  const calls = [];
  const result = await exchangeProviderCode('github', 'code', { codeVerifier: 'verifier' }, config, async (url, options) => {
    calls.push({ url, options });
    return calls.length === 1 ? json({ access_token: 'token', token_type: 'bearer' }) : json({ id: 42, login: 'student' });
  });
  assert.equal(result.profile.accountId, '42');
  assert.equal(new URLSearchParams(calls[0].options.body).get('code_verifier'), 'verifier');
  assert.equal(calls[1].url, 'https://api.github.com/user');
  assert.equal(calls[1].options.headers.Authorization, 'Bearer token');
  await assert.rejects(() => exchangeProviderCode('github', 'code', {}, config, async () => json({ error: 'bad_verification_code' })), { status: 502 });
});

test('repository import excludes private, forked, archived and other-owner projects', async () => {
  const repo = { id: 10, name: 'portfolio', owner: { login: 'student' }, language: 'TypeScript' };
  const repositories = await fetchGithubRepositories('token', 'student', async () => json([repo, { ...repo, id: 11, private: true }, { ...repo, id: 12, fork: true }, { ...repo, id: 13, archived: true }, { ...repo, id: 14, owner: { login: 'someone-else' } }]));
  assert.equal(repositories.length, 1);
  assert.equal(repositories[0].url, 'https://github.com/student/portfolio');
  const suggestions = suggestGithubSkills(repositories, [{ id: 1, name: 'TypeScript' }, { id: 2, name: 'React' }, { id: 3, name: 'JavaScript' }]);
  assert.deepEqual(suggestions, [{ skillId: 1, name: 'TypeScript', evidence: ['portfolio'] }]);
});

test('provider failures distinguish revoked access, rate limits and invalid JSON', async () => {
  await assert.rejects(() => providerJson('https://api.github.com/user', {}, async () => json({}, 401)), { status: 409 });
  await assert.rejects(() => providerJson('https://api.github.com/user', {}, async () => json({}, 429)), { status: 429 });
  await assert.rejects(() => providerJson('https://api.github.com/user', {}, async () => new Response('bad')), { status: 502 });
  await assert.rejects(() => providerJson('https://api.github.com/user', {}, async () => { throw new Error('secret provider error'); }), { status: 502 });
});

test('LinkedIn ID tokens validate signature, issuer, audience, nonce, expiry and userinfo subject', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'key1', use: 'sig', alg: 'RS256' };
  const claims = { sub: 'li-42', nonce: 'nonce' };
  const options = { algorithm: 'RS256', keyid: 'key1', issuer: 'https://www.linkedin.com', audience: 'linkedin-client', expiresIn: '5m' };
  const fetcher = async () => json({ keys: [jwk] });
  const verify = (token, overrides = {}) => validateLinkedinToken(token, { clientId: 'linkedin-client', nonce: 'nonce', subject: 'li-42', ...overrides }, fetcher);
  const token = jwt.sign(claims, privateKey, options);
  assert.equal((await verify(token)).sub, 'li-42');
  for (const overrides of [{ nonce: 'other' }, { subject: 'other' }, { clientId: 'other' }]) await assert.rejects(() => verify(token, overrides), { status: 502 });
  await assert.rejects(() => verify(jwt.sign(claims, privateKey, { ...options, issuer: 'https://attacker.test' })), { status: 502 });
  await assert.rejects(() => verify(jwt.sign(claims, privateKey, { ...options, expiresIn: -60 })), { status: 502 });
  await assert.rejects(() => verify(jwt.sign(claims, 'secret', { algorithm: 'HS256', keyid: 'key1' })), { status: 502 });
});
