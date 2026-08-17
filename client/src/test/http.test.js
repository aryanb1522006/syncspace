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
});
