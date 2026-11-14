import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { generateKeyPairSync, randomBytes } from 'node:crypto';
process.env.LINKEDIN_CLIENT_ID = 'linkedin-fixture';
process.env.LINKEDIN_CLIENT_SECRET = 'linkedin-secret';
process.env.LINKEDIN_REDIRECT_URI = 'http://localhost:4000/api/integrations/linkedin/callback';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
const { app } = await import('../src/app.js');
const { pool, query } = await import('../src/config/db.js');
const { integrationFixture } = await import('../test-fixtures/integrationHarness.js');
const { oauthChallenge } = await import('../src/models/integrationOAuthModel.js');
const { exchangeLinkedin, safeLinkedinPicture } = await import('../src/services/linkedinIdentity.js');
after(() => pool.end());
const enabled = process.env.RUN_DB_TESTS === 'true';
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'fixture', alg: 'RS256' };
const json = (value) => new Response(JSON.stringify(value));
function mockFetch({ nonce, subject = 'fixture-account', claims = {}, info = {}, pause, issuer = 'https://www.linkedin.com' }) {
  return async (url, options) => {
    if (url.endsWith('/accessToken')) {
      const body = new URLSearchParams(options.body);
      assert.equal(body.get('client_secret'), 'linkedin-secret');
      await pause?.();
      return json({ access_token: 'never-store-this-token', id_token: jwt.sign({ ...(nonce == null ? {} : { nonce }), sub: subject, ...claims }, privateKey, { algorithm: 'RS256', keyid: 'fixture', issuer, audience: 'linkedin-fixture', expiresIn: '10m' }) });
    }
    if (url.endsWith('/jwks')) return json({ keys: [jwk] });
    if (url.endsWith('/userinfo')) return json({ sub: subject, name: 'LinkedIn Name', picture: 'https://media.licdn.com/dms/photo', ...info });
    throw new Error('Unexpected provider endpoint');
  };
}

test('OIDC rejects invalid nonce, issuer, audience, expired tokens and subject mismatch', async () => {
  const input = { code: 'code', clientId: 'linkedin-fixture', clientSecret: 'linkedin-secret', redirectUri: process.env.LINKEDIN_REDIRECT_URI, nonce: 'expected' };
  const success = await exchangeLinkedin({ ...input, fetchImpl: mockFetch({ nonce: 'expected' }) });
  assert.equal(success.name, 'LinkedIn Name');
  for (const override of [{ nonce: 'wrong' }, { info: { sub: 'someone-else' } }, { claims: { azp: 'other-app' } }, { claims: { iat: Math.floor(Date.now() / 1000) + 120 } }]) await assert.rejects(exchangeLinkedin({ ...input, fetchImpl: mockFetch({ nonce: 'expected', ...override }) }), { status: 400 });
  for (const options of [{ issuer: 'https://evil.test' }, { audience: 'other-app' }, { expiresIn: -1 }]) {
    const valid = mockFetch({ nonce: 'expected' });
    await assert.rejects(exchangeLinkedin({ ...input, fetchImpl: async (url, requestOptions) => url.endsWith('/accessToken')
      ? json({ access_token: 'token', id_token: jwt.sign({ nonce: 'expected', sub: 'fixture-account' }, privateKey, { algorithm: 'RS256', keyid: 'fixture', issuer: 'https://www.linkedin.com', audience: 'linkedin-fixture', expiresIn: '10m', ...options }) })
      : valid(url, requestOptions) }), { status: 400 });
  }
  assert.equal(safeLinkedinPicture('https://media.licdn.com.evil.test/photo'), null);
  assert.equal(safeLinkedinPicture('javascript:alert(1)'), null);
  assert.ok(safeLinkedinPicture('https://media.licdn-ei.com/dms/photo'));
});

test('current LinkedIn issuer and code-flow tokens without an unrequested nonce validate securely', async () => {
  const input = { code: 'code', clientId: 'linkedin-fixture', clientSecret: 'linkedin-secret', redirectUri: process.env.LINKEDIN_REDIRECT_URI };
  const current = { issuer: 'https://www.linkedin.com/oauth' };
  const account = await exchangeLinkedin({ ...input, fetchImpl: mockFetch(current) });
  assert.equal(account.subject, 'fixture-account');
  // Older in-flight requests that sent a nonce must still validate it.
  await assert.rejects(exchangeLinkedin({ ...input, nonce: 'expected', fetchImpl: mockFetch(current) }), { status: 400, details: { reason: 'nonce_missing' } });
  await assert.rejects(exchangeLinkedin({ ...input, nonce: 'expected', fetchImpl: mockFetch({ ...current, nonce: 'wrong' }) }), { status: 400, details: { reason: 'nonce_mismatch' } });
  assert.equal((await exchangeLinkedin({ ...input, nonce: 'expected', fetchImpl: mockFetch({ ...current, nonce: 'expected' }) })).subject, 'fixture-account');
  for (const issuer of ['https://evil.test/oauth', 'https://www.linkedin.com.evil.test/oauth', 'https://www.linkedin.com/oauth/']) {
    await assert.rejects(exchangeLinkedin({ ...input, fetchImpl: mockFetch({ issuer }) }), { status: 400, details: { reason: 'issuer_mismatch' } });
  }
  for (const [options, reason] of [[{ audience: 'other-app' }, 'audience_mismatch'], [{ expiresIn: -1 }, 'token_expired']]) {
    const provider = mockFetch(current);
    await assert.rejects(exchangeLinkedin({ ...input, fetchImpl: (url, requestOptions) => url.endsWith('/accessToken')
      ? json({ access_token: 'private-access-token', id_token: jwt.sign({ sub: 'fixture-account' }, privateKey, { algorithm: 'RS256', keyid: 'fixture', issuer: current.issuer, audience: 'linkedin-fixture', expiresIn: '10m', ...options }) })
      : provider(url, requestOptions) }), { status: 400, details: { reason } });
  }
  const otherKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  const provider = mockFetch(current);
  await assert.rejects(exchangeLinkedin({ ...input, fetchImpl: (url, options) => url.endsWith('/accessToken')
    ? json({ access_token: 'private-access-token', id_token: jwt.sign({ sub: 'fixture-account' }, otherKey, { algorithm: 'RS256', keyid: 'fixture', issuer: current.issuer, audience: 'linkedin-fixture', expiresIn: '10m' }) })
    : provider(url, options) }), (error) => {
      assert.equal(error.details.reason, 'invalid_signature');
      assert.ok(!JSON.stringify(error).includes('private-access-token'));
      return true;
    });
});

test('LinkedIn callback is browser-bound, single-use and only copies selected profile fields', { skip: !enabled }, async () => {
  const f = await integrationFixture();
  const original = global.fetch;
  const auth = (call, user = f.candidate) => call.set('Authorization', `Bearer ${user.token}`);
  const start = async (user = f.candidate) => {
    const verifier = randomBytes(32).toString('base64url');
    const response = await auth(request(app).get('/api/integrations/linkedin/authorize'), user).query({ browserChallenge: oauthChallenge(verifier) }).expect(200);
    const url = new URL(response.body.url);
    assert.equal(url.searchParams.get('scope'), 'openid profile');
    assert.equal(url.searchParams.has('nonce'), false, 'new code-flow requests use browser-bound one-time state');
    assert.equal((await query('SELECT nonce FROM integration_oauth_requests WHERE id = $1', [response.body.requestId])).rows[0].nonce, null);
    return { verifier, state: url.searchParams.get('state'), nonce: url.searchParams.get('nonce'), id: response.body.requestId };
  };
  const exchange = (flow, user) => auth(request(app).post('/api/integrations/linkedin/exchange'), user).send({ code: 'code', state: flow.state, verifier: flow.verifier });
  try {
    const flow = await start();
    global.fetch = mockFetch({ issuer: 'https://www.linkedin.com/oauth', nonce: flow.nonce, subject: f.suffix });
    const callback = await request(app).get('/api/integrations/linkedin/callback').query({ code: 'code', state: flow.state }).expect(303);
    assert.ok(callback.headers.location.startsWith('http://localhost:5173/#/integrations/linkedin/callback?'));
    await exchange(flow, f.owner).expect(400);
    await exchange({ ...flow, verifier: randomBytes(32).toString('base64url') }).expect(403);
    const result = await exchange(flow).expect(200);
    assert.equal(result.body.linkedin.account.name, 'LinkedIn Name');
    assert.ok(!JSON.stringify(result.body).includes('never-store-this-token'));
    const before = await auth(request(app).get('/api/students/me')).expect(200);
    assert.equal(before.body.student.name, 'candidate');
    assert.equal(before.body.student.avatar_url, null);
    await exchange(flow).expect(400);
    const used = await auth(request(app).post('/api/integrations/linkedin/profile')).send({ fields: ['photo'] }).expect(200);
    assert.equal(used.body.student.name, 'candidate');
    assert.equal(used.body.student.avatar_url, 'https://media.licdn.com/dms/photo');
    const duplicate = await start(f.owner);
    global.fetch = mockFetch({ issuer: 'https://www.linkedin.com/oauth', nonce: duplicate.nonce, subject: f.suffix });
    await exchange(duplicate, f.owner).expect(409);
    const expired = await start();
    await query("UPDATE integration_oauth_requests SET expires_at = NOW() - INTERVAL '1 second' WHERE id = $1", [expired.id]);
    await exchange(expired).expect(400);
    const cancelled = await start();
    let arrived, release;
    const entered = new Promise((resolve) => { arrived = resolve; });
    const waiting = new Promise((resolve) => { release = resolve; });
    global.fetch = mockFetch({ issuer: 'https://www.linkedin.com/oauth', nonce: cancelled.nonce, subject: f.suffix, pause: () => { arrived(); return waiting; } });
    const running = exchange(cancelled).then((response) => response);
    await entered;
    await auth(request(app).delete('/api/integrations/linkedin/account')).expect(200);
    release();
    assert.equal((await running).status, 409);
    const overview = await auth(request(app).get('/api/integrations')).expect(200);
    assert.equal(overview.body.linkedin.account, null);
    const after = await auth(request(app).get('/api/students/me')).expect(200);
    assert.equal(after.body.student.avatar_url, null);
    assert.equal(after.body.student.name, 'candidate');
  } finally { global.fetch = original; await f.cleanup(); }
});

test('LinkedIn accepts callback-length codes unchanged while rejecting oversized codes before claiming state', { skip: !enabled }, async () => {
  const f = await integrationFixture();
  const original = global.fetch;
  const auth = (call) => call.set('Authorization', `Bearer ${f.candidate.token}`);
  const verifier = randomBytes(32).toString('base64url');
  // LinkedIn codes are opaque and can exceed GitHub's 200-character limit.
  // This synthetic value exercises the full callback boundary, not a live code.
  const code = 'A'.repeat(1997) + '_-Z';
  try {
    const start = await auth(request(app).get('/api/integrations/linkedin/authorize')).query({ browserChallenge: oauthChallenge(verifier) }).expect(200);
    const url = new URL(start.body.url);
    const state = url.searchParams.get('state');
    const callback = await request(app).get('/api/integrations/linkedin/callback').query({ code, state }).expect(303);
    const params = new URLSearchParams(new URL(callback.headers.location).hash.split('?')[1]);
    assert.equal(params.get('code'), code);
    const provider = mockFetch({ issuer: 'https://www.linkedin.com/oauth', nonce: url.searchParams.get('nonce'), subject: f.suffix });
    let exchanges = 0;
    global.fetch = async (endpoint, options) => {
      if (endpoint.endsWith('/accessToken')) {
        exchanges += 1;
        assert.equal(new URLSearchParams(options.body).get('code'), code, 'opaque code reaches LinkedIn without truncation');
      }
      return provider(endpoint, options);
    };
    await request(app).get('/api/integrations/linkedin/callback').query({ code: code + 'X', state }).expect(400);
    const oversized = await auth(request(app).post('/api/integrations/linkedin/exchange')).send({ code: code + 'X', state, verifier }).expect(400);
    assert.ok(oversized.body.error.details.fieldErrors.code);
    assert.equal(exchanges, 0);
    const success = await auth(request(app).post('/api/integrations/linkedin/exchange')).send({ code, state, verifier }).expect(200);
    assert.equal(success.body.linkedin.account.name, 'LinkedIn Name');
    assert.equal(exchanges, 1);
    await auth(request(app).post('/api/integrations/linkedin/exchange')).send({ code, state, verifier }).expect(400);
    assert.equal(exchanges, 1, 'state stays single-use');
  } finally { global.fetch = original; await f.cleanup(); }
});
