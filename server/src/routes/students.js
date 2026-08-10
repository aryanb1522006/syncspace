import { Router } from 'express';
import { z } from 'zod';
import { downloadResume, getMe, getStudent, listSkills, updateProfile, updateSkills, uploadResume } from '../controllers/studentController.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validation.js';
import { resumeUpload } from '../services/storage.js';

const router = Router();
router.use(authenticate);

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  department: z.string().trim().min(2).max(100).nullable().optional(),
  year: z.coerce.number().int().min(1).max(8).nullable().optional(),
  bio: z.string().trim().max(1000).optional(),
  interests: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
  availabilityHoursPerWeek: z.coerce.number().int().min(0).max(168).optional()
}).refine((body) => Object.keys(body).length > 0, 'At least one profile field is required');

const skillsSchema = z.object({
  skills: z.array(z.object({
    skillId: z.coerce.number().int().positive(),
    proficiency: z.coerce.number().int().min(1).max(5)
  })).max(50)
});

router.get('/me', asyncHandler(getMe));
router.get('/skills/dictionary', asyncHandler(listSkills));
router.get('/:id/resume', asyncHandler(downloadResume));
router.get('/:id', asyncHandler(getStudent));
router.put('/:id', validate(profileSchema), asyncHandler(updateProfile));
router.post('/:id/resume', resumeUpload.single('resume'), asyncHandler(uploadResume));
router.put('/:id/skills', validate(skillsSchema), asyncHandler(updateSkills));

export default router;
