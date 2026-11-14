import { getOwnTeamContacts, saveGroupInvite, saveOwnTeamContacts } from '../models/teamContactModel.js';
import { AppError } from '../utils/AppError.js';

export async function getMyTeamContacts(req, res) {
  res.set('Cache-Control', 'no-store');
  const contacts = await getOwnTeamContacts(req.user.id, req.user.collegeId);
  if (!contacts) throw new AppError(404, 'Student profile not found');
  res.json({ contacts });
}

export async function updateMyTeamContacts(req, res) {
  res.set('Cache-Control', 'no-store');
  const contacts = await saveOwnTeamContacts(req.user.id, req.user.collegeId, req.body);
  if (!contacts) throw new AppError(404, 'Student profile not found');
  res.json({ contacts });
}

export async function updateGroupInvite(req, res) {
  res.set('Cache-Control', 'no-store');
  const details = await saveGroupInvite(req.params.id, req.user.id, req.user.collegeId, req.body.groupInviteUrl);
  if (!details) throw new AppError(403, 'Only the project owner can change the group invite');
  res.json(details);
}
