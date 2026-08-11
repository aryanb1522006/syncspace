import {
  createProject as createProjectRecord,
  deleteProject as deleteProjectRecord,
  getProjectById,
  listProjects as listProjectRecords,
  updateProject as updateProjectRecord
} from '../models/projectModel.js';
import { AppError } from '../utils/AppError.js';

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
  res.status(201).json({ project });
}

export async function listProjects(req, res) {
  const projects = await listProjectRecords({
    skill: req.query.skill,
    domain: req.query.domain,
    collegeId: req.user.collegeId,
    ownerId: req.query.mine === 'true' && req.user.role === 'owner' ? req.user.id : undefined
  });
  res.json({ projects });
}

export async function getProject(req, res) {
  res.json({ project: await visibleProject(req, Number(req.params.id)) });
}

export async function updateProject(req, res) {
  const id = Number(req.params.id);
  await ownedProject(req, id);
  res.json({ project: await updateProjectRecord(id, req.user.collegeId, req.body) });
}

export async function deleteProject(req, res) {
  const id = Number(req.params.id);
  await ownedProject(req, id);
  await deleteProjectRecord(id, req.user.collegeId);
  res.status(204).send();
}
