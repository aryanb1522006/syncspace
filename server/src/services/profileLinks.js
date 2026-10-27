import { AppError } from '../utils/AppError.js';

export function normalizeProfileLink(value, provider) {
  if (value === null || value === undefined || value.trim() === '') return null;
  let url;
  try { url = new URL(value.trim()); } catch { throw new AppError(400, `Enter a valid ${provider} profile URL`); }
  const path = url.pathname.replace(/\/$/, '');
  const validPath = provider === 'github'
    ? /^\/[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(path)
    : /^\/in\/[a-z\d_-][a-z\d_.%_-]{0,149}$/i.test(path);
  const hosts = provider === 'github' ? ['github.com', 'www.github.com'] : ['linkedin.com', 'www.linkedin.com'];
  if (url.protocol !== 'https:' || !hosts.includes(url.hostname.toLowerCase()) || url.port || url.username || url.password || !validPath) {
    throw new AppError(400, `Use an https ${provider === 'github' ? 'github.com/username' : 'linkedin.com/in/username'} profile URL`);
  }
  return `https://${provider === 'github' ? 'github.com' : 'www.linkedin.com'}${path}`;
}

export function canViewSocials(profile, viewerUserId, contactVisible) {
  return Number(profile.user_id) === Number(viewerUserId)
    || profile.social_visibility === 'college'
    || (profile.social_visibility === 'team' && contactVisible);
}

export function visibleSocials(profile, viewerUserId, contactVisible) {
  return canViewSocials(profile, viewerUserId, contactVisible)
    ? { githubUrl: profile.github_url, linkedinUrl: profile.linkedin_url, avatarUrl: profile.avatar_url, portfolio: profile.portfolio ?? [] }
    : {};
}
