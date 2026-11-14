import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { query, pool } from '../src/config/db.js';
import { integrationFixture } from '../test-fixtures/integrationHarness.js';
import { deleteConnection, getConnection, replaceSourceEvidence, saveGitHubConnection, setEvidenceVisibility } from '../src/models/profileIntelligenceModel.js';
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
    await setEvidenceVisibility(candidate.profile.id, [id], 'college');
    await request(app).delete(`/api/students/${candidate.profile.id}/skills/${skill.id}`).set('Authorization', `Bearer ${candidate.token}`).expect(200);
    const removed = await request(app).get(`/api/students/${candidate.profile.id}`).set('Authorization', `Bearer ${owner.token}`).expect(200);
    assert.deepEqual(removed.body.student.skillEvidence, [], 'removing a skill hides its evidence from other profiles');
  } finally { await fixture.cleanup(); }
});

test('project links are opt-in and applicant profiles are scoped to the project owner', { skip: process.env.RUN_DB_TESTS !== 'true' }, async () => {
  const fixture = await integrationFixture();
  const otherCollege = await integrationFixture();
  const { owner, candidate, stranger, project, skill } = fixture;
  const auth = (call, user) => call.set('Authorization', `Bearer ${user.token}`);
  const saveLinks = (user, shareProfileLinks) => auth(request(app).put(`/api/students/${user.profile.id}`), user).send({
    linkedinUrl: 'https://www.linkedin.com/in/campus-member', shareProfileLinks
  }).expect(200);
  try {
    for (const [user, username] of [[owner, 'campus-leader'], [candidate, 'campus-applicant']]) {
      await saveGitHubConnection({
        studentId: user.profile.id, providerUserId: `${fixture.suffix}-${username}`, username,
        profileUrl: `https://github.com/${username}`, accessTokenCiphertext: 'private-test-ciphertext'
      });
    }
    const projectPath = `/api/projects/${project.id}`;
    assert.equal((await auth(request(app).get(projectPath), stranger).expect(200)).body.project.ownerLinks, null);
    await saveLinks(owner, true);
    const shared = await auth(request(app).get(projectPath), stranger).expect(200);
    assert.deepEqual(shared.body.project.ownerLinks, {
      githubUrl: 'https://github.com/campus-leader', linkedinUrl: 'https://www.linkedin.com/in/campus-member'
    });
    assert.equal(shared.body.project.canViewTeamContacts, false);
    assert.ok(!JSON.stringify(shared.body).includes('private-test-ciphertext'));
    await auth(request(app).get(projectPath), otherCollege.candidate).expect(404);
    await deleteConnection(owner.profile.id, 'github');
    assert.equal((await auth(request(app).get(projectPath), stranger).expect(200)).body.project.ownerLinks.githubUrl, null);
    await saveLinks(owner, false);
    assert.equal((await auth(request(app).get(projectPath), stranger).expect(200)).body.project.ownerLinks, null);

    await replaceSourceEvidence({
      studentId: candidate.profile.id, source: 'github', evidence: fixture.evidence, profileText: '',
      expectedConnection: await getConnection(candidate.profile.id, 'github')
    });
    const applied = await auth(request(app).post(`${projectPath}/apply`), candidate).expect(201);
    const applicationId = applied.body.application.id;
    const applicantPath = `${projectPath}/applications/${applicationId}/profile`;
    const beforeSharing = (await auth(request(app).get(applicantPath), owner).expect(200)).body.student;
    assert.equal(beforeSharing.name, 'candidate');
    assert.ok(beforeSharing.skills.some((entry) => Number(entry.id) === Number(skill.id)));
    assert.equal(beforeSharing.githubUrl, undefined);
    assert.equal(beforeSharing.linkedinUrl, undefined);
    await saveLinks(candidate, true);
    const applicant = (await auth(request(app).get(applicantPath), owner).expect(200)).body.student;
    assert.equal(applicant.githubUrl, 'https://github.com/campus-applicant');
    assert.equal(applicant.linkedinUrl, 'https://www.linkedin.com/in/campus-member');
    assert.equal(applicant.email, undefined);
    assert.equal(applicant.contactVisible, false);
    assert.deepEqual(applicant.skillEvidence, []);
    await auth(request(app).get(applicantPath), stranger).expect(404);
    await auth(request(app).get(applicantPath), candidate).expect(404);
    await auth(request(app).get(applicantPath), otherCollege.owner).expect(404);
    const wrongProject = await fixture.makeProject();
    await auth(request(app).get(`/api/projects/${wrongProject.id}/applications/${applicationId}/profile`), owner).expect(404);
    await auth(request(app).get(`/api/students/${candidate.profile.id}`), stranger).expect(({ body }) => {
      assert.equal(body.student.githubUrl, undefined);
      assert.equal(body.student.linkedinUrl, undefined);
    });
    await query("UPDATE applications SET status = 'rejected' WHERE id = $1", [applicationId]);
    await auth(request(app).get(applicantPath), owner).expect(404);
    await auth(request(app).put(`/api/students/${candidate.profile.id}/skills/${skill.id}`), stranger).expect(403);
    await auth(request(app).post(`/api/students/${candidate.profile.id}/resume`), candidate).expect(410);
  } finally {
    await fixture.cleanup();
    await otherCollege.cleanup();
  }
});
