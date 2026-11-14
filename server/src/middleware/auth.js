import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { isAdminEmail, normalizeIdentityEmail } from '../services/adminIdentity.js';
import { AppError } from '../utils/AppError.js';

function readRequestIdentity(req) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) return { user: null, message: 'Authentication required' };

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const id = Number(payload.sub);
    const collegeId = Number(payload.collegeId);
    if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(collegeId) || collegeId <= 0) {
      throw new Error('Invalid identity claims');
    }
    const email = normalizeIdentityEmail(payload.email);
    return { user: { id, role: payload.role, collegeId, email, isAdmin: payload.isAdmin === true && isAdminEmail(email) } };
  } catch {
    return { user: null, message: 'Invalid or expired token' };
  }
}

const identityKey = Symbol('requestIdentity');
export function requestIdentity(req) {
  return req[identityKey] ??= readRequestIdentity(req);
}

export function authenticate(req, res, next) {
  const { user, message } = requestIdentity(req);
  if (!user) return next(new AppError(401, message));
  req.user = user;
  next();
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(new AppError(403, 'Insufficient permissions'));
  next();
};

export function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) return next(new AppError(403, 'Administrator access required'));
  next();
}
