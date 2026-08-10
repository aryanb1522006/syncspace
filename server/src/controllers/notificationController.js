import { listNotifications, markNotificationRead } from '../models/notificationModel.js';
import { AppError } from '../utils/AppError.js';

export async function getNotifications(req, res) {
  res.json({ notifications: await listNotifications(req.user.id) });
}

export async function readNotification(req, res) {
  const notification = await markNotificationRead(Number(req.params.id), req.user.id);
  if (!notification) throw new AppError(404, 'Notification not found');
  res.json({ notification });
}
