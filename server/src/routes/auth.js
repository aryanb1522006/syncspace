import { Router } from 'express';
import { z } from 'zod';
import { login, register } from '../controllers/authController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validation.js';

const router = Router();
const email = z.string().email().max(254).transform((value) => value.toLowerCase());

const registerSchema = z.object({
  email,
  password: z.string().min(8).max(72),
  role: z.enum(['student', 'owner']).default('student'),
  name: z.string().trim().min(2).max(100),
  department: z.string().trim().min(2).max(100).optional(),
  year: z.coerce.number().int().min(1).max(8).optional()
}).strict();

const loginSchema = z.object({ email, password: z.string().min(1).max(72) }).strict();

router.post('/register', validate(registerSchema), asyncHandler(register));
router.post('/login', validate(loginSchema), asyncHandler(login));

export default router;
