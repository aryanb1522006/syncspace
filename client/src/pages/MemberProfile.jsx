import { ArrowLeft, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/resources.js';
import { AppShell } from '../components/AppShell.jsx';
import { Button } from '../components/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ProfileAvatar } from '../components/ProfileAvatar.jsx';
import { ProfileLinks } from '../components/ProfileLinks.jsx';

export function MemberProfile() {
  const { id, userId, projectId, applicationId } = useParams();
  const backTo = applicationId ? `/projects/${projectId}/applications` : '/teams';
  const backLabel = applicationId ? 'Back to applications' : 'Back to teams';
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setStudent(null);
    setError('');
    const loadProfile = applicationId
      ? api.getApplicantProfile(projectId, applicationId)
      : userId ? api.getStudentByUserId(userId) : api.getStudent(id);
    loadProfile
      .then(({ student: value }) => { if (active) setStudent(value); })
      .catch((reason) => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [id, userId, projectId, applicationId]);

  if (error) return <AppShell><div className="empty-panel"><h2>Profile could not be loaded</h2><p>{error}</p><Button to={backTo}>{backLabel}</Button></div></AppShell>;
  if (!student) return <AppShell><div className="loading">Loading profile…</div></AppShell>;

  const ownProfile = Number(student.userId) === Number(user?.id);
  const interests = student.interests ?? [];
  const skills = student.skills ?? [];
  const evidence = student.skillEvidence ?? [];
  const sourceNames = { github: 'GitHub', linkedin_export: 'LinkedIn' };

  return <AppShell>
    <Link className="back-link app-back" to={backTo}><ArrowLeft />{backLabel}</Link>
    <section className="member-profile">
      <ProfileAvatar name={student.name} photoUrl={student.avatarUrl} />
      <span className="eyebrow">{applicationId ? 'Project applicant' : 'SyncSpace teammate'}</span>
      <h1>{student.name}</h1>
      {student.email
        ? <a className="member-profile__email" href={`mailto:${student.email}`}><Mail />{student.email}</a>
        : <p className="contact-privacy"><UserRound />Email becomes visible after you are accepted into the same project team.</p>}
      <ProfileLinks githubUrl={student.githubUrl} linkedinUrl={student.linkedinUrl} />
      <div className="member-profile__details">
        {(student.department || student.year) && <dl>
          {student.department && <div><dt>Department</dt><dd>{student.department}</dd></div>}
          {student.year && <div><dt>Year</dt><dd>{student.year}</dd></div>}
          {student.availabilityHoursPerWeek !== undefined && <div><dt>Availability</dt><dd>{student.availabilityHoursPerWeek}h / week</dd></div>}
        </dl>}
        {student.bio && <section><h2>About</h2><p>{student.bio}</p></section>}
        {skills.length > 0 && <section><h2>Skills</h2><div className="member-profile__tags">{skills.map((skill) => <span key={skill.id}>{skill.name}</span>)}</div></section>}
        {evidence.length > 0 && <section><h2>Skill evidence</h2><ul className="member-profile__evidence">{evidence.map((group) => <li key={group.skillId}>
          <strong>{group.name}</strong> <small>{group.sources.map((source) => sourceNames[source] ?? source).join(' + ')}</small>
          <span>{group.items.slice(0, 3).map((item) => `${item.sourceRef}: ${item.evidence}`).join(' · ')}</span>
        </li>)}</ul></section>}
        {interests.length > 0 && <section><h2>Interests</h2><div className="member-profile__tags">{interests.map((interest) => <span key={interest}>{interest}</span>)}</div></section>}
      </div>
      <p className="member-profile__trust"><ShieldCheck />Email is shared inside accepted project teams.</p>
      {ownProfile && <Button to="/profile" variant="secondary">Edit your profile</Button>}
    </section>
  </AppShell>;
}
