import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
process.env.GITHUB_CLIENT_ID = 'test-github-client';
process.env.GITHUB_CLIENT_SECRET = 'test-github-secret';
process.env.GITHUB_REDIRECT_URI = 'http://localhost:4000/api/integrations/github/callback';
process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 13).toString('base64');
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
const { app } = await import('../src/app.js');
const { pool, query } = await import('../src/config/db.js');
const { integrationFixture } = await import('../test-fixtures/integrationHarness.js');
const { oauthChallenge } = await import('../src/models/integrationOAuthModel.js');
const { getConnection, listEvidence } = await import('../src/models/profileIntelligenceModel.js');
const { randomBytes } = await import('node:crypto');
after(() => pool.end());
const enabled = process.env.RUN_DB_TESTS === 'true';
const json = (value, status = 200) => new Response(JSON.stringify(value), { status });

test('GitHub callback, PKCE, browser binding, one-time state and identity isolation work through HTTP', { skip: !enabled }, async () => {
  const f = await integrationFixture();
  const originalFetch = global.fetch;
  let expectedChallenge;
  global.fetch = async (url, options) => {
    if (url === 'https://github.com/login/oauth/access_token') {
      const body = JSON.parse(options.body);
      assert.equal(oauthChallenge(body.code_verifier), expectedChallenge);
      assert.equal(body.client_secret, 'test-github-secret');
      return json({ access_token: 'github-fixture-secret', scope: '' });
    }
    if (url === 'https://api.github.com/user') return json({ id: 100000 + Number(f.candidate.id), login: 'fixture', html_url: 'https://github.com/fixture' });
    if (url.includes('/users/fixture/repos')) return json([{ full_name: 'fixture/campus-tools', size: 12 }]);
    if (url.endsWith('/repos/fixture/campus-tools/languages')) return json({ Python: 1000 });
    if (url.endsWith('/repos/fixture/campus-tools/contents/')) return json([]);
    if (url.endsWith('/repos/fixture/campus-tools/readme')) return new Response(null, { status: 404 });
    throw new Error(`Unexpected test request ${url}`);
  };
  const auth = (call, user = f.candidate) => call.set('Authorization', `Bearer ${user.token}`);
  const start = async (user = f.candidate) => {
    const verifier = randomBytes(32).toString('base64url');
    const result = await auth(request(app).get('/api/integrations/github/authorize'), user).query({ browserChallenge: oauthChallenge(verifier) }).expect(200);
    const url = new URL(result.body.url);
    expectedChallenge = url.searchParams.get('code_challenge');
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
    assert.ok(!url.searchParams.get('scope'));
    return { verifier, state: url.searchParams.get('state'), requestId: result.body.requestId };
  };
  const exchange = (flow, user = f.candidate) => auth(request(app).post('/api/integrations/github/exchange'), user).send({ code: 'fixture-code', state: flow.state, verifier: flow.verifier });
  try {
    const flow = await start();
    const callback = await request(app).get('/api/integrations/github/callback').query({ code: 'fixture-code', state: flow.state }).expect(303);
    assert.equal(callback.headers['cache-control'], 'no-store');
    assert.equal(callback.headers['referrer-policy'], 'no-referrer');
    assert.ok(callback.headers.location.startsWith('http://localhost:5173/#/integrations/github/callback?'));
    assert.ok(!callback.headers.location.includes('test-github-secret'));
    await exchange(flow, f.owner).expect(403);
    await exchange({ ...flow, verifier: randomBytes(32).toString('base64url') }).expect(403);
    const success = await exchange(flow).expect(200);
    assert.equal(success.body.github.connection.username, 'fixture');
    const added = success.body.skills.find((skill) => skill.name === 'Python');
    assert.equal(added.status, 'on_profile');
    assert.deepEqual(success.body.addedSkillIds, [Number(added.skillId)]);
    const repeated = await auth(request(app).post('/api/integrations/github/sync')).expect(200);
    assert.deepEqual(repeated.body.addedSkillIds, []);
    await auth(request(app).delete(`/api/students/${f.candidate.profile.id}/skills/${added.skillId}`)).expect(200);
    const afterRemoval = await auth(request(app).post('/api/integrations/github/sync')).expect(200);
    assert.deepEqual(afterRemoval.body.addedSkillIds, []);
    assert.equal(afterRemoval.body.skills.find((skill) => skill.name === 'Python').status, 'rejected');
    assert.ok(!JSON.stringify(success.body).includes('github-fixture-secret'));
    await exchange(flow).expect(400);
    const stored = await getConnection(f.candidate.profile.id, 'github');
    assert.ok(!stored.accessTokenCiphertext.includes('github-fixture-secret'));
    const duplicate = await start(f.owner);
    await exchange(duplicate, f.owner).expect(409);
    const expired = await start();
    await query("UPDATE integration_oauth_requests SET expires_at = NOW() - INTERVAL '1 second' WHERE id = $1", [expired.requestId]);
    await exchange(expired).expect(400);
    const unknown = await request(app).get('/api/integrations/github/callback').query({ state: 'not-a-signed-state', code: 'fixture' }).expect(400);
    assert.ok(!unknown.headers.location);
  } finally { global.fetch = originalFetch; await f.cleanup(); }
});

test('an HTTP sync paused upstream cannot recreate deleted evidence after disconnect', { skip: !enabled }, async () => {
  const f = await integrationFixture();
  const originalFetch = global.fetch;
  const { saveGitHubConnection } = await import('../src/models/profileIntelligenceModel.js');
  const { encryptToken } = await import('../src/services/tokenCrypto.js');
  const { env } = await import('../src/config/env.js');
  let release;
  let entered;
  const arrived = new Promise((resolve) => { entered = resolve; });
  const paused = new Promise((resolve) => { release = resolve; });
  global.fetch = async (url) => {
    if (url === 'https://api.github.com/user') return json({ id: 123, login: 'fixture' });
    if (url.includes('/users/fixture/repos')) { entered(); await paused; return json([]); }
    if (url.endsWith('/applications/test-github-client/token')) return new Response(null, { status: 204 });
    throw new Error(`Unexpected test request ${url}`);
  };
  try {
    await saveGitHubConnection({ studentId: f.candidate.profile.id, providerUserId: '123', username: 'fixture', profileUrl: 'https://github.com/fixture', accessTokenCiphertext: encryptToken('fixture-token', env.tokenEncryptionKey) });
    const running = request(app).post('/api/integrations/github/sync').set('Authorization', `Bearer ${f.candidate.token}`).then((response) => response);
    await arrived;
    await request(app).delete('/api/integrations/github?deleteEvidence=true').set('Authorization', `Bearer ${f.candidate.token}`).expect(200);
    release();
    assert.equal((await running).status, 409);
    assert.equal(await getConnection(f.candidate.profile.id, 'github'), null);
    assert.deepEqual(await listEvidence(f.candidate.profile.id), []);
  } finally { release(); global.fetch = originalFetch; await f.cleanup(); }
});
