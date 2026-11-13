CREATE TABLE linkedin_identity_connections (
  student_id BIGINT PRIMARY KEY REFERENCES student_profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  picture_url TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE linkedin_identity_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS avatar_source TEXT;
