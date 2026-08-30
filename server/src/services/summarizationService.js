// summarizationService.js
//
// Produces a short, configurable-length summary of a project description
// WITHOUT ever truncating raw text mid-thought. It uses a classic
// frequency-based extractive summarization technique:
//   1. Split the description into sentences.
//   2. Score each sentence by how many "salient" (frequent, non-stopword)
//      terms it contains, normalized for sentence length so long sentences
//      aren't unfairly favored.
//   3. Greedily select the highest scoring sentences (in their original
//      order) until the configured word budget is reached.
//   4. If even the single best sentence exceeds the word budget (e.g. one
//      very long run-on sentence), fall back to a word-boundary trim of
//      that sentence with an ellipsis - this only happens in that edge
//      case, never as the primary strategy.
//
// This keeps the implementation dependency-free and deterministic (no
// external LLM calls, no new infrastructure), while still being a genuine
// semantic summary rather than naive string truncation: sentence order and
// salience drive which content is kept, not raw character/word cutoffs.

import { normalizeText } from './embeddingService.js';

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'so', 'of', 'to', 'in',
  'on', 'for', 'with', 'as', 'by', 'at', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'this', 'that', 'these', 'those', 'it', 'its', 'into',
  'their', 'our', 'your', 'we', 'you', 'they', 'he', 'she', 'will', 'can',
  'from', 'using', 'use', 'used', 'via', 'about', 'across', 'per', 'also'
]);

function splitSentences(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  // Split on sentence terminators while keeping the punctuation attached.
  const matches = trimmed.match(/[^.!?]+[.!?]*/g);
  return (matches ?? [trimmed]).map((sentence) => sentence.trim()).filter(Boolean);
}

function wordsOf(text) {
  return text.split(/\s+/).filter(Boolean);
}

function scoreSentences(sentences) {
  const frequency = new Map();
  const tokenizedSentences = sentences.map((sentence) => {
    const tokens = normalizeText(sentence).split(' ').filter((token) => token && !STOPWORDS.has(token));
    for (const token of tokens) frequency.set(token, (frequency.get(token) ?? 0) + 1);
    return tokens;
  });

  return sentences.map((sentence, index) => {
    const tokens = tokenizedSentences[index];
    const salience = tokens.reduce((sum, token) => sum + (frequency.get(token) ?? 0), 0);
    const score = tokens.length ? salience / Math.sqrt(tokens.length) : 0;
    return { sentence, index, score };
  });
}

/**
 * Generates a semantic (extractive) summary of `text` limited to
 * approximately `wordLimit` words. Handles empty text, very short text,
 * very long AI-generated text, and single-run-on-sentence edge cases.
 */
export function generateSummary(text, wordLimit) {
  const limit = Math.max(5, Number(wordLimit) || 50);
  const cleaned = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';

  const totalWords = wordsOf(cleaned);
  if (totalWords.length <= limit) return cleaned;

  const sentences = splitSentences(cleaned);
  if (sentences.length <= 1) {
    return `${wordsOf(cleaned).slice(0, limit).join(' ')}\u2026`;
  }

  const scored = scoreSentences(sentences).sort((a, b) => b.score - a.score);

  const selected = [];
  let wordCount = 0;
  for (const candidate of scored) {
    const candidateWordCount = wordsOf(candidate.sentence).length;
    if (selected.length && wordCount + candidateWordCount > limit) continue;
    selected.push(candidate);
    wordCount += candidateWordCount;
    if (wordCount >= limit) break;
  }

  if (!selected.length) {
    // The single best sentence alone is longer than the whole budget.
    const best = scored[0];
    return `${wordsOf(best.sentence).slice(0, limit).join(' ')}\u2026`;
  }

  selected.sort((a, b) => a.index - b.index);
  const summary = selected.map((item) => item.sentence).join(' ').trim();

  // Safety net: guarantee the configured word limit is always respected.
  const summaryWords = wordsOf(summary);
  if (summaryWords.length > limit) {
    return `${summaryWords.slice(0, limit).join(' ')}\u2026`;
  }
  return summary;
}
