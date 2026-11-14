import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { zipSync, strToU8 } from 'fflate';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { integrationFixture } from '../test-fixtures/integrationHarness.js';
import { listEvidence, getConnection } from '../src/models/profileIntelligenceModel.js';
import { parseCsv, parseLinkedInUpload } from '../src/services/linkedinExport.js';
after(() => pool.end());
test('import limits reject unsupported CSVs, unknown sections and oversized rows', () => {
  assert.throws(() => parseLinkedInUpload(Buffer.from('Name\nReact\n'), 'Contacts.csv', []), { status: 400 });
  assert.throws(() => parseLinkedInUpload(Buffer.from('Name\nReact\n'), 'Skills.csv', [], ['profile.csv']), { status: 400 });
  assert.throws(() => parseCsv('Name\n' + 'React\n'.repeat(10002)), { status: 422 });
});
test('ZIP/CSV preview writes nothing; confirmation imports only selected sections privately', { skip: process.env.RUN_DB_TESTS !== 'true' }, async () => {
  const f = await integrationFixture();
  const auth = (call) => call.set('Authorization', `Bearer ${f.candidate.token}`);
  const file = Buffer.from(zipSync({ 'Skills.csv': strToU8('Name\nPython\n'), 'Profile.csv': strToU8('Headline,Summary\nPrivate headline,React developer\n'), 'Connections.csv': strToU8('Secret Contact\n') }));
  try {
    const preview = await auth(request(app).post('/api/integrations/linkedin/preview')).attach('export', file, 'linkedin.zip').expect(200);
    assert.deepEqual(preview.body.sections.map((item) => item.name), ['profile.csv', 'skills.csv']);
    assert.ok(!JSON.stringify(preview.body).includes('Secret Contact'));
    assert.deepEqual(await listEvidence(f.candidate.profile.id), []);
    assert.equal(await getConnection(f.candidate.profile.id, 'linkedin_export'), null);
    await auth(request(app).post('/api/integrations/linkedin/import')).attach('export', file, 'linkedin.zip').expect(400);
    await auth(request(app).post('/api/integrations/linkedin/import')).field('confirm', 'true').field('sections', '["connections.csv"]').attach('export', file, 'linkedin.zip').expect(400);
    const imported = await auth(request(app).post('/api/integrations/linkedin/import')).field('confirm', 'true').field('sections', '["skills.csv"]').attach('export', file, 'linkedin.zip').expect(200);
    assert.deepEqual(imported.body.import.sectionsFound, ['skills.csv']);
    const evidence = await listEvidence(f.candidate.profile.id);
    assert.equal(evidence.length, 1);
    assert.equal(evidence[0].visibility, 'private');
    assert.equal(evidence[0].detectionMethod, 'linkedin_skill');
    const importedSkill = imported.body.skills.find((skill) => skill.name === 'Python');
    assert.equal(importedSkill.status, 'pending');
    assert.equal(importedSkill.selectedByDefault, true);
    const own = await auth(request(app).get('/api/students/me')).expect(200);
    assert.ok(!own.body.student.skills.some((skill) => skill.name === 'Python'));
    const reopened = await auth(request(app).get('/api/integrations')).expect(200);
    assert.deepEqual(reopened.body.reviewIds, imported.body.reviewIds);
    const saved = await auth(request(app).post('/api/integrations/skills/review'))
      .send({ reviewIds: imported.body.reviewIds, skillIds: [Number(importedSkill.skillId)] }).expect(200);
    assert.equal(saved.body.profileSkills.find((skill) => skill.name === 'Python').proficiency, 3);
    assert.deepEqual(saved.body.reviewIds, []);
    assert.deepEqual(saved.body.skills, []);
    const stored = await getConnection(f.candidate.profile.id, 'linkedin_export');
    assert.equal(stored.accessTokenCiphertext, null);
    const csv = Buffer.from('Title,Company Name,Description\nDeveloper,Acme,React applications\n');
    await auth(request(app).post('/api/integrations/linkedin/preview')).attach('export', csv, 'Positions.csv').expect(200);
    const reimported = await auth(request(app).post('/api/integrations/linkedin/import')).field('confirm', 'true').field('sections', '["positions.csv"]').attach('export', csv, 'Positions.csv').expect(200);
    assert.equal(reimported.body.reviewIds.length, 1);
    assert.notDeepEqual(reimported.body.reviewIds, imported.body.reviewIds);
    assert.ok((await listEvidence(f.candidate.profile.id)).every((item) => item.detectionMethod === 'linkedin_position'));
    await auth(request(app).delete('/api/integrations/linkedin')).expect(200);
    assert.deepEqual(await listEvidence(f.candidate.profile.id), []);
  } finally { await f.cleanup(); }
});
