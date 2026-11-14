ALTER TABLE student_team_contacts ENABLE ROW LEVEL SECURITY;

CREATE TABLE team_group_invites (
  team_id BIGINT PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  invite_url TEXT NOT NULL
);

ALTER TABLE team_group_invites ENABLE ROW LEVEL SECURITY;

INSERT INTO team_group_invites (team_id, invite_url)
SELECT id, group_invite_url FROM teams WHERE group_invite_url IS NOT NULL;

ALTER TABLE teams DROP COLUMN group_invite_url;
