import { ArrowLeft, Check, CheckCircle2, Clock3, RefreshCw, UserRound, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../api/resources.js';
import { AppShell } from '../components/AppShell.jsx';
import { Button } from '../components/Button.jsx';

export function OwnerApplications() {
  const { id } = useParams();
  const location = useLocation();
  const [project, setProject] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingOn, setActingOn] = useState(null);

  const refresh = useCallback(() => Promise.all([api.getProject(id), api.projectApplications(id)])
    .then(([projectResult, applicationResult]) => { setProject(projectResult.project); setApplications(applicationResult.applications); setError(''); })
    .catch((reason) => setError(reason.message))
    .finally(() => setLoading(false)), [id]);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 15_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const decide = async (applicationId, status) => {
    setActingOn(applicationId); setError('');
    try {
      const { result } = await api.decideApplication(applicationId, status);
      setApplications((current) => current.map((application) => Number(application.id) === Number(applicationId) ? { ...application, status: result.status, teamId: result.teamId } : application));
    } catch (reason) { setError(reason.message); } finally { setActingOn(null); }
  };
  const pending = useMemo(() => applications.filter((application) => application.status === 'pending').length, [applications]);

  return <AppShell>
    <Link className="back-link app-back" to="/dashboard"><ArrowLeft />My projects</Link>
    <header className="page-header"><div><span className="eyebrow">Application inbox</span><h1>{project?.title ?? 'Project applications'}</h1><p>{pending} pending · {applications.length} total · refreshes every 15 seconds</p></div><Button variant="secondary" onClick={refresh}><RefreshCw />Refresh</Button></header>
    {location.state?.created && <div className="notice-banner"><CheckCircle2 /><span>Your project is live. New student applications will appear here.</span></div>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {loading ? <div className="loading">Opening the application inbox…</div> : <div className="candidate-list">
      {applications.map((application) => <article className="candidate-card" key={application.id}>
        <div className="candidate-card__identity"><span className="avatar avatar--mint">{application.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><div><h2>{application.name}</h2><p>{application.department || 'Department not set'}{application.year ? ` · Year ${application.year}` : ''}</p></div><span className={`status status--${application.status}`}>{application.status === 'pending' ? <Clock3 /> : application.status === 'accepted' ? <CheckCircle2 /> : <X />}{application.status}</span></div>
        <p className="candidate-card__bio">{application.bio || 'This student has not added a bio yet.'}</p>
        <div className="candidate-card__meta"><span><Clock3 />{application.availabilityHoursPerWeek ?? 0} hours available each week</span><div className="skills">{application.skills.map((skill) => <b key={skill.id}>{skill.name} · {skill.proficiency}/5</b>)}</div></div>
        <div className="candidate-card__actions">{application.status === 'pending' ? <><Button variant="secondary" disabled={actingOn === application.id} onClick={() => decide(application.id, 'rejected')}><X />Reject</Button><Button disabled={actingOn === application.id} onClick={() => decide(application.id, 'accepted')}><Check />Accept and add to team</Button></> : application.status === 'accepted' && application.teamId ? <Button to={`/team/${application.teamId}`}>Open team workspace</Button> : <span className="decision-note">Decision recorded</span>}</div>
      </article>)}
      {applications.length === 0 && <div className="empty-panel"><UserRound /><h2>No applications yet</h2><p>Share the project with students. This inbox updates automatically as they apply.</p><Button to={`/projects/${id}`} variant="secondary">View public project page</Button></div>}
    </div>}
  </AppShell>;
}
