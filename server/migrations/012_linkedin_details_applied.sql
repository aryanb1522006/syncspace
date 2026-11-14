ALTER TABLE linkedin_identity_connections
  ADD COLUMN IF NOT EXISTS name_applied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS photo_applied_at TIMESTAMPTZ;

-- Recognize details already in place so existing members do not repeat setup.
UPDATE linkedin_identity_connections c SET
  name_applied_at = COALESCE(c.name_applied_at, CASE WHEN c.name = p.name THEN NOW() END),
  photo_applied_at = COALESCE(c.photo_applied_at, CASE WHEN c.picture_url = p.avatar_url THEN NOW() END)
FROM student_profiles p WHERE p.id = c.student_id;
