import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAuthorizeUrl,
  createConnectState,
  createGitHubClient,
  exchangeOAuthCode,
  GitHubRevokedError,
  revokeOAuthGrant,
  verifyConnectState
} from '../src/services/githubClient.js';

const SECRET = 'test-secret-with-enough-length-1234';

function response(status, body, headers = {}) {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers });
}

/** Fake fetch routing by URL; records every request. */
function fakeGitHub(routes) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    const path = String(url).replace('https://api.github.com', '');
    const handler = routes[path] ?? routes['*'];
    if (!handler) return response(404, { message: 'Not Found' });
    return typeof handler === 'function' ? handler(options) : handler;
  };
  return { fetchImpl, calls };
}

test('collects public repository data and tolerates empty repos and missing READMEs', async () => {
  const { fetchImpl, calls } = fakeGitHub({
    '/users/asha/repos?type=owner&sort=pushed&per_page=100': response(200, [
      { full_name: 'asha/web', size: 50, topics: ['react'], private: false, fork: false },
      { full_name: 'asha/empty', size: 0, private: false },
      { full_name: 'asha/hidden', size: 10, private: true }
    ]),
    '/repos/asha/web/languages': response(200, { JavaScript: 1000 }),
    '/repos/asha/web/contents/': response(200, [{ name: 'package.json', path: 'package.json', type: 'file', size: 40 }]),
    '/repos/asha/web/contents/package.json': response(200, '{"dependencies":{"react":"19"}}'),
    '/repos/asha/web/readme': response(404, { message: 'Not Found' }),
    '/repos/asha/empty/languages': response(200, {})
  });
  const client = createGitHubClient({ token: 'gho_test', fetchImpl });
  const repos = await client.listPublicRepositories('asha', 20);
  assert.deepEqual(repos.map((repo) => repo.full_name), ['asha/web', 'asha/empty'], 'private repositories are dropped');

  const [web, empty] = await client.collectRepositoryData(repos);
  assert.deepEqual(web.manifests, { 'package.json': '{"dependencies":{"react":"19"}}' });
  assert.equal(web.readme, null);
  assert.deepEqual(empty.rootEntries, []);
  assert.ok(!calls.some((call) => call.url.includes('/repos/asha/empty/contents')), 'empty repos skip content requests');
  assert.ok(calls.every((call) => call.options.headers.Authorization === 'Bearer gho_test'));
});

test('rate limits become 429 with a retry time instead of a generic failure', async () => {
  const reset = Math.floor(Date.now() / 1000) + 600;
  const { fetchImpl } = fakeGitHub({ '*': response(403, { message: 'API rate limit exceeded' }, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(reset) }) });
  await assert.rejects(createGitHubClient({ token: 't', fetchImpl }).getAuthenticatedUser(), (error) => {
    assert.equal(error.status, 429);
    assert.ok(error.details.retryAfterSeconds > 500);
    return true;
  });
  const secondary = fakeGitHub({ '*': response(429, {}, { 'retry-after': '120' }) });
  await assert.rejects(createGitHubClient({ token: 't', fetchImpl: secondary.fetchImpl }).getAuthenticatedUser(), (error) => error.status === 429 && error.details.retryAfterSeconds === 120);
});

test('revoked tokens surface as 409 (not 401, which would sign the student out of SyncSpace)', async () => {
  const { fetchImpl } = fakeGitHub({ '*': response(401, { message: 'Bad credentials' }) });
  await assert.rejects(createGitHubClient({ token: 't', fetchImpl }).getAuthenticatedUser(), (error) => {
    assert.ok(error instanceof GitHubRevokedError);
    assert.equal(error.status, 409);
    return true;
  });
});

test('unknown users and server errors are reported, not silently treated as empty', async () => {
  const { fetchImpl } = fakeGitHub({});
  await assert.rejects(createGitHubClient({ token: 't', fetchImpl }).listPublicRepositories('missing', 5), (error) => error.status === 502);
});

test('OAuth: no scopes are requested and code exchange errors are explained', async () => {
  const url = new URL(buildAuthorizeUrl({ clientId: 'abc', redirectUri: 'http://localhost:5173/integrations/github/callback', state: 's' }));
  assert.equal(url.origin + url.pathname, 'https://github.com/login/oauth/authorize');
  assert.equal(url.searchParams.get('scope'), null, 'public data only');

  const expired = async () => response(200, { error: 'bad_verification_code' });
  await assert.rejects(exchangeOAuthCode({ code: 'x', clientId: 'a', clientSecret: 'b', redirectUri: 'r', fetchImpl: expired }), /expired or was already used/);
  const ok = async () => response(200, { access_token: 'gho_new', scope: '' });
  assert.equal(await exchangeOAuthCode({ code: 'x', clientId: 'a', clientSecret: 'b', redirectUri: 'r', fetchImpl: ok }), 'gho_new');
});

test('disconnect revokes the grant; an already-revoked grant is not an error', async () => {
  const seen = [];
  const fetchImpl = async (url, options) => { seen.push([String(url), options.method]); return new Response(null, { status: 404 }); };
  await revokeOAuthGrant({ token: 't', clientId: 'abc', clientSecret: 'shh', fetchImpl });
  assert.deepEqual(seen, [['https://api.github.com/applications/abc/token', 'DELETE']]);
});

test('OAuth state is bound to the SyncSpace user who started the connection', () => {
  const state = createConnectState(7, SECRET);
  assert.doesNotThrow(() => verifyConnectState(state, 7, SECRET));
  assert.throws(() => verifyConnectState(state, 8, SECRET), (error) => error.status === 403);
  assert.throws(() => verifyConnectState(state, 7, 'another-secret-value-1234567890'), (error) => error.status === 400);
  assert.throws(() => verifyConnectState('not-a-token', 7, SECRET), (error) => error.status === 400);
});
