import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { createUserWithProfile, findOrCreateGoogleUser, findUserByEmail } from '../models/userModel.js';
import { verifyGoogleCredential } from '../services/googleIdentity.js';
import { createAccessToken } from '../services/tokenService.js';
import { AppError } from '../utils/AppError.js';

const publicUser = (user) => ({
  id: Number(user.id),
  email: user.email,
  role: user.role,
  collegeId: Number(user.college_id),
  profile: user.profile,
  emailVerified: Boolean(user.email_verified),
  authProvider: user.auth_provider ?? 'password',
  capabilities: ['join_projects', 'post_projects']
});

export async function register(req, res) {
  if (!env.passwordAuthEnabled || env.allowedEmailDomain) {
    throw new AppError(
      403,
      `Password signup is disabled. Continue with a verified @${env.allowedEmailDomain ?? 'college'} Google account`
    );
  }
  const existing = await findUserByEmail(req.body.email);
  if (existing) throw new AppError(409, 'Email is already registered');
  const passwordHash = await bcrypt.hash(req.body.password, 12);
  const user = await createUserWithProfile({
    ...req.body,
    role: 'student',
    collegeId: env.defaultCollegeId,
    passwordHash
  });
  res.status(201).json({ token: createAccessToken(user), user: publicUser(user) });
}

export async function login(req, res) {
  if (!env.passwordAuthEnabled) {
    throw new AppError(403, 'Password sign-in is disabled. Continue with Google');
  }
  const user = await findUserByEmail(req.body.email);
  if (!user?.password_hash || !(await bcrypt.compare(req.body.password, user.password_hash))) {
    throw new AppError(401, 'Invalid email or password');
  }
  res.json({ token: createAccessToken(user), user: publicUser(user) });
}

export async function googleLogin(req, res) {
  const identity = await verifyGoogleCredential(req.body.credential);
  const user = await findOrCreateGoogleUser({
    ...identity,
    collegeId: env.defaultCollegeId
  });
  res.json({
    token: createAccessToken(user),
    user: publicUser(user)
  });
}
