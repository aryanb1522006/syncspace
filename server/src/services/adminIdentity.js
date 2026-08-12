import { env } from '../config/env.js';

export const normalizeIdentityEmail = (email) => String(email ?? '').trim().toLowerCase();

export function isAdminEmail(email, allowlist = env.adminEmails) {
  const normalized = normalizeIdentityEmail(email);
  return Boolean(normalized) && allowlist.includes(normalized);
}
