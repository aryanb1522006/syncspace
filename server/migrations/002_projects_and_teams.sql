CREATE TYPE project_status AS ENUM ('open', 'forming', 'active', 'completed', 'cancelled');
CREATE TYPE skill_importance AS ENUM ('required', 'preferred');
CREATE TYPE application_status AS ENUM ('pending', 'accepted', 'rejected');

CREATE TABLE projects (
  id BIGSERIAL PRIMARY KEY,
  college_id BIGINT DEFAULT 1 REFERENCES colleges(id),
  owner_id BIGINT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  domain TEXT NOT NULL,
  team_size SMALLINT NOT NULL CHECK (team_size BETWEEN 2 AND 20),
  commitment_hours_per_week SMALLINT NOT NULL DEFAULT 5 CHECK (commitment_hours_per_week BETWEEN 1 AND 168),
  deadline TIMESTAMPTZ NOT NULL,
  status project_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (owner_id, title)
);

CREATE TABLE project_skills (
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  skill_id BIGINT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  importance skill_importance NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, skill_id)
);

CREATE TABLE teams (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE team_members (
  team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  role_label TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, student_id)
);

CREATE TABLE applications (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status application_status NOT NULL DEFAULT 'pending',
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, project_id)
);

CREATE INDEX projects_owner_id_idx ON projects(owner_id);
CREATE INDEX projects_college_id_idx ON projects(college_id);
CREATE INDEX projects_status_idx ON projects(status);
CREATE INDEX project_skills_skill_id_idx ON project_skills(skill_id);
CREATE INDEX team_members_student_id_idx ON team_members(student_id);
CREATE INDEX applications_project_id_idx ON applications(project_id);
CREATE INDEX applications_status_idx ON applications(status);
