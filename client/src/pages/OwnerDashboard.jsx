import { ArrowRight, BriefcaseBusiness, Clock3, Pencil, Trash2, UsersRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/resources.js';
import { AppShell } from '../components/AppShell.jsx';
import { Button } from '../components/Button.jsx';
import { Modal } from '../components/Modal.jsx';
import { NotificationMenu } from '../components/NotificationMenu.jsx';

function OwnerRail({ projects }) {
  const pending = projects.reduce((total, project) => total + Number(project.pendingApplicationCount ?? 0), 0);
  const members = projects.reduce((total, project) => total + Number(project.memberCount ?? 0), 0);
  return <>
    <div className="rail-top"><NotificationMenu /></div>
    <section><h2>Owner overview</h2><p>Applications refresh automatically while this page is open.</p></section>
    <section className="owner-rail-stats"><div><strong>{projects.length}</strong><span>projects</span></div><div><strong>{pending}</strong><span>pending</span></div><div><strong>{members}</strong><span>members</span></div></section>
  </>;
}

export function OwnerDashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const refresh = useCallback(() => api.listProjects('?mine=true')
    .then(({ projects: rows }) => { setProjects(rows); setError(''); })
    .catch((reason) => setError(reason.message))
    .finally(() => setLoading(false)), []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 20_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const pending = useMemo(() => projects.reduce((total, project) => total + Number(project.pendingApplicationCount ?? 0), 0), [projects]);

  const removeProject = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError('');
    try {
      await api.deleteProject(deleteTarget.id);
      setProjects((current) => current.filter((project) => Number(project.id) !== Number(deleteTarget.id)));
      setDeleteTarget(null);
    } catch (reason) {
      setActionError(reason.message);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return <AppShell rightRail={<OwnerRail projects={projects} />}>
    <header className="page-header"><div><span className="eyebrow">Projects you lead</span><h1>Build the right team</h1><p>Create projects, review live applications, and move accepted students into a workspace.</p></div><Button to="/projects/new">Create project</Button></header>
    <div className="owner-summary"><article><BriefcaseBusiness /><strong>{projects.length}</strong><span>projects</span></article><article><Clock3 /><strong>{pending}</strong><span>awaiting review</span></article><article><UsersRound /><strong>{projects.reduce((total, project) => total + Number(project.memberCount ?? 0), 0)}</strong><span>team members</span></article></div>
    {actionError && <p className="form-error" role="alert">{actionError}</p>}
    {loading ? <div className="loading">Loading your projects…</div> : error ? <div className="empty-panel"><h2>Projects could not be loaded</h2><p>{error}</p><Button onClick={refresh}>Try again</Button></div> : <div className="owner-project-list">
      {projects.map((project) => <article className="owner-project-card" key={project.id}>
        <div className="owner-project-card__top"><div><span className="tag">{project.domain}</span><h2>{project.title}</h2><p>{project.description}</p></div><span className={`status status--${project.status}`}>{project.status}</span></div>
        <div className="owner-project-card__metrics"><span><strong>{project.pendingApplicationCount ?? 0}</strong> pending applications</span><span><strong>{project.memberCount ?? 0} of {project.teamSize}</strong> members</span><span><strong>{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(project.deadline))}</strong> deadline</span></div>
        <div className="owner-project-card__actions"><Button to={`/projects/${project.id}/edit`} variant="secondary"><Pencil />Edit</Button><Button type="button" variant="danger" aria-label={`Delete ${project.title}`} onClick={() => setDeleteTarget(project)}><Trash2 />Delete</Button><Button to={`/projects/${project.id}`} variant="secondary">Project & queries</Button><Button to={`/projects/${project.id}/applications`}>Review applications <ArrowRight /></Button></div>
      </article>)}
      {projects.length === 0 && <div className="empty-panel"><BriefcaseBusiness /><h2>Publish your first project</h2><p>Add the brief, commitment, deadline, and skills students should bring.</p><Button to="/projects/new">Create project</Button></div>}
    </div>}
    {deleteTarget && <Modal title={`Delete ${deleteTarget.title}?`} onClose={() => !deleting && setDeleteTarget(null)}><div className="delete-confirmation"><p>This permanently removes the project, its applications, and its team workspace.</p><p className="delete-confirmation__warning">This action cannot be undone.</p><div className="delete-confirmation__actions"><Button type="button" variant="secondary" disabled={deleting} onClick={() => setDeleteTarget(null)}>Cancel</Button><Button type="button" variant="danger" disabled={deleting} onClick={removeProject}>{deleting ? 'Deleting...' : 'Delete project'}</Button></div></div></Modal>}
  </AppShell>;
}
