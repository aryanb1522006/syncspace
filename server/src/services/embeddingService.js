// embeddingService.js
//
// Reusable text-embedding utilities used by the recommendation system for:
//  - semantic skill matching (matching "React" with "Frontend Development")
//  - cosine similarity between a student's profile text and a project's
//    original description
//  - duplicate/near-duplicate project description detection
//
// PROVIDERS
// ---------
// EMBEDDING_PROVIDER=hashing (default)
//   A dependency-free, fully deterministic, offline embedding built with the
//   classic "feature hashing" trick (unigrams + bigrams hashed into a fixed
//   size vector, TF-weighted, L2-normalized). It requires no network access,
//   no native binaries, and no model download, which keeps the existing
//   runtime architecture untouched and keeps automated tests deterministic
//   and fast. Its similarity signal is driven mostly by shared/overlapping
//   vocabulary (including partial n-gram overlap), so it captures a good
//   amount of lexical relatedness but not deep semantic relationships
//   between totally different words.
//
// EMBEDDING_PROVIDER=transformers (optional)
//   Uses a real pretrained sentence-embedding model (default:
//   'Xenova/all-MiniLM-L6-v2') through the optional `@xenova/transformers`
//   package for genuine semantic embeddings. This is the recommended
//   provider for production if outbound network access to download model
//   weights is available. If the package is not installed, or the model
//   fails to load (e.g. no network access), the service automatically and
//   transparently falls back to the hashing provider so the application
//   keeps working.
//
// Both providers implement the same contract:
//   generateEmbedding(text) -> Promise<number[]>
//   cosineSimilarity(a, b) -> number in [-1, 1]
//
// The embedding model name/provider is configurable via environment
// variables (see config/env.js) so it can be swapped without code changes.

import { env } from '../config/env.js';

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'so', 'of', 'to', 'in',
  'on', 'for', 'with', 'as', 'by', 'at', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'this', 'that', 'these', 'those', 'it', 'its', 'into',
  'their', 'our', 'your', 'we', 'you', 'they', 'he', 'she', 'will', 'can',
  'from', 'using', 'use', 'used', 'via', 'about', 'across', 'per'
]);

/**
 * Normalizes text consistently so the same conceptual input always produces
 * the same embedding: lowercases, strips punctuation/symbols down to
 * alphanumerics and spaces, and collapses repeated whitespace.
 */
export function normalizeText(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(normalized) {
  if (!normalized) return [];
  return normalized.split(' ').filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

// Deterministic 32-bit FNV-1a hash. Stable across Node versions/processes,
// unlike Object/Map iteration order or Math.random-based hashing.
function fnv1a(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function dimensions() {
  return Math.max(32, Number(env.embeddingDimensions) || 256);
}

/**
 * Deterministic offline embedding using the feature-hashing trick.
 * Unigrams and bigrams are hashed into a fixed-size vector; a second hash
 * decides the sign of each contribution (the standard "hashing trick" used
 * to reduce collision bias), weighted by sqrt term-frequency to dampen
 * the effect of very repetitive text. The result is L2-normalized so cosine
 * similarity behaves consistently.
 */
function hashingEmbedding(text) {
  const dims = dimensions();
  const vector = new Array(dims).fill(0);
  const normalized = normalizeText(text);
  const tokens = tokenize(normalized);
  if (!tokens.length) return vector;

  const grams = [...tokens];
  for (let i = 0; i < tokens.length - 1; i += 1) {
    grams.push(`${tokens[i]}_${tokens[i + 1]}`);
  }

  const termFrequency = new Map();
  for (const gram of grams) {
    termFrequency.set(gram, (termFrequency.get(gram) ?? 0) + 1);
  }

  for (const [gram, count] of termFrequency) {
    const bucket = fnv1a(gram) % dims;
    const sign = fnv1a(`sign:${gram}`) % 2 === 0 ? 1 : -1;
    const weight = Math.sqrt(count);
    vector[bucket] += sign * weight;
  }

  return l2Normalize(vector);
}

function l2Normalize(vector) {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!magnitude) return vector;
  return vector.map((value) => value / magnitude);
}

let transformersPipelinePromise = null;
let transformersUnavailableLogged = false;

async function loadTransformersPipeline(modelName) {
  if (!transformersPipelinePromise) {
    transformersPipelinePromise = (async () => {
      // Optional dependency: only imported when EMBEDDING_PROVIDER=transformers.
      // Wrapped so environments without network access (or without the
      // package installed) gracefully fall back to the hashing provider.
      const { pipeline } = await import('@xenova/transformers');
      return pipeline('feature-extraction', modelName);
    })().catch((error) => {
      transformersPipelinePromise = null;
      throw error;
    });
  }
  return transformersPipelinePromise;
}

async function transformersEmbedding(text, modelName) {
  try {
    const extractor = await loadTransformersPipeline(modelName);
    const output = await extractor(normalizeText(text) || ' ', { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (error) {
    if (!transformersUnavailableLogged) {
      transformersUnavailableLogged = true;
      // eslint-disable-next-line no-console
      console.warn(
        `[embeddingService] Falling back to the deterministic hashing embedding provider ` +
        `because the '${modelName}' transformer model could not be loaded (${error.message}). ` +
        `Install '@xenova/transformers' and ensure network access to use real pretrained embeddings.`
      );
    }
    return hashingEmbedding(text);
  }
}

/**
 * Returns the embedding model identifier currently configured. Stored
 * alongside each project's embedding so we know which model produced it
 * (used to detect stale embeddings if the model is ever changed).
 */
export function getEmbeddingModelName() {
  if (env.embeddingProvider === 'transformers') return env.embeddingModel;
  return 'local-hashing-v1';
}

/**
 * Generates an embedding vector for arbitrary text.
 * - Empty/null/whitespace-only text safely returns a zero vector rather
 *   than throwing, so callers never need to special-case missing text.
 * - Deterministic: the same model + input always returns the same vector.
 */
export async function generateEmbedding(text) {
  const normalized = normalizeText(text);
  if (!normalized) return new Array(dimensions()).fill(0);

  if (env.embeddingProvider === 'transformers') {
    return transformersEmbedding(normalized, env.embeddingModel);
  }
  return hashingEmbedding(normalized);
}

/**
 * Cosine similarity between two vectors, in [-1, 1].
 * Returns 0 for missing/empty/zero-magnitude vectors instead of NaN so it
 * is always safe to use directly in scoring formulas.
 */
export function cosineSimilarity(vectorA, vectorB) {
  if (!Array.isArray(vectorA) || !Array.isArray(vectorB)) return 0;
  const length = Math.min(vectorA.length, vectorB.length);
  if (!length) return 0;

  let dot = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  for (let i = 0; i < length; i += 1) {
    dot += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }
  if (!magnitudeA || !magnitudeB) return 0;
  return dot / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

/**
 * Rescales a cosine similarity score ([-1, 1]) into a normalized [0, 1]
 * range so it can be combined consistently with other 0-1 scores.
 */
export function normalizeCosine(similarity) {
  return Math.min(1, Math.max(0, (similarity + 1) / 2));
}
