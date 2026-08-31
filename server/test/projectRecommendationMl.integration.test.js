import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { pool, query } from '../src/config/db.js';
import {
  backfillProjectDerivedFields,
  createProject,
  listProjectsNeedingEmbeddingBackfill,
  updateProject
} from '../src/models/projectModel.js';

const enabled = process.env.RUN_DB_TESTS === 'true';

after(async () => {
  await pool.end();
});

test('creating a project generates and stores an embedding and summary from the original description', { skip: !enabled }, async () => {
  const { rows: [college] } = await query('SELECT id FROM colleges LIMIT 1');
  const { rows: [owner] } = await query("SELECT id FROM users WHERE role = 'owner' AND college_id = $1 LIMIT 1", [college.id]);
  const { rows: [skill] } = await query('SELECT id FROM skills LIMIT 1');

  const description = 'A brand new AI powered platform that helps students discover collaborators for hackathon projects.';
  const project = await createProject(owner.id, college.id, {
    title: `ML Test Project ${Date.now()}`,
    description,
    domain: 'Developer Tools',
    teamSize: 3,
    commitmentHoursPerWeek: 5,
    deadline: new Date(Date.now() + 30 * 86_400_000),
    skills: [{ skillId: skill.id, importance: 'required' }]
  });

  assert.equal(project.description, description, 'original description must remain unchanged');
  assert.ok(Array.isArray(project.descriptionEmbedding) && project.descriptionEmbedding.length > 0);
  assert.ok(project.embeddingModel);
  assert.ok(project.descriptionSummary);
  assert.notEqual(project.descriptionSummary, description === project.descriptionSummary);
});

test('updating a project description regenerates its embedding and summary; other updates do not', { skip: !enabled }, async () => {
  const { rows: [college] } = await query('SELECT id FROM colleges LIMIT 1');
  const { rows: [owner] } = await query("SELECT id FROM users WHERE role = 'owner' AND college_id = $1 LIMIT 1", [college.id]);
  const { rows: [skill] } = await query('SELECT id FROM skills LIMIT 1');

  const created = await createProject(owner.id, college.id, {
    title: `ML Update Test ${Date.now()}`,
    description: 'Original description about a campus carpooling app.',
    domain: 'Civic Tech',
    teamSize: 3,
    commitmentHoursPerWeek: 5,
    deadline: new Date(Date.now() + 30 * 86_400_000),
    skills: [{ skillId: skill.id, importance: 'required' }]
  });

  const beforeEmbedding = created.descriptionEmbedding;
  const beforeSummary = created.descriptionSummary;

  const untouched = await updateProject(created.id, college.id, { status: 'forming' });
  assert.deepEqual(untouched.descriptionEmbedding, beforeEmbedding, 'unrelated updates should not regenerate the embedding');
  assert.equal(untouched.descriptionSummary, beforeSummary);

  const newDescription = 'A completely rewritten description about a peer tutoring marketplace for engineering students.';
  const updated = await updateProject(created.id, college.id, { description: newDescription });
  assert.equal(updated.description, newDescription);
  assert.notDeepEqual(updated.descriptionEmbedding, beforeEmbedding);
  assert.notEqual(updated.descriptionSummary, beforeSummary);
});

test('existing projects without embeddings are found by the backfill query and can be safely backfilled', { skip: !enabled }, async () => {
  const { rows: [college] } = await query('SELECT id FROM colleges LIMIT 1');
  const { rows: [owner] } = await query("SELECT id FROM users WHERE role = 'owner' AND college_id = $1 LIMIT 1", [college.id]);
  const { rows: [skill] } = await query('SELECT id FROM skills LIMIT 1');

  const created = await createProject(owner.id, college.id, {
    title: `ML Backfill Test ${Date.now()}`,
    description: 'A project created normally, then manually stripped of its embedding to simulate legacy data.',
    domain: 'Civic Tech',
    teamSize: 3,
    commitmentHoursPerWeek: 5,
    deadline: new Date(Date.now() + 30 * 86_400_000),
    skills: [{ skillId: skill.id, importance: 'required' }]
  });

  // Simulate a project created before this feature existed.
  await query('UPDATE projects SET description_embedding = NULL, embedding_model = NULL, description_summary = NULL WHERE id = $1', [created.id]);

  const needsBackfill = await listProjectsNeedingEmbeddingBackfill('local-hashing-v1');
  assert.ok(needsBackfill.some((project) => project.id === created.id));

  const target = needsBackfill.find((project) => project.id === created.id);
  const result = await backfillProjectDerivedFields(target);
  assert.ok(result.descriptionEmbedding.length > 0);
  assert.ok(result.descriptionSummary);

  const { rows: [refreshed] } = await query('SELECT description_embedding, description_summary FROM projects WHERE id = $1', [created.id]);
  assert.ok(refreshed.description_embedding);
  assert.ok(refreshed.description_summary);
});
