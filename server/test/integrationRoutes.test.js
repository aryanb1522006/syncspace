// HTTP-level checks for /api/integrations that run without PostgreSQL:
// authentication, configuration, validation and upload filtering all
// happen before any query. Database behaviour is covered by
// profileIntelligence.integration.test.js (RUN_DB_TESTS=true).
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { createAccessToken } from '../src/services/tokenService.js';

after(() => pool.end());

const token = createAccessToken({ id: 1, role: 'student', college_id: 1, email: 'isha@northstar.edu', email_verified: false });
const auth = (req) => req.set('Authorization', `Bearer ${token}`);

test('integration endpoints require a SyncSpace session', async () => {
  await request(app).get('/api/integrations').expect(401);
  await request(app).post('/api/integrations/github/sync').expect(401);
});

test('GitHub reports itself as unavailable when OAuth is not configured', async () => {
  const response = await auth(request(app).get('/api/integrations/github/authorize')).expect(503);
  assert.match(response.body.error.message, /not configured/);
});

test('inputs are validated before any work is done', async () => {
  await auth(request(app).post('/api/integrations/github/exchange')).send({ code: '' }).expect(400);
  await auth(request(app).post('/api/integrations/skills/abc/decision')).send({ decision: 'approved', proficiency: 3 }).expect(400);
  await auth(request(app).post('/api/integrations/skills/3/decision')).send({ decision: 'approved', proficiency: 9 }).expect(400);
  await auth(request(app).put('/api/integrations/evidence/visibility')).send({ evidenceIds: [1], visibility: 'public' }).expect(400);
  await auth(request(app).delete('/api/integrations/github?deleteEvidence=maybe')).expect(400);
});

test('LinkedIn import only accepts a .zip upload', async () => {
  const response = await auth(request(app).post('/api/integrations/linkedin/import'))
    .attach('export', Buffer.from('Name\nPython\n'), 'Skills.csv')
    .expect(400);
  assert.match(response.body.error.message, /\.zip/);
});

test('profile LinkedIn URLs must be linkedin.com/in profile links', async () => {
  for (const linkedinUrl of ['http://linkedin.com/in/asha', 'https://evil.example/in/asha', 'https://www.linkedin.com/company/acme', 'javascript:alert(1)']) {
    await auth(request(app).put('/api/students/1')).send({ linkedinUrl }).expect(400);
  }
});
