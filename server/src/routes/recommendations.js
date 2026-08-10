import { Router } from 'express';
import { recommendProjects, recommendTeammates } from '../controllers/recommendationController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();
router.use(authenticate);
router.get('/projects', requireRole('student'), asyncHandler(recommendProjects));
router.get('/teammates/:projectId', requireRole('owner'), asyncHandler(recommendTeammates));

export default router;
