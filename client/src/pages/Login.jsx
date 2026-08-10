import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button.jsx';
import { Logo } from '../components/Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function Login() {
  const [form, setForm] = useState({ email: 'isha@northstar.edu', password: 'demo1234' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await login(form); navigate('/dashboard'); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <main className="auth-page">
    <div className="auth-brand"><Logo /><div className="auth-orbits"><i /><i /><i /></div><h1>Good teams start with complementary skills.</h1><p>Find projects worth your time, then see exactly why they fit.</p></div>
    <div className="auth-form-wrap"><form className="auth-form" onSubmit={submit}>
      <Link className="back-link" to="/">← Back home</Link><h2>Welcome back</h2><p>Sign in to see your latest matches.</p>
      <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
      <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? 'Signing in…' : <>Sign in <ArrowRight /></>}</Button>
      <p className="auth-switch">New to SyncSpace? <Link to="/register">Create an account</Link></p>
      <div className="demo-note"><strong>Demo accounts</strong><span>Student: isha@northstar.edu</span><span>Owner: arjun@northstar.edu</span><span>Password: demo1234</span></div>
    </form></div>
  </main>;
}
