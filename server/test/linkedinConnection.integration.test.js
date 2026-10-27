import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { generateKeyPairSync, randomUUID } from 'node:crypto';

process.env.NODE_ENV = 'test';
process.env.GITHUB_CLIENT_ID = '';
process.env.GITHUB_CLIENT_SECRET = '';
process.env.LINKEDIN_CLIENT_ID = 'test-linkedin-client';
process.env.LINKEDIN_CLIENT_SECRET = 'test-linkedin-secret';
process.env.EXTERNAL_ACCOUNTS_KEY = Buffer.alloc(32, 12).toString('base64');
process.env.API_PUBLIC_URL = 'http://localhost:4000';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
const { app } = await import('../src/app.js');
const { query, pool } = await import('../src/config/db.js');
const { createAccessToken } = await import('../src/services/tokenService.js');
const { digest, randomSecret } = await import('../src/services/accountCrypto.js');
after(() => pool.end());

test('LinkedIn OIDC links a signed basic profile without asserting ownership of the typed URL', { skip: process.env.RUN_DB_TESTS !== 'true' }, async () => {
  const suffix = randomUUID();
  const originalFetch = global.fetch;
  let collegeId;
  let nonce;
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', use: 'sig', alg: 'RS256' };
  global.fetch = async (url) => {
    if (url === 'https://www.linkedin.com/oauth/v2/accessToken') return new Response(JSON.stringify({ access_token: 'linkedin-fixture-secret', expires_in: 3600, id_token: jwt.sign({ sub: `li-${suffix}`, nonce }, privateKey, { algorithm: 'RS256', keyid: 'test-key', issuer: 'https://www.linkedin.com', audience: 'test-linkedin-client', expiresIn: '5m' }) }));
    if (url === 'https://api.linkedin.com/v2/userinfo') return new Response(JSON.stringify({ sub: `li-${suffix}`, name: 'LinkedIn Name', picture: 'https://media.licdn.com/profile-photo' }));
    if (url === 'https://www.linkedin.com/oauth/openid/jwks') return new Response(JSON.stringify({ keys: [jwk] }));
    throw new Error('Unexpected LinkedIn endpoint');
  };
  try {
    collegeId = (await query('INSERT INTO colleges (name, slug) VALUES ($1, $2) RETURNING id', [`LinkedIn ${suffix}`, `linkedin-${suffix}`])).rows[0].id;
    const user = (await query("INSERT INTO users (college_id, email, password_hash) VALUES ($1, $2, 'fixture') RETURNING *", [collegeId, `linkedin-${suffix}@test.edu`])).rows[0];
    const profile = (await query("INSERT INTO student_profiles (user_id, name, linkedin_url, social_visibility) VALUES ($1, 'Original Name', 'https://www.linkedin.com/in/manually-entered', 'college') RETURNING *", [user.id])).rows[0];
    const token = createAccessToken(user);
    const auth = (call) => call.set('Authorization', `Bearer ${token}`);
    const verifier = randomSecret();
    const started = await auth(request(app).post('/api/connections/linkedin/start')).send({ browserChallenge: digest(verifier) }).expect(200);
    const url = new URL(started.body.authorizationUrl);
    nonce = url.searchParams.get('nonce');
    assert.equal(url.searchParams.get('scope'), 'openid profile');
    await request(app).get('/api/connections/linkedin/callback').query({ state: url.searchParams.get('state'), code: 'fixture-code' }).expect(303);
    const linked = await auth(request(app).post('/api/connections/complete')).send({ transactionId: started.body.transactionId, verifier }).expect(200);
    assert.equal(linked.body.provider, 'linkedin');
    assert.ok(!JSON.stringify(linked.body).includes('linkedin-fixture-secret'));
    await auth(request(app).post('/api/connections/linkedin/import')).send({ fields: ['profileUrl'], repositoryIds: [], skills: [] }).expect(400);
    const imported = await auth(request(app).post('/api/connections/linkedin/import')).send({ fields: ['name', 'avatarUrl'], repositoryIds: [], skills: [] }).expect(200);
    assert.equal(imported.body.student.name, 'LinkedIn Name');
    assert.equal(imported.body.student.linkedin_url, 'https://www.linkedin.com/in/manually-entered');
    assert.equal(imported.body.student.email, user.email);
    const member = await auth(request(app).get(`/api/students/${profile.id}`)).expect(200);
    assert.equal(member.body.student.connections[0].linkedProfile, false);
    const removed = await auth(request(app).delete('/api/connections/linkedin')).send({ removeImported: true }).expect(200);
    assert.equal(removed.body.student.name, 'LinkedIn Name');
    assert.equal(removed.body.student.avatar_url, null);
    assert.equal(removed.body.student.linkedin_url, 'https://www.linkedin.com/in/manually-entered');
  } finally {
    global.fetch = originalFetch;
    if (collegeId) { await query('DELETE FROM users WHERE college_id = $1', [collegeId]); await query('DELETE FROM colleges WHERE id = $1', [collegeId]); }
  }
});
