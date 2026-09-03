// projectDerivedFields.js
//
// Single place that computes the ML-derived fields stored alongside a
// project's ORIGINAL, unmodified description:
//   - descriptionSummary: a short, configurable-length TextRank summary of
//     the original description, generated FIRST.
//   - descriptionEmbedding: vector used for cosine similarity / duplicate
//     detection, generated from that summary (not the raw description) -
//     summarizing first strips filler, boilerplate, and tangential
//     sentences before the text is embedded, which sharpens the embedding
//     around the project's actual core idea (better matching accuracy)
//     and gives us a human-readable blurb for free (better readability).
//   - embeddingModel: which embedding model/provider produced the vector,
//     so stale embeddings can be detected if the model is later changed.
//
//        original description
//               |
//               v
//        summarization (TextRank) -----------------> descriptionSummary
//               |
//               v
//        embedding generation ------------------------> descriptionEmbedding
//
// For descriptions already at or under the configured word limit,
// generateSummary returns the text unchanged, so short/typical
// descriptions embed exactly as before - this change only affects long,
// verbose (often AI-generated) descriptions where summarizing first
// actually helps.
//
// The original `projects.description` column is never modified by this
// module.

import { generateEmbedding, getEmbeddingModelName } from './embeddingService.js';
import { generateSummary } from './summarizationService.js';
import { env } from '../config/env.js';

/**
 * Computes the summary and embedding for a project description.
 * Safe to call with empty/missing descriptions.
 */
export async function deriveProjectFields(description, { summaryWordLimit = env.projectSummaryWordLimit } = {}) {
  const descriptionSummary = await generateSummary(description, summaryWordLimit);

  // Embed the summary, since it's what will actually drive matching and
  // duplicate detection; fall back to the raw description only in the
  // (practically unreachable, since generateSummary never throws on bad
  // input) case that summarization returns nothing usable.
  const textToEmbed = descriptionSummary || description;
  const descriptionEmbedding = await generateEmbedding(textToEmbed);

  return {
    descriptionEmbedding,
    embeddingModel: getEmbeddingModelName(),
    descriptionSummary
  };
}
