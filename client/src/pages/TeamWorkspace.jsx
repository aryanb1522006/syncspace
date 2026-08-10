import { ArrowLeft, BarChart3, Check, Circle, Code2, Hexagon, PencilRuler, Plus, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/resources.js';
import { AppShell } from '../components/AppShell.jsx';
import { Button } from '../components/Button.jsx';
import { Modal } from '../components/Modal.jsx';

const columns = [['todo', 'To do'], ['in_progress', 'In progress'], ['done', 'Done']];
const nextStatus = { todo: 'in_progress', in_progress: 'done', done: 'todo' };

function TeamRail({ tasks }) {
  const done = tasks.filter((task) => task.status === 'done').length;
  return <><section><h2>Team focus</h2><p>Complete the first live data loop</p><div className="task-progress"><span style={{ '--progress': `${done / Math.max(tasks.length, 1) * 360}deg` }} /><strong>{done} of {tasks.length}<small>tasks</small></strong></div></section><section><h3>Skill coverage</h3><div className="coverage"><div><span><Code2 />React</span><b>Covered</b></div><div><span><Hexagon />Node.js</span><b className="gap">Gap</b></div><div><span><PencilRuler />UI/UX</span><b>Covered</b></div><div><span><BarChart3 />Data Science</span><b>Covered</b></div></div></section><Button to="/dashboard">Find a teammate</Button></>;
}

export function TeamWorkspace() {
  const { id } = useParams(); const [team, setTeam] = useState(null); const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ title: '', assignedTo: '', dueDate: '' });
  const refresh = () => api.getTeam(id).then(({ team: value }) => setTeam(value));
  useEffect(() => { refresh(); }, [id]);
  const grouped = useMemo(() => Object.fromEntries(columns.map(([key]) => [key, team?.tasks.filter((task) => task.status === key) ?? []])), [team]);
  const move = async (task) => { await api.updateTask(task.id, { status: nextStatus[task.status] }); refresh(); };
  const add = async (event) => { event.preventDefault(); await api.createTask(id, { title: draft.title, assignedTo: draft.assignedTo ? Number(draft.assignedTo) : null, dueDate: draft.dueDate || null }); setAdding(false); setDraft({ title: '', assignedTo: '', dueDate: '' }); refresh(); };
  if (!team) return <AppShell><div className="loading">Opening the workspace…</div></AppShell>;
  return <AppShell className="workspace-shell" rightRail={<TeamRail tasks={team.tasks} />}>
    <Link className="back-link app-back" to="/dashboard"><ArrowLeft />My team</Link>
    <header className="workspace-head"><div><h1>{team.project_title} workspace</h1><p><i />Team forming · {team.members.length} of 4</p></div><Button to={`/projects/${team.project_id}`}>View project</Button></header>
    <div className="members-strip">{team.members.map((member, index) => <div className="member" key={member.id}><span className={`avatar ${index ? 'avatar--lavender' : 'avatar--mint'}`}>{member.initials ?? member.name.split(' ').map((part) => part[0]).join('')}</span><span><strong>{member.name}</strong><small>{member.role_label}</small></span></div>)}<div className="member member--open"><span><UserRound /></span><strong>2 spots open</strong></div></div>
    <div className="board-title"><h2>This week</h2><Button variant="secondary" onClick={() => setAdding(true)}><Plus />Add task</Button></div>
    <div className="task-board">{columns.map(([status, label]) => <section className={`task-column task-column--${status}`} key={status}><h3>{label} · {grouped[status].length}</h3>{grouped[status].map((task) => <article className="task" key={task.id}><button onClick={() => move(task)} aria-label={`Move ${task.title} to ${nextStatus[task.status]}`}>{task.status === 'done' ? <Check /> : <Circle />}</button><div><h4>{task.title}</h4><div><span className={`mini-avatar ${task.assigned_to ? '' : 'unassigned'}`}>{task.assigned_to ? task.assignee_name.split(' ').map((part) => part[0]).join('') : <UserRound />}</span><span>{task.assignee_name ?? 'Unassigned'}</span><time>{task.due_date ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(task.due_date)) : '—'}</time></div></div></article>)}</section>)}</div>
    {adding && <Modal title="Add a task" onClose={() => setAdding(false)}><form className="modal-form" onSubmit={add}><label>Task title<input autoFocus value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required /></label><label>Assign to<select value={draft.assignedTo} onChange={(e) => setDraft({ ...draft, assignedTo: e.target.value })}><option value="">Unassigned</option>{team.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><label>Due date<input type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} /></label><div><Button type="button" variant="secondary" onClick={() => setAdding(false)}>Cancel</Button><Button type="submit">Add task</Button></div></form></Modal>}
  </AppShell>;
}
