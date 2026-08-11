import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

let client;

function normalizedDomain(value) {
  return String(value ?? '').trim().toLowerCase().replace(/^@/, '');
}

export function validateGoogleIdentity(payload, allowedDomain = env.allowedEmailDomain) {
  const email = String(payload?.email ?? '').trim().toLowerCase();
  const emailDomain = email.split('@')[1] ?? '';
  const requiredDomain = normalizedDomain(allowedDomain);
  const hostedDomain = normalizedDomain(payload?.hd);

  if (!payload?.sub || !email || !payload?.email_verified) {
    throw new AppError(403, 'Google could not verify this email address');
  }
  if (requiredDomain && (emailDomain !== requiredDomain || hostedDomain !== requiredDomain)) {
    throw new AppError(403, `Use a verified @${requiredDomain} Google Workspace account`);
  }

  return {
    googleSubject: String(payload.sub),
    email,
    name: String(payload.name ?? email.split('@')[0]).trim().slice(0, 100),
    picture: payload.picture
  };
}

export async function verifyGoogleCredential(credential) {
  if (!env.googleClientId) {
    throw new AppError(503, 'Google sign-in is not configured');
  }
  client ??= new OAuth2Client(env.googleClientId);

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: env.googleClientId
    });
    return validateGoogleIdentity(ticket.getPayload());
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(401, 'Google sign-in token is invalid or expired');
  }
}
