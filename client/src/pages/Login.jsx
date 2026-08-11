import { ArrowRight } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { demoMode } from '../api/resources.js';
import { Button } from '../components/Button.jsx';
import { GoogleSignInButton, googleSignInConfigured } from '../components/GoogleSignInButton.jsx';
import { Logo } from '../components/Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const passwordAuthEnabled = (import.meta.env.VITE_PASSWORD_AUTH_ENABLED ?? 'true') !== 'false';

export function Login() {
  const [params] = useSearchParams();
  const intent = params.get('intent');
  const [form, setForm] = useState({
    email: demoMode ? 'isha@northstar.edu' : '',
    password: demoMode ? 'demo1234' : ''
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const finish = useCallback(() => navigate(intent === 'post' ? '/projects/new' : '/dashboard'), [intent, navigate]);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await login(form); finish(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return <main className="auth-page">
    <div className="auth-brand"><Logo /><div className="auth-orbits"><i /><i /><i /></div><h1>Good teams start with complementary skills.</h1><p>Find projects worth your time, then see exactly why they fit.</p></div>
    <div className="auth-form-wrap"><form className="auth-form" onSubmit={submit}>
      <Link className="back-link" to="/">← Back home</Link><h2>Welcome back</h2><p>Use one account to join projects and post your own ideas.</p>
      <GoogleSignInButton onAuthenticated={finish} onError={setError} />
      {googleSignInConfigured && passwordAuthEnabled && <div className="auth-divider"><span>or use password</span></div>}
      {passwordAuthEnabled && <>
        <label>Email<input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
        <label>Password<input type="password" autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label>
        <Button type="submit" disabled={busy}>{busy ? 'Signing in…' : <>Sign in <ArrowRight /></>}</Button>
      </>}
      {!googleSignInConfigured && !passwordAuthEnabled && <p className="form-error" role="alert">No sign-in method is configured.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="auth-switch">New to SyncSpace? <Link to={`/register${intent ? `?intent=${intent}` : ''}`}>Create an account</Link></p>
      {demoMode && passwordAuthEnabled && <div className="demo-note"><strong>Demo accounts</strong><span>Student: isha@northstar.edu</span><span>Owner: arjun@northstar.edu</span><span>Password: demo1234</span></div>}
    </form></div>
  </main>;
}
