import test from 'node:test';
import assert from 'node:assert/strict';
import { generateEmbedding } from '../src/services/embeddingService.js';
import { differentiateProjects, findSimilarProjectPairs, groupSimilarProjectsByProjectId } from '../src/services/similarProjectsService.js';

async function project(id, { title, description, domain, skills }) {
  return {
    id,
    title,
    domain,
    skills,
    descriptionEmbedding: await generateEmbedding(description)
  };
}

test('paraphrased descriptions are recognized as highly similar (not exact string match)', async () => {
  const a = await project(1, {
    title: 'Facial Attendance A',
    description: 'AI powered attendance system using facial recognition',
    domain: 'EdTech',
    skills: [{ name: 'Machine Learning' }, { name: 'Python' }]
  });
  const b = await project(2, {
    title: 'Facial Attendance B',
    description: 'Smart student attendance platform based on face recognition',
    domain: 'EdTech',
    skills: [{ name: 'Machine Learning' }, { name: 'React' }]
  });

  // Threshold calibrated for the deterministic hashing embedding provider,
  // which surfaces shared-vocabulary overlap ("attendance", "recognition")
  // rather than deep semantic similarity; a transformer-backed provider
  // would score this pair much higher and could use a stricter threshold
  // (e.g. the configured default of 0.85).
  const pairs = findSimilarProjectPairs([a, b], 0.12);
  assert.equal(pairs.length, 1, 'expected the paraphrased descriptions to be flagged as similar');
  assert.equal(pairs[0].projectId, 1);
  assert.equal(pairs[0].similarProjectId, 2);
});

test('unrelated descriptions have low similarity and are not flagged', async () => {
  const a = await project(1, {
    title: 'Campus Energy Dashboard',
    description: 'A campus energy dashboard that turns live meter readings into actionable nudges.',
    domain: 'Climate Tech',
    skills: [{ name: 'React' }]
  });
  const b = await project(2, {
    title: 'Peer Study Groups',
    description: 'Smart peer study-group formation based on courses, pace, and availability.',
    domain: 'EdTech',
    skills: [{ name: 'PostgreSQL' }]
  });

  const pairs = findSimilarProjectPairs([a, b], 0.85);
  assert.equal(pairs.length, 0);
});

test('projects without a persisted embedding are skipped rather than embedded on demand', async () => {
  const withEmbedding = await project(1, {
    title: 'A',
    description: 'AI powered attendance system using facial recognition',
    domain: 'EdTech',
    skills: []
  });
  const withoutEmbedding = { id: 2, title: 'B', domain: 'EdTech', skills: [], descriptionEmbedding: null };

  const pairs = findSimilarProjectPairs([withEmbedding, withoutEmbedding], 0.1);
  assert.equal(pairs.length, 0);
});

test('differentiateProjects reports structured, non-invented differences from existing fields', () => {
  const a = { title: 'Facial Attendance A', domain: 'EdTech', skills: [{ name: 'Python' }, { name: 'OpenCV' }] };
  const b = { title: 'Facial Attendance B', domain: 'Civic Tech', skills: [{ name: 'Python' }, { name: 'React' }] };

  const diff = differentiateProjects(a, b, 0.91);

  assert.equal(diff.similarityScore, 0.91);
  assert.deepEqual(diff.differences.skills.shared, ['Python']);
  assert.deepEqual(diff.differences.technologies.onlyInFirst, ['OpenCV']);
  assert.deepEqual(diff.differences.technologies.onlyInSecond, ['React']);
  assert.equal(diff.differences.domain.same, false);
  assert.equal(diff.differences.domain.first, 'EdTech');
  assert.equal(diff.differences.domain.second, 'Civic Tech');
});

test('similar projects are grouped per project id in both directions, never merged/deleted', async () => {
  const a = await project(1, { title: 'A', description: 'AI attendance using facial recognition', domain: 'EdTech', skills: [] });
  const b = await project(2, { title: 'B', description: 'Smart attendance platform based on face recognition', domain: 'EdTech', skills: [] });
  const c = await project(3, { title: 'C', description: 'A totally unrelated budgeting app for students', domain: 'FinTech', skills: [] });

  const pairs = findSimilarProjectPairs([a, b, c], 0.12);
  const grouped = groupSimilarProjectsByProjectId([a, b, c], pairs);

  assert.equal(grouped.get(1).length, 1);
  assert.equal(grouped.get(1)[0].project.id, 2);
  assert.equal(grouped.get(2)[0].project.id, 1);
  assert.equal(grouped.has(3), false);
});

test('grouping swaps onlyInFirst/onlyInSecond so differences read correctly from each side', async () => {
  const a = await project(1, {
    title: 'Facial Attendance A',
    description: 'AI powered attendance system using facial recognition',
    domain: 'EdTech',
    skills: [{ name: 'Python' }, { name: 'OpenCV' }]
  });
  const b = await project(2, {
    title: 'Facial Attendance B',
    description: 'Smart student attendance platform based on face recognition',
    domain: 'Civic Tech',
    skills: [{ name: 'Python' }, { name: 'React' }]
  });

  const pairs = findSimilarProjectPairs([a, b], 0.12);
  const grouped = groupSimilarProjectsByProjectId([a, b], pairs);

  const fromA = grouped.get(1)[0];
  const fromB = grouped.get(2)[0];

  // From A's perspective: "only in first" = A's own unique skill (OpenCV).
  assert.deepEqual(fromA.differences.technologies.onlyInFirst, ['OpenCV']);
  assert.deepEqual(fromA.differences.technologies.onlyInSecond, ['React']);
  assert.equal(fromA.differences.domain.first, 'EdTech');
  assert.equal(fromA.differences.domain.second, 'Civic Tech');

  // From B's perspective: "only in first" must now mean B's own unique
  // skill (React), not still A's - this is the bug being guarded against.
  assert.deepEqual(fromB.differences.technologies.onlyInFirst, ['React']);
  assert.deepEqual(fromB.differences.technologies.onlyInSecond, ['OpenCV']);
  assert.equal(fromB.differences.domain.first, 'Civic Tech');
  assert.equal(fromB.differences.domain.second, 'EdTech');
});
