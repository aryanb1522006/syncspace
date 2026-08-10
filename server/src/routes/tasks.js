import { Router } from 'express';
import { z } from 'zod';
import { updateTask } from '../controllers/teamController.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validation.js';

const router = Router();
router.use(authenticate);
const schema = z.object({
  title: z.string().trim().min(2).max(180).optional(),
  assignedTo: z.coerce.number().int().positive().nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  dueDate: z.coerce.date().nullable().optional()
}).refine((body) => Object.keys(body).length > 0, 'At least one field is required');

router.put('/:id', validate(schema), asyncHandler(updateTask));
export default router;
