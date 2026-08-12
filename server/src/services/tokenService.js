import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { isAdminEmail } from './adminIdentity.js';

export function createAccessToken(user) {
  return jwt.sign(
    {
      role: user.role,
      collegeId: Number(user.college_id),
      email: String(user.email).trim().toLowerCase(),
      isAdmin: Boolean(user.email_verified) && isAdminEmail(user.email)
    },
    env.jwtSecret,
    { subject: String(user.id), expiresIn: env.jwtExpiresIn }
  );
}
