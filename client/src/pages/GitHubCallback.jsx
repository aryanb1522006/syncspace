import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/resources.js';
import { oauthCompletion } from '../api/providerConnection.js';
import { AppShell } from '../components/AppShell.jsx';
import { Button } from '../components/Button.jsx';

// GitHub redirects here after the student authorizes SyncSpace. The page
// forwards code + state to the API with the signed-in user's own token;
// the API checks the state was issued to this same user.
export function GitHubCallback() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  // A GitHub code can be exchanged only once; StrictMode runs effects twice.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let completion;
    try { completion = oauthCompletion('github', params); }
    catch (reason) { setError(reason.message); setParams({}, { replace: true }); return; }
    setParams({}, { replace: true });
    api.githubExchange(completion.code, completion.state, completion.verifier)
      .then(({ addedSkillIds } = {}) => {
        const count = addedSkillIds?.length ?? 0;
        const message = count ? `GitHub connected. Added ${count} skill${count === 1 ? '' : 's'} to your profile.` : 'GitHub connected.';
        navigate('/profile', { replace: true, state: { message } });
      })
      .catch((reason) => setError(reason.message))
      .finally(completion.clear);
  }, [navigate, params, setParams]);

  return <AppShell>
    {error
      ? <div className="empty-panel"><h1>GitHub not connected</h1><p>{error}</p><Button to="/profile">Back to your profile</Button></div>
      : <div className="loading">Connecting GitHub and analyzing your public repositories…</div>}
  </AppShell>;
}
