CREATE TABLE admin_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  college_id BIGINT NOT NULL REFERENCES colleges(id),
  admin_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('project.delete')),
  target_type TEXT NOT NULL CHECK (target_type IN ('project')),
  target_id BIGINT NOT NULL,
  reason TEXT NOT NULL CHECK (CHAR_LENGTH(reason) BETWEEN 8 AND 500),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX admin_audit_logs_college_created_idx
  ON admin_audit_logs (college_id, created_at DESC);

CREATE INDEX admin_audit_logs_admin_user_id_idx
  ON admin_audit_logs (admin_user_id);
