import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { authenticate, requireAdmin } from '../src/middleware/auth.js';
import { isAdminEmail } from '../src/services/adminIdentity.js';
import { createAccessToken } from '../src/services/tokenService.js';

after(() => pool.end());

test('health endpoint is available without a database connection', async () => {
  const response = await request(app).get('/api/health').expect(200);
  assert.equal(response.body.status, 'ok');
  assert.ok(response.headers['x-request-id']);
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
});

test('CORS rejects origins outside the production allowlist', async () => {
  const response = await request(app)
    .get('/api/health')
    .set('Origin', 'https://malicious.example')
    .expect(403);
  assert.match(response.body.error.message, /origin/i);
});

test('metrics stay unavailable when monitoring is disabled', async () => {
  await request(app).get('/api/metrics').expect(404);
});

test('invalid JWT is rejected', async () => {
  const response = await request(app)
    .get('/api/students/me')
    .set('Authorization', 'Bearer definitely-not-a-token')
    .expect(401);
  assert.match(response.body.error.message, /invalid or expired/i);
});

test('expired JWT is rejected', async () => {
  const token = jwt.sign({ role: 'student', collegeId: 1 }, env.jwtSecret, {
    subject: '1', expiresIn: -1
  });
  await request(app)
    .get('/api/students/me')
    .set('Authorization', `Bearer ${token}`)
    .expect(401);
});

test('authentication normalizes PostgreSQL bigint identity claims to numbers', async () => {
  const token = jwt.sign({ role: 'student', collegeId: '1' }, env.jwtSecret, {
    subject: '11', expiresIn: '5m'
  });
  const req = { headers: { authorization: `Bearer ${token}` } };
  await new Promise((resolve, reject) => authenticate(req, {}, (error) => error ? reject(error) : resolve()));
  assert.deepEqual(req.user, { id: 11, role: 'student', collegeId: 1, email: '', isAdmin: false });
});

test('new access tokens serialize normalized identity claims', () => {
  const token = createAccessToken({ id: '11', role: 'student', college_id: '1', email: 'Admin@Thapar.edu', email_verified: true });
  const payload = jwt.verify(token, env.jwtSecret);
  assert.equal(payload.sub, '11');
  assert.equal(payload.collegeId, 1);
  assert.equal(payload.email, 'admin@thapar.edu');
  assert.equal(payload.isAdmin, false, 'the configured allowlist remains the source of administrator authority');
});

test('administrator allowlist matching is exact and case-insensitive', () => {
  const allowlist = ['abansal6_be24@thapar.edu'];
  assert.equal(isAdminEmail('ABANSAL6_BE24@THAPAR.EDU', allowlist), true);
  assert.equal(isAdminEmail('abansal6_be24@thapar.edu.attacker.test', allowlist), false);
  assert.equal(isAdminEmail('other@thapar.edu', allowlist), false);
});

test('admin middleware rejects ordinary authenticated users', async () => {
  const token = jwt.sign({ role: 'student', collegeId: 1, email: 'student@thapar.edu' }, env.jwtSecret, {
    subject: '1', expiresIn: '5m'
  });
  const response = await request(app)
    .get('/api/admin/projects')
    .set('Authorization', `Bearer ${token}`)
    .expect(403);
  assert.match(response.body.error.message, /administrator access required/i);
});

test('requireAdmin permits only a server-derived administrator identity', async () => {
  const allowed = { user: { isAdmin: true } };
  await new Promise((resolve, reject) => requireAdmin(allowed, {}, (error) => error ? reject(error) : resolve()));
  const denied = await new Promise((resolve) => requireAdmin({ user: { isAdmin: false } }, {}, resolve));
  assert.equal(denied.status, 403);
});

test('both legacy roles retain authenticated project creation capability', async () => {
  for (const role of ['student', 'owner']) {
    const token = jwt.sign({ role, collegeId: 1 }, env.jwtSecret, {
      subject: role === 'student' ? '1' : '4', expiresIn: '5m'
    });
    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);
    assert.equal(response.body.error.message, 'Validation failed');
  }
});

test('both legacy roles reach application decisions but still require valid input and ownership', async () => {
  for (const role of ['student', 'owner']) {
    const token = jwt.sign({ role, collegeId: 1 }, env.jwtSecret, {
      subject: role === 'student' ? '1' : '4', expiresIn: '5m'
    });
    await request(app)
      .put('/api/applications/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'not-a-decision' })
      .expect(400);
  }
});

test('registration validation rejects a weak request before database access', async () => {
  const response = await request(app)
    .post('/api/auth/register')
    .send({ email: 'not-an-email', password: 'short', name: '' })
    .expect(400);
  assert.equal(response.body.error.message, 'Validation failed');
});

test('public registration cannot select an arbitrary college', async () => {
  const response = await request(app)
    .post('/api/auth/register')
    .send({
      email: 'tenant-switch@example.edu',
      password: 'strongpass123',
      role: 'student',
      name: 'Tenant Switch',
      collegeId: 999
    })
    .expect(400);
  assert.equal(response.body.error.message, 'Validation failed');
});
