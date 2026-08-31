import test from 'node:test';
import assert from 'node:assert/strict';
import { cosineSimilarity, generateEmbedding, normalizeCosine, normalizeText } from '../src/services/embeddingService.js';

test('normalizeText lowercases, strips punctuation, and collapses whitespace', () => {
  assert.equal(normalizeText('  React.js & Node.JS!! '), 'react js node js');
});

test('normalizeText safely handles null/undefined', () => {
  assert.equal(normalizeText(null), '');
  assert.equal(normalizeText(undefined), '');
});

test('generateEmbedding returns a deterministic vector for the same input', async () => {
  const a = await generateEmbedding('Machine learning powered attendance system');
  const b = await generateEmbedding('Machine learning powered attendance system');
  assert.deepEqual(a, b);
});

test('generateEmbedding safely handles empty/null/whitespace-only text', async () => {
  const empty = await generateEmbedding('');
  const nullish = await generateEmbedding(null);
  const whitespace = await generateEmbedding('   ');
  assert.ok(empty.every((value) => value === 0));
  assert.ok(nullish.every((value) => value === 0));
  assert.ok(whitespace.every((value) => value === 0));
});

test('cosineSimilarity of identical vectors is ~1, orthogonal-ish text is low', async () => {
  const embedding = await generateEmbedding('React frontend developer building dashboards');
  assert.ok(cosineSimilarity(embedding, embedding) > 0.999);

  const unrelated = await generateEmbedding('Organic chemistry lab safety procedures');
  const similarity = cosineSimilarity(embedding, unrelated);
  assert.ok(similarity < 0.3, `expected low similarity for unrelated text, got ${similarity}`);
});

test('cosineSimilarity safely handles missing/zero vectors', () => {
  assert.equal(cosineSimilarity(null, [1, 2, 3]), 0);
  assert.equal(cosineSimilarity([0, 0, 0], [0, 0, 0]), 0);
  assert.equal(cosineSimilarity([], []), 0);
});

test('normalizeCosine maps [-1, 1] into [0, 1]', () => {
  assert.equal(normalizeCosine(1), 1);
  assert.equal(normalizeCosine(-1), 0);
  assert.equal(normalizeCosine(0), 0.5);
});
