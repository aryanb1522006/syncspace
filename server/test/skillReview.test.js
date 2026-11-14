import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSkillReview, decideSkillSuggestion } from '../src/services/skillReview.js';
import { computeMatchScore } from '../src/services/matchingEngine.js';
import { buildStudentProfileText, computeRecommendationScore, computeSkillScore } from '../src/services/recommendationScoring.js';
import { generateEmbedding } from '../src/services/embeddingService.js';

/** In-memory stand-in for skillReviewRepository. */
function memoryRepository({ evidenceSkillIds = [], profile = new Map() } = {}) {
  const decisions = new Map();
  return {
    profile,
    decisions,
    transaction: (studentId, work) => work({
      listEvidenceForSkill: async (studentId, skillId) => (evidenceSkillIds.includes(skillId) ? [{ id: 1, source: 'github' }] : []),
      addSkillIfMissing: async (studentId, skillId, proficiency) => {
        if (profile.has(skillId)) return false;
        profile.set(skillId, proficiency);
        return true;
      },
      saveDecision: async (studentId, skillId, decision) => { decisions.set(skillId, decision); }
    })
  };
}

test('approving adds the skill with the student-chosen proficiency', async () => {
  const repository = memoryRepository({ evidenceSkillIds: [3] });
  const result = await decideSkillSuggestion(repository, { studentId: 1, skillId: 3, decision: 'approved', proficiency: 4 });
  assert.deepEqual(result, { skillId: 3, decision: 'approved', addedToProfile: true });
  assert.equal(repository.profile.get(3), 4);
});

test('approving never overwrites a manually entered skill or its proficiency', async () => {
  const repository = memoryRepository({ evidenceSkillIds: [3], profile: new Map([[3, 2]]) });
  const result = await decideSkillSuggestion(repository, { studentId: 1, skillId: 3, decision: 'approved', proficiency: 5 });
  assert.equal(result.addedToProfile, false);
  assert.equal(repository.profile.get(3), 2);
});

test('proficiency is never inferred: approval without one is refused', async () => {
  const repository = memoryRepository({ evidenceSkillIds: [3] });
  await assert.rejects(decideSkillSuggestion(repository, { studentId: 1, skillId: 3, decision: 'approved' }), (error) => error.status === 400);
  assert.equal(repository.profile.size, 0);
  assert.equal(repository.decisions.size, 0);
});

test('rejecting records the decision without touching the profile; skills without evidence cannot be decided', async () => {
  const repository = memoryRepository({ evidenceSkillIds: [3], profile: new Map([[3, 2]]) });
  await decideSkillSuggestion(repository, { studentId: 1, skillId: 3, decision: 'rejected' });
  assert.equal(repository.decisions.get(3), 'rejected');
  assert.equal(repository.profile.get(3), 2, 'a manual skill survives rejecting its suggestion');
  await assert.rejects(decideSkillSuggestion(repository, { studentId: 1, skillId: 99, decision: 'rejected' }), (error) => error.status === 404);
});

test('review statuses: on profile, decided, pending and unmatched', () => {
  const evidence = (skillId, rawName) => ({ skillId, skillName: rawName, rawName, source: 'github', sourceRef: 'a/b', detectionMethod: 'manifest_dependency', confidence: 0.6 });
  const review = buildSkillReview(
    [evidence(1, 'React'), evidence(2, 'Docker'), evidence(3, 'Django'), evidence(null, 'Elixir')],
    [{ skillId: 2, decision: 'rejected' }],
    [1]
  );
  const status = Object.fromEntries(review.map((group) => [group.name, group.status]));
  assert.deepEqual(status, { React: 'on_profile', Docker: 'rejected', Django: 'pending', Elixir: 'unmatched' });
});

test('review preselects new skills only when one source exceeds ten percent', () => {
  const piece = (skillId, source, confidence) => ({
    skillId, rawName: String(skillId), source, confidence, sourceRef: 'fixture', detectionMethod: 'readme_mention'
  });
  const review = buildSkillReview([
    piece(1, 'github', 0.1), piece(1, 'linkedin_export', 0.1),
    piece(2, 'github', 0.101), piece(3, 'linkedin_export', 0.3), piece(4, 'github', 0.8)
  ], [{ skillId: 4, decision: 'rejected' }], []);
  assert.deepEqual(Object.fromEntries(review.map((group) => [group.skillId, group.selectedByDefault])), {
    1: false, 2: true, 3: true, 4: false
  });
});

test('an approved evidence-backed skill improves the existing recommendation score and is explained', async () => {
  const project = {
    skills: [{ skillId: 3, name: 'React', importance: 'required' }, { skillId: 4, name: 'Node.js', importance: 'required' }],
    domain: 'EdTech',
    descriptionEmbedding: await generateEmbedding('A React and Node.js tutoring scheduler'),
    descriptionSummary: 'A React and Node.js tutoring scheduler'
  };
  const before = { bio: '', interests: [], skills: [{ skillId: 3, name: 'React', evidenceSources: [] }] };
  const after = { ...before, skills: [...before.skills, { skillId: 4, name: 'Node.js', evidenceSources: ['github'] }] };
  const score = (student) => computeMatchScore(student.skills, project.skills, [], project.domain, 10, 10).breakdown;
  assert.ok(computeSkillScore(score(after)) > computeSkillScore(score(before)));

  const result = await computeRecommendationScore({
    student: after, studentEmbedding: await generateEmbedding(buildStudentProfileText(after)), matchBreakdown: score(after), project
  });
  assert.deepEqual(result.matchedSkills.find((skill) => skill.name === 'Node.js').evidenceSources, ['github']);
  assert.deepEqual(result.matchedSkills.find((skill) => skill.name === 'React').evidenceSources, []);
});

test('connected-source text joins the profile text used for semantic similarity', () => {
  const text = buildStudentProfileText({ bio: 'Student', skills: [], interests: [], externalProfileText: 'campus-api: Attendance API for labs.' });
  assert.match(text, /Attendance API for labs/);
});
