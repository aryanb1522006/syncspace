import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/resources.js';
import { AppShell } from '../components/AppShell.jsx';
import { Button } from '../components/Button.jsx';

// GitHub redirects here after the student authorizes SyncSpace. The page
// forwards code + state to the API with the signed-in user's own token;
// the API checks the state was issued to this same user.
export function GitHubCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  // A GitHub code can be exchanged only once; StrictMode runs effects twice.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (params.get('error')) {
      setError(params.get('error') === 'access_denied'
        ? 'GitHub connection was cancelled. Nothing was shared.'
        : 'GitHub did not complete the connection.');
      return;
    }
    const code = params.get('code');
    const state = params.get('state');
    if (!code || !state) {
      setError('This GitHub connection link is incomplete.');
      return;
    }
    api.githubExchange(code, state)
      .then(() => navigate('/profile', { replace: true, state: { message: 'GitHub connected. Review the suggested skills below.' } }))
      .catch((reason) => setError(reason.message));
  }, [navigate, params]);

  return <AppShell>
    {error
      ? <div className="empty-panel"><h1>GitHub not connected</h1><p>{error}</p><Button to="/profile">Back to your profile</Button></div>
      : <div className="loading">Connecting GitHub and analyzing your public repositories…</div>}
  </AppShell>;
}
