import test from 'node:test';
import assert from 'node:assert/strict';
import { generateEmbedding } from '../src/services/embeddingService.js';
import {
  buildStudentProfileText,
  computeCosineScore,
  computeFinalScore,
  computeSkillScore,
  computeRecommendationScore
} from '../src/services/recommendationScoring.js';

test('computeSkillScore reuses the existing required/preferred overlap ratios (0-1)', () => {
  const score = computeSkillScore({ requiredSkillOverlapRatio: 1, preferredSkillOverlapRatio: 0.5 });
  assert.equal(score, 0.7 * 1 + 0.3 * 0.5);
});

test('computeCosineScore normalizes cosine similarity into 0-1 and handles missing embeddings', async () => {
  const embeddingA = await generateEmbedding('React frontend developer');
  const embeddingB = await generateEmbedding('React frontend developer');
  const score = computeCosineScore(embeddingA, embeddingB);
  assert.ok(score > 0.9);
  assert.equal(computeCosineScore(null, embeddingB), 0);
  assert.equal(computeCosineScore(embeddingA, undefined), 0);
});

test('computeFinalScore combines skillScore and cosineScore using default 0.5/0.5 weights', () => {
  const finalScore = computeFinalScore(0.8, 0.4);
  assert.equal(finalScore, 0.5 * 0.8 + 0.5 * 0.4);
});

test('computeFinalScore weights are configurable', () => {
  const skillHeavy = computeFinalScore(1, 0, { skillScoreWeight: 0.9, cosineScoreWeight: 0.1 });
  const cosineHeavy = computeFinalScore(1, 0, { skillScoreWeight: 0.1, cosineScoreWeight: 0.9 });
  assert.ok(skillHeavy > cosineHeavy);
  assert.equal(Math.round(skillHeavy * 100), 90);
});

test('buildStudentProfileText combines bio, interests, and skill names', () => {
  const text = buildStudentProfileText({
    bio: 'Frontend engineer.',
    interests: ['Climate Tech'],
    skills: [{ name: 'React' }, { name: 'TypeScript' }]
  });
  assert.match(text, /Frontend engineer/);
  assert.match(text, /Climate Tech/);
  assert.match(text, /React/);
});

test('computeRecommendationScore produces a full payload with matched/related skills and a 0-100 finalScore', async () => {
  const student = {
    bio: 'Frontend engineer who loves building dashboards.',
    interests: ['Climate Tech'],
    skills: [{ skillId: 1, name: 'React' }, { skillId: 2, name: 'Machine Learning' }]
  };
  const studentEmbedding = await generateEmbedding(buildStudentProfileText(student));
  const project = {
    skills: [
      { skillId: 1, name: 'React', importance: 'required' },
      { skillId: 3, name: 'Deep Learning', importance: 'preferred' }
    ],
    descriptionEmbedding: await generateEmbedding('A React dashboard for visualizing climate data.'),
    descriptionSummary: 'A React dashboard for visualizing climate data.'
  };
  const matchBreakdown = { requiredSkillOverlapRatio: 1, preferredSkillOverlapRatio: 0 };

  const result = await computeRecommendationScore({ student, studentEmbedding, matchBreakdown, project });

  assert.ok(result.finalScore >= 0 && result.finalScore <= 100);
  assert.ok(result.skillScore >= 0 && result.skillScore <= 100);
  assert.ok(result.cosineScore >= 0 && result.cosineScore <= 100);
  assert.ok(result.matchedSkills.some((skill) => skill.name === 'React'));
  assert.equal(result.summary, 'A React dashboard for visualizing climate data.');
});

test('recommendation ranking: higher combined score sorts first', () => {
  const projects = [
    { id: 1, recommendation: { finalScore: 40 } },
    { id: 2, recommendation: { finalScore: 90 } },
    { id: 3, recommendation: { finalScore: 65 } }
  ];
  const ranked = [...projects].sort((a, b) => b.recommendation.finalScore - a.recommendation.finalScore);
  assert.deepEqual(ranked.map((project) => project.id), [2, 3, 1]);
});
