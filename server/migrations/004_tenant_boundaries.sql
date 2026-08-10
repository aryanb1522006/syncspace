ALTER TABLE users ALTER COLUMN college_id SET NOT NULL;
ALTER TABLE projects ALTER COLUMN college_id SET NOT NULL;

ALTER TABLE users
  ADD CONSTRAINT users_id_college_id_unique UNIQUE (id, college_id);

ALTER TABLE projects
  ADD CONSTRAINT projects_owner_same_college_fk
  FOREIGN KEY (owner_id, college_id)
  REFERENCES users (id, college_id);

CREATE OR REPLACE FUNCTION enforce_application_same_college()
RETURNS TRIGGER AS $$
DECLARE
  student_college_id BIGINT;
  project_college_id BIGINT;
BEGIN
  SELECT u.college_id INTO student_college_id
  FROM student_profiles sp
  JOIN users u ON u.id = sp.user_id
  WHERE sp.id = NEW.student_id;

  SELECT college_id INTO project_college_id
  FROM projects
  WHERE id = NEW.project_id;

  IF student_college_id IS DISTINCT FROM project_college_id THEN
    RAISE EXCEPTION 'Application student and project must belong to the same college'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER applications_same_college
BEFORE INSERT OR UPDATE OF student_id, project_id ON applications
FOR EACH ROW EXECUTE FUNCTION enforce_application_same_college();

CREATE OR REPLACE FUNCTION enforce_team_member_same_college()
RETURNS TRIGGER AS $$
DECLARE
  student_college_id BIGINT;
  project_college_id BIGINT;
BEGIN
  SELECT u.college_id INTO student_college_id
  FROM student_profiles sp
  JOIN users u ON u.id = sp.user_id
  WHERE sp.id = NEW.student_id;

  SELECT p.college_id INTO project_college_id
  FROM teams t
  JOIN projects p ON p.id = t.project_id
  WHERE t.id = NEW.team_id;

  IF student_college_id IS DISTINCT FROM project_college_id THEN
    RAISE EXCEPTION 'Team member and project must belong to the same college'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER team_members_same_college
BEFORE INSERT OR UPDATE OF student_id, team_id ON team_members
FOR EACH ROW EXECUTE FUNCTION enforce_team_member_same_college();
