import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyEvidence, combineConfidence, itemConfidence, summarizeEvidence } from '../src/services/evidenceScoring.js';

const NOW = Date.parse('2026-11-01T00:00:00Z');

test('item confidence follows the documented weights, fork and staleness penalties', () => {
  assert.equal(itemConfidence('manifest_dependency'), 0.6);
  assert.equal(itemConfidence('language_bytes', { languageShare: 1 }), 0.7);
  assert.equal(itemConfidence('language_bytes', { languageShare: 0.5 }), 0.5);
  assert.equal(itemConfidence('manifest_dependency', { fork: true }), 0.3);
  assert.equal(itemConfidence('repo_topic', { pushedAt: '2024-01-01T00:00:00Z', now: NOW }), 0.32);
  assert.throws(() => itemConfidence('guess'));
});

test('noisy-OR accumulates independent evidence but never reaches certainty', () => {
  assert.equal(combineConfidence([0.6]), 0.6);
  assert.equal(combineConfidence([0.6, 0.5]), 0.8);
  assert.equal(combineConfidence([0.9, 0.9, 0.9]), 0.95);
});

test('evidence classes distinguish repeated GitHub use, single repositories, professional and self-declared', () => {
  const github = (repo) => ({ source: 'github', sourceRef: repo, detectionMethod: 'manifest_dependency' });
  assert.equal(classifyEvidence([github('a/one'), github('a/two'), github('a/three')]), 'repeated_project_evidence');
  assert.equal(classifyEvidence([github('a/one'), github('a/one')]), 'github_detected');
  assert.equal(classifyEvidence([{ source: 'linkedin_export', detectionMethod: 'linkedin_position' }]), 'professional_experience');
  assert.equal(classifyEvidence([{ source: 'linkedin_export', detectionMethod: 'linkedin_skill' }]), 'self_declared');
});

test('summarizeEvidence groups duplicate detections of one skill across sources', () => {
  const groups = summarizeEvidence([
    { skillId: 3, skillName: 'React', rawName: 'React', source: 'github', sourceRef: 'a/web', detectionMethod: 'manifest_dependency', confidence: 0.6 },
    { skillId: 3, skillName: 'React', rawName: 'React', source: 'linkedin_export', sourceRef: 'LinkedIn Skills', detectionMethod: 'linkedin_skill', confidence: 0.3 },
    { skillId: null, skillName: null, rawName: 'Elixir', source: 'github', sourceRef: 'a/api', detectionMethod: 'language_bytes', confidence: 0.5 }
  ]);
  assert.equal(groups.length, 2);
  const react = groups.find((group) => group.name === 'React');
  assert.equal(react.items.length, 2);
  assert.equal(react.confidence, 0.72);
  assert.deepEqual(react.sources.sort(), ['github', 'linkedin_export']);
  assert.equal(groups.find((group) => group.name === 'Elixir').skillId, null);
});
