import { Router } from 'express';
import { z } from 'zod';
import { addSkill, downloadResume, getMe, getStudent, getStudentByUser, listSkills, removeSkill, updateProfile, updateSkills } from '../controllers/studentController.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validation.js';
import { AppError } from '../utils/AppError.js';

const router = Router();
router.use(authenticate);

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  department: z.string().trim().min(2).max(100).nullable().optional(),
  year: z.coerce.number().int().min(1).max(8).nullable().optional(),
  bio: z.string().trim().max(1000).optional(),
  interests: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
  availabilityHoursPerWeek: z.coerce.number().int().min(0).max(168).optional(),
  shareProfileLinks: z.boolean().optional(),
  // Matches the student_profiles.linkedin_url CHECK; '' clears the link.
  linkedinUrl: z.union([
    z.literal('').transform(() => null),
    z.string().trim().regex(/^https:\/\/(www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]{3,100}\/?$/, 'Enter a LinkedIn profile URL like https://www.linkedin.com/in/your-name')
  ]).nullable().optional()
}).refine((body) => Object.keys(body).length > 0, 'At least one profile field is required');

const skillsSchema = z.object({
  skills: z.array(z.object({
    skillId: z.coerce.number().int().positive(),
    proficiency: z.coerce.number().int().min(1).max(5)
  })).max(200).refine((skills) => new Set(skills.map((skill) => skill.skillId)).size === skills.length, 'Choose each skill only once')
});
const skillParams = z.object({ id: z.coerce.number().int().positive(), skillId: z.coerce.number().int().positive() });

router.get('/me', asyncHandler(getMe));
router.get('/skills/dictionary', asyncHandler(listSkills));
router.get('/by-user/:userId', asyncHandler(getStudentByUser));
router.get('/:id/resume', asyncHandler(downloadResume));
router.get('/:id', asyncHandler(getStudent));
router.put('/:id', validate(profileSchema), asyncHandler(updateProfile));
router.post('/:id/resume', () => { throw new AppError(410, 'Add skills from GitHub or edit them on your profile.'); });
router.put('/:id/skills', validate(skillsSchema), asyncHandler(updateSkills));
router.put('/:id/skills/:skillId', validate(skillParams, 'params'), asyncHandler(addSkill));
router.delete('/:id/skills/:skillId', validate(skillParams, 'params'), asyncHandler(removeSkill));

export default router;
