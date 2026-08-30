-- Adds persistent storage for the recommendation-system ML upgrades:
--   - description_embedding: vector representation of the project's
--     ORIGINAL, unmodified description, used for cosine similarity
--     against student profiles and for duplicate/similar project
--     detection. Stored as a plain DOUBLE PRECISION[] so no additional
--     database extension (e.g. pgvector) is required, keeping the
--     existing Postgres setup unchanged.
--   - embedding_model: which embedding model/provider produced the
--     stored vector, so a future model change can be detected and
--     stale embeddings backfilled.
--   - embedding_updated_at: when the embedding was last (re)generated.
--   - description_summary: a short, configurable-word-limit semantic
--     summary of the ORIGINAL description. The original `description`
--     column is never modified.
--   - summary_updated_at: when the summary was last (re)generated.

ALTER TABLE projects
  ADD COLUMN description_embedding DOUBLE PRECISION[],
  ADD COLUMN embedding_model TEXT,
  ADD COLUMN embedding_updated_at TIMESTAMPTZ,
  ADD COLUMN description_summary TEXT,
  ADD COLUMN summary_updated_at TIMESTAMPTZ;

CREATE INDEX projects_embedding_model_idx ON projects(embedding_model);
