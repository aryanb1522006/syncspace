import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { env } from '../src/config/env.js';

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

test('student role cannot create an owner-only project', async () => {
  const token = jwt.sign({ role: 'student', collegeId: 1 }, env.jwtSecret, {
    subject: '1', expiresIn: '5m'
  });
  const response = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${token}`)
    .send({})
    .expect(403);
  assert.match(response.body.error.message, /permissions/i);
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
