import { FileUp, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api/resources.js';
import { AppShell } from '../components/AppShell.jsx';
import { Button } from '../components/Button.jsx';

export function ProfileEdit() {
  const [profile, setProfile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [proposed, setProposed] = useState([]);
  const [message, setMessage] = useState('');
  useEffect(() => { Promise.all([api.getMe(), api.listSkills()]).then(([{ student }, { skills: options }]) => { setProfile(student); setSkills(options); }); }, []);
  if (!profile) return <AppShell><div className="loading">Loading your profile…</div></AppShell>;
  const update = (field) => (event) => setProfile({ ...profile, [field]: event.target.value });
  const saveProfile = async (event) => {
    event.preventDefault();
    const { student } = await api.updateProfile(profile.id, { name: profile.name, department: profile.department, year: Number(profile.year), bio: profile.bio, interests: profile.interests, availabilityHoursPerWeek: Number(profile.availability_hours_per_week) });
    setProfile(student); setMessage('Profile saved.');
  };
  const upload = async (event) => {
    const file = event.target.files[0]; if (!file) return;
    const result = await api.uploadResume(profile.id, file); setProposed(result.proposedSkills); setMessage('Resume read. Review the proposed skills below.');
  };
  const acceptProposed = async () => {
    const existing = profile.skills.map((skill) => ({ skillId: skill.id, proficiency: skill.proficiency }));
    const additions = proposed.filter((item) => !existing.some((skill) => Number(skill.skillId) === Number(item.skillId))).map((item) => ({ skillId: item.skillId, proficiency: 3 }));
    const { student } = await api.updateSkills(profile.id, [...existing, ...additions]); setProfile(student); setProposed([]); setMessage('Reviewed skills saved.');
  };
  const removeSkill = async (skillId) => {
    const next = profile.skills.filter((skill) => skill.id !== skillId).map((skill) => ({ skillId: skill.id, proficiency: skill.proficiency }));
    const { student } = await api.updateSkills(profile.id, next); setProfile(student);
  };
  return <AppShell><header className="page-header"><div><h1>Your profile</h1><p>Keep this honest and current—better context makes better matches.</p></div></header>
    <form className="profile-form" onSubmit={saveProfile}><section><h2>About you</h2><div className="form-grid"><label>Full name<input value={profile.name} onChange={update('name')} /></label><label>Department<input value={profile.department ?? ''} onChange={update('department')} /></label><label>Year<select value={profile.year ?? 1} onChange={update('year')}>{[1,2,3,4].map((year) => <option key={year}>{year}</option>)}</select></label><label>Hours available each week<input type="number" min="0" max="168" value={profile.availability_hours_per_week} onChange={update('availability_hours_per_week')} /></label></div><label>Bio<textarea rows="4" value={profile.bio ?? ''} onChange={update('bio')} /></label><Button type="submit">Save profile</Button></section>
      <section><div className="section-title"><div><h2>Skills</h2><p>Use your resume as a starting point, then review every suggestion.</p></div><label className="button button--secondary upload-button"><FileUp />Read resume<input type="file" accept="application/pdf" onChange={upload} /></label></div><div className="skill-list">{profile.skills.map((skill) => <span key={skill.id}>{skill.name}<small>{skill.proficiency}/5</small><button type="button" aria-label={`Remove ${skill.name}`} onClick={() => removeSkill(skill.id)}><X /></button></span>)}</div>{proposed.length > 0 && <div className="proposed"><h3>Proposed from your resume</h3><p>Nothing is saved until you confirm it.</p><div>{proposed.map((skill) => <span key={skill.skillId}><Plus />{skill.name}<small>matched “{skill.matchedAlias}”</small></span>)}</div><Button type="button" onClick={acceptProposed}>Save reviewed skills</Button></div>}</section>{message && <p className="success-message" role="status">{message}</p>}</form>
  </AppShell>;
}
