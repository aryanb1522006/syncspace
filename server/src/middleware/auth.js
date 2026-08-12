import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) return next(new AppError(401, 'Authentication required'));

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const id = Number(payload.sub);
    const collegeId = Number(payload.collegeId);
    if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(collegeId) || collegeId <= 0) {
      throw new Error('Invalid identity claims');
    }
    req.user = { id, role: payload.role, collegeId };
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
  }
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(new AppError(403, 'Insufficient permissions'));
  next();
};
