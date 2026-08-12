import { deleteProjectAsAdmin, listAdminAuditLogs, listAdminProjects } from '../models/adminModel.js';
import { AppError } from '../utils/AppError.js';

export async function getAdminProjects(req, res) {
  res.json({ projects: await listAdminProjects(req.user.collegeId) });
}

export async function getAdminAudit(req, res) {
  res.json({ audit: await listAdminAuditLogs(req.user.collegeId) });
}

export async function deleteAdminProject(req, res) {
  const result = await deleteProjectAsAdmin({
    projectId: Number(req.params.id),
    collegeId: req.user.collegeId,
    adminUserId: req.user.id,
    confirmation: req.body.confirmation,
    reason: req.body.reason
  });
  if (result.status === 'not_found') throw new AppError(404, 'Project not found');
  if (result.status === 'confirmation_mismatch') throw new AppError(400, 'Project title confirmation does not match');
  res.json({ deletedProject: result.project, audit: { ...result.audit, adminEmail: req.user.email } });
}
