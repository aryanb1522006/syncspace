import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button.jsx';
import { Logo } from '../components/Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function Register() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '', year: 2, role: params.get('role') === 'owner' ? 'owner' : 'student' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { register } = useAuth(); const navigate = useNavigate();
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await register({ ...form, year: Number(form.year) }); navigate('/dashboard'); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <main className="auth-page">
    <div className="auth-brand auth-brand--register"><Logo /><div className="auth-orbits"><i /><i /><i /></div><h1>Bring your skills. Find the gap you can fill.</h1><p>Your profile makes every recommendation more useful.</p></div>
    <div className="auth-form-wrap"><form className="auth-form auth-form--wide" onSubmit={submit}>
      <Link className="back-link" to="/">← Back home</Link><h2>Create your profile</h2><p>You can refine your skills after signing up.</p>
      <div className="segmented" aria-label="Account type"><button type="button" className={form.role === 'student' ? 'active' : ''} onClick={() => setForm({ ...form, role: 'student' })}>Join projects</button><button type="button" className={form.role === 'owner' ? 'active' : ''} onClick={() => setForm({ ...form, role: 'owner' })}>Post projects</button></div>
      <div className="form-grid"><label>Full name<input value={form.name} onChange={update('name')} required /></label><label>College email<input type="email" value={form.email} onChange={update('email')} required /></label><label>Department<input value={form.department} onChange={update('department')} required /></label><label>Year<select value={form.year} onChange={update('year')}>{[1,2,3,4].map((year) => <option key={year}>{year}</option>)}</select></label></div>
      <label>Password<input type="password" minLength="8" value={form.password} onChange={update('password')} required /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? 'Creating profile…' : <>Create profile <ArrowRight /></>}</Button>
      <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
    </form></div>
  </main>;
}
