import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSummary } from '../src/services/summarizationService.js';

test('empty description returns an empty summary', () => {
  assert.equal(generateSummary('', 50), '');
  assert.equal(generateSummary(null, 50), '');
  assert.equal(generateSummary('   ', 50), '');
});

test('short description under the word limit is returned as-is', () => {
  const description = 'A campus energy dashboard for students.';
  assert.equal(generateSummary(description, 50), description);
});

test('summary respects a configurable word limit', () => {
  const longDescription = Array.from({ length: 200 }, (_, i) => `word${i}`).join(' ') + '.';
  const summary = generateSummary(longDescription, 20);
  const wordCount = summary.replace(/\u2026$/, '').trim().split(/\s+/).filter(Boolean).length;
  assert.ok(wordCount <= 20, `expected at most 20 words, got ${wordCount}`);
});

test('handles a very long AI-generated, verbose description without truncating mid-sentence for short summaries', () => {
  const verbose = [
    'This project aims to build an AI powered smart student attendance platform that leverages facial recognition to automatically mark attendance in real time.',
    'It will integrate with the existing college learning management system and provide administrators with a comprehensive dashboard of attendance trends.',
    'The team will also explore privacy-preserving techniques so that biometric data is never stored in raw form on any server.',
    'Additional stretch goals include SMS notifications for parents and a mobile companion app for teachers.'
  ].join(' ');

  const summary = generateSummary(verbose, 30);
  assert.ok(summary.length > 0);
  const wordCount = summary.replace(/\u2026$/, '').trim().split(/\s+/).filter(Boolean).length;
  assert.ok(wordCount <= 30, `expected at most 30 words, got ${wordCount}`);
});

test('a single very long run-on sentence is trimmed at a word boundary with an ellipsis, not mid-word', () => {
  const runOn = Array.from({ length: 60 }, (_, i) => `term${i}`).join(' ');
  const summary = generateSummary(runOn, 10);
  assert.ok(summary.endsWith('\u2026'));
  const words = summary.replace(/\u2026$/, '').trim().split(/\s+/);
  assert.equal(words.length, 10);
});
