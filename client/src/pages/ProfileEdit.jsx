import { FileUp, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api/resources.js';
import { AppShell } from '../components/AppShell.jsx';
import { Button } from '../components/Button.jsx';

const proficiencyLevels = [1, 2, 3, 4, 5];

export function ProfileEdit() {
  const [profile, setProfile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [proposed, setProposed] = useState([]);
  const [manualSkillId, setManualSkillId] = useState('');
  const [manualProficiency, setManualProficiency] = useState(3);
  const [skillBusy, setSkillBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([api.getMe(), api.listSkills()]).then(([{ student }, { skills: options }]) => {
      setProfile(student);
      setSkills(options);
    });
  }, []);

  if (!profile) return <AppShell><div className="loading">Loading your profile...</div></AppShell>;

  const update = (field) => (event) => setProfile({ ...profile, [field]: event.target.value });
  const saveProfile = async (event) => {
    event.preventDefault();
    const { student } = await api.updateProfile(profile.id, {
      name: profile.name,
      department: profile.department,
      year: Number(profile.year),
      bio: profile.bio,
      interests: profile.interests,
      availabilityHoursPerWeek: Number(profile.availability_hours_per_week)
    });
    setProfile(student);
    setMessage('Profile saved.');
  };

  const upload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const result = await api.uploadResume(profile.id, file);
    setProposed(result.proposedSkills.map((skill) => ({ ...skill, proficiency: 3 })));
    setMessage('Resume read. Review the proposed skills and proficiency levels below.');
  };

  const persistSkills = async (next, successMessage) => {
    setSkillBusy(true);
    try {
      const { student } = await api.updateSkills(profile.id, next);
      setProfile(student);
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
      .map((item) => ({ skillId: item.skillId, proficiency: Number(item.proficiency) }));
    if (await persistSkills([...existing, ...additions], 'Reviewed resume skills saved.')) setProposed([]);
  };

  const removeSkill = async (skillId) => {
    const next = profile.skills
      .filter((skill) => Number(skill.id) !== Number(skillId))
      .map((skill) => ({ skillId: skill.id, proficiency: skill.proficiency }));
    await persistSkills(next, 'Skill removed.');
  };

  const updateProficiency = async (skillId, proficiency) => {
    const next = profile.skills.map((skill) => ({
      skillId: skill.id,
      proficiency: Number(skill.id) === Number(skillId) ? Number(proficiency) : skill.proficiency
    }));
    await persistSkills(next, 'Skill proficiency updated.');
  };

  const addManualSkill = async () => {
    if (!manualSkillId) return;
    const next = [
      ...profile.skills.map((skill) => ({ skillId: skill.id, proficiency: skill.proficiency })),
      { skillId: Number(manualSkillId), proficiency: Number(manualProficiency) }
    ];
    if (await persistSkills(next, 'Skill added manually.')) {
      setManualSkillId('');
      setManualProficiency(3);
    }
  };

  const availableSkills = skills.filter((skill) => !profile.skills.some((current) => Number(current.id) === Number(skill.id)));

  return <AppShell>
    <header className="page-header"><div><h1>Your profile</h1><p>Keep this honest and current—better context makes better matches.</p></div></header>
    <form className="profile-form" onSubmit={saveProfile}>
      <section>
        <h2>About you</h2>
        <div className="form-grid"><label>Full name<input value={profile.name} onChange={update('name')} /></label><label>Department<input value={profile.department ?? ''} onChange={update('department')} /></label><label>Year<select value={profile.year ?? 1} onChange={update('year')}>{[1, 2, 3, 4].map((year) => <option key={year}>{year}</option>)}</select></label><label>Hours available each week<input type="number" min="0" max="168" value={profile.availability_hours_per_week} onChange={update('availability_hours_per_week')} /></label></div>
        <label>Bio<textarea rows="4" value={profile.bio ?? ''} onChange={update('bio')} /></label>
        <Button type="submit">Save profile</Button>
      </section>
      <section>
        <div className="section-title"><div><h2>Skills</h2><p>Add skills manually or use your resume as a starting point. Set an honest proficiency from 1 to 5.</p></div><label className="button button--secondary upload-button"><FileUp />Read resume<input type="file" accept="application/pdf" onChange={upload} /></label></div>
        <div className="manual-skill" aria-label="Add a skill manually">
          <label>Skill<select value={manualSkillId} onChange={(event) => setManualSkillId(event.target.value)}><option value="">Choose a skill</option>{availableSkills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name} — {skill.category}</option>)}</select></label>
          <label>Proficiency<select value={manualProficiency} onChange={(event) => setManualProficiency(Number(event.target.value))}>{proficiencyLevels.map((level) => <option key={level} value={level}>{level}/5</option>)}</select></label>
          <Button type="button" disabled={!manualSkillId || skillBusy} onClick={addManualSkill}><Plus />Add skill</Button>
        </div>
        <div className="skill-list">{profile.skills.map((skill) => <span className="skill-chip" key={skill.id}><strong>{skill.name}</strong><label className="skill-chip__level"><span>{skill.name} proficiency</span><select aria-label={`${skill.name} proficiency`} value={skill.proficiency} disabled={skillBusy} onChange={(event) => updateProficiency(skill.id, event.target.value)}>{proficiencyLevels.map((level) => <option key={level} value={level}>{level}/5</option>)}</select></label><button type="button" aria-label={`Remove ${skill.name}`} disabled={skillBusy} onClick={() => removeSkill(skill.id)}><X /></button></span>)}</div>
        {proposed.length > 0 && <div className="proposed"><h3>Proposed from your resume</h3><p>Review each detected skill and choose a proficiency before saving.</p><div>{proposed.map((skill) => <span key={skill.skillId}><Plus />{skill.name}<small>matched “{skill.matchedAlias}”</small><select aria-label={`${skill.name} proposed proficiency`} value={skill.proficiency} onChange={(event) => setProposed((current) => current.map((item) => item.skillId === skill.skillId ? { ...item, proficiency: Number(event.target.value) } : item))}>{proficiencyLevels.map((level) => <option key={level} value={level}>{level}/5</option>)}</select></span>)}</div><Button type="button" disabled={skillBusy} onClick={acceptProposed}>Save reviewed skills</Button></div>}
      </section>
      {message && <p className="success-message" role="status">{message}</p>}
    </form>
  </AppShell>;
}
