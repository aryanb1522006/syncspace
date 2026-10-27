import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { randomUUID } from 'node:crypto';

// Only synthetic OAuth credentials are used by this isolated test process.
process.env.NODE_ENV = 'test';
process.env.GITHUB_CLIENT_ID = 'test-client';
process.env.GITHUB_CLIENT_SECRET = 'test-secret';
process.env.LINKEDIN_CLIENT_ID = '';
process.env.LINKEDIN_CLIENT_SECRET = '';
process.env.EXTERNAL_ACCOUNTS_KEY = Buffer.alloc(32, 11).toString('base64');
process.env.API_PUBLIC_URL = 'http://localhost:4000';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';

const { app } = await import('../src/app.js');
const { query, pool } = await import('../src/config/db.js');
const { createAccessToken } = await import('../src/services/tokenService.js');
const { digest, randomSecret } = await import('../src/services/accountCrypto.js');
const enabled = process.env.RUN_DB_TESTS === 'true';
after(() => pool.end());

test('real database account linking, visibility, import and disconnect enforce ownership', { skip: !enabled }, async () => {
  const suffix = randomUUID();
  const originalFetch = global.fetch;
  let collegeId;
  let otherCollegeId;
  let providerStatus = 200;
  const externalId = 420000000 + Math.floor(Math.random() * 1000000);
  global.fetch = async (url, options) => {
    if (url === 'https://github.com/login/oauth/access_token') return new Response(JSON.stringify({ access_token: `fixture-secret-${suffix}`, token_type: 'bearer' }));
    if (url === 'https://api.github.com/user') return new Response(JSON.stringify({ id: externalId, login: 'fixture-student', name: 'Imported Name', bio: 'Imported bio', avatar_url: 'https://avatars.githubusercontent.com/u/42' }), { status: providerStatus });
    if (url.includes('/users/fixture-student/repos')) return new Response(JSON.stringify([
      { id: 111, name: 'portfolio', owner: { login: 'fixture-student' }, language: 'TypeScript', description: 'A public project', stargazers_count: 2 },
      { id: 112, name: 'private-work', owner: { login: 'fixture-student' }, language: 'Rust', private: true }
    ]));
    throw new Error(`Unexpected provider request: ${url}`);
  };
  try {
    collegeId = (await query('INSERT INTO colleges (name, slug) VALUES ($1, $2) RETURNING id', [`Connections ${suffix}`, `connections-${suffix}`])).rows[0].id;
    otherCollegeId = (await query('INSERT INTO colleges (name, slug) VALUES ($1, $2) RETURNING id', [`Other ${suffix}`, `other-${suffix}`])).rows[0].id;
    const makeUser = async (label, tenant = collegeId) => {
      const user = (await query("INSERT INTO users (email, password_hash, college_id) VALUES ($1, 'test', $2) RETURNING *", [`${label}-${suffix}@test.edu`, tenant])).rows[0];
      const profile = (await query("INSERT INTO student_profiles (user_id, name, bio) VALUES ($1, $2, 'Original bio') RETURNING *", [user.id, `Original ${label}`])).rows[0];
      return { ...user, profile, token: createAccessToken(user) };
    };
    const owner = await makeUser('owner');
    const outsider = await makeUser('outsider');
    const foreign = await makeUser('foreign', otherCollegeId);
    const auth = (call, user = owner) => call.set('Authorization', `Bearer ${user.token}`);
    await request(app).get('/api/connections').expect(401);
    await auth(request(app).get('/api/connections')).expect(200);

    await auth(request(app).put(`/api/students/${owner.profile.id}`)).send({ githubUrl: 'https://github.com.attacker.test/user' }).expect(400);
    await auth(request(app).put(`/api/students/${owner.profile.id}`)).send({ githubUrl: 'https://github.com/manual', linkedinUrl: 'https://www.linkedin.com/in/manual', socialVisibility: 'private' }).expect(200);
    const hidden = await auth(request(app).get(`/api/students/${owner.profile.id}`), outsider).expect(200);
    assert.equal(hidden.body.student.githubUrl, undefined);
    await auth(request(app).get(`/api/students/${owner.profile.id}`), foreign).expect(404);
    await auth(request(app).put(`/api/students/${owner.profile.id}`), outsider).send({ bio: 'tamper' }).expect(403);

    const start = async (user = owner) => {
      const verifier = randomSecret();
      const response = await auth(request(app).post('/api/connections/github/start'), user).set('Origin', 'http://localhost:5173').send({ browserChallenge: digest(verifier) }).expect(200);
      const state = new URL(response.body.authorizationUrl).searchParams.get('state');
      return { verifier, transactionId: response.body.transactionId, state };
    };
    const callback = (flow) => request(app).get('/api/connections/github/callback').query({ state: flow.state, code: 'test-code' });
    const complete = (flow, user = owner) => auth(request(app).post('/api/connections/complete'), user).send({ transactionId: flow.transactionId, verifier: flow.verifier });
    const flow = await start();
    const returned = await callback(flow).expect(303);
    assert.ok(returned.headers.location.startsWith('http://localhost:5173/#/profile?connection='));
    assert.ok(!returned.headers.location.includes('secret'));
    await callback(flow).expect(400);
    await complete(flow, outsider).expect(400);
    await complete({ ...flow, verifier: randomSecret() }).expect(400);
    const linked = await complete(flow).expect(200);
    assert.ok(!JSON.stringify(linked.body).includes(`fixture-secret-${suffix}`));
    await complete(flow).expect(409);
    const stored = (await query('SELECT credentials FROM external_accounts WHERE user_id = $1', [owner.id])).rows[0];
    assert.ok(!stored.credentials.includes('fixture-secret'));
    const initial = await auth(request(app).get('/api/students/me')).expect(200);
    assert.equal(initial.body.student.name, 'Original owner', 'linking does not overwrite the profile');

    const duplicate = await start(outsider);
    await callback(duplicate).expect(303);
    await complete(duplicate, outsider).expect(409);
    const expired = await start();
    await query("UPDATE account_connection_transactions SET expires_at = NOW() - INTERVAL '1 second' WHERE id = $1", [expired.transactionId]);
    await callback(expired).expect(400);
    const cancelled = await start();
    await request(app).get('/api/connections/github/callback').query({ state: cancelled.state, error: 'access_denied' }).expect(303);
    await complete(cancelled).expect(409);

    const refreshed = await auth(request(app).post('/api/connections/github/refresh')).expect(200);
    assert.equal(refreshed.body.preview.repositories.length, 1);
    await auth(request(app).post('/api/connections/github/refresh')).expect(429);
    const suggestion = refreshed.body.preview.proposedSkills.find((skill) => skill.name === 'TypeScript');
    assert.ok(suggestion, 'seeded dictionary contains TypeScript');
    await auth(request(app).post('/api/connections/github/import')).send({ fields: [], repositoryIds: ['999'], skills: [] }).expect(400);
    await auth(request(app).post('/api/connections/github/import')).send({ fields: [], repositoryIds: [], skills: [{ skillId: 999999, proficiency: 5 }] }).expect(400);
    const accepted = await auth(request(app).post('/api/connections/github/import')).send({ fields: ['bio', 'profileUrl', 'avatarUrl'], repositoryIds: ['111'], skills: [{ skillId: suggestion.skillId, proficiency: 2 }] }).expect(200);
    assert.equal(accepted.body.student.name, 'Original owner');
    assert.equal(accepted.body.student.bio, 'Imported bio');
    assert.equal(accepted.body.student.portfolio[0].name, 'portfolio');
    assert.equal(accepted.body.student.skills.find((skill) => Number(skill.id) === suggestion.skillId).proficiency, 2);
    const afterUser = (await query('SELECT email, college_id, auth_provider FROM users WHERE id = $1', [owner.id])).rows[0];
    assert.equal(afterUser.email, owner.email);
    assert.equal(afterUser.college_id, owner.college_id);
    assert.equal(afterUser.auth_provider, owner.auth_provider);

    await auth(request(app).put(`/api/students/${owner.profile.id}`)).send({ socialVisibility: 'college' }).expect(200);
    const visible = await auth(request(app).get(`/api/students/${owner.profile.id}`), outsider).expect(200);
    assert.equal(visible.body.student.githubUrl, 'https://github.com/fixture-student');
    assert.equal(visible.body.student.email, undefined, 'college social visibility does not expose contact email');

    await query("UPDATE external_accounts SET refreshed_at = NOW() - INTERVAL '2 minutes' WHERE user_id = $1", [owner.id]);
    providerStatus = 401;
    await auth(request(app).post('/api/connections/github/refresh')).expect(409);
    const reconnect = await auth(request(app).get('/api/connections')).expect(200);
    assert.equal(reconnect.body.accounts[0].status, 'reconnect');
    await auth(request(app).put(`/api/students/${owner.profile.id}`)).send({ bio: 'My later manual edit' }).expect(200);
    const disconnected = await auth(request(app).delete('/api/connections/github')).send({ removeImported: true }).expect(200);
    assert.equal(disconnected.body.accounts.length, 0);
    assert.equal(disconnected.body.student.bio, 'My later manual edit');
    assert.equal(disconnected.body.student.github_url, null);
    assert.deepEqual(disconnected.body.student.portfolio, []);
    assert.equal(disconnected.body.student.linkedin_url, 'https://www.linkedin.com/in/manual');
    assert.ok(disconnected.body.student.skills.length, 'reviewed skills are retained and remain editable');
    console.log('account database journey complete');
  } finally {
    global.fetch = originalFetch;
    if (collegeId) {
      await query('DELETE FROM users WHERE college_id = $1', [collegeId]);
      await query('DELETE FROM colleges WHERE id = $1', [collegeId]);
    }
    if (otherCollegeId) {
      await query('DELETE FROM users WHERE college_id = $1', [otherCollegeId]);
      await query('DELETE FROM colleges WHERE id = $1', [otherCollegeId]);
    }
  }
});
