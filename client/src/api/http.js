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
    const error = new Error(payload.error?.message ?? `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}
