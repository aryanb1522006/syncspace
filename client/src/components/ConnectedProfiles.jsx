import { Check, FileArchive, Github, Linkedin, RefreshCw, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/resources.js';
import { startProviderConnection } from '../api/providerConnection.js';
import { Button } from './Button.jsx';
import { ProfileAvatar } from './ProfileAvatar.jsx';

const defaultProficiency = 3;
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
const githubSyncMessage = ({ addedSkillIds }) => {
  const count = addedSkillIds?.length ?? 0;
  return count ? `GitHub synced. Added ${count} skill${count === 1 ? '' : 's'} to your profile.` : 'GitHub synced.';
};

function EvidenceList({ group }) {
  return <div className="evidence-review__details">
    <p>{group.items.length} piece{group.items.length === 1 ? '' : 's'} of evidence</p>
    <ul>{group.items.map((item) => <li key={item.id}>
      <strong>{item.sourceRef}</strong> — {item.evidence}
      <small>{methodLabels[item.detectionMethod] ?? item.detectionMethod} · {Math.round(item.confidence * 100)}% · verified {formatDate(item.lastVerifiedAt)}</small>
    </li>)}</ul>
  </div>;
}

function SkillRow({ group, busy, onDecide, onVisibility }) {
  const onProfile = group.status === 'on_profile';
  const fromGitHub = group.sources.includes('github');
  const dismissed = group.status === 'rejected' || group.status === 'approved';
  const visibility = group.items.every((item) => item.visibility === group.items[0].visibility) ? group.items[0].visibility : '';
  return <details className="evidence-review__row">
    <summary className="evidence-review__head">
      <strong>{group.name}</strong>
      <span className="evidence-review__confidence">{Number(((group.githubConfidence ?? group.confidence) * 100).toFixed(1))}% evidence</span>
      <small>{classLabels[group.evidenceClass]}</small>
    </summary>
    <div className="evidence-review__body">
      <EvidenceList group={group} />
      <div className="evidence-review__actions">
        {onProfile
          ? <label>Evidence visible to<select aria-label={`${group.name} evidence visibility`} value={visibility} disabled={busy} onChange={(event) => onVisibility(group, event.target.value)}>
            {!visibility && <option value="">Mixed</option>}
            {Object.entries(visibilityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          : fromGitHub && <>
            <Button type="button" disabled={busy} onClick={() => onDecide(group, 'approved', defaultProficiency)}><Check />{dismissed ? 'Add back' : 'Add to skills'}</Button>
            {!dismissed && <Button type="button" variant="secondary" disabled={busy} onClick={() => onDecide(group, 'rejected')}><X />Dismiss</Button>}
          </>}
      </div>
    </div>
  </details>;
}

export function ConnectedProfiles({ profile, onSkillsChanged, onProfileUpdated, onBusyChange, skillRevision = 0, skillBusy = false, profileDirty = false, initialMessage = '' }) {
  const [state, setState] = useState(null);
  const [working, setBusy] = useState(false);
  const [loadedRevision, setLoadedRevision] = useState(null);
  const busy = working || skillBusy || loadedRevision !== skillRevision;
  const [message, setMessage] = useState(initialMessage);
  const [error, setError] = useState('');
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [deleteGitHubEvidence, setDeleteGitHubEvidence] = useState(false);
  const [upload, setUpload] = useState(null);
  const [sections, setSections] = useState([]);
  const [detailFields, setDetailFields] = useState([]);
  const [pendingAction, setPendingAction] = useState('');

  useEffect(() => {
    let active = true;
    api.integrations()
      .then((next) => { if (active) setState(next); })
      .catch((reason) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoadedRevision(skillRevision); });
    return () => { active = false; };
  }, [skillRevision]);
  useEffect(() => { onBusyChange?.(working); }, [onBusyChange, working]);
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(''), 6000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const run = useCallback(async (action, success, { skillsChanged = false, actionName = '' } = {}) => {
    setBusy(true); setError(''); setMessage('');
    setPendingAction(actionName);
    try {
      const next = await action();
      setState(next);
      setMessage(typeof success === 'function' ? success(next) : success);
      if (skillsChanged) await onSkillsChanged?.();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
      setPendingAction('');
    }
  }, [onSkillsChanged]);

  if (error && !state) return <section className="connected-profiles"><h2>Connected profiles</h2><p className="form-error" role="alert">{error}</p></section>;
  if (!state) return <section className="connected-profiles"><h2>Connected profiles</h2><p className="loading">Loading connected profiles…</p></section>;
  if (state.demo) {
    return <section className="connected-profiles"><h2>Connected profiles</h2><p className="connected-profiles__note">Account connections and export uploads are unavailable in demo mode.</p></section>;
  }

  const github = state.github.connection;
  const linkedin = state.linkedin.connection;
  const account = state.linkedin.account;
  // Compare against the last saved profile, never unsaved form edits. The
  // server flags preserve completion even if the user later edits their name.
  const nameApplied = account && (account.nameApplied || (profile?.name != null && profile.name.trim() === account.name.trim()));
  const photoApplied = account && (account.photoApplied || (account.pictureUrl && profile?.avatar_url === account.pictureUrl));
  const availableFields = account ? [...(!nameApplied ? ['name'] : []), ...(account.pictureUrl && !photoApplied ? ['photo'] : [])] : [];
  const selectedFields = detailFields.filter((field) => availableFields.includes(field));
  const detailsComplete = account && availableFields.length === 0;
  const reviewable = state.skills.filter((group) => group.status !== 'unmatched');
  const unmatched = state.skills.filter((group) => group.status === 'unmatched');
  const groups = [
    { title: 'On your profile', items: reviewable.filter((group) => group.status === 'on_profile') },
    { title: 'GitHub suggestions', items: reviewable.filter((group) => group.status === 'pending' && group.sources.includes('github')) },
    { title: 'Dismissed or removed', items: reviewable.filter((group) => ['rejected', 'approved'].includes(group.status) && group.sources.includes('github')) },
    { title: 'LinkedIn evidence', items: reviewable.filter((group) => group.status !== 'on_profile' && !group.sources.includes('github')) }
  ];

  const connectProvider = async (provider) => {
    setBusy(true); setError('');
    try {
      await startProviderConnection(provider, provider === 'github' ? api.githubAuthorizeUrl : api.linkedinAuthorizeUrl);
    } catch (reason) {
      setError(reason.message);
      setBusy(false);
    }
  };
  const connectGitHub = () => connectProvider('github');
  const importLinkedIn = async (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true); setError(''); setUpload(null); setMessage('');
    try {
      const preview = await api.linkedinPreview(file);
      setUpload({ file, ...preview });
      setSections(preview.sections.map((section) => section.name));
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  };
  const useDetails = async () => {
    if (!selectedFields.length) return;
    setBusy(true); setError(''); setPendingAction('linkedin-details');
    try {
      const { student } = await api.linkedinUseDetails(selectedFields);
      setState((current) => ({ ...current, linkedin: { ...current.linkedin, account: {
        ...current.linkedin.account,
        nameApplied: Boolean(nameApplied || selectedFields.includes('name')),
        photoApplied: Boolean(photoApplied || selectedFields.includes('photo'))
      } } }));
      onProfileUpdated?.(student); setDetailFields([]); setMessage('Profile details updated.');
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); setPendingAction(''); }
  };
  const toggle = (list, value) => list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  const decide = (group, decision, proficiency) => run(
    () => api.decideSkill(group.skillId, decision, proficiency),
    decision === 'approved' ? `${group.name} added to your skills.` : `${group.name} dismissed.`,
    { skillsChanged: decision === 'approved' }
  );
  const setVisibility = (group, visibility) => run(
    () => api.setEvidenceVisibility(group.items.map((item) => item.id), visibility),
    `${group.name} evidence is now visible to: ${visibilityLabels[visibility].toLowerCase()}.`
  );

  return <section className="connected-profiles">
    <div className="section-title"><div><h2>Connected profiles</h2><p>Manage your accounts and the evidence behind your skills.</p></div></div>
    {profileDirty && ((!github && state.github.configured) || github?.status === 'revoked' || (!account && state.linkedin.configured) || (account && !detailsComplete)) && <p className="connected-profiles__note">Save your profile edits before connecting an account or copying account details.</p>}

    <div className="source-cards">
      <article className="source-card">
        <div className="source-card__header"><h3><Github />GitHub</h3>{github && <span className={`source-card__status${github.status === 'revoked' ? ' source-card__status--attention' : ''}`}>{github.status === 'revoked' ? 'Reconnect needed' : <><Check />Connected</>}</span>}</div>
        {!state.github.configured && !github && <p className="connected-profiles__note">GitHub connection is unavailable right now.</p>}
        {github
          ? <>
            <div className="source-card__identity"><div><a href={github.profileUrl} target="_blank" rel="noreferrer">@{github.username}</a><small>{github.status === 'revoked' ? 'Reconnect to resume syncing.' : `Synced ${formatDate(github.lastSyncedAt)}`}</small></div></div>
            {github.status === 'active' && <p>Sync adds skills with more than 10% GitHub evidence. Edit your skill list anytime.</p>}
            {github.lastSyncError && <p className="form-error">{github.lastSyncError}</p>}
            <div className="source-card__actions">
              {github.status === 'revoked'
                ? <Button type="button" disabled={busy || profileDirty || !state.github.configured} onClick={connectGitHub}><Github />Reconnect</Button>
                : <Button type="button" variant="secondary" disabled={busy} onClick={() => run(() => api.githubSync(), githubSyncMessage, { actionName: 'github-sync', skillsChanged: true })}><RefreshCw className={pendingAction === 'github-sync' ? 'is-spinning' : ''} />{pendingAction === 'github-sync' ? 'Syncing…' : 'Sync now'}</Button>}
              {!confirmDisconnect
                ? <Button type="button" variant="secondary" disabled={busy} onClick={() => setConfirmDisconnect(true)}>Disconnect</Button>
                : <div className="source-card__confirm">
                  <label><input type="checkbox" checked={deleteGitHubEvidence} onChange={(event) => setDeleteGitHubEvidence(event.target.checked)} />Also delete all GitHub evidence</label>
                  <p>Skills already on your profile stay until you remove them.</p>
                  <Button type="button" disabled={busy} onClick={() => run(() => api.githubDisconnect(deleteGitHubEvidence), 'GitHub disconnected. Stored authorization was removed; you can also revoke SyncSpace in GitHub settings.').then(() => setConfirmDisconnect(false))}>Confirm disconnect</Button>
                  <Button type="button" variant="secondary" onClick={() => setConfirmDisconnect(false)}>Cancel</Button>
                </div>}
            </div>
          </>
          : state.github.configured && <>
            <p>Add skills from your public repositories when GitHub evidence exceeds 10%. You can remove any skill from your profile. Nothing is posted to GitHub.</p>
            <Button type="button" disabled={busy || profileDirty} onClick={connectGitHub}><Github />Connect GitHub</Button>
          </>}
      </article>

      <article className="source-card">
        <div className="source-card__header"><h3><Linkedin />LinkedIn</h3>{account && <span className="source-card__status"><Check />Connected</span>}</div>
        {account ? <>
          <div className="source-card__identity"><ProfileAvatar name={account.name} photoUrl={account.pictureUrl} label="Your LinkedIn account photo" /><div><strong>{account.name}</strong><small>{detailsComplete ? 'Profile details up to date' : 'Choose details to add to your profile'}</small></div></div>
          {!detailsComplete && <div className="source-card__review">
            {!nameApplied && <label className="source-card__choice"><input type="checkbox" checked={selectedFields.includes('name')} disabled={busy} onChange={() => setDetailFields((fields) => toggle(fields, 'name'))} />Use name: {account.name}</label>}
            {account.pictureUrl && !photoApplied && <label className="source-card__choice"><input type="checkbox" checked={selectedFields.includes('photo')} disabled={busy} onChange={() => setDetailFields((fields) => toggle(fields, 'photo'))} />Use photo on my college profile</label>}
          </div>}
          <div className="source-card__actions">
            {!detailsComplete && <Button type="button" disabled={busy || profileDirty || !selectedFields.length} onClick={useDetails}>{pendingAction === 'linkedin-details' ? 'Applying…' : 'Use selected details'}</Button>}
            <Button type="button" variant="secondary" disabled={busy} onClick={() => run(async () => {
              const next = await api.linkedinDisconnect();
              const { student } = await api.getMe();
              onProfileUpdated?.(student, { preserveEdits: true });
              setDetailFields([]); return next;
            }, 'LinkedIn disconnected. Your copied name and imported skills are kept.')}>Disconnect account</Button>
          </div>
        </> : <>
          <p>Use your LinkedIn name and photo. Choose what to add after connecting.</p>
          {state.linkedin.configured
            ? <Button type="button" disabled={busy || profileDirty} onClick={() => connectProvider('linkedin')}><Linkedin />Connect LinkedIn</Button>
            : <p className="connected-profiles__note">Account linking is unavailable. You can still import an export below.</p>}
          <details className="source-card__help"><summary>What does this share?</summary><p>Choose whether to use your LinkedIn name and photo. Add your LinkedIn profile URL under About you to share a link.</p></details>
        </>}
      </article>
    </div>

    <details className="profile-import">
      <summary><span><FileArchive /><strong>Import LinkedIn evidence</strong></span><small>{linkedin ? `Imported ${formatDate(linkedin.lastSyncedAt)}` : 'ZIP or CSV'}</small></summary>
      <div className="profile-import__body">
        <p>Review your LinkedIn export before importing it. It can support skills already on your profile.</p>
        <details className="source-card__help"><summary>How to get your export</summary><p>In LinkedIn, open Settings → Data privacy → Get a copy of your data. Upload the ZIP or a supported CSV. Files are processed in memory; contacts and messages are ignored.</p></details>
        <div className="source-card__actions">
          <label className="button button--secondary upload-button"><FileArchive />{linkedin ? 'Preview a newer export' : 'Preview LinkedIn export'}<input aria-label="LinkedIn export file" type="file" accept=".zip,.csv,application/zip,text/csv" disabled={busy} onChange={importLinkedIn} /></label>
          {linkedin && <Button type="button" variant="secondary" disabled={busy} onClick={() => run(() => api.linkedinDelete(), 'LinkedIn import and its evidence deleted.')}>Delete import</Button>}
        </div>
        {upload && <div className="source-card__confirm">
          <h4>Review {upload.file.name}</h4>
          <p>Confirming replaces the previous LinkedIn import with the selected sections. New evidence is private, and existing evidence keeps its visibility.</p>
          {upload.sections.map((section) => <div key={section.name}>
            <label><input type="checkbox" checked={sections.includes(section.name)} disabled={busy} onChange={() => setSections((list) => toggle(list, section.name))} />{section.name} · {section.evidenceCount} evidence items</label>
            <p>{section.skills.length ? section.skills.join(', ') : 'No recognized skill evidence in this section.'}</p>
            {section.profileText && <details><summary>Profile text used for matching</summary><p>{section.profileText}</p></details>}
          </div>)}
          <Button type="button" disabled={busy || !sections.length} onClick={() => run(async () => {
            const next = await api.linkedinImport(upload.file, sections); setUpload(null); return next;
          }, 'Selected LinkedIn evidence imported.')}>Confirm selected sections</Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => setUpload(null)}>Cancel import</Button>
        </div>}
      </div>
    </details>

    {error && <p className="form-error" role="alert">{error}</p>}
    {message && <p className="success-message" role="status">{message}</p>}

    {state.skills.length > 0 && <div className="evidence-review">
      <h3>Skill evidence</h3>
      <p className="connected-profiles__note">Evidence scores show how strongly sources support a skill. Sync adds skills with more than 10% GitHub evidence. Open a skill to see its sources and manage sharing.</p>
      {groups.filter(({ items }) => items.length).map(({ title, items }) => <details className="evidence-review__group" key={title}>
        <summary>{title} <small>{items.length}</small></summary>
        <div>{items.map((group) => <SkillRow key={group.skillId} group={group} busy={busy} onDecide={decide} onVisibility={setVisibility} />)}</div>
      </details>)}
      {unmatched.length > 0 && <details className="evidence-review__group">
        <summary>Not in the skill list <small>{unmatched.length}</small></summary>
        <p>{unmatched.map((group) => group.name).join(', ')}</p>
      </details>}
    </div>}
  </section>;
}
