import { Router } from 'express';
import { z } from 'zod';
import { createTask, getTeam, listTeams } from '../controllers/teamController.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validation.js';

const router = Router();
router.use(authenticate);

const taskSchema = z.object({
  title: z.string().trim().min(2).max(180),
  assignedTo: z.coerce.number().int().positive().nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  dueDate: z.coerce.date().optional()
});

router.get('/', asyncHandler(listTeams));
router.get('/:id', asyncHandler(getTeam));
router.post('/:id/tasks', validate(taskSchema), asyncHandler(createTask));

export default router;
