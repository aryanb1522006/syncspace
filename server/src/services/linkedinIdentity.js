import jwt from 'jsonwebtoken';
import { createPublicKey, timingSafeEqual } from 'node:crypto';
import { AppError } from '../utils/AppError.js';

// Callback and exchange must accept the same bounded, opaque code.
export const MAX_LINKEDIN_AUTHORIZATION_CODE_LENGTH = 2000;

export function linkedinState(userId, secret, requestId) {
  return jwt.sign({ purpose: 'linkedin-connect' }, secret, { subject: String(userId), jwtid: requestId, expiresIn: '10m', algorithm: 'HS256' });
}
export function verifyLinkedinState(state, userId, secret) {
  try {
    const value = jwt.verify(state, secret, { algorithms: ['HS256'], maxAge: '10m' });
    if (value.purpose !== 'linkedin-connect' || !/^[0-9a-f-]{36}$/.test(value.jti) || !/^\d+$/.test(value.sub) || (userId !== undefined && value.sub !== String(userId))) throw new Error();
    return { requestId: value.jti, userId: value.sub };
  } catch { throw new AppError(400, 'This LinkedIn connection expired or is invalid. Start again from your profile.'); }
}
export function linkedinAuthorize({ clientId, redirectUri, state, nonce }) {
  const url = new URL('https://www.linkedin.com/oauth/v2/authorization');
  url.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope: 'openid profile', state, nonce });
  return url.href;
}
export function safeLinkedinPicture(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && ['media.licdn.com', 'media.licdn-ei.com'].includes(url.hostname) && url.href.length <= 2000 ? url.href : null;
  } catch { return null; }
}
// Only fixed provider endpoints are contacted. Tokens are discarded after this read.
export async function exchangeLinkedin({ code, clientId, clientSecret, redirectUri, nonce, fetchImpl = fetch }) {
  async function json(url, options = {}) {
    try {
      const response = await fetchImpl(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error();
      const text = await response.text();
      if (text.length > 100000) throw new Error();
      return JSON.parse(text);
    } catch { throw new AppError(502, 'LinkedIn could not complete the connection. Please try again.'); }
  }
  const tokens = await json('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri }).toString()
  });
  if (typeof tokens.access_token !== 'string' || tokens.access_token.length > 10000 || typeof tokens.id_token !== 'string' || tokens.id_token.length > 20000) throw new AppError(502, 'LinkedIn did not return an account token.');
  const jwks = await json('https://www.linkedin.com/oauth/openid/jwks');
  let claims;
  try {
    const decoded = jwt.decode(tokens.id_token, { complete: true });
    if (decoded?.header.alg !== 'RS256' || typeof decoded.header.kid !== 'string') throw new Error();
    const key = jwks.keys?.find((item) => item.kid === decoded.header.kid && item.kty === 'RSA' && (!item.use || item.use === 'sig') && (!item.alg || item.alg === 'RS256'));
    if (!key) throw new Error();
    claims = jwt.verify(tokens.id_token, createPublicKey({ key, format: 'jwk' }), { algorithms: ['RS256'], issuer: 'https://www.linkedin.com', audience: clientId, maxAge: '10m' });
    if (!Number.isFinite(claims.exp) || claims.iat > Date.now() / 1000 + 30 || typeof claims.nonce !== 'string') throw new Error();
    const actual = Buffer.from(claims.nonce), expected = Buffer.from(nonce);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error();
    if (Array.isArray(claims.aud) && claims.aud.length > 1 && claims.azp !== clientId) throw new Error();
    if (claims.azp !== undefined && claims.azp !== clientId) throw new Error();
  } catch { throw new AppError(400, 'LinkedIn account token could not be validated. Connect again.'); }
  const info = await json('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
  if (typeof info.sub !== 'string' || !info.sub || info.sub.length > 255 || info.sub !== claims.sub || typeof info.name !== 'string' || !info.name.trim()) throw new AppError(400, 'LinkedIn returned inconsistent account details.');
  return { subject: info.sub, name: info.name.trim().slice(0, 120), pictureUrl: safeLinkedinPicture(info.picture) };
}
