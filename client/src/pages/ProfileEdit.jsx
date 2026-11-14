import { FileUp, Plus, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api/resources.js';
import { AppShell } from '../components/AppShell.jsx';
import { Button } from '../components/Button.jsx';
import { ConnectedProfiles } from '../components/ConnectedProfiles.jsx';
import { ProfileAvatar } from '../components/ProfileAvatar.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// Retain the API's required rating internally without asking students to rank skills.
const defaultProficiency = 3;

export function ProfileEdit() {
  const [profile, setProfile] = useState(null);
  const [savedProfile, setSavedProfile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [proposed, setProposed] = useState([]);
  const [manualSkillId, setManualSkillId] = useState('');
  const [skillBusy, setSkillBusy] = useState(false);
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
  // Approving an evidence-backed suggestion adds a skill server-side.
  const reloadSkills = useCallback(async () => {
    const { student } = await api.getMe();
    setProfile((current) => ({ ...current, skills: student.skills }));
  }, []);

  if (!profile) return <AppShell><div className="loading">Loading your profile...</div></AppShell>;

  const update = (field) => (event) => { setDirty(true); setProfile({ ...profile, [field]: event.target.value }); };
  const saveProfile = async (event) => {
    event.preventDefault();
    try {
      const { student } = await api.updateProfile(profile.id, {
        name: profile.name,
        department: profile.department,
        year: Number(profile.year),
        bio: profile.bio,
        interests: profile.interests,
        availabilityHoursPerWeek: Number(profile.availability_hours_per_week),
        ...(profile.linkedin_url !== undefined ? { linkedinUrl: profile.linkedin_url ?? '' } : {})
      });
      applySavedProfile(student);
      setDirty(false);
      setMessage('Profile saved.');
    } catch (reason) {
      setMessage(reason.message);
    }
  };

  const upload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const result = await api.uploadResume(profile.id, file);
    setProposed(result.proposedSkills);
    setMessage('Resume read. Review the proposed skills below.');
  };

  const persistSkills = async (next, successMessage) => {
    setSkillBusy(true);
    try {
      const { student } = await api.updateSkills(profile.id, next);
      setProfile((current) => ({ ...current, skills: student.skills }));
      setMessage(successMessage);
      return true;
    } catch (reason) {
      setMessage(reason.message);
      return false;
    } finally {
      setSkillBusy(false);
    }
  };

  const acceptProposed = async () => {
    const existing = profile.skills.map((skill) => ({ skillId: skill.id, proficiency: skill.proficiency }));
    const additions = proposed
      .filter((item) => !existing.some((skill) => Number(skill.skillId) === Number(item.skillId)))
      .map((item) => ({ skillId: item.skillId, proficiency: defaultProficiency }));
    if (await persistSkills([...existing, ...additions], 'Reviewed resume skills saved.')) setProposed([]);
  };

  const removeSkill = async (skillId) => {
    const next = profile.skills
      .filter((skill) => Number(skill.id) !== Number(skillId))
      .map((skill) => ({ skillId: skill.id, proficiency: skill.proficiency }));
    await persistSkills(next, 'Skill removed.');
  };

  const addManualSkill = async () => {
    if (!manualSkillId) return;
    const next = [
      ...profile.skills.map((skill) => ({ skillId: skill.id, proficiency: skill.proficiency })),
      { skillId: Number(manualSkillId), proficiency: defaultProficiency }
    ];
    if (await persistSkills(next, 'Skill added manually.')) {
      setManualSkillId('');
    }
  };

  const availableSkills = skills.filter((skill) => !profile.skills.some((current) => Number(current.id) === Number(skill.id)));

  return <AppShell>
    <header className="page-header"><div><h1>Your profile</h1><p>Keep this honest and current—better context makes better matches.</p></div></header>
    <form className="profile-form" onSubmit={saveProfile}>
      <section>
        <h2>About you</h2>
        <div className="profile-photo"><ProfileAvatar name={profile.name} photoUrl={profile.avatar_url} label="Your profile photo" /><div><strong>Profile photo</strong><p>{profile.avatar_url ? 'Visible on your college profile.' : 'Choose your photo in Connected profiles below.'}</p></div></div>
        <div className="form-grid"><label>Full name<input value={profile.name} onChange={update('name')} /></label><label>Department<input value={profile.department ?? ''} onChange={update('department')} /></label><label>Year<select value={profile.year ?? 1} onChange={update('year')}>{[1, 2, 3, 4].map((year) => <option key={year}>{year}</option>)}</select></label><label>Hours available each week<input type="number" min="0" max="168" value={profile.availability_hours_per_week} onChange={update('availability_hours_per_week')} /></label></div>
        <label>Bio<textarea rows="4" value={profile.bio ?? ''} onChange={update('bio')} /></label>
        <label>LinkedIn profile URL <small>(shown only to accepted teammates)</small><input type="url" placeholder="https://www.linkedin.com/in/your-name" value={profile.linkedin_url ?? ''} onChange={update('linkedin_url')} /></label>
        <Button type="submit">Save profile</Button>
      </section>
      <section>
        <div className="section-title"><div><h2>Skills</h2><p>Add skills you can contribute to a project, or start with your resume.</p></div><label className="button button--secondary upload-button"><FileUp />Read resume<input type="file" accept="application/pdf" onChange={upload} /></label></div>
        <div className="manual-skill" aria-label="Add a skill manually">
          <label>Skill<select value={manualSkillId} onChange={(event) => setManualSkillId(event.target.value)}><option value="">Choose a skill</option>{availableSkills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name} — {skill.category}</option>)}</select></label>
          <Button type="button" disabled={!manualSkillId || skillBusy} onClick={addManualSkill}><Plus />Add skill</Button>
        </div>
        <div className="skill-list">{profile.skills.map((skill) => <span className="skill-chip" key={skill.id}><strong>{skill.name}</strong><button type="button" aria-label={`Remove ${skill.name}`} disabled={skillBusy} onClick={() => removeSkill(skill.id)}><X /></button></span>)}</div>
        {proposed.length > 0 && <div className="proposed"><h3>Proposed from your resume</h3><p>Review the detected skills before adding them to your profile.</p><div>{proposed.map((skill) => <span key={skill.skillId}><Plus />{skill.name}<small>matched “{skill.matchedAlias}”</small></span>)}</div><Button type="button" disabled={skillBusy} onClick={acceptProposed}>Save reviewed skills</Button></div>}
      </section>
      {message && <p className="success-message" role="status">{message}</p>}
    </form>
    <ConnectedProfiles profile={savedProfile} onSkillsChanged={reloadSkills} profileDirty={dirty} onProfileUpdated={applySavedProfile} initialMessage={location.state?.message ?? ''} />
  </AppShell>;
}
