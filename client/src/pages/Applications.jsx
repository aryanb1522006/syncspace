import { CheckCircle2, Clock3, RefreshCw, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/resources.js';
import { AppShell } from '../components/AppShell.jsx';
import { Button } from '../components/Button.jsx';

const statusIcon = { pending: Clock3, accepted: CheckCircle2, rejected: XCircle };

export function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(() => api.listApplications()
    .then(({ applications: rows }) => { setApplications(rows); setError(''); })
    .catch((reason) => setError(reason.message))
    .finally(() => setLoading(false)), []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 20_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return <AppShell>
    <header className="page-header"><div><h1>Your applications</h1><p>Live status from the project owners reviewing your requests.</p></div><Button variant="secondary" onClick={refresh}><RefreshCw />Refresh</Button></header>
    {loading ? <div className="loading">Loading your applications…</div> : error ? <div className="empty-panel"><h2>Applications could not be loaded</h2><p>{error}</p><Button onClick={refresh}>Try again</Button></div> : <div className="application-list">
      {applications.map((application) => {
        const Icon = statusIcon[application.status] ?? Clock3;
        const action = application.status === 'accepted' && application.teamId ? { to: `/team/${application.teamId}`, label: 'Open team' } : { to: `/projects/${application.projectId}`, label: 'View project' };
        return <article key={application.id}>
          <span className="project-emblem project-emblem--lavender">{application.title.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
          <div><h2>{application.title}</h2><p>{application.domain} · Applied {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(application.appliedAt))}</p></div>
          <span className={`status status--${application.status}`}><Icon />{application.status}</span>
          <Button to={action.to} variant={application.status === 'accepted' ? 'primary' : 'secondary'}>{action.label}</Button>
        </article>;
      })}
      {applications.length === 0 && <div className="empty-inline"><CheckCircle2 /><div><h3>No applications yet</h3><p>Apply to a project and its live status will appear here.</p></div><Button to="/dashboard">Discover projects</Button></div>}
    </div>}
  </AppShell>;
}
