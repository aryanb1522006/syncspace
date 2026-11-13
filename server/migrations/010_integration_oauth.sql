CREATE TABLE integration_oauth_requests (
  id UUID PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('github', 'linkedin')),
  browser_challenge TEXT NOT NULL,
  verifier_ciphertext TEXT,
  nonce TEXT,
  return_origin TEXT NOT NULL,
  consumed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX integration_oauth_expiry_idx ON integration_oauth_requests(expires_at);
-- Server-side only, including when the database is hosted by Supabase.
ALTER TABLE integration_oauth_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_decisions ENABLE ROW LEVEL SECURITY;
