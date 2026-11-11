import { Check, FileArchive, Github, Linkedin, RefreshCw, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/resources.js';
import { Button } from './Button.jsx';

const proficiencyLevels = [1, 2, 3, 4, 5];
const classLabels = {
  repeated_project_evidence: 'Used in 3+ GitHub repositories',
  github_detected: 'Detected on GitHub',
  professional_experience: 'From LinkedIn experience',
  self_declared: 'Self-declared on LinkedIn'
};
const methodLabels = {
  manifest_dependency: 'dependency file', config_file: 'config file', language_bytes: 'language breakdown',
  repo_topic: 'repository topic', readme_mention: 'README', linkedin_skill: 'LinkedIn Skills',
  linkedin_position: 'LinkedIn position', linkedin_project: 'LinkedIn project',
  linkedin_certification: 'LinkedIn certification', linkedin_summary: 'LinkedIn summary'
};
const visibilityLabels = { private: 'Only me', team: 'My teammates', college: 'Students at my college' };
const formatDate = (value) => (value ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : '—');

function EvidenceList({ group }) {
  return <details className="evidence-review__details">
    <summary>{group.items.length} piece{group.items.length === 1 ? '' : 's'} of evidence</summary>
    <ul>{group.items.map((item) => <li key={item.id}>
      <strong>{item.sourceRef}</strong> — {item.evidence}
      <small>{methodLabels[item.detectionMethod] ?? item.detectionMethod} · {Math.round(item.confidence * 100)}% · verified {formatDate(item.lastVerifiedAt)}</small>
    </li>)}</ul>
  </details>;
}

function SkillRow({ group, busy, onDecide, onVisibility }) {
  const [level, setLevel] = useState('');
  const decided = group.status === 'on_profile' || group.status === 'approved';
  const visibility = group.items.every((item) => item.visibility === group.items[0].visibility) ? group.items[0].visibility : '';
  return <article className={`evidence-review__row evidence-review__row--${group.status}`}>
    <div className="evidence-review__head">
      <strong>{group.name}</strong>
      <span className="evidence-review__confidence" title="Strength of the evidence that you have used this skill, not a proficiency level">{Math.round(group.confidence * 100)}% evidence</span>
      <small>{classLabels[group.evidenceClass]}</small>
    </div>
    <EvidenceList group={group} />
    <div className="evidence-review__actions">
      {decided
        ? <>
          <span className="evidence-review__status"><Check />{group.status === 'on_profile' ? 'On your profile' : 'Approved'}</span>
          <label>Evidence visible to<select aria-label={`${group.name} evidence visibility`} value={visibility} disabled={busy} onChange={(event) => onVisibility(group, event.target.value)}>
            {!visibility && <option value="">Mixed</option>}
            {Object.entries(visibilityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
        </>
        : <>
          {group.status === 'rejected' && <span className="evidence-review__status evidence-review__status--muted"><X />Rejected</span>}
          <label>Your level<select aria-label={`${group.name} proficiency`} value={level} disabled={busy} onChange={(event) => setLevel(event.target.value)}>
            <option value="">Choose</option>
            {proficiencyLevels.map((value) => <option key={value} value={value}>{value}/5</option>)}
          </select></label>
          <Button type="button" disabled={busy || !level} onClick={() => onDecide(group, 'approved', Number(level))}><Check />{group.status === 'rejected' ? 'Add anyway' : 'Approve'}</Button>
          {group.status !== 'rejected' && <Button type="button" variant="secondary" disabled={busy} onClick={() => onDecide(group, 'rejected')}><X />Not accurate</Button>}
        </>}
    </div>
  </article>;
}

export function ConnectedProfiles({ onSkillsChanged, initialMessage = '' }) {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [error, setError] = useState('');
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [deleteGitHubEvidence, setDeleteGitHubEvidence] = useState(false);

  useEffect(() => {
    api.integrations().then(setState).catch((reason) => setError(reason.message));
  }, []);

  const run = useCallback(async (action, success, { skillsChanged = false } = {}) => {
    setBusy(true); setError(''); setMessage('');
    try {
      const next = await action();
      setState(next);
      setMessage(typeof success === 'function' ? success(next) : success);
      if (skillsChanged) await onSkillsChanged?.();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }, [onSkillsChanged]);

  if (error && !state) return <section className="connected-profiles"><h2>Connected profiles</h2><p className="form-error" role="alert">{error}</p></section>;
  if (!state) return <section className="connected-profiles"><h2>Connected profiles</h2><p className="loading">Loading connected profiles…</p></section>;
  if (state.demo) {
    return <section className="connected-profiles"><h2>Connected profiles</h2><p className="connected-profiles__note">GitHub and LinkedIn import use real OAuth and real uploads, so they are unavailable in demo mode. Run SyncSpace with <code>VITE_DEMO_MODE=false</code> to connect your profiles.</p></section>;
  }

  const github = state.github.connection;
  const linkedin = state.linkedin.connection;
  const reviewable = state.skills.filter((group) => group.status !== 'unmatched');
  const pending = reviewable.filter((group) => group.status === 'pending');
  const rest = reviewable.filter((group) => group.status !== 'pending');
  const unmatched = state.skills.filter((group) => group.status === 'unmatched');

  const connectGitHub = async () => {
    setBusy(true); setError('');
    try {
      const { url } = await api.githubAuthorizeUrl();
      window.location.assign(url);
    } catch (reason) {
      setError(reason.message);
      setBusy(false);
    }
  };
  const importLinkedIn = (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    run(() => api.linkedinImport(file), (next) => `LinkedIn export read (${next.import.sectionsFound.join(', ')}). Review the suggested skills below.`);
  };
  const decide = (group, decision, proficiency) => run(
    () => api.decideSkill(group.skillId, decision, proficiency),
    decision === 'approved' ? `${group.name} added to your skills.` : `${group.name} will not be suggested again.`,
    { skillsChanged: decision === 'approved' }
  );
  const setVisibility = (group, visibility) => run(
    () => api.setEvidenceVisibility(group.items.map((item) => item.id), visibility),
    `${group.name} evidence is now visible to: ${visibilityLabels[visibility].toLowerCase()}.`
  );

  return <section className="connected-profiles">
    <div className="section-title"><div><h2>Connected profiles</h2><p>Use evidence from GitHub and LinkedIn to suggest skills. Nothing is added to your profile until you approve it, and evidence stays private unless you share it.</p></div></div>

    <div className="source-cards">
      <article className="source-card">
        <h3><Github />GitHub</h3>
        {!state.github.configured && !github && <p className="connected-profiles__note">GitHub connection is not configured on this server yet.</p>}
        {github
          ? <>
            <p><a href={github.profileUrl} target="_blank" rel="noreferrer">@{github.username}</a> · {github.status === 'revoked' ? 'access revoked — reconnect to sync' : `last synced ${formatDate(github.lastSyncedAt)}`}</p>
            {github.lastSyncError && <p className="form-error">{github.lastSyncError}</p>}
            <div className="source-card__actions">
              {github.status === 'revoked'
                ? <Button type="button" disabled={busy || !state.github.configured} onClick={connectGitHub}><Github />Reconnect</Button>
                : <Button type="button" variant="secondary" disabled={busy} onClick={() => run(() => api.githubSync(), 'GitHub synced. Review any new suggestions below.')}><RefreshCw className={busy ? 'is-spinning' : ''} />Sync now</Button>}
              {!confirmDisconnect
                ? <Button type="button" variant="secondary" disabled={busy} onClick={() => setConfirmDisconnect(true)}>Disconnect</Button>
                : <div className="source-card__confirm">
                  <label><input type="checkbox" checked={deleteGitHubEvidence} onChange={(event) => setDeleteGitHubEvidence(event.target.checked)} />Also delete all GitHub evidence</label>
                  <p>Skills you already approved stay on your profile.</p>
                  <Button type="button" disabled={busy} onClick={() => run(() => api.githubDisconnect(deleteGitHubEvidence), 'GitHub disconnected and SyncSpace access revoked.').then(() => setConfirmDisconnect(false))}>Confirm disconnect</Button>
                  <Button type="button" variant="secondary" onClick={() => setConfirmDisconnect(false)}>Cancel</Button>
                </div>}
            </div>
          </>
          : state.github.configured && <>
            <p>SyncSpace reads only your <strong>public</strong> repositories: languages, topics, README and dependency files. It requests no GitHub permissions and never posts anything.</p>
            <Button type="button" disabled={busy} onClick={connectGitHub}><Github />Connect GitHub</Button>
          </>}
      </article>

      <article className="source-card">
        <h3><Linkedin />LinkedIn</h3>
        <p>LinkedIn does not let apps read your skills directly. Instead, download your data (LinkedIn → Settings → Data privacy → <em>Get a copy of your data</em>) and upload the ZIP. Only Skills, Positions, Projects, Certifications, Education and your headline are read; the file is not stored.</p>
        {linkedin && <p>Imported {formatDate(linkedin.lastSyncedAt)}</p>}
        <div className="source-card__actions">
          <label className={`button button--${linkedin ? 'secondary' : 'primary'} upload-button`}><FileArchive />{linkedin ? 'Import a newer export' : 'Upload LinkedIn export'}<input type="file" accept=".zip,application/zip" disabled={busy} onChange={importLinkedIn} /></label>
          {linkedin && <Button type="button" variant="secondary" disabled={busy} onClick={() => run(() => api.linkedinDelete(), 'LinkedIn import and its evidence deleted.')}>Delete import</Button>}
        </div>
      </article>
    </div>

    {error && <p className="form-error" role="alert">{error}</p>}
    {message && <p className="success-message" role="status">{message}</p>}

    {reviewable.length > 0 && <div className="evidence-review">
      {pending.length > 0 && <h3>Suggested skills · {pending.length} to review</h3>}
      {pending.map((group) => <SkillRow key={group.skillId} group={group} busy={busy} onDecide={decide} onVisibility={setVisibility} />)}
      {rest.length > 0 && <h3>Reviewed evidence</h3>}
      {rest.map((group) => <SkillRow key={group.skillId} group={group} busy={busy} onDecide={decide} onVisibility={setVisibility} />)}
    </div>}
    {unmatched.length > 0 && <p className="connected-profiles__note">Also detected, but not in SyncSpace's skill list yet: {unmatched.map((group) => group.name).join(', ')}.</p>}
  </section>;
}
