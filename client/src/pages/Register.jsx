import { ArrowRight } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button.jsx';
import { GoogleSignInButton, googleSignInConfigured } from '../components/GoogleSignInButton.jsx';
import { Logo } from '../components/Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const passwordAuthEnabled = (import.meta.env.VITE_PASSWORD_AUTH_ENABLED ?? 'true') !== 'false';

export function Register() {
  const [params] = useSearchParams();
  const intent = params.get('intent');
  const projectId = params.get('project');
  const skill = params.get('skill')?.trim();
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '', year: 2 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const finish = useCallback(() => navigate(
    intent === 'post' ? '/projects/new' : projectId ? `/projects/${projectId}` : skill ? `/dashboard?skill=${encodeURIComponent(skill)}` : '/dashboard'
  ), [intent, navigate, projectId, skill]);
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await register({ ...form, year: Number(form.year) }); finish(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return <main className="auth-page">
    <div className="auth-brand auth-brand--register"><Logo /><div className="auth-orbits"><i /><i /><i /></div><h1>Bring your skills. Find the gap you can fill.</h1><p>One verified account lets you join a team or lead your own.</p></div>
    <div className="auth-form-wrap"><form className="auth-form auth-form--wide" onSubmit={submit}>
      <Link className="back-link" to="/">← Back home</Link><h2>Sign up now</h2><p>Continue with your Thapar Google account, then complete your profile.</p>
      <GoogleSignInButton onAuthenticated={finish} onError={setError} />
      {googleSignInConfigured && passwordAuthEnabled && <div className="auth-divider"><span>or create a password account</span></div>}
      {passwordAuthEnabled && <>
        <div className="form-grid"><label>Full name<input autoComplete="name" value={form.name} onChange={update('name')} required /></label><label>College email<input type="email" autoComplete="email" value={form.email} onChange={update('email')} required /></label><label>Department<input value={form.department} onChange={update('department')} required /></label><label>Year<select value={form.year} onChange={update('year')}>{[1,2,3,4].map((year) => <option key={year}>{year}</option>)}</select></label></div>
        <label>Password<input type="password" autoComplete="new-password" minLength="8" value={form.password} onChange={update('password')} required /></label>
        <Button type="submit" disabled={busy}>{busy ? 'Creating profile…' : <>Create profile <ArrowRight /></>}</Button>
      </>}
      {!googleSignInConfigured && !passwordAuthEnabled && <p className="form-error" role="alert">No sign-up method is configured.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="auth-switch">Already have an account? <Link to={`/login${params.toString() ? `?${params.toString()}` : ''}`}>Sign in</Link></p>
    </form></div>
  </main>;
}
