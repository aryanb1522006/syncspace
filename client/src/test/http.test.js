import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_EXPIRED_EVENT } from '../api/authSession.js';
import { request } from '../api/http.js';

describe('HTTP authentication handling', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('clears an authenticated session when the API returns 401', async () => {
    localStorage.setItem('syncspace-token', 'expired-token');
    localStorage.setItem('syncspace-user', JSON.stringify({ id: 1 }));
    const expired = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, expired, { once: true });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'Invalid or expired token' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })));

    await expect(request('/teams')).rejects.toMatchObject({ message: 'Invalid or expired token', status: 401 });
    expect(localStorage.getItem('syncspace-token')).toBeNull();
    expect(localStorage.getItem('syncspace-user')).toBeNull();
    expect(expired).toHaveBeenCalledOnce();
  });

  it('uses the wait time in a 429 response and preserves the signed-in session', async () => {
    localStorage.setItem('syncspace-token', 'active-token');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Too many requests', {
      status: 429,
      headers: { 'Retry-After': '68' }
    })));
    await expect(request('/integrations')).rejects.toMatchObject({
      status: 429, message: 'Too many requests. Try again in about 2 minutes.'
    });
    expect(localStorage.getItem('syncspace-token')).toBe('active-token');
  });
});
