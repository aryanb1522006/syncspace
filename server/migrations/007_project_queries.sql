CREATE TYPE project_query_status AS ENUM ('open', 'answered');

ALTER TABLE projects
  ADD CONSTRAINT projects_id_college_id_unique UNIQUE (id, college_id);

CREATE TABLE project_queries (
  id BIGSERIAL PRIMARY KEY,
  college_id BIGINT NOT NULL REFERENCES colleges(id),
  project_id BIGINT NOT NULL,
  asker_id BIGINT NOT NULL,
  question TEXT NOT NULL CHECK (CHAR_LENGTH(question) BETWEEN 10 AND 800),
  response TEXT CHECK (response IS NULL OR CHAR_LENGTH(response) BETWEEN 2 AND 800),
  status project_query_status NOT NULL DEFAULT 'open',
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT project_queries_project_same_college_fk
    FOREIGN KEY (project_id, college_id)
    REFERENCES projects (id, college_id)
    ON DELETE CASCADE,
  CONSTRAINT project_queries_asker_same_college_fk
    FOREIGN KEY (asker_id, college_id)
    REFERENCES users (id, college_id)
    ON DELETE CASCADE,
  CONSTRAINT project_queries_answer_state_check CHECK (
    (status = 'open' AND response IS NULL AND answered_at IS NULL)
    OR
    (status = 'answered' AND response IS NOT NULL AND answered_at IS NOT NULL)
  )
);

CREATE INDEX project_queries_project_created_idx
  ON project_queries (project_id, created_at DESC);

CREATE INDEX project_queries_asker_created_idx
  ON project_queries (asker_id, created_at DESC);

CREATE INDEX project_queries_owner_queue_idx
  ON project_queries (project_id, status, created_at DESC);

CREATE TRIGGER project_queries_set_updated_at
BEFORE UPDATE ON project_queries
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
