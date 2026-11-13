import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { query, pool } from '../src/config/db.js';
import { integrationFixture } from '../test-fixtures/integrationHarness.js';
import { getConnection, replaceSourceEvidence, saveGitHubConnection, setEvidenceVisibility } from '../src/models/profileIntelligenceModel.js';
after(() => pool.end());

test('private, college and team evidence have the same audience in profiles and recommendations', { skip: process.env.RUN_DB_TESTS !== 'true' }, async () => {
  const fixture = await integrationFixture();
  const { owner, candidate, stranger, project, skill } = fixture;
  try {
    await saveGitHubConnection({ studentId: candidate.profile.id, providerUserId: fixture.suffix, username: 'fixture', profileUrl: 'https://github.com/fixture', accessTokenCiphertext: 'fixture-v1' });
    await replaceSourceEvidence({ studentId: candidate.profile.id, source: 'github', evidence: fixture.evidence, profileText: '', expectedConnection: await getConnection(candidate.profile.id, 'github') });
    const id = (await query('SELECT id FROM skill_evidence WHERE student_id = $1', [candidate.profile.id])).rows[0].id;
    const sources = async () => {
      const response = await request(app).get(`/api/recommendations/teammates/${project.id}`).set('Authorization', `Bearer ${owner.token}`).expect(200);
      const match = response.body.candidates.find((person) => Number(person.id) === Number(candidate.profile.id));
      assert.ok(match, 'the control candidate must be present');
      return match.skills.find((item) => Number(item.skillId) === Number(skill.id)).evidenceSources;
    };
    assert.deepEqual(await sources(), []);
    await setEvidenceVisibility(candidate.profile.id, [id], 'college');
    assert.deepEqual(await sources(), ['github']);
    await setEvidenceVisibility(candidate.profile.id, [id], 'team');
    assert.deepEqual(await sources(), []);
    const shared = await fixture.makeProject();
    const team = (await query('INSERT INTO teams (project_id) VALUES ($1) RETURNING id', [shared.id])).rows[0];
    await query('INSERT INTO team_members (team_id, student_id) VALUES ($1, $2)', [team.id, candidate.profile.id]);
    assert.deepEqual(await sources(), ['github']);
    const visible = await request(app).get(`/api/students/${candidate.profile.id}`).set('Authorization', `Bearer ${owner.token}`).expect(200);
    assert.equal(visible.body.student.skillEvidence.length, 1);
    const hidden = await request(app).get(`/api/students/${candidate.profile.id}`).set('Authorization', `Bearer ${stranger.token}`).expect(200);
    assert.deepEqual(hidden.body.student.skillEvidence, []);
    await setEvidenceVisibility(candidate.profile.id, [id], 'private');
    assert.deepEqual(await sources(), [], 'accepted teammates still cannot see private provenance');
    const own = await request(app).get(`/api/students/${candidate.profile.id}`).set('Authorization', `Bearer ${candidate.token}`).expect(200);
    assert.equal(own.body.student.skillEvidence.length, 1);
  } finally { await fixture.cleanup(); }
});
