import { ArrowLeft, CalendarDays, Check, Clock3, Leaf, Mail, UserRound, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/resources.js';
import { AppShell } from '../components/AppShell.jsx';
import { Button } from '../components/Button.jsx';
import { MatchBreakdown } from '../components/MatchBreakdown.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [application, setApplication] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const load = Promise.all([api.getProject(id), api.listApplications(), api.recommendations().catch(() => ({ recommendations: [] }))]);
    load.then(([projectResult, applicationResult, recommendationResult]) => {
      if (!active) return;
      const match = recommendationResult.recommendations.find((item) => Number(item.id) === Number(id))?.match;
      setProject(match ? { ...projectResult.project, match } : projectResult.project);
      setApplication(applicationResult.applications.find((item) => Number(item.projectId) === Number(id)) ?? null);
    }).catch((reason) => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [id]);

  const apply = async () => {
    setBusy(true); setError('');
    try {
      const { application: created } = await api.apply(id);
      setApplication({ ...created, projectId: Number(id), status: created.status ?? 'pending' });
      setMessage('Application sent. The project owner has been notified.');
    } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  };

  if (error && !project) return <AppShell><div className="empty-panel"><h2>Project could not be loaded</h2><p>{error}</p><Button to="/dashboard">Back to dashboard</Button></div></AppShell>;
  if (!project) return <AppShell><div className="loading">Loading project…</div></AppShell>;

  const memberCount = project.memberCount ?? project.member_count ?? 0;
  const teamSize = project.teamSize ?? project.team_size;
  const commitment = project.commitmentHoursPerWeek ?? project.commitment_hours_per_week;
  const ownerId = project.ownerId ?? project.owner_id;
  const isOwner = Number(ownerId) === Number(user.id);
  const teamContacts = project.teamContacts ?? [];

  return <AppShell>
    <Link className="back-link app-back" to="/dashboard"><ArrowLeft />Discover</Link>
    <div className="project-detail__head"><div><span className="tag">{project.domain}</span><h1>{project.title}</h1><p>{project.description}</p></div>{project.match && <div className="score-ring score-ring--large" style={{ '--score': `${project.match.score * 3.6}deg` }}><strong>{project.match.score}%</strong><span>match</span></div>}</div>
    <div className="project-detail__layout"><div className="project-detail__main"><section><h2>What the team is building</h2><p>{project.longDescription ?? project.description}</p></section><section><h2>Skills this project needs</h2><div className="skill-requirements">{project.skills.map((skill) => <div key={skill.id}><span><Check />{skill.name}</span><small>{skill.importance}</small></div>)}</div></section>
        {teamContacts.length > 0 && <section className="project-contacts"><h2>Project contacts</h2><p>Available to the project creator and accepted collaborators.</p><div>{teamContacts.map((contact) => <article key={`${contact.profileId}-${contact.roleLabel}`}>
          <span className="avatar avatar--mint">{contact.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>
          <span><strong>{contact.name}</strong><small>{contact.roleLabel}</small><a href={`mailto:${contact.email}`}><Mail />{contact.email}</a></span>
          <Link to={contact.userId ? `/profiles/users/${contact.userId}` : `/profiles/${contact.profileId}`}><UserRound />View profile</Link>
        </article>)}</div></section>}
        {project.match && <MatchBreakdown match={project.match} domain={project.domain} />}</div>
      <aside className="project-detail__aside"><div className="project-icon"><Leaf /></div><dl><div><dt><UsersRound />Team</dt><dd>{memberCount} of {teamSize} spots filled</dd></div><div><dt><Clock3 />Commitment</dt><dd>{commitment} hours per week</dd></div><div><dt><CalendarDays />Deadline</dt><dd>{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(project.deadline))}</dd></div></dl><p>Led by <strong>{project.owner_name}</strong>{ownerId && <Link className="profile-inline-link" to={`/profiles/users/${ownerId}`}>View profile</Link>}</p>
        {isOwner ? <Button to={`/projects/${id}/applications`}>Review applications</Button> : application?.status === 'accepted' && application.teamId ? <Button to={`/team/${application.teamId}`}>Open team workspace</Button> : application ? <Button to="/applications" variant="secondary">Application {application.status}</Button> : <Button onClick={apply} disabled={busy}>{busy ? 'Sending…' : 'Apply to join'}</Button>}
        {message && <p className="success-message" role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}
      </aside>
    </div>
  </AppShell>;
}
