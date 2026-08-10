import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { createUserWithProfile, findUserByEmail } from '../models/userModel.js';
import { createAccessToken } from '../services/tokenService.js';
import { AppError } from '../utils/AppError.js';

const publicUser = (user) => ({
  id: Number(user.id),
  email: user.email,
  role: user.role,
  collegeId: Number(user.college_id),
  profile: user.profile
});

export async function register(req, res) {
  const existing = await findUserByEmail(req.body.email);
  if (existing) throw new AppError(409, 'Email is already registered');
  const passwordHash = await bcrypt.hash(req.body.password, 12);
  const user = await createUserWithProfile({
    ...req.body,
    collegeId: env.defaultCollegeId,
    passwordHash
  });
  res.status(201).json({ token: createAccessToken(user), user: publicUser(user) });
}

export async function login(req, res) {
  const user = await findUserByEmail(req.body.email);
  if (!user || !(await bcrypt.compare(req.body.password, user.password_hash))) {
    throw new AppError(401, 'Invalid email or password');
  }
  res.json({ token: createAccessToken(user), user: publicUser(user) });
}
