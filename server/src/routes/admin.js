import { Router } from 'express';
import { z } from 'zod';
import { deleteAdminProject, getAdminAudit, getAdminProjects } from '../controllers/adminController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';

const router = Router();
router.use(authenticate, requireAdmin);

const deleteSchema = z.object({
  confirmation: z.string().min(1).max(120),
  reason: z.string().trim().min(8).max(500)
});
const projectParamsSchema = z.object({ id: z.coerce.number().int().positive() });

router.get('/projects', asyncHandler(getAdminProjects));
router.get('/audit', asyncHandler(getAdminAudit));
router.delete('/projects/:id', validate(projectParamsSchema, 'params'), validate(deleteSchema), asyncHandler(deleteAdminProject));

export default router;
