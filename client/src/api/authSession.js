export const AUTH_EXPIRED_EVENT = 'syncspace:auth-expired';

const tokenKey = 'syncspace-token';
const userKey = 'syncspace-user';

function decodeTokenPayload(token) {
  try {
    const encoded = String(token).split('.')[1];
    if (!encoded) return null;
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function getTokenExpiry(token) {
  const expiresAt = Number(decodeTokenPayload(token)?.exp) * 1000;
  return Number.isFinite(expiresAt) && expiresAt > 0 ? expiresAt : null;
}

export function clearStoredSession() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(userKey);
}

export function readStoredSession(now = Date.now()) {
  const token = localStorage.getItem(tokenKey);
  const savedUser = localStorage.getItem(userKey);
  if (!token || !savedUser) {
    clearStoredSession();
    return { user: null, expired: false };
  }

  const expiresAt = getTokenExpiry(token);
  if (expiresAt && expiresAt <= now) {
    clearStoredSession();
    return { user: null, expired: true };
  }

  try {
    return { user: JSON.parse(savedUser), expired: false };
  } catch {
    clearStoredSession();
    return { user: null, expired: false };
  }
}

export function expireStoredSession() {
  clearStoredSession();
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}
