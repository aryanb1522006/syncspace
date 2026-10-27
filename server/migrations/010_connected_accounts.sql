ALTER TABLE student_profiles
  ADD COLUMN avatar_url TEXT,
  ADD COLUMN portfolio JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN import_sources JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE external_accounts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('github', 'linkedin')),
  provider_account_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  username TEXT,
  credentials TEXT NOT NULL,
  preview JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'reconnect')),
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  refreshed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  UNIQUE (user_id, provider),
  UNIQUE (provider, provider_account_id)
);

CREATE TABLE account_connection_transactions (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('github', 'linkedin')),
  state_hash TEXT NOT NULL UNIQUE,
  browser_challenge TEXT NOT NULL,
  return_origin TEXT NOT NULL,
  protocol_secrets TEXT,
  result TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'exchanging', 'ready', 'failed', 'complete')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX account_connection_expiry_idx ON account_connection_transactions(expires_at);
