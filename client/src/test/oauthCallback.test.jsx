import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { HashRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import App from '../App.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { ThemeProvider } from '../context/ThemeContext.jsx';
import { api } from '../api/resources.js';
import { oauthCallbackRoute } from '../api/providerConnection.js';

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); sessionStorage.clear(); window.history.replaceState({}, '', '/'); });
function show(url) {
  localStorage.setItem('syncspace-user', JSON.stringify({ id: 1, role: 'student', email: 'isha@northstar.edu', profileId: 1, profile: { id: 1, name: 'Isha' } }));
  localStorage.setItem('syncspace-token', 'demo-token-student');
  window.history.replaceState({}, '', url);
  const target = oauthCallbackRoute(window.location);
  if (target) window.history.replaceState({}, '', target);
  render(<HashRouter><ThemeProvider><AuthProvider><App /></AuthProvider></ThemeProvider></HashRouter>);
}

it('bridges the documented normal callback into HashRouter and sends the initiating browser proof once', async () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const exchange = vi.spyOn(api, 'githubExchange').mockResolvedValue({});
  sessionStorage.setItem(`syncspace-oauth:github:${id}`, JSON.stringify({ verifier: 'browser-proof', expiresAt: Date.now() + 60000 }));
  show(`/integrations/github/callback?code=fixture-code&state=fixture-state&requestId=${id}`);
  await waitFor(() => expect(exchange).toHaveBeenCalledExactlyOnceWith('fixture-code', 'fixture-state', 'browser-proof'));
  expect(await screen.findByRole('heading', { level: 1, name: 'Your profile' })).toBeVisible();
  expect(sessionStorage.getItem(`syncspace-oauth:github:${id}`)).toBeNull();
  expect(window.location.href).not.toContain('fixture-code');
});

it('does not exchange a callback from a different browser', async () => {
  const exchange = vi.spyOn(api, 'githubExchange');
  show('/#/integrations/github/callback?code=fixture-code&state=fixture-state&requestId=missing');
  expect(await screen.findByText('Start the connection again from your profile in this browser.')).toBeVisible();
  expect(exchange).not.toHaveBeenCalled();
});

it('keeps ordinary app routes and unrelated external-looking paths unchanged', () => {
  for (const pathname of ['/profile', '/', '/integrations/evil/callback', '//attacker.test']) expect(oauthCallbackRoute({ pathname, search: '?anything=1' })).toBeNull();
});
