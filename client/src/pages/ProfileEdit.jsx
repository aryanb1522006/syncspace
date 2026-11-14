import { Plus, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api/resources.js';
import { AppShell } from '../components/AppShell.jsx';
import { Button } from '../components/Button.jsx';
import { ConnectedProfiles } from '../components/ConnectedProfiles.jsx';
import { ProfileAvatar } from '../components/ProfileAvatar.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function ProfileEdit() {
  const [profile, setProfile] = useState(null);
  const [savedProfile, setSavedProfile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [manualSkillId, setManualSkillId] = useState('');
  const [skillBusy, setSkillBusy] = useState(false);
  const [integrationBusy, setIntegrationBusy] = useState(false);
  const [skillRevision, setSkillRevision] = useState(0);
  const [skillError, setSkillError] = useState('');
  const [skillMessage, setSkillMessage] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);
  const location = useLocation();
  const { syncProfile } = useAuth();
  const applySavedProfile = useCallback((student, { preserveEdits = false } = {}) => {
    setSavedProfile(student);
    setProfile((current) => preserveEdits ? { ...current, avatar_url: student.avatar_url, avatar_source: student.avatar_source } : student);
    syncProfile(student);
  }, [syncProfile]);

  useEffect(() => {
    Promise.all([api.getMe(), api.listSkills()]).then(([{ student }, { skills: options }]) => {
      applySavedProfile(student);
      setSkills(options);
    });
  }, [applySavedProfile]);
  // GitHub sync and suggestion actions can change saved skills.
  const updateSavedSkills = useCallback((skills) => {
    setProfile((current) => ({ ...current, skills }));
  }, []);

  if (!profile) return <AppShell><div className="loading">Loading your profile...</div></AppShell>;

  const update = (field) => (event) => {
    const value = event.target.value;
    setDirty(true);
    setProfile((current) => ({ ...current, [field]: value }));
  };
  const saveProfile = async (event) => {
    event.preventDefault();
    if (profileSaving || integrationBusy) return;
    setProfileSaving(true);
    setProfileError('');
    setMessage('');
    try {
      const { student } = await api.updateProfile(profile.id, {
        name: profile.name,
        department: profile.department,
        year: Number(profile.year),
        bio: profile.bio,
        interests: profile.interests,
        availabilityHoursPerWeek: Number(profile.availability_hours_per_week),
        linkedinUrl: profile.linkedin_url ?? '',
        shareProfileLinks: Boolean(profile.share_profile_links)
      });
      setSavedProfile(student);
      setProfile((current) => ({ ...student, skills: current.skills }));
      syncProfile(student);
      setDirty(false);
      setMessage('Profile saved.');
    } catch (reason) {
      setProfileError(reason.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const persistSkillEdit = async (action, successMessage) => {
    setSkillBusy(true);
    setSkillError('');
    setSkillMessage('');
    try {
      const { student } = await action();
      setProfile((current) => ({ ...current, skills: student.skills }));
      setSkillRevision((revision) => revision + 1);
      setSkillMessage(successMessage);
      return true;
    } catch (reason) {
      setSkillError(reason.message);
      return false;
    } finally {
      setSkillBusy(false);
    }
  };

  const removeSkill = (skillId) => persistSkillEdit(() => api.removeSkill(profile.id, skillId), 'Skill removed.');

  const addManualSkill = async () => {
    if (!manualSkillId) return;
    if (await persistSkillEdit(() => api.addSkill(profile.id, Number(manualSkillId)), 'Skill added manually.')) {
      setManualSkillId('');
    }
  };

  const availableSkills = skills.filter((skill) => !profile.skills.some((current) => Number(current.id) === Number(skill.id)));

  return <AppShell>
    <header className="page-header"><div><h1>Your profile</h1><p>Keep this honest and current—better context makes better matches.</p></div></header>
    <form className="profile-form" onSubmit={saveProfile}>
      <section>
        <h2>About you</h2>
        <fieldset disabled={profileSaving}>
        <div className="profile-photo"><ProfileAvatar name={profile.name} photoUrl={profile.avatar_url} label="Your profile photo" /><div><strong>Profile photo</strong><p>{profile.avatar_url ? 'Visible on your college profile.' : 'Choose your photo in Connected profiles below.'}</p></div></div>
        <div className="form-grid"><label>Full name<input value={profile.name} onChange={update('name')} /></label><label>Department<input value={profile.department ?? ''} onChange={update('department')} /></label><label>Year<select value={profile.year ?? 1} onChange={update('year')}>{[1, 2, 3, 4].map((year) => <option key={year}>{year}</option>)}</select></label><label>Hours available each week<input type="number" min="0" max="168" value={profile.availability_hours_per_week} onChange={update('availability_hours_per_week')} /></label></div>
        <label>Bio<textarea rows="4" value={profile.bio ?? ''} onChange={update('bio')} /></label>
        <label>LinkedIn profile URL<input type="url" placeholder="https://www.linkedin.com/in/your-name" value={profile.linkedin_url ?? ''} onChange={update('linkedin_url')} /></label>
        <label className="profile-link-sharing">
          <input type="checkbox" checked={Boolean(profile.share_profile_links)} onChange={(event) => {
            setDirty(true);
            setProfile((current) => ({ ...current, share_profile_links: event.target.checked }));
          }} />
          <span>Share my GitHub and LinkedIn links
            <small>Show your links to college members viewing your projects and to project leaders reviewing your applications.</small>
          </span>
        </label>
        <Button type="submit" disabled={profileSaving || integrationBusy}>{profileSaving ? 'Saving…' : 'Save profile'}</Button>
        </fieldset>
      </section>
      <section>
        <div className="section-title"><div><h2>Skills</h2><p>Sync skills from GitHub or edit your list here.</p></div></div>
        <div className="manual-skill" aria-label="Add a skill manually">
          <label>Skill<select value={manualSkillId} onChange={(event) => setManualSkillId(event.target.value)}><option value="">Choose a skill</option>{availableSkills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name} — {skill.category}</option>)}</select></label>
          <Button type="button" disabled={!manualSkillId || skillBusy || integrationBusy} onClick={addManualSkill}><Plus />Add skill</Button>
        </div>
        <div className="skill-list">{profile.skills.map((skill) => <span className="skill-chip" key={skill.id}><strong>{skill.name}</strong><button type="button" aria-label={`Remove ${skill.name}`} disabled={skillBusy || integrationBusy} onClick={() => removeSkill(skill.id)}><X /></button></span>)}</div>
        {skillMessage && <p className="success-message" role="status">{skillMessage}</p>}
        {skillError && <p className="form-error" role="alert">{skillError}</p>}
      </section>
      {message && <p className="success-message" role="status">{message}</p>}
      {profileError && <p className="form-error" role="alert">{profileError}</p>}
    </form>
    <ConnectedProfiles profile={savedProfile} onSkillsChanged={updateSavedSkills} profileDirty={dirty}
      onProfileUpdated={applySavedProfile} initialMessage={location.state?.message ?? ''}
      skillBusy={skillBusy} skillRevision={skillRevision} onBusyChange={setIntegrationBusy} />
  </AppShell>;
}
