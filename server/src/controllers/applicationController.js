import {
  applicationWorkflowRepository,
  createApplication,
  listProjectApplications,
  listStudentApplications
} from '../models/applicationModel.js';
import { decideApplication } from '../services/teamWorkflow.js';

export async function applyToProject(req, res) {
  const application = await createApplication(req.user.id, Number(req.params.id), req.user.collegeId);
  res.status(201).json({ application });
}

export async function getProjectApplications(req, res) {
  const applications = await listProjectApplications(Number(req.params.id), req.user.id, req.user.collegeId);
  res.json({ applications });
}

export async function getMyApplications(req, res) {
  const applications = await listStudentApplications(req.user.id, req.user.collegeId);
  res.json({ applications });
}

export async function updateApplication(req, res) {
  const result = await decideApplication(applicationWorkflowRepository, {
    applicationId: Number(req.params.id), ownerId: req.user.id, decision: req.body.status
  });
  res.json({ result });
}
