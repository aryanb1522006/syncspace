// githubClient.js
//
// Minimal GitHub REST + OAuth client for profile intelligence.
//  - OAuth requests NO scopes: the token can read public data only, and
//    is used to prove the student owns the GitHub account.
//  - Only PUBLIC repositories are listed (/users/:login/repos), so private
//    code is never read even if a broader token were ever supplied.
//  - Rate limits surface as 429 with a retry time; a revoked token as 409
//    (not 401, which the SPA treats as "your SyncSpace session expired").
// `fetchImpl` is injectable so tests never touch the network.

import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';
import { MANIFEST_FILES } from './githubAnalyzer.js';

const API = 'https://api.github.com';
const OAUTH = 'https://github.com/login/oauth';
const MAX_FILE_BYTES = 300_000;
const REPO_CONCURRENCY = 4;

export class GitHubRevokedError extends AppError {
  constructor() {
    super(409, 'GitHub access was revoked or has expired. Reconnect GitHub to sync again.');
    this.code = 'github_revoked';
  }
}

function rateLimitError(response) {
  const retryAfter = Number(response.headers.get('retry-after'));
  const reset = Number(response.headers.get('x-ratelimit-reset'));
  const retryAfterSeconds = Number.isFinite(retryAfter) && retryAfter > 0
    ? retryAfter
    : Number.isFinite(reset) && reset > 0 ? Math.max(0, Math.ceil(reset - Date.now() / 1000)) : 60;
  const error = new AppError(429, `GitHub rate limit reached. Try syncing again in about ${Math.ceil(retryAfterSeconds / 60)} minute(s).`);
  error.details = { retryAfterSeconds };
  return error;
}

const isRateLimited = (response) => response.status === 429 ||
  (response.status === 403 && (response.headers.get('x-ratelimit-remaining') === '0' || response.headers.get('retry-after')));

const encodePath = (path) => path.split('/').map(encodeURIComponent).join('/');

export function createGitHubClient({ token, fetchImpl = fetch }) {
  async function call(path, { raw = false, allowMissing = false } = {}) {
    const response = await fetchImpl(`${API}${path}`, {
      headers: {
        Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'SyncSpace',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    if (response.status === 401) throw new GitHubRevokedError();
    if (isRateLimited(response)) throw rateLimitError(response);
    // 404: missing file/README; 409: "Git Repository is empty".
    if (allowMissing && (response.status === 404 || response.status === 409)) return null;
    if (!response.ok) throw new AppError(502, `GitHub request failed (${response.status})`);
    return raw ? response.text() : response.json();
  }

  async function repositoryDetails(repo) {
    const fullName = repo.full_name;
    const base = `/repos/${encodePath(fullName)}`;
    const empty = !repo.size;
    const [languages, root, readme] = await Promise.all([
      call(`${base}/languages`, { allowMissing: true }),
      empty ? null : call(`${base}/contents/`, { allowMissing: true }),
      empty ? null : call(`${base}/readme`, { raw: true, allowMissing: true })
    ]);
    const entries = Array.isArray(root) ? root : [];
    const byName = new Map(entries.map((entry) => [String(entry.name).toLowerCase(), entry]));

    const manifests = {};
    await Promise.all(MANIFEST_FILES.map(async (file) => {
      const entry = byName.get(file);
      if (!entry || entry.type !== 'file' || Number(entry.size) > MAX_FILE_BYTES) return;
      const text = await call(`${base}/contents/${encodePath(entry.path ?? entry.name)}`, { raw: true, allowMissing: true });
      if (typeof text === 'string') manifests[file] = text;
    }));

    let workflowFiles = [];
    if (byName.get('.github')?.type === 'dir') {
      const workflows = await call(`${base}/contents/.github/workflows`, { allowMissing: true });
      workflowFiles = Array.isArray(workflows) ? workflows.filter((entry) => entry.type === 'file').map((entry) => entry.name) : [];
    }

    return {
      fullName,
      description: repo.description,
      topics: repo.topics ?? [],
      fork: Boolean(repo.fork),
      private: Boolean(repo.private),
      pushedAt: repo.pushed_at,
      size: repo.size,
      languages: languages ?? {},
      rootEntries: entries.map((entry) => entry.name),
      workflowFiles,
      manifests,
      readme: typeof readme === 'string' ? readme.slice(0, 50_000) : null
    };
  }

  return {
    getAuthenticatedUser: () => call('/user'),

    /** Public repositories the user owns, most recently pushed first. */
    async listPublicRepositories(login, maxRepos) {
      const repos = await call(`/users/${encodeURIComponent(login)}/repos?type=owner&sort=pushed&per_page=100`);
      return (Array.isArray(repos) ? repos : []).filter((repo) => !repo.private).slice(0, maxRepos);
    },

    /** Fetches analysis inputs for each repository, a few at a time. */
    async collectRepositoryData(repos) {
      const results = [];
      for (let index = 0; index < repos.length; index += REPO_CONCURRENCY) {
        results.push(...await Promise.all(repos.slice(index, index + REPO_CONCURRENCY).map(repositoryDetails)));
      }
      return results;
    }
  };
}

const STATE_PURPOSE = 'github-connect';

/** Short-lived signed OAuth `state`, bound to the SyncSpace user who started the connection. */
export function createConnectState(userId, secret) {
  return jwt.sign({ purpose: STATE_PURPOSE }, secret, { subject: String(userId), expiresIn: '10m' });
}

/**
 * The callback page sends code + state with the signed-in user's own
 * token; the state must have been issued to that same user, so nobody can
 * trick a victim into linking the victim's GitHub to another account.
 */
export function verifyConnectState(state, userId, secret) {
  let payload;
  try {
    payload = jwt.verify(state, secret);
  } catch {
    throw new AppError(400, 'The GitHub connection request expired. Connect GitHub again.');
  }
  if (payload.purpose !== STATE_PURPOSE || Number(payload.sub) !== Number(userId)) {
    throw new AppError(403, 'This GitHub connection request belongs to a different SyncSpace session.');
  }
}

export function buildAuthorizeUrl({ clientId, redirectUri, state }) {
  const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, state, allow_signup: 'false' });
  return `${OAUTH}/authorize?${params}`;
}

export async function exchangeOAuthCode({ code, clientId, clientSecret, redirectUri, fetchImpl = fetch }) {
  const response = await fetchImpl(`${OAUTH}/access_token`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'SyncSpace' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri })
  });
  if (!response.ok) throw new AppError(502, `GitHub sign-in failed (${response.status})`);
  // GitHub reports OAuth errors with HTTP 200 and an `error` field.
  const payload = await response.json();
  if (payload.error || !payload.access_token) {
    throw new AppError(400, payload.error === 'bad_verification_code'
      ? 'The GitHub authorization expired or was already used. Connect GitHub again.'
      : 'GitHub did not authorize SyncSpace. Connect GitHub again.');
  }
  return payload.access_token;
}

/** Revokes the OAuth grant at GitHub. An already-revoked grant is not an error. */
export async function revokeOAuthGrant({ token, clientId, clientSecret, fetchImpl = fetch }) {
  const response = await fetchImpl(`${API}/applications/${encodeURIComponent(clientId)}/grant`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
      'User-Agent': 'SyncSpace',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({ access_token: token })
  });
  if (response.status === 204 || response.status === 404 || response.status === 422) return;
  throw new AppError(502, `GitHub could not revoke access (${response.status})`);
}
