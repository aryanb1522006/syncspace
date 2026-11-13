import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { pool, query } from '../src/config/db.js';
import {
  deleteConnection,
  getConnection,
  listEvidence,
  listVisibleEvidence,
  replaceSourceEvidence,
  saveGitHubConnection,
  setEvidenceVisibility,
  skillReviewRepository
} from '../src/models/profileIntelligenceModel.js';
import { getStudentRecommendationContext } from '../src/models/recommendationModel.js';
import { decideSkillSuggestion } from '../src/services/skillReview.js';

const enabled = process.env.RUN_DB_TESTS === 'true';

after(async () => {
  await pool.end();
});

const item = (skillId, rawName, sourceRef, detectionMethod, confidence = 0.6) => ({
  skillId, rawName, sourceRef, detectionMethod, confidence, evidence: `${rawName} evidence in ${sourceRef}`
});

test('GitHub evidence sync, visibility, review decisions and recommendation context work in PostgreSQL', { skip: !enabled }, async () => {
  const { rows: [student] } = await query(
    `SELECT sp.id, sp.user_id, u.college_id FROM student_profiles sp JOIN users u ON u.id = sp.user_id
     WHERE u.email = 'isha@northstar.edu'`
  );
  const { rows: [other] } = await query(
    `SELECT sp.id FROM student_profiles sp JOIN users u ON u.id = sp.user_id WHERE u.email = 'kabir@northstar.edu'`
  );
  const { rows: skills } = await query("SELECT id, name FROM skills WHERE name IN ('React', 'Docker', 'Kubernetes')");
  const skill = Object.fromEntries(skills.map((row) => [row.name, Number(row.id)]));
  const { rows: [react] } = await query('SELECT proficiency FROM student_skills WHERE student_id = $1 AND skill_id = $2', [student.id, skill.React]);
  assert.ok(react, 'seeded student has React');
  const providerUserId = `test-${Date.now()}`;

  try {
    await saveGitHubConnection({ studentId: student.id, providerUserId, username: 'isha-test', profileUrl: 'https://github.com/isha-test', accessTokenCiphertext: 'v1.a.b.c' });
    await assert.rejects(
      saveGitHubConnection({ studentId: other.id, providerUserId, username: 'isha-test', profileUrl: null, accessTokenCiphertext: 'v1.a.b.c' }),
      (error) => error.status === 409,
      'one GitHub account backs only one SyncSpace profile'
    );

    await replaceSourceEvidence({
      studentId: student.id,
      source: 'github',
      expectedConnection: await getConnection(student.id, 'github'),
      evidence: [item(skill.React, 'React', 'isha/web', 'manifest_dependency'), item(skill.Docker, 'Docker', 'isha/web', 'config_file', 0.5)],
      profileText: 'web: Campus energy dashboard.'
    });
    let evidence = await listEvidence(student.id);
    assert.equal(evidence.length, 2);
    const reactEvidence = evidence.find((row) => row.rawName === 'React');
    assert.equal(reactEvidence.visibility, 'private', 'evidence is private by default');
    assert.deepEqual(await setEvidenceVisibility(student.id, [reactEvidence.id], 'college'), [Number(reactEvidence.id)]);
    assert.deepEqual(await setEvidenceVisibility(other.id, [reactEvidence.id], 'college'), [], 'students cannot change others\' evidence');

    // Re-sync: Docker disappeared from the repository, Kubernetes appeared.
    await replaceSourceEvidence({
      studentId: student.id,
      source: 'github',
      expectedConnection: await getConnection(student.id, 'github'),
      evidence: [item(skill.React, 'React', 'isha/web', 'manifest_dependency', 0.55), item(skill.Kubernetes, 'Kubernetes', 'isha/web', 'config_file', 0.5)],
      profileText: 'web: Campus energy dashboard.'
    });
    evidence = await listEvidence(student.id);
    assert.deepEqual(evidence.map((row) => row.rawName).sort(), ['Kubernetes', 'React'], 'outdated evidence is removed');
    const refreshed = evidence.find((row) => row.rawName === 'React');
    assert.equal(refreshed.visibility, 'college', 'a re-sync keeps the student\'s visibility choice');
    assert.equal(refreshed.confidence, 0.55);
    assert.deepEqual((await listVisibleEvidence(student.id, ['college'])).map((row) => row.rawName), ['React']);

    const keep = await decideSkillSuggestion(skillReviewRepository, { studentId: student.id, skillId: skill.React, decision: 'approved', proficiency: 1 });
    assert.equal(keep.addedToProfile, false);
    const { rows: [unchanged] } = await query('SELECT proficiency FROM student_skills WHERE student_id = $1 AND skill_id = $2', [student.id, skill.React]);
    assert.equal(unchanged.proficiency, react.proficiency, 'manual proficiency is never overwritten');

    const added = await decideSkillSuggestion(skillReviewRepository, { studentId: student.id, skillId: skill.Kubernetes, decision: 'approved', proficiency: 2 });
    assert.equal(added.addedToProfile, true);

    const context = await getStudentRecommendationContext(student.user_id, student.college_id);
    assert.match(context.student.externalProfileText, /Campus energy dashboard/);
    const kubernetes = context.student.skills.find((row) => Number(row.skillId) === skill.Kubernetes);
    assert.deepEqual(kubernetes.evidenceSources, ['github']);
  } finally {
    await deleteConnection(student.id, 'github', { deleteEvidence: true });
    await query('DELETE FROM skill_decisions WHERE student_id = $1', [student.id]);
    await query('DELETE FROM student_skills WHERE student_id = $1 AND skill_id = $2', [student.id, skill.Kubernetes]);
  }

  assert.equal((await listEvidence(student.id)).length, 0, 'disconnecting with deleteEvidence removes the data');
});
