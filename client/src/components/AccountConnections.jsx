import { Check, ExternalLink, Github, Linkedin, RefreshCw, Unplug } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, demoMode } from '../api/resources.js';
import { Button } from './Button.jsx';

const labels = { github: 'GitHub', linkedin: 'LinkedIn' };
const fieldNames = { name: 'name', bio: 'bio', avatarUrl: 'profile photo', profileUrl: 'profile link' };
const base64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function AccountConnections({ profile, profileDirty = false, onProfileChange }) {
  const [accounts, setAccounts] = useState([]);
  const [providers, setProviders] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [review, setReview] = useState(null);
  const [fields, setFields] = useState([]);
  const [repositoryIds, setRepositoryIds] = useState([]);
  const [skills, setSkills] = useState({});
  const [disconnect, setDisconnect] = useState(null);
  const [removeImported, setRemoveImported] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const handled = useRef(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try { const value = await api.connectedAccounts(); setAccounts(value.accounts); setProviders(value.providers); }
    catch (reason) { setError(reason.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (!searchParams.get('connection')) load(); else setLoading(false); }, []);

  useEffect(() => {
    const id = searchParams.get('connection');
    if (!id || handled.current === id) return;
    handled.current = id;
    const finish = async () => {
      setBusy('callback'); setError('');
      try {
        const saved = JSON.parse(sessionStorage.getItem(`syncspace-connection:${id}`) ?? 'null');
        if (!saved || saved.expiresAt < Date.now()) throw new Error('This connection request expired or was started in another browser. Connect again from this profile.');
        if (searchParams.has('connection_error')) throw new Error('The account connection was not authorized. You can try again.');
        const result = await api.completeConnection({ transactionId: id, verifier: saved.verifier });
        setAccounts(result.accounts);
        if (result.provider === 'github') {
          const refreshed = await api.refreshConnection('github');
          setAccounts(refreshed.accounts);
        }
        setMessage(`${labels[result.provider]} connected. Review the import before applying it to your profile.`);
      } catch (reason) { setError(reason.message); }
      finally {
        sessionStorage.removeItem(`syncspace-connection:${id}`);
        const next = new URLSearchParams(searchParams); next.delete('connection'); next.delete('connection_error');
        setSearchParams(next, { replace: true }); setBusy('');
      }
    };
    finish();
  }, [searchParams, setSearchParams]);

  const connect = async (provider) => {
    setBusy(provider); setError(''); setMessage('');
    try {
      if (!window.crypto?.subtle) throw new Error('Use HTTPS or localhost to connect an account.');
      const verifier = base64url(window.crypto.getRandomValues(new Uint8Array(32)));
      const browserChallenge = base64url(await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
      const result = await api.startConnection(provider, browserChallenge);
      for (const key of Object.keys(sessionStorage).filter((key) => key.startsWith('syncspace-connection:'))) {
        try { if (JSON.parse(sessionStorage.getItem(key)).expiresAt < Date.now()) sessionStorage.removeItem(key); } catch { sessionStorage.removeItem(key); }
      }
      sessionStorage.setItem(`syncspace-connection:${result.transactionId}`, JSON.stringify({ verifier, expiresAt: Date.now() + 600000 }));
      window.location.assign(result.authorizationUrl);
    } catch (reason) { setError(reason.message); setBusy(''); }
  };

  const openReview = (account) => {
    setReview(account.provider); setFields([]); setSkills({}); setMessage(''); setError('');
    setRepositoryIds((profile.portfolio ?? []).filter((repo) => account.preview?.repositories?.some((item) => item.id === repo.id)).map((repo) => repo.id));
  };
  const refresh = async (provider) => {
    setBusy(provider); setError(''); setMessage('');
    try { const result = await api.refreshConnection(provider); setAccounts(result.accounts); setReview(null); setMessage('Import preview refreshed. Your saved profile has not changed.'); }
    catch (reason) { setError(reason.message); await api.connectedAccounts().then((value) => setAccounts(value.accounts)).catch(() => {}); }
    finally { setBusy(''); }
  };
  const accept = async () => {
    setBusy(review); setError('');
    try {
      const result = await api.importConnection(review, { fields, repositoryIds, skills: Object.entries(skills).map(([skillId, proficiency]) => ({ skillId: Number(skillId), proficiency: Number(proficiency) })) });
      onProfileChange(result.student); setReview(null); setMessage('Your reviewed import was saved.');
    } catch (reason) { setError(reason.message); }
    finally { setBusy(''); }
  };
  const confirmDisconnect = async () => {
    setBusy(disconnect); setError('');
    try { const result = await api.disconnectAccount(disconnect, removeImported); setAccounts(result.accounts); onProfileChange(result.student); setDisconnect(null); setReview(null); setMessage('Account disconnected.'); }
    catch (reason) { setError(reason.message); }
    finally { setBusy(''); }
  };

  const reviewing = accounts.find((account) => account.provider === review);
  const preview = reviewing?.preview;
  const existingSkills = new Set((profile.skills ?? []).map((skill) => Number(skill.id)));
  return <section className="account-connections" aria-label="Connected accounts">
    <div className="section-title"><div><h2>Connected accounts</h2><p>Bring your work into your profile. You choose what to import.</p></div></div>
    <p className="connection-note">Your college account stays your SyncSpace sign-in. Imported photos, links, and portfolio projects use the audience selected above.</p>
    {profileDirty && <p className="connection-note" role="status">Save your profile changes above before connecting, importing, or disconnecting an account.</p>}
    {demoMode && <p className="connection-note">Demo mode: try a sample GitHub import below. Connecting your real accounts requires the live API.</p>}
    {loading ? <p role="status">Loading connections…</p> : <div className="connection-grid">{['github', 'linkedin'].map((provider) => {
      const account = accounts.find((item) => item.provider === provider);
      const Icon = provider === 'github' ? Github : Linkedin;
      return <article className="connection-card" key={provider}>
        <div className="connection-card__title"><Icon /><h3>{labels[provider]}</h3>{account && <span className="connection-status"><Check />{account.status === 'reconnect' ? 'Reconnect needed' : demoMode ? 'Sample preview' : 'Connected'}</span>}</div>
        <p>{provider === 'github' ? 'Import your bio, photo, and up to three public projects. Review language-based skill suggestions.' : 'Import your name and photo. Add your LinkedIn URL above; enter experience and education manually or use your resume.'}</p>
        {account && <p className="connection-account">{account.displayName}{account.username ? ` · @${account.username}` : ''}<small>{account.refreshedAt ? `Last refresh attempt: ${new Date(account.refreshedAt).toLocaleString()}` : 'Ready to review'}{account.preview?.fetchedAt ? ` · Data imported ${new Date(account.preview.fetchedAt).toLocaleString()}` : ''}</small></p>}
        <div className="connection-actions">
          {(!account || account.status === 'reconnect') && <Button type="button" variant="secondary" disabled={Boolean(busy) || profileDirty || (!demoMode && !providers[provider]) || demoMode} onClick={() => connect(provider)}>Connect {labels[provider]}</Button>}
          {account && <><Button type="button" variant="secondary" disabled={Boolean(busy) || profileDirty} onClick={() => openReview(account)}>Review {labels[provider]} import</Button><Button type="button" variant="secondary" disabled={Boolean(busy) || account.status === 'reconnect'} onClick={() => refresh(provider)}><RefreshCw />Refresh {labels[provider]}</Button><button type="button" className="connection-text-button" disabled={Boolean(busy) || profileDirty} onClick={() => { setDisconnect(provider); setRemoveImported(true); }}><Unplug />Disconnect {labels[provider]}</button></>}
          {demoMode && provider === 'github' && !account && <Button type="button" variant="secondary" disabled={Boolean(busy)} onClick={() => refresh(provider)}>Try sample GitHub import</Button>}
        </div>
        {!account && !providers[provider] && !demoMode && <p className="connection-note">Connection setup is pending. You can add a profile link above.</p>}
      </article>;
    })}</div>}
    {error && <div className="form-error" role="alert">{error}{!accounts.length && !loading && <button type="button" className="connection-text-button" onClick={load}>Reload connections</button>}</div>}
    {message && <p className="success-message" role="status">{message}</p>}
    {busy && <p role="status">Working on your connection…</p>}
    {preview && <div className="import-review" role="region" aria-label={`${labels[review]} import review`}>
      <h3>Review your {labels[review]} import</h3><p>Select each change you want to apply. Unselected profile fields stay as you wrote them.</p>
      <div className="import-fields">{Object.keys(fieldNames).filter((field) => preview[field] && (review === 'github' || field !== 'profileUrl')).map((field) => <label className="import-option" key={field}>
        <input type="checkbox" checked={fields.includes(field)} onChange={(event) => setFields((current) => event.target.checked ? [...current, field] : current.filter((item) => item !== field))} />
        <span><strong>Use {labels[review]} {fieldNames[field]}</strong>{field === 'avatarUrl' ? <img className="import-avatar" src={preview.avatarUrl} alt={`${labels[review]} profile preview`} referrerPolicy="no-referrer" /> : <small>{preview[field]}</small>}{['name', 'bio'].includes(field) && <small>Current: {profile[field] || 'Not set'}</small>}</span>
      </label>)}</div>
      {review === 'github' && <><h4>Featured projects ({repositoryIds.length}/3)</h4><p>Select up to three of your most recently updated public repositories. Forks and archived projects are excluded; up to 100 repositories are checked.</p>
        {!preview.repositories?.length && <p>No repositories in this preview. Refresh GitHub to check for public projects.</p>}
        <div className="repository-picker">{(preview.repositories ?? []).map((repo) => <div className="repository-option" key={repo.id}><label><input type="checkbox" checked={repositoryIds.includes(repo.id)} disabled={!repositoryIds.includes(repo.id) && repositoryIds.length >= 3} onChange={(event) => setRepositoryIds((current) => event.target.checked ? [...current, repo.id] : current.filter((id) => id !== repo.id))} /><span><strong>{repo.name}</strong><small>{repo.description || 'No description'}{repo.language ? ` · ${repo.language}` : ''}</small></span></label><a href={repo.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${repo.name} on GitHub`}><ExternalLink /></a></div>)}</div>
        <h4>Suggested skills</h4><p>Languages suggest experience, not proficiency. Choose an honest level. Existing skills keep their current levels.</p>
        {(preview.proposedSkills ?? []).length === 0 && <p>No dictionary skills were suggested from these repositories.</p>}
        {(preview.proposedSkills ?? []).map((skill) => <div className="import-skill" key={skill.skillId}><label><input type="checkbox" disabled={existingSkills.has(skill.skillId)} checked={existingSkills.has(skill.skillId) || skill.skillId in skills} onChange={(event) => setSkills((current) => { const next = { ...current }; if (event.target.checked) next[skill.skillId] = 3; else delete next[skill.skillId]; return next; })} /><span>{skill.name}<small>{existingSkills.has(skill.skillId) ? 'Already in your profile' : `Seen in ${skill.evidence.join(', ')}`}</small></span></label>{skill.skillId in skills && <select aria-label={`${skill.name} imported proficiency`} value={skills[skill.skillId]} onChange={(event) => setSkills({ ...skills, [skill.skillId]: Number(event.target.value) })}>{[1, 2, 3, 4, 5].map((level) => <option value={level} key={level}>{level}/5</option>)}</select>}</div>)}
      </>}
      <div className="connection-actions"><Button type="button" disabled={Boolean(busy) || profileDirty} onClick={accept}>Save reviewed import</Button><Button type="button" variant="secondary" disabled={Boolean(busy)} onClick={() => setReview(null)}>Cancel import</Button></div>
    </div>}
    {disconnect && <div className="disconnect-panel" role="dialog" aria-modal="false" aria-labelledby="disconnect-title"><h3 id="disconnect-title">Disconnect {labels[disconnect]}?</h3><p>SyncSpace will delete its stored authorization and stop accessing this account. You can also revoke the app in your provider settings.</p><label className="import-option"><input type="checkbox" checked={removeImported} onChange={(event) => setRemoveImported(event.target.checked)} /><span>Remove imported bio, photo, profile link, and portfolio where they have not been edited since import.</span></label><p className="connection-note">Your name and reviewed skills stay in your profile. You can edit or remove them separately.</p><div className="connection-actions"><Button type="button" disabled={Boolean(busy) || profileDirty} onClick={confirmDisconnect}>Confirm disconnect</Button><Button type="button" variant="secondary" disabled={Boolean(busy)} onClick={() => setDisconnect(null)}>Keep connected</Button></div></div>}
  </section>;
}
