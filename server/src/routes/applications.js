import { Router } from 'express';
import { z } from 'zod';
import { getMyApplications, updateApplication } from '../controllers/applicationController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validation.js';

const router = Router();
router.use(authenticate);
router.get('/', requireRole('student'), asyncHandler(getMyApplications));
router.put('/:id', requireRole('owner'), validate(z.object({ status: z.enum(['accepted', 'rejected']) })), asyncHandler(updateApplication));

export default router;
