import { ArrowLeft, Check, Circle, ExternalLink, Plus, RefreshCw, UserRound, UsersRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/resources.js';
import { AppShell } from '../components/AppShell.jsx';
import { Button } from '../components/Button.jsx';
import { Modal } from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const columns = [['todo', 'To do'], ['in_progress', 'In progress'], ['done', 'Done']];
const nextStatus = { todo: 'in_progress', in_progress: 'done', done: 'todo' };

function TeamRail({ team, isOwner }) {
  const done = team.tasks.filter((task) => task.status === 'done').length;
  const teamSize = team.teamSize ?? Math.max(team.members.length, 1);
  return <>
    <section><h2>Team progress</h2><p>{team.projectTitle ?? team.project_title}</p><div className="task-progress"><span style={{ '--progress': `${done / Math.max(team.tasks.length, 1) * 360}deg` }} /><strong>{done} of {team.tasks.length}<small>tasks complete</small></strong></div></section>
    <section><h3>Team formation</h3><div className="team-formation"><UsersRound /><strong>{team.members.length} of {teamSize}</strong><span>members joined</span></div></section>
    <Button to={isOwner ? `/projects/${team.projectId ?? team.project_id}/applications` : '/dashboard'}>{isOwner ? 'Review applications' : 'Discover projects'}</Button>
  </>;
}

export function TeamWorkspace() {
  const { id } = useParams();
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ title: '', assignedTo: '', dueDate: '' });
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const refreshInFlight = useRef(false);
  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    if (!silent) setSyncing(true);
    try {
      const { team: value } = await api.getTeam(id);
      setTeam(value);
      setLastUpdated(new Date());
      setError('');
    } catch (reason) {
      setError(reason.message);
    } finally {
      refreshInFlight.current = false;
      if (!silent) setSyncing(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh({ silent: true });
    };
    const timer = window.setInterval(refreshWhenVisible, 15_000);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [refresh]);
  const grouped = useMemo(() => Object.fromEntries(columns.map(([key]) => [key, team?.tasks.filter((task) => task.status === key) ?? []])), [team]);
  const move = async (task) => { try { await api.updateTask(task.id, { status: nextStatus[task.status] }); await refresh(); } catch (reason) { setError(reason.message); } };
  const add = async (event) => {
    event.preventDefault(); setError('');
    const input = { title: draft.title, assignedTo: draft.assignedTo ? Number(draft.assignedTo) : null, ...(draft.dueDate ? { dueDate: draft.dueDate } : {}) };
    try { await api.createTask(id, input); setAdding(false); setDraft({ title: '', assignedTo: '', dueDate: '' }); await refresh(); } catch (reason) { setError(reason.message); }
  };

  if (error && !team) return <AppShell><div className="empty-panel"><h2>Workspace could not be opened</h2><p>{error}</p><Button to="/teams">Back to teams</Button></div></AppShell>;
  if (!team) return <AppShell><div className="loading">Opening the workspace…</div></AppShell>;
  const projectId = team.projectId ?? team.project_id;
  const projectTitle = team.projectTitle ?? team.project_title;
  const projectStatus = team.projectStatus ?? team.project_status;
  const teamSize = team.teamSize ?? Math.max(team.members.length, 4);
  const openSpots = Math.max(teamSize - team.members.length, 0);
  const isOwner = Number(team.ownerId ?? team.owner_id) === Number(user?.id);
  const ownerName = team.ownerName ?? 'Project creator';
  const ownerInitials = ownerName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  const ownerUserId = team.ownerUserId ?? team.ownerId ?? team.owner_id;
  const ownerProfileId = team.ownerProfileId ?? team.owner_profile_id;
  const memberProfilePath = (member) => (member.userId ?? member.user_id)
    ? `/profiles/users/${member.userId ?? member.user_id}`
    : `/profiles/${member.profileId ?? member.id}`;

  return <AppShell className="workspace-shell" rightRail={<TeamRail team={team} isOwner={isOwner} />}>
    <Link className="back-link app-back" to="/teams"><ArrowLeft />My teams</Link>
    <header className="workspace-head"><div><h1>{projectTitle} workspace</h1><p><i />{projectStatus} · {team.members.length} of {teamSize}</p></div><Button to={`/projects/${projectId}`}>View project</Button></header>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="members-strip"><div className="member member--owner"><span className="avatar avatar--mint">{ownerInitials}</span><span><strong>{ownerName}</strong><small>Creator · {team.ownerEmail}</small></span></div>{team.members.map((member, index) => <div className="member" key={member.id}><span className={`avatar ${index % 2 ? 'avatar--lavender' : 'avatar--mint'}`}>{member.initials ?? member.name.split(' ').map((part) => part[0]).join('')}</span><span><strong>{member.name}</strong><small>{member.role_label || 'Collaborator'} · {member.email}</small></span></div>)}{openSpots > 0 && <div className="member member--open"><span><UserRound /></span><strong>{openSpots} {openSpots === 1 ? 'spot' : 'spots'} open</strong></div>}</div>
    <div className="member-profile-links" aria-label="Team member profiles">
      {(ownerUserId || ownerProfileId) && <Link to={ownerUserId ? `/profiles/users/${ownerUserId}` : `/profiles/${ownerProfileId}`}><ExternalLink />View {ownerName}'s profile</Link>}
      {team.members.map((member) => <Link key={member.profileId ?? member.id} to={memberProfilePath(member)}><ExternalLink />View {member.name}'s profile</Link>)}
    </div>
    <div className="board-title"><div><h2>This week</h2><p className="workspace-sync" aria-live="polite"><i />{syncing ? 'Syncing workspace…' : lastUpdated ? `Live updates · checked ${new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(lastUpdated)}` : 'Connecting live updates…'}</p></div><div className="board-title__actions"><Button variant="secondary" onClick={() => refresh()} disabled={syncing}><RefreshCw className={syncing ? 'is-spinning' : ''} />Refresh</Button><Button variant="secondary" onClick={() => setAdding(true)}><Plus />Add task</Button></div></div>
    <div className="task-board">{columns.map(([status, label]) => <section className={`task-column task-column--${status}`} key={status}><h3>{label} · {grouped[status].length}</h3>{grouped[status].map((task) => <article className="task" key={task.id}><button onClick={() => move(task)} aria-label={`Move ${task.title} to ${nextStatus[task.status]}`}>{task.status === 'done' ? <Check /> : <Circle />}</button><div><h4>{task.title}</h4><div><span className={`mini-avatar ${task.assigned_to ? '' : 'unassigned'}`}>{task.assigned_to ? task.assignee_name.split(' ').map((part) => part[0]).join('') : <UserRound />}</span><span>{task.assignee_name ?? 'Unassigned'}</span><time>{task.due_date ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(task.due_date)) : '—'}</time></div></div></article>)}</section>)}</div>
    {adding && <Modal title="Add a task" onClose={() => setAdding(false)}><form className="modal-form" onSubmit={add}><label>Task title<input autoFocus value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} minLength="2" required /></label><label>Assign to<select value={draft.assignedTo} onChange={(event) => setDraft((current) => ({ ...current, assignedTo: event.target.value }))}><option value="">Unassigned</option>{team.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><label>Due date<input type="date" value={draft.dueDate} onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))} /></label><div><Button type="button" variant="secondary" onClick={() => setAdding(false)}>Cancel</Button><Button type="submit">Add task</Button></div></form></Modal>}
  </AppShell>;
}
