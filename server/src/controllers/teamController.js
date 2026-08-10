import { getTaskById, createTask as createTaskRecord, updateTask as updateTaskRecord } from '../models/taskModel.js';
import { canAccessTeam, getTeamById, isTeamMember } from '../models/teamModel.js';
import { AppError } from '../utils/AppError.js';

async function requireTeamAccess(teamId, userId, collegeId) {
  if (!(await canAccessTeam(teamId, userId, collegeId))) throw new AppError(403, 'You do not have access to this team');
}

export async function getTeam(req, res) {
  const id = Number(req.params.id);
  await requireTeamAccess(id, req.user.id, req.user.collegeId);
  const team = await getTeamById(id, req.user.collegeId);
  if (!team) throw new AppError(404, 'Team not found');
  res.json({ team });
}

export async function createTask(req, res) {
  const teamId = Number(req.params.id);
  await requireTeamAccess(teamId, req.user.id, req.user.collegeId);
  if (req.body.assignedTo && !(await isTeamMember(teamId, req.body.assignedTo))) {
    throw new AppError(400, 'The assignee must be a member of this team');
  }
  res.status(201).json({ task: await createTaskRecord(teamId, req.body) });
}

export async function updateTask(req, res) {
  const task = await getTaskById(Number(req.params.id));
  if (!task) throw new AppError(404, 'Task not found');
  await requireTeamAccess(task.team_id, req.user.id, req.user.collegeId);
  if (req.body.assignedTo && !(await isTeamMember(task.team_id, req.body.assignedTo))) {
    throw new AppError(400, 'The assignee must be a member of this team');
  }
  res.json({ task: await updateTaskRecord(task.id, req.body) });
}
