import { ArrowLeft, Linkedin, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/resources.js';
import { AppShell } from '../components/AppShell.jsx';
import { Button } from '../components/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ProfileAvatar } from '../components/ProfileAvatar.jsx';

export function MemberProfile() {
  const { id, userId } = useParams();
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const loadProfile = userId ? api.getStudentByUserId(userId) : api.getStudent(id);
    loadProfile
      .then(({ student: value }) => { if (active) setStudent(value); })
      .catch((reason) => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [id, userId]);

  if (error) return <AppShell><div className="empty-panel"><h2>Profile could not be loaded</h2><p>{error}</p><Button to="/dashboard">Back to dashboard</Button></div></AppShell>;
  if (!student) return <AppShell><div className="loading">Loading member profile?</div></AppShell>;

  const ownProfile = Number(student.userId) === Number(user?.id);
  const interests = student.interests ?? [];
  const skills = student.skills ?? [];
  const evidence = student.skillEvidence ?? [];
  const sourceNames = { github: 'GitHub', linkedin_export: 'LinkedIn' };

  return <AppShell>
    <Link className="back-link app-back" to="/teams"><ArrowLeft />Back to teams</Link>
    <section className="member-profile">
      <ProfileAvatar name={student.name} photoUrl={student.avatarUrl} />
      <span className="eyebrow">SyncSpace teammate</span>
      <h1>{student.name}</h1>
      {student.email
        ? <a className="member-profile__email" href={`mailto:${student.email}`}><Mail />{student.email}</a>
        : <p className="contact-privacy"><UserRound />Email becomes visible after you are accepted into the same project team.</p>}
      {student.linkedinUrl && <a className="member-profile__email" href={student.linkedinUrl} target="_blank" rel="noreferrer"><Linkedin />LinkedIn profile</a>}
      <div className="member-profile__details">
        {(student.department || student.year) && <dl>
          {student.department && <div><dt>Department</dt><dd>{student.department}</dd></div>}
          {student.year && <div><dt>Year</dt><dd>{student.year}</dd></div>}
          {student.availabilityHoursPerWeek !== undefined && <div><dt>Availability</dt><dd>{student.availabilityHoursPerWeek}h / week</dd></div>}
        </dl>}
        {student.bio && <section><h2>About</h2><p>{student.bio}</p></section>}
        {skills.length > 0 && <section><h2>Skills</h2><div className="member-profile__tags">{skills.map((skill) => <span key={skill.id}>{skill.name}<small>{skill.proficiency}/5</small></span>)}</div></section>}
        {evidence.length > 0 && <section><h2>Skill evidence</h2><ul className="member-profile__evidence">{evidence.map((group) => <li key={group.skillId}>
          <strong>{group.name}</strong> <small>{group.sources.map((source) => sourceNames[source] ?? source).join(' + ')}</small>
          <span>{group.items.slice(0, 3).map((item) => `${item.sourceRef}: ${item.evidence}`).join(' · ')}</span>
        </li>)}</ul></section>}
        {interests.length > 0 && <section><h2>Interests</h2><div className="member-profile__tags">{interests.map((interest) => <span key={interest}>{interest}</span>)}</div></section>}
      </div>
      <p className="member-profile__trust"><ShieldCheck />Contact details are shared only inside accepted project teams.</p>
      {ownProfile && <Button to="/profile" variant="secondary">Edit your profile</Button>}
    </section>
  </AppShell>;
}
