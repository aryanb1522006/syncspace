import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCoverageScore,
  computeMatchScore,
  computeSkillGap,
  isEligible,
  rankTeammates
} from '../src/services/matchingEngine.js';

test('match score returns the weighted total and transparent breakdown', () => {
  const result = computeMatchScore(
    [{ skillId: 1 }, { skillId: 2 }],
    [{ skillId: 1, importance: 'required' }, { skillId: 3, importance: 'required' }, { skillId: 2, importance: 'preferred' }],
    ['Climate Tech'],
    'Climate Tech',
    5,
    10
  );
  assert.equal(result.score, 68);
  assert.deepEqual(result.breakdown.contributions, {
    requiredSkills: 25,
    preferredSkills: 20,
    domainInterest: 15,
    availability: 8
  });
});

test('worked example ranks complementary frontend candidate above another ML candidate', () => {
  const projectSkills = [
    { skillId: 1, name: 'Machine Learning', importance: 'required' },
    { skillId: 2, name: 'Backend', importance: 'required' },
    { skillId: 3, name: 'Frontend', importance: 'required' },
    { skillId: 4, name: 'UI/UX', importance: 'preferred' }
  ];
  const gap = computeSkillGap(projectSkills, [{ skillId: 1 }, { skillId: 2 }]);
  const ranked = rankTeammates([
    { id: 'similar', name: 'More ML', skills: [{ skillId: 1 }] },
    { id: 'complementary', name: 'Frontend designer', skills: [{ skillId: 3 }, { skillId: 4 }] }
  ], gap);

  assert.equal(ranked[0].id, 'complementary');
  assert.equal(ranked[0].coverageScore, 1);
  assert.equal(ranked[1].coverageScore, 0);
});

test('coverage score respects required versus preferred weights', () => {
  const gap = [
    { skillId: 1, weight: 2 },
    { skillId: 2, weight: 1 }
  ];
  assert.equal(computeCoverageScore([{ skillId: 1 }], gap), 2 / 3);
});

test('hard constraints reject closed, full, expired, applied, and member cases', () => {
  const future = new Date(Date.now() + 86_400_000).toISOString();
  const base = { id: 7, status: 'open', memberCount: 1, teamSize: 3, deadline: future };
  assert.equal(isEligible({}, base), true);
  assert.equal(isEligible({}, { ...base, status: 'active' }), false);
  assert.equal(isEligible({}, { ...base, memberCount: 3 }), false);
  assert.equal(isEligible({}, { ...base, deadline: new Date(0).toISOString() }), false);
  assert.equal(isEligible({ applicationProjectIds: [7] }, base), false);
  assert.equal(isEligible({ membershipProjectIds: [7] }, base), false);
});
