import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/resources.js';
import { oauthCompletion } from '../api/providerConnection.js';
import { AppShell } from '../components/AppShell.jsx';
import { Button } from '../components/Button.jsx';

export function LinkedInCallback() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let completion;
    try { completion = oauthCompletion('linkedin', params); }
    catch (reason) { setError(reason.message); setParams({}, { replace: true }); return; }
    setParams({}, { replace: true });
    api.linkedinExchange(completion.code, completion.state, completion.verifier)
      .then(() => navigate('/profile', { replace: true, state: { message: 'LinkedIn connected. Choose whether to use your name or photo below.' } }))
      .catch((reason) => setError(reason.message))
      .finally(completion.clear);
  }, [navigate, params, setParams]);
  return <AppShell>{error
    ? <div className="empty-panel"><h1>LinkedIn not connected</h1><p>{error}</p><Button to="/profile">Back to your profile</Button></div>
    : <div className="loading">Connecting your LinkedIn account…</div>}</AppShell>;
}
