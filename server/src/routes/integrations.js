import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import { z } from 'zod';
import { env } from '../config/env.js';
import {
  decideSkill,
  deleteLinkedIn,
  disconnectGitHub,
  exchangeGitHubCode,
  getGitHubAuthorizeUrl,
  getOverview,
  githubCallbackBridge,
  importLinkedIn,
  syncGitHubNow,
  updateEvidenceVisibility
} from '../controllers/integrationController.js';
import { getLinkedinAuthorizeUrl, linkedinCallbackBridge, exchangeLinkedinCode, importLinkedinDetails, disconnectLinkedinAccount, previewLinkedIn } from '../controllers/integrationController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { AppError } from '../utils/AppError.js';
import { MAX_LINKEDIN_AUTHORIZATION_CODE_LENGTH } from '../services/linkedinIdentity.js';

const router = Router();
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.get('/github/callback', asyncHandler(githubCallbackBridge));
router.get('/linkedin/callback', asyncHandler(linkedinCallbackBridge));
router.use(authenticate);

// Sync and import call GitHub or parse uploads, so they get a tighter
// limit than the global API limiter.
const syncLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  limit: 20,
  keyGenerator: (req) => String(req.user.id),
  standardHeaders: 'draft-8',
  legacyHeaders: false
});

// The export is parsed in memory and never written to disk.
const linkedinUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 2, fieldSize: 2000, parts: 4 },
  fileFilter: (req, file, callback) => {
    if (!/\.(zip|csv)$/i.test(file.originalname ?? '')) return callback(new AppError(400, 'Upload the LinkedIn export as a .zip or .csv file'));
    callback(null, true);
  }
});

const exchangeSchema = z.object({
  code: z.string().trim().min(1).max(200),
  verifier: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/),
  state: z.string().trim().min(1).max(2000)
}).strict();
const linkedinExchangeSchema = exchangeSchema.extend({
  code: z.string().trim().min(1).max(MAX_LINKEDIN_AUTHORIZATION_CODE_LENGTH)
});
const disconnectSchema = z.object({ deleteEvidence: z.enum(['true', 'false']).optional() });
const skillParamsSchema = z.object({ skillId: z.coerce.number().int().positive() });
const decisionSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  proficiency: z.coerce.number().int().min(1).max(5).optional()
}).strict();
const visibilitySchema = z.object({
  evidenceIds: z.array(z.coerce.number().int().positive()).min(1).max(200),
  visibility: z.enum(['private', 'team', 'college'])
}).strict();

router.get('/', asyncHandler(getOverview));
router.get('/github/authorize', asyncHandler(getGitHubAuthorizeUrl));
router.post('/github/exchange', syncLimiter, validate(exchangeSchema), asyncHandler(exchangeGitHubCode));
router.post('/github/sync', syncLimiter, asyncHandler(syncGitHubNow));
router.delete('/github', validate(disconnectSchema, 'query'), asyncHandler(disconnectGitHub));
router.get('/linkedin/authorize', asyncHandler(getLinkedinAuthorizeUrl));
router.post('/linkedin/exchange', syncLimiter, validate(linkedinExchangeSchema), asyncHandler(exchangeLinkedinCode));
router.post('/linkedin/profile', validate(z.object({ fields: z.array(z.enum(['name', 'photo'])).min(1).max(2) }).strict()), asyncHandler(importLinkedinDetails));
router.delete('/linkedin/account', asyncHandler(disconnectLinkedinAccount));
router.post('/linkedin/preview', syncLimiter, linkedinUpload.single('export'), asyncHandler(previewLinkedIn));
router.post('/linkedin/import', syncLimiter, linkedinUpload.single('export'), asyncHandler(importLinkedIn));
router.delete('/linkedin', asyncHandler(deleteLinkedIn));
router.post('/skills/:skillId/decision', validate(skillParamsSchema, 'params'), validate(decisionSchema), asyncHandler(decideSkill));
router.put('/evidence/visibility', validate(visibilitySchema), asyncHandler(updateEvidenceVisibility));

export default router;
