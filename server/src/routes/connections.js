import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validation.js';
import * as controller from '../controllers/accountConnectionController.js';

const router = Router();
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.use('/:provider', (req, res, next) => ['github', 'linkedin'].includes(req.params.provider) || req.params.provider === 'complete' ? next() : res.status(400).json({ error: { message: 'Unknown account provider' } }));
router.get('/:provider/callback', asyncHandler(controller.connectionCallback));
router.use(authenticate);
router.use(rateLimit({ windowMs: 60000, limit: 30, keyGenerator: (req) => String(req.user.id), standardHeaders: 'draft-8', legacyHeaders: false }));
router.get('/', asyncHandler(controller.connectionList));
router.post('/complete', validate(z.object({ transactionId: z.uuid(), verifier: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/) }).strict()), asyncHandler(controller.connectionComplete));
router.post('/:provider/start', validate(z.object({ browserChallenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict()), asyncHandler(controller.connectionStart));
router.post('/:provider/refresh', asyncHandler(controller.refreshConnection));
router.post('/:provider/import', validate(z.object({
  fields: z.array(z.enum(['name', 'bio', 'avatarUrl', 'profileUrl'])).max(4).refine((items) => new Set(items).size === items.length),
  repositoryIds: z.array(z.string().regex(/^\d+$/)).max(3).refine((items) => new Set(items).size === items.length),
  skills: z.array(z.object({ skillId: z.number().int().positive(), proficiency: z.number().int().min(1).max(5) }).strict()).max(50).refine((items) => new Set(items.map((item) => item.skillId)).size === items.length)
}).strict()), asyncHandler(controller.importConnection));
router.delete('/:provider', validate(z.object({ removeImported: z.boolean() }).strict()), asyncHandler(controller.removeConnection));
export default router;
