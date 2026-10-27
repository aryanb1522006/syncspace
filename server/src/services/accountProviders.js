import { createPublicKey } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const short = (value, max = 300) => typeof value === 'string' ? value.slice(0, max) : '';
export function safeAvatar(value, provider) {
  try {
    const url = new URL(value);
    const allowed = provider === 'github' ? ['avatars.githubusercontent.com'] : ['media.licdn.com'];
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && allowed.includes(url.hostname) ? url.href : null;
  } catch { return null; }
}

export function providerConfig(provider, config = env) {
  if (!['github', 'linkedin'].includes(provider)) throw new AppError(400, 'Unknown account provider');
  const clientId = config[`${provider}ClientId`];
  const clientSecret = config[`${provider}ClientSecret`];
  if (!clientId || !clientSecret || !config.externalAccountsKey || !config.apiPublicUrl) throw new AppError(503, `${provider === 'github' ? 'GitHub' : 'LinkedIn'} connection is not enabled yet. You can add your profile link below.`);
  return { clientId, clientSecret, redirectUri: `${config.apiPublicUrl}/api/connections/${provider}/callback` };
}

export function authorizationUrl(provider, { state, nonce, verifier }, config = env) {
  const { clientId, redirectUri } = providerConfig(provider, config);
  const url = new URL(provider === 'github' ? 'https://github.com/login/oauth/authorize' : 'https://www.linkedin.com/oauth/v2/authorization');
  url.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, state, ...(provider === 'github'
    ? { scope: '', code_challenge: verifier, code_challenge_method: 'S256' }
    : { response_type: 'code', scope: 'openid profile', nonce }) }).toString();
  return url.href;
}

export async function providerJson(url, options = {}, fetcher = fetch) {
  let response;
  try {
    response = await fetcher(url, { ...options, signal: AbortSignal.timeout(12000), redirect: 'error' });
  } catch { throw new AppError(502, 'The provider could not be reached. Please try again.'); }
  if (!response.ok) {
    if (response.status === 401) throw new AppError(409, 'Reconnect this account to import again');
    if (response.status === 403 || response.status === 429) throw new AppError(429, 'The provider is limiting requests. Please try again later.');
    throw new AppError(502, 'The provider could not complete the request');
  }
  // Bound upstream payloads before parsing; OAuth codes and secrets are never logged.
  const body = await response.text();
  if (body.length > 2_000_000) throw new AppError(502, 'The provider returned too much data');
  try { return JSON.parse(body); } catch { throw new AppError(502, 'The provider returned an invalid response'); }
}

export function normalizeGithubProfile(profile) {
  if (!Number.isSafeInteger(profile.id) || profile.id <= 0 || !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(profile.login ?? '')) throw new AppError(502, 'GitHub returned an invalid account');
  return { accountId: String(profile.id), username: profile.login, name: short(profile.name || profile.login, 100), bio: short(profile.bio, 1000), avatarUrl: safeAvatar(profile.avatar_url, 'github'), profileUrl: `https://github.com/${profile.login}` };
}

export function normalizeLinkedinProfile(profile) {
  if (typeof profile.sub !== 'string' || !profile.sub || profile.sub.length > 255) throw new AppError(502, 'LinkedIn returned an invalid account');
  return { accountId: profile.sub, username: null, name: short(profile.name || [profile.given_name, profile.family_name].filter(Boolean).join(' '), 100), avatarUrl: safeAvatar(profile.picture, 'linkedin'), bio: null, profileUrl: null };
}

const githubHeaders = (token) => ({ Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'SyncSpace' });
export async function fetchProviderProfile(provider, accessToken, fetcher = fetch) {
  const raw = await providerJson(provider === 'github' ? 'https://api.github.com/user' : 'https://api.linkedin.com/v2/userinfo', {
    headers: provider === 'github' ? githubHeaders(accessToken) : { Authorization: `Bearer ${accessToken}` }
  }, fetcher);
  return provider === 'github' ? normalizeGithubProfile(raw) : normalizeLinkedinProfile(raw);
}

export async function validateLinkedinToken(token, { clientId, nonce, subject }, fetcher = fetch) {
  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || decoded.header.alg !== 'RS256' || typeof decoded.header.kid !== 'string') throw new Error('Invalid ID token');
    const { keys } = await providerJson('https://www.linkedin.com/oauth/openid/jwks', {}, fetcher);
    const jwk = keys.find((item) => item.kid === decoded.header.kid && item.kty === 'RSA' && (!item.use || item.use === 'sig') && (!item.alg || item.alg === 'RS256'));
    if (!jwk) throw new Error('Unknown ID token key');
    const claims = jwt.verify(token, createPublicKey({ key: jwk, format: 'jwk' }), { algorithms: ['RS256'], audience: clientId, issuer: 'https://www.linkedin.com', maxAge: '10m', clockTolerance: 5 });
    if (claims.sub !== subject || claims.nonce !== nonce || !claims.exp) throw new Error('ID token identity mismatch');
    return claims;
  } catch { throw new AppError(502, 'LinkedIn could not confirm this account. Please reconnect.'); }
}

export async function exchangeProviderCode(provider, code, { nonce, codeVerifier }, config = env, fetcher = fetch) {
  const { clientId, clientSecret, redirectUri } = providerConfig(provider, config);
  const params = { grant_type: 'authorization_code', code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, ...(provider === 'github' ? { code_verifier: codeVerifier } : {}) };
  const result = await providerJson(provider === 'github' ? 'https://github.com/login/oauth/access_token' : 'https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params).toString()
  }, fetcher);
  if (typeof result.access_token !== 'string' || !result.access_token || result.error || (result.token_type && result.token_type.toLowerCase() !== 'bearer')) throw new AppError(502, 'The provider did not authorize this connection');
  const profile = await fetchProviderProfile(provider, result.access_token, fetcher);
  if (provider === 'linkedin') await validateLinkedinToken(result.id_token, { clientId, nonce, subject: profile.accountId }, fetcher);
  return { profile, accessToken: result.access_token, expiresAt: Number.isFinite(result.expires_in) ? new Date(Date.now() + result.expires_in * 1000).toISOString() : null };
}

export async function fetchGithubRepositories(token, username, fetcher = fetch) {
  const repos = await providerJson(`https://api.github.com/users/${encodeURIComponent(username)}/repos?type=owner&sort=updated&per_page=100`, { headers: githubHeaders(token) }, fetcher);
  if (!Array.isArray(repos)) throw new AppError(502, 'GitHub returned invalid repositories');
  return repos.filter((repo) => !repo.private && !repo.fork && !repo.archived && repo.owner?.login?.toLowerCase() === username.toLowerCase()
    && Number.isSafeInteger(repo.id) && /^[a-z\d_.-]{1,100}$/i.test(repo.name ?? ''))
    .slice(0, 100).map((repo) => ({ id: String(repo.id), name: repo.name, description: short(repo.description, 500), url: `https://github.com/${username}/${repo.name}`, language: short(repo.language, 80), updatedAt: repo.pushed_at ?? null, stars: Number.isSafeInteger(repo.stargazers_count) ? repo.stargazers_count : 0 }));
}

export function suggestGithubSkills(repositories, dictionary) {
  const languages = new Set(repositories.map((repo) => repo.language.toLowerCase()).filter(Boolean));
  return dictionary.filter((skill) => [skill.name, ...(skill.aliases ?? [])].some((name) => languages.has(name.toLowerCase())))
    .map((skill) => ({ skillId: Number(skill.id), name: skill.name, evidence: repositories.filter((repo) => [skill.name, ...(skill.aliases ?? [])].some((name) => name.toLowerCase() === repo.language.toLowerCase())).map((repo) => repo.name) }));
}
