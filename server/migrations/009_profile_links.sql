ALTER TABLE student_profiles
  ADD COLUMN github_url TEXT,
  ADD COLUMN linkedin_url TEXT,
  ADD COLUMN social_visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (social_visibility IN ('private', 'team', 'college'));
