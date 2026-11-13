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
function mockFetch({ nonce, subject = 'fixture-account', claims = {}, info = {}, pause }) {
  return async (url, options) => {
    if (url.endsWith('/accessToken')) {
      const body = new URLSearchParams(options.body);
      assert.equal(body.get('client_secret'), 'linkedin-secret');
      await pause?.();
      return json({ access_token: 'never-store-this-token', id_token: jwt.sign({ nonce, sub: subject, ...claims }, privateKey, { algorithm: 'RS256', keyid: 'fixture', issuer: 'https://www.linkedin.com', audience: 'linkedin-fixture', expiresIn: '10m' }) });
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
  for (const override of [{ nonce: 'wrong' }, { info: { sub: 'someone-else' } }]) await assert.rejects(exchangeLinkedin({ ...input, fetchImpl: mockFetch({ nonce: 'expected', ...override }) }), { status: 400 });
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

test('LinkedIn callback is browser-bound, single-use and only copies selected profile fields', { skip: !enabled }, async () => {
  const f = await integrationFixture();
  const original = global.fetch;
  const auth = (call, user = f.candidate) => call.set('Authorization', `Bearer ${user.token}`);
  const start = async (user = f.candidate) => {
    const verifier = randomBytes(32).toString('base64url');
    const response = await auth(request(app).get('/api/integrations/linkedin/authorize'), user).query({ browserChallenge: oauthChallenge(verifier) }).expect(200);
    const url = new URL(response.body.url);
    assert.equal(url.searchParams.get('scope'), 'openid profile');
    return { verifier, state: url.searchParams.get('state'), nonce: url.searchParams.get('nonce'), id: response.body.requestId };
  };
  const exchange = (flow, user) => auth(request(app).post('/api/integrations/linkedin/exchange'), user).send({ code: 'code', state: flow.state, verifier: flow.verifier });
  try {
    const flow = await start();
    global.fetch = mockFetch({ nonce: flow.nonce, subject: f.suffix });
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
    global.fetch = mockFetch({ nonce: duplicate.nonce, subject: f.suffix });
    await exchange(duplicate, f.owner).expect(409);
    const expired = await start();
    await query("UPDATE integration_oauth_requests SET expires_at = NOW() - INTERVAL '1 second' WHERE id = $1", [expired.id]);
    await exchange(expired).expect(400);
    const cancelled = await start();
    let arrived, release;
    const entered = new Promise((resolve) => { arrived = resolve; });
    const waiting = new Promise((resolve) => { release = resolve; });
    global.fetch = mockFetch({ nonce: cancelled.nonce, subject: f.suffix, pause: () => { arrived(); return waiting; } });
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
