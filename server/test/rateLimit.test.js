import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';

process.env.RATE_LIMIT_MAX = '3';
process.env.AUTH_RATE_LIMIT_MAX = '2';
const { app } = await import('../src/app.js');
const { env } = await import('../src/config/env.js');

test('verified accounts have separate budgets while unauthenticated requests and login remain IP limited', async () => {
  const token = (id) => jwt.sign({ collegeId: 1 }, env.jwtSecret, { subject: String(id), expiresIn: '1m' });
  const first = token(1);
  const second = token(2);
  const check = (value) => {
    const call = request(app).get('/api/teams/missing/route');
    return value ? call.set('Authorization', `Bearer ${value}`) : call;
  };

  for (let index = 0; index < 3; index += 1) await check(first).expect(404);
  await check(first).set('Origin', env.clientOrigins[0]).expect(429)
    .expect('Access-Control-Expose-Headers', 'Retry-After')
    .expect('Retry-After', /^\d+$/)
    .expect(({ body }) => assert.match(body.error.message, /Too many requests/));
  await check(second).expect(404);

  for (const value of [undefined, 'invalid-token', 'another-invalid-token']) {
    await check(value).expect(401);
  }
  await check().expect(429);
  await check(second).expect(404);
  await request(app).get('/api/health').expect(200);
});

test('account tokens do not change the login IP budget', async () => {
  // Use an independent client IP for the two cases.
  const settings = app.get('trust proxy');
  app.set('trust proxy', 1);
  try {
    const loginRoute = (id) => request(app).get('/api/auth/missing')
      .set('X-Forwarded-For', '192.0.2.11')
      .set('Authorization', `Bearer ${jwt.sign({ collegeId: 1 }, env.jwtSecret, { subject: String(id) })}`);
    await loginRoute(1).expect(404);
    await loginRoute(2).expect(404);
    await loginRoute(3).expect(429);
  } finally {
    app.set('trust proxy', settings);
  }
});
