import { Search, ShieldCheck, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/resources.js';
import { AppShell } from '../components/AppShell.jsx';
import { Button } from '../components/Button.jsx';
import { Modal } from '../components/Modal.jsx';
import { NotificationMenu } from '../components/NotificationMenu.jsx';

const formatDate = (value) => new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric'
}).format(new Date(value));

function AdminActivity({ audit }) {
  return <>
    <div className="rail-top"><NotificationMenu /></div>
    <section className="admin-activity"><h2>Recent admin activity</h2>
      {audit.length === 0 ? <p>No administrative actions recorded yet.</p> : audit.slice(0, 8).map((entry) => <article key={entry.id}>
        <Trash2 /><div><strong>Deleted project</strong><span>{entry.metadata?.title ?? `Project ${entry.targetId}`}</span><small>{entry.adminEmail ?? 'Administrator'} - {formatDate(entry.createdAt)}</small><small>{entry.reason}</small></div>
      </article>)}
    </section>
  </>;
}

export function AdminProjects() {
  const [projects, setProjects] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [confirmation, setConfirmation] = useState('');
  const [reason, setReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [{ projects: projectRows }, { audit: auditRows }] = await Promise.all([
        api.adminProjects(), api.adminAudit()
      ]);
      setProjects(projectRows);
      setAudit(auditRows);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const visibleProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesStatus = status === 'all' || project.status === status;
      const matchesQuery = !query || [project.title, project.ownerName, project.ownerEmail, project.domain]
        .some((value) => String(value ?? '').toLowerCase().includes(query));
      return matchesStatus && matchesQuery;
    });
  }, [projects, search, status]);

  const pending = useMemo(() => projects.reduce(
    (total, project) => total + Number(project.pendingApplicationCount ?? 0), 0
  ), [projects]);
  const activeTeams = useMemo(() => projects.reduce(
    (total, project) => total + (Number(project.teamCount ?? 0) > 0 ? 1 : 0), 0
  ), [projects]);

  const closeDelete = () => {
    if (deleting) return;
    setDeleteTarget(null);
    setConfirmation('');
    setReason('');
  };

  const deleteProject = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError('');
    try {
      const result = await api.adminDeleteProject(deleteTarget.id, { confirmation, reason });
      setProjects((current) => current.filter((project) => Number(project.id) !== Number(deleteTarget.id)));
      setAudit((current) => [result.audit, ...current]);
      setDeleteTarget(null);
      setConfirmation('');
      setReason('');
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setDeleting(false);
    }
  };

  const confirmationReady = deleteTarget
    && confirmation === deleteTarget.title
    && reason.trim().length >= 8;

  return <AppShell className="admin-shell" rightRail={<AdminActivity audit={audit} />}>
    <header className="page-header admin-header"><div><h1>Project control</h1><p>Review every project in your college. All deletions are recorded.</p></div></header>
    <section className="admin-summary" aria-label="Project administration summary">
      <article><span>Total projects</span><strong>{projects.length}</strong></article>
      <article><span>Active teams</span><strong>{activeTeams}</strong></article>
      <article><span>Pending applications</span><strong>{pending}</strong></article>
    </section>
    <div className="admin-filters">
      <label className="admin-search"><Search /><input aria-label="Search projects or owners" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects" /></label>
      <label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All</option><option value="open">Open</option><option value="forming">Forming</option><option value="active">Active</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
      <Button variant="secondary" type="button" onClick={() => { setSearch(''); setStatus('all'); }}>Clear filters</Button>
    </div>
    {actionError && <p className="form-error" role="alert">{actionError}</p>}
    {loading ? <div className="loading">Loading project control...</div> : error ? <div className="empty-panel"><ShieldCheck /><h2>Admin projects could not be loaded</h2><p>{error}</p><Button onClick={refresh}>Try again</Button></div> : <section className="admin-projects" aria-label="Projects available for administration">
      <div className="admin-projects__head" aria-hidden="true"><span>Project title</span><span>Owner</span><span>Status</span><span>Created</span><span>Applications</span><span>Members</span><span>Actions</span></div>
      {visibleProjects.map((project) => <article className="admin-project-row" key={project.id}>
        <div className="admin-project-row__title"><strong>{project.title}</strong><small>{project.domain}</small></div>
        <div className="admin-project-row__owner"><strong>{project.ownerName}</strong><a href={`mailto:${project.ownerEmail}`}>{project.ownerEmail}</a></div>
        <span><span className={`status status--${project.status ?? 'open'}`}>{project.status ?? 'open'}</span></span>
        <time dateTime={project.createdAt}>{formatDate(project.createdAt)}</time>
        <span>{project.applicationCount ?? 0}</span>
        <span>{project.memberCount ?? 0}</span>
        <Button type="button" variant="danger" aria-label={`Admin delete ${project.title}`} onClick={() => { setDeleteTarget(project); setActionError(''); }}><Trash2 />Delete</Button>
      </article>)}
      {visibleProjects.length === 0 && <div className="admin-projects__empty">No projects match these filters.</div>}
    </section>}
    {deleteTarget && <Modal title="Delete project" onClose={closeDelete}><div className="admin-delete">
      <p>This permanently removes <strong>{deleteTarget.title}</strong>, its applications, team workspace and tasks. The action will be recorded.</p>
      <label>Type the project title to confirm<input autoFocus value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={deleteTarget.title} /></label>
      <label>Reason for deletion<textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength="8" maxLength="500" rows="4" placeholder="Explain why this project should be removed" /></label>
      {actionError && <p className="form-error" role="alert">{actionError}</p>}
      <div className="admin-delete__actions"><Button type="button" variant="secondary" disabled={deleting} onClick={closeDelete}>Cancel</Button><Button type="button" variant="danger" disabled={!confirmationReady || deleting} onClick={deleteProject}>{deleting ? 'Deleting...' : 'Delete permanently'}</Button></div>
    </div></Modal>}
  </AppShell>;
}
