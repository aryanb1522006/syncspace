import test from 'node:test';
import assert from 'node:assert/strict';
import { matchSkillsSemantically } from '../src/services/semanticSkillMatching.js';

test('exact skill match: identical skillId is reported as an exact match, not semantic', async () => {
  const studentSkills = [{ skillId: 1, name: 'React' }];
  const projectSkills = [{ skillId: 1, name: 'React', importance: 'required' }];

  const result = await matchSkillsSemantically(studentSkills, projectSkills, 0.3);

  assert.equal(result.exactMatches.length, 1);
  assert.equal(result.semanticMatches.length, 0);
  assert.equal(result.unmatched.length, 0);
});

test('semantic skill match: related-but-different skill names match above the threshold', async () => {
  const studentSkills = [{ skillId: 10, name: 'Machine Learning' }];
  const projectSkills = [{ skillId: 11, name: 'Deep Learning', importance: 'required' }];

  // Threshold appropriate for the deterministic hashing provider, which
  // surfaces lexical/token overlap ("learning" shared) rather than deep
  // semantic relationships; a transformer-backed provider would use a
  // higher, more discriminating threshold.
  const result = await matchSkillsSemantically(studentSkills, projectSkills, 0.3);

  assert.equal(result.exactMatches.length, 0);
  assert.equal(result.semanticMatches.length, 1);
  assert.equal(result.semanticMatches[0].name, 'Deep Learning');
  assert.equal(result.semanticMatches[0].relatedTo, 'Machine Learning');
  assert.ok(result.semanticMatches[0].similarity >= 0.3);
});

test('unrelated skills are neither an exact nor a semantic match', async () => {
  const studentSkills = [{ skillId: 20, name: 'Pottery' }];
  const projectSkills = [{ skillId: 21, name: 'Quantum Computing', importance: 'required' }];

  const result = await matchSkillsSemantically(studentSkills, projectSkills, 0.3);

  assert.equal(result.exactMatches.length, 0);
  assert.equal(result.semanticMatches.length, 0);
  assert.equal(result.unmatched.length, 1);
  assert.equal(result.unmatched[0].name, 'Quantum Computing');
});

test('handles a student with no skills without throwing', async () => {
  const result = await matchSkillsSemantically([], [{ skillId: 1, name: 'React', importance: 'required' }], 0.3);
  assert.equal(result.exactMatches.length, 0);
  assert.equal(result.unmatched.length, 1);
});
