import { Router } from 'express';
import { z } from 'zod';
import { createTask, deleteTeamMember, getTeam, listTeams } from '../controllers/teamController.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validation.js';
import { updateGroupInvite } from '../controllers/teamContactController.js';
import { groupInviteSchema } from '../utils/teamContactValidation.js';

const router = Router();
router.use(authenticate);
const teamParams = z.object({ id: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER) });
const memberParams = teamParams.extend({ studentId: teamParams.shape.id });

const taskSchema = z.object({
  title: z.string().trim().min(2).max(180),
  assignedTo: z.coerce.number().int().positive().nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  dueDate: z.coerce.date().optional()
});

router.get('/', asyncHandler(listTeams));
router.get('/:id', asyncHandler(getTeam));
router.put('/:id/group-invite', validate(teamParams, 'params'), validate(groupInviteSchema), asyncHandler(updateGroupInvite));
router.delete('/:id/members/:studentId', validate(memberParams, 'params'), asyncHandler(deleteTeamMember));
router.post('/:id/tasks', validate(taskSchema), asyncHandler(createTask));

export default router;
