// summarizationService.js
//
// Produces a short, configurable-length summary of a project description
// WITHOUT ever truncating raw text mid-thought, using TextRank: an
// unsupervised, graph-based extractive summarization algorithm (Mihalcea &
// Tarau, 2004 - the same family of algorithm as Google's PageRank, applied
// to sentences instead of web pages).
//
// WHY TEXTRANK (over PCA/LSA or SVM)
// -----------------------------------
// - SVM is a *supervised* classifier: it needs a labeled training set of
//   "this sentence belongs in the summary" / "this one doesn't" to learn
//   from. We have no such labels for project descriptions, and hand-
//   labeling one would be a project of its own. Not a fit.
// - PCA/LSA-style summarization (SVD over a term-sentence matrix, keeping
//   sentences that load heavily on the top singular vectors) is unsupervised
//   and can work well on longer, multi-topic documents, but project
//   descriptions here are typically a handful of sentences - too small a
//   matrix for SVD to meaningfully separate "topics" from noise, and it
//   doesn't reuse anything else in this codebase.
// - TextRank is unsupervised, requires no training data, and - crucially -
//   is a graph built directly out of the sentence-similarity primitive we
//   already have: `generateEmbedding` + `cosineSimilarity` from
//   embeddingService.js. That means summarization now shares the exact
//   same notion of "similar text" as duplicate-project detection and
//   student/project matching, rather than a separate, disconnected
//   frequency heuristic.
//
// ALGORITHM
// ---------
//   1. Split the description into sentences.
//   2. Embed every sentence (reusing embeddingService.generateEmbedding).
//   3. Build a complete sentence-similarity graph: edge weight(i, j) =
//      cosineSimilarity(embedding_i, embedding_j).
//   4. Row-normalize the graph into a transition matrix and run the
//      PageRank power iteration over it (damping = 0.85) until scores
//      converge. The result is a "centrality" score per sentence: sentences
//      that are semantically close to many other sentences in the
//      description (i.e. represent its core, recurring ideas) rank highest.
//   5. Greedily select the highest-ranked sentences (restored to their
//      original order) until the configured word budget is reached.
//   6. If even the single best sentence exceeds the word budget (e.g. one
//      very long run-on sentence), fall back to a word-boundary trim of
//      that sentence with an ellipsis - this only happens in that edge
//      case, never as the primary strategy.
//
// If embedding generation ever throws (e.g. a misconfigured optional
// transformers provider), this module falls back to the previous
// deterministic frequency-based sentence scoring so summarization never
// blocks project creation.

import { normalizeText, generateEmbedding, cosineSimilarity } from './embeddingService.js';

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'so', 'of', 'to', 'in',
  'on', 'for', 'with', 'as', 'by', 'at', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'this', 'that', 'these', 'those', 'it', 'its', 'into',
  'their', 'our', 'your', 'we', 'you', 'they', 'he', 'she', 'will', 'can',
  'from', 'using', 'use', 'used', 'via', 'about', 'across', 'per', 'also'
]);

const DAMPING = 0.85;
const MAX_ITERATIONS = 40;
const CONVERGENCE_TOLERANCE = 1e-4;

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

/**
 * Deterministic offline fallback: scores sentences by how many "salient"
 * (frequent, non-stopword) terms they contain, normalized for sentence
 * length. Used only if sentence-embedding generation fails.
 */
function scoreSentencesByFrequency(sentences) {
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
 * TextRank: builds a sentence-similarity graph from embeddings and runs
 * the PageRank power iteration over it to score each sentence by how
 * central/representative it is of the description as a whole.
 */
async function scoreSentencesByTextRank(sentences) {
  const n = sentences.length;
  const embeddings = await Promise.all(sentences.map((sentence) => generateEmbedding(sentence)));

  // Build the similarity matrix (symmetric, zero diagonal - a sentence
  // doesn't vote for itself).
  const similarity = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const score = Math.max(0, cosineSimilarity(embeddings[i], embeddings[j]));
      similarity[i][j] = score;
      similarity[j][i] = score;
    }
  }

  // Row-normalize into transition probabilities. A sentence with no
  // similarity to anything else (e.g. it's all stopwords/empty) gets a
  // uniform transition to every other sentence rather than a divide-by-zero,
  // so it neither dominates nor breaks the iteration.
  const transition = similarity.map((row, i) => {
    const rowSum = row.reduce((sum, value) => sum + value, 0);
    if (!rowSum) return row.map((_, j) => (j === i || n <= 1 ? 0 : 1 / (n - 1)));
    return row.map((value) => value / rowSum);
  });

  // Power iteration (standard PageRank formulation).
  let scores = new Array(n).fill(1 / n);
  for (let iter = 0; iter < MAX_ITERATIONS; iter += 1) {
    const next = new Array(n).fill((1 - DAMPING) / n);
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        if (i === j) continue;
        next[i] += DAMPING * transition[j][i] * scores[j];
      }
    }
    const delta = next.reduce((sum, value, index) => sum + Math.abs(value - scores[index]), 0);
    scores = next;
    if (delta < CONVERGENCE_TOLERANCE) break;
  }

  return sentences.map((sentence, index) => ({ sentence, index, score: scores[index] }));
}

function selectSentencesWithinBudget(scored, limit) {
  const ranked = [...scored].sort((a, b) => b.score - a.score);

  const selected = [];
  let wordCount = 0;
  for (const candidate of ranked) {
    const candidateWordCount = wordsOf(candidate.sentence).length;
    if (selected.length && wordCount + candidateWordCount > limit) continue;
    selected.push(candidate);
    wordCount += candidateWordCount;
    if (wordCount >= limit) break;
  }

  if (!selected.length) {
    // The single best sentence alone is longer than the whole budget.
    const best = ranked[0];
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

/**
 * Generates a semantic (extractive) summary of `text` limited to
 * approximately `wordLimit` words, using TextRank sentence-centrality
 * scoring. Handles empty text, very short text, very long AI-generated
 * text, and single-run-on-sentence edge cases.
 */
export async function generateSummary(text, wordLimit) {
  const limit = Math.max(5, Number(wordLimit) || 50);
  const cleaned = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';

  const totalWords = wordsOf(cleaned);
  if (totalWords.length <= limit) return cleaned;

  const sentences = splitSentences(cleaned);
  if (sentences.length <= 1) {
    return `${wordsOf(cleaned).slice(0, limit).join(' ')}\u2026`;
  }

  let scored;
  try {
    scored = await scoreSentencesByTextRank(sentences);
  } catch {
    // Embedding generation failed (e.g. optional transformers provider
    // misconfigured) - fall back to the deterministic frequency heuristic
    // so summary generation never blocks project creation.
    scored = scoreSentencesByFrequency(sentences);
  }

  return selectSentencesWithinBudget(scored, limit);
}
