import { randomUUID } from 'node:crypto';
import { query } from '../src/config/db.js';
import { createAccessToken } from '../src/services/tokenService.js';

export async function integrationFixture() {
  const suffix = randomUUID();
  const college = (await query('INSERT INTO colleges (name, slug) VALUES ($1, $2) RETURNING id', [`Integration ${suffix}`, `integration-${suffix}`])).rows[0];
  const makeUser = async (name) => {
    const user = (await query("INSERT INTO users (college_id, email, password_hash) VALUES ($1, $2, 'test-fixture') RETURNING *", [college.id, `${name}-${suffix}@test.edu`])).rows[0];
    const profile = (await query('INSERT INTO student_profiles (user_id, name, availability_hours_per_week) VALUES ($1, $2, 10) RETURNING *', [user.id, name])).rows[0];
    return { ...user, profile, token: createAccessToken(user) };
  };
  const owner = await makeUser('owner');
  const candidate = await makeUser('candidate');
  const stranger = await makeUser('stranger');
  const skill = (await query("SELECT id FROM skills WHERE name = 'React'")).rows[0];
  const makeProject = async () => (await query("INSERT INTO projects (college_id, owner_id, title, description, domain, team_size, commitment_hours_per_week, deadline) VALUES ($1, $2, $3, 'A sufficiently detailed temporary integration project', 'Web', 4, 5, NOW() + INTERVAL '14 days') RETURNING *", [college.id, owner.id, `Integration ${randomUUID()}`])).rows[0];
  const project = await makeProject();
  await query('INSERT INTO student_skills (student_id, skill_id, proficiency) VALUES ($1, $2, 3)', [candidate.profile.id, skill.id]);
  await query("INSERT INTO project_skills (project_id, skill_id, importance) VALUES ($1, $2, 'required')", [project.id, skill.id]);
  return { suffix, college, owner, candidate, stranger, skill, project, makeProject,
    evidence: [{ skillId: Number(skill.id), rawName: 'React', sourceRef: 'fixture/web', evidence: 'React fixture', detectionMethod: 'manifest_dependency', confidence: 0.6 }],
    async cleanup() { await query('DELETE FROM projects WHERE college_id = $1', [college.id]); await query('DELETE FROM users WHERE college_id = $1', [college.id]); await query('DELETE FROM colleges WHERE id = $1', [college.id]); }
  };
}
