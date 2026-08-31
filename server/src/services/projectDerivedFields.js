// projectDerivedFields.js
//
// Single place that computes the ML-derived fields stored alongside a
// project's ORIGINAL, unmodified description:
//   - descriptionEmbedding: vector used for cosine similarity / duplicate
//     detection, generated from the full original description (never from
//     the shortened summary).
//   - embeddingModel: which embedding model/provider produced the vector,
//     so stale embeddings can be detected if the model is later changed.
//   - descriptionSummary: a short, configurable-length semantic summary,
//     generated independently from the same original description.
//
//        original description
//               |-------------------> embedding generation
//               '-------------------> summarization -> descriptionSummary
//
// The original `projects.description` column is never modified by this
// module.

import { generateEmbedding, getEmbeddingModelName } from './embeddingService.js';
import { generateSummary } from './summarizationService.js';
import { env } from '../config/env.js';

/**
 * Computes the embedding and summary for a project description.
 * Safe to call with empty/missing descriptions.
 */
export async function deriveProjectFields(description, { summaryWordLimit = env.projectSummaryWordLimit } = {}) {
  const [descriptionEmbedding, descriptionSummary] = await Promise.all([
    generateEmbedding(description),
    Promise.resolve(generateSummary(description, summaryWordLimit))
  ]);

  return {
    descriptionEmbedding,
    embeddingModel: getEmbeddingModelName(),
    descriptionSummary
  };
}
