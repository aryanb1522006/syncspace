-- GitHub and LinkedIn profile intelligence.
--
--   profile_connections: one row per student per external source. GitHub
--     rows are created through OAuth (provider_user_id is GitHub's stable
--     numeric user id; the access token is stored AES-256-GCM encrypted).
--     LinkedIn rows record a student-uploaded LinkedIn data export, since
--     LinkedIn's public APIs do not expose skills or positions.
--     profile_text holds public repository descriptions/topics or the
--     export headline/summary; it is used only internally for semantic
--     matching and is never returned to other users.
--   skill_evidence: every individual piece of evidence for a skill, with
--     its source, location, detection method and confidence. Evidence is
--     private by default.
--   skill_decisions: a student's approve/reject decision per suggested
--     skill, so a re-sync never re-suggests a rejected skill and never
--     overwrites a manually entered skill.

CREATE TYPE profile_source AS ENUM ('github', 'linkedin_export');
CREATE TYPE evidence_visibility AS ENUM ('private', 'team', 'college');
CREATE TYPE skill_decision AS ENUM ('approved', 'rejected');

ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT
  CHECK (linkedin_url IS NULL OR linkedin_url ~ '^https://(www\.)?linkedin\.com/in/[A-Za-z0-9_-]{3,100}/?$');

CREATE TABLE profile_connections (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  source profile_source NOT NULL,
  provider_user_id TEXT,
  username TEXT,
  profile_url TEXT,
  access_token_ciphertext TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  profile_text TEXT NOT NULL DEFAULT '' CHECK (CHAR_LENGTH(profile_text) <= 4000),
  last_synced_at TIMESTAMPTZ,
  last_sync_error TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, source),
  CONSTRAINT profile_connections_github_identity_check
    CHECK (source <> 'github' OR (provider_user_id IS NOT NULL AND username IS NOT NULL))
);

-- One GitHub account can back only one SyncSpace profile.
CREATE UNIQUE INDEX profile_connections_provider_user_unique
  ON profile_connections (source, provider_user_id)
  WHERE provider_user_id IS NOT NULL;

CREATE TABLE skill_evidence (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  skill_id BIGINT REFERENCES skills(id) ON DELETE CASCADE,
  raw_name TEXT NOT NULL CHECK (CHAR_LENGTH(raw_name) BETWEEN 1 AND 120),
  source profile_source NOT NULL,
  source_ref TEXT NOT NULL CHECK (CHAR_LENGTH(source_ref) BETWEEN 1 AND 300),
  evidence TEXT NOT NULL CHECK (CHAR_LENGTH(evidence) BETWEEN 1 AND 500),
  detection_method TEXT NOT NULL CHECK (detection_method IN (
    'language_bytes', 'manifest_dependency', 'repo_topic', 'config_file', 'readme_mention',
    'linkedin_skill', 'linkedin_position', 'linkedin_project', 'linkedin_certification', 'linkedin_summary'
  )),
  confidence NUMERIC(4, 3) NOT NULL CHECK (confidence > 0 AND confidence <= 1),
  visibility evidence_visibility NOT NULL DEFAULT 'private',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, source, source_ref, detection_method, raw_name)
);

CREATE INDEX skill_evidence_student_skill_idx ON skill_evidence (student_id, skill_id);

CREATE TABLE skill_decisions (
  student_id BIGINT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  skill_id BIGINT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  decision skill_decision NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, skill_id)
);

CREATE TRIGGER profile_connections_set_updated_at
BEFORE UPDATE ON profile_connections FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER skill_evidence_set_updated_at
BEFORE UPDATE ON skill_evidence FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER skill_decisions_set_updated_at
BEFORE UPDATE ON skill_decisions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Technologies GitHub repositories commonly reveal that the dictionary
-- lacked. Existing skills are left untouched.
INSERT INTO skills (name, category, aliases) VALUES
  ('Next.js', 'Web', ARRAY['nextjs', 'next.js']),
  ('Django', 'Backend', ARRAY[]::TEXT[]),
  ('Flask', 'Backend', ARRAY[]::TEXT[]),
  ('FastAPI', 'Backend', ARRAY['fast api']),
  ('Spring Boot', 'Backend', ARRAY['spring-boot', 'springboot']),
  ('Kubernetes', 'DevOps', ARRAY['k8s']),
  ('GitHub Actions', 'DevOps', ARRAY['github-actions']),
  ('scikit-learn', 'AI', ARRAY['sklearn', 'scikit learn']),
  ('C', 'Programming', ARRAY[]::TEXT[]),
  ('Go', 'Programming', ARRAY['golang']),
  ('Rust', 'Programming', ARRAY[]::TEXT[]),
  ('Dart', 'Mobile', ARRAY[]::TEXT[])
ON CONFLICT (name) DO NOTHING;
