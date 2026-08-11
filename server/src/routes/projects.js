import { Router } from 'express';
import { z } from 'zod';
import { createProject, deleteProject, getProject, listProjects, updateProject } from '../controllers/projectController.js';
import { applyToProject, getProjectApplications } from '../controllers/applicationController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validation.js';

const router = Router();
router.use(authenticate);

const skillSchema = z.object({
  skillId: z.coerce.number().int().positive(),
  importance: z.enum(['required', 'preferred'])
});

const createSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(20).max(4000),
  domain: z.string().trim().min(2).max(80),
  teamSize: z.coerce.number().int().min(2).max(20),
  commitmentHoursPerWeek: z.coerce.number().int().min(1).max(168),
  deadline: z.coerce.date().refine((date) => date > new Date(), 'Deadline must be in the future'),
  status: z.enum(['open', 'forming', 'active', 'completed', 'cancelled']).optional(),
  skills: z.array(skillSchema).min(1).max(20)
});

const updateSchema = createSchema.partial().refine((body) => Object.keys(body).length > 0, 'At least one field is required');

router.get('/', asyncHandler(listProjects));
router.get('/:id', asyncHandler(getProject));
router.post('/:id/apply', requireRole('student', 'owner'), asyncHandler(applyToProject));
router.get('/:id/applications', requireRole('student', 'owner'), asyncHandler(getProjectApplications));
router.post('/', requireRole('student', 'owner'), validate(createSchema), asyncHandler(createProject));
router.put('/:id', requireRole('student', 'owner'), validate(updateSchema), asyncHandler(updateProject));
router.delete('/:id', requireRole('student', 'owner'), asyncHandler(deleteProject));

export default router;
