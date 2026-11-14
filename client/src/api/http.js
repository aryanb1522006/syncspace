import { expireStoredSession } from './authSession.js';

const baseUrl = import.meta.env.VITE_API_URL ?? '/api';

export async function request(path, options = {}) {
  const token = localStorage.getItem('syncspace-token');
  const isForm = options.body instanceof FormData;
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401 && token) expireStoredSession();
    const retryAfter = response.headers.get('Retry-After');
    const seconds = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : null;
    const minutes = seconds ? Math.ceil(seconds / 60) : null;
    const rateLimitMessage = minutes
      ? `Too many requests. Try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.`
      : 'Too many requests. Wait a moment and try again.';
    const error = new Error(response.status === 429 ? rateLimitMessage
      : payload.error?.message ?? `Request failed (${response.status})`);
    error.details = payload.error?.details;
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}
