import { getProjectById } from '../models/projectModel.js';
import {
  answerProjectQuery as answerProjectQueryRecord,
  createProjectQuery as createProjectQueryRecord,
  listProjectQueries as listProjectQueryRecords
} from '../models/projectQueryModel.js';
import { moderateProjectQuery } from '../services/projectQueryModeration.js';
import { AppError } from '../utils/AppError.js';

async function visibleProject(req) {
  const project = await getProjectById(Number(req.params.id), req.user.collegeId);
  if (!project) throw new AppError(404, 'Project not found');
  return project;
}

function enforceModeration(value, project, options) {
  const result = moderateProjectQuery(value, project, options);
  if (!result.allowed) throw new AppError(422, result.message, { code: result.code });
}

export async function createProjectQuery(req, res) {
  const project = await visibleProject(req);
  if (Number(project.owner_id) === req.user.id) {
    throw new AppError(400, 'Project owners cannot raise a query on their own project');
  }
  enforceModeration(req.body.question, project);
  const projectQuery = await createProjectQueryRecord({
    project,
    askerUserId: req.user.id,
    collegeId: req.user.collegeId,
    question: req.body.question
  });
  res.status(201).json({ query: projectQuery });
}

export async function listProjectQueries(req, res) {
  await visibleProject(req);
  const queries = await listProjectQueryRecords({
    projectId: Number(req.params.id),
    viewerUserId: req.user.id,
    collegeId: req.user.collegeId
  });
  res.json({ queries });
}

export async function answerProjectQuery(req, res) {
  const project = await visibleProject(req);
  if (Number(project.owner_id) !== req.user.id) {
    throw new AppError(403, 'Only the project owner can answer queries');
  }
  enforceModeration(req.body.response, project, { response: true });
  const projectQuery = await answerProjectQueryRecord({
    queryId: Number(req.params.queryId),
    projectId: Number(req.params.id),
    ownerUserId: req.user.id,
    collegeId: req.user.collegeId,
    response: req.body.response
  });
  if (!projectQuery) throw new AppError(404, 'Open project query not found');
  res.json({ query: projectQuery });
}
