CREATE TABLE student_team_contacts (
  student_id BIGINT PRIMARY KEY REFERENCES student_profiles(id) ON DELETE CASCADE,
  whatsapp_number TEXT,
  discord_username TEXT,
  contact_email TEXT
);

ALTER TABLE teams ADD COLUMN group_invite_url TEXT;
ALTER TABLE notifications ADD COLUMN team_id BIGINT REFERENCES teams(id) ON DELETE SET NULL;
CREATE INDEX notifications_team_id_idx ON notifications(team_id) WHERE team_id IS NOT NULL;
