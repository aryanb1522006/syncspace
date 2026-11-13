const keyFor = (provider, id) => `syncspace-oauth:${provider}:${id}`;
const base64url = (value) => btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function startProviderConnection(provider, authorize) {
  if (!window.crypto?.subtle) throw new Error('Use HTTPS or localhost to connect an account.');
  const verifier = base64url(window.crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64url(await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const result = await authorize(challenge);
  sessionStorage.setItem(keyFor(provider, result.requestId), JSON.stringify({ verifier, expiresAt: Date.now() + 600000 }));
  window.location.assign(result.url);
}

export function oauthCompletion(provider, params) {
  const state = params.get('state');
  const code = params.get('code');
  let requestId = params.get('requestId');
  if (!requestId && state) {
    try { requestId = JSON.parse(atob(state.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).jti; } catch { /* Server validates the signed state. */ }
  }
  const key = keyFor(provider, requestId);
  let pending;
  try { pending = JSON.parse(sessionStorage.getItem(key) ?? 'null'); } catch { /* A missing proof requires a fresh connect. */ }
  if (!pending || pending.expiresAt < Date.now()) throw new Error('Start the connection again from your profile in this browser.');
  if (params.get('error')) { sessionStorage.removeItem(key); throw new Error('Account connection was cancelled. Your saved profile has not changed.'); }
  if (!code || !state) throw new Error('This account connection link is incomplete.');
  return { code, state, verifier: pending.verifier, clear: () => sessionStorage.removeItem(key) };
}

// Keep older developer-app callback URLs working while recommending an API
// callback bridge. This executes before HashRouter reads the initial route.
export function oauthCallbackRoute(location) {
  return /^\/integrations\/(github|linkedin)\/callback\/?$/.test(location.pathname)
    ? `/#${location.pathname.replace(/\/$/, '')}${location.search}`
    : null;
}
