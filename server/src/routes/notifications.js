import { Router } from 'express';
import { getNotifications, readNotification } from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();
router.use(authenticate);
router.get('/', asyncHandler(getNotifications));
router.put('/:id/read', asyncHandler(readNotification));
export default router;
