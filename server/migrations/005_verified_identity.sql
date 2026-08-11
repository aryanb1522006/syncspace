ALTER TABLE users
  ALTER COLUMN password_hash DROP NOT NULL,
  ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'password',
  ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN google_subject TEXT;

ALTER TABLE users
  ADD CONSTRAINT users_auth_provider_check
  CHECK (auth_provider IN ('password', 'google'));

CREATE UNIQUE INDEX users_google_subject_unique
  ON users (google_subject)
  WHERE google_subject IS NOT NULL;

CREATE INDEX users_email_verified_idx ON users (email_verified);
