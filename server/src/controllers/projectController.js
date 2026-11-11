import {
  createProject as createProjectRecord,
  deleteProject as deleteProjectRecord,
  getProjectById,
  getProjectContactsForViewer,
  listPublicProjects,
  listProjects as listProjectRecords,
  updateProject as updateProjectRecord
} from '../models/projectModel.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

// The description embedding is an internal ML vector (hundreds of floats,
// selected twice by p.* and its alias); API clients never need it.
const toResponse = ({ description_embedding: _raw, descriptionEmbedding: _vector, ...project }) => project;

async function visibleProject(req, id) {
  const project = await getProjectById(id, req.user.collegeId);
  if (!project) throw new AppError(404, 'Project not found');
  return project;
}

async function ownedProject(req, id) {
  const project = await visibleProject(req, id);
  if (Number(project.owner_id) !== req.user.id) throw new AppError(403, 'Only the project owner can change this project');
  return project;
}

export async function createProject(req, res) {
  const project = await createProjectRecord(req.user.id, req.user.collegeId, req.body);
  res.status(201).json({ project: toResponse(project) });
}

export async function listProjects(req, res) {
  const projects = await listProjectRecords({
    skill: req.query.skill,
    domain: req.query.domain,
    collegeId: req.user.collegeId,
    ownerId: req.query.mine === 'true' ? req.user.id : undefined
  });
  res.json({ projects: projects.map(toResponse) });
}

export async function searchPublicProjects(req, res) {
  const query = req.validatedQuery ?? req.query;
  const projects = await listPublicProjects({
    skill: query.skill,
    collegeId: env.defaultCollegeId,
    limit: 6
  });
  res.json({ projects, count: projects.length });
}

export async function getProject(req, res) {
  const id = Number(req.params.id);
  const project = await visibleProject(req, id);
  const teamContacts = await getProjectContactsForViewer(id, req.user.id, req.user.collegeId);
  res.json({
    project: { ...toResponse(project), teamContacts, canViewTeamContacts: teamContacts.length > 0 }
  });
}

export async function updateProject(req, res) {
  const id = Number(req.params.id);
  await ownedProject(req, id);
  res.json({ project: toResponse(await updateProjectRecord(id, req.user.collegeId, req.body)) });
}

export async function deleteProject(req, res) {
  const id = Number(req.params.id);
  await ownedProject(req, id);
  await deleteProjectRecord(id, req.user.collegeId);
  res.status(204).send();
}
