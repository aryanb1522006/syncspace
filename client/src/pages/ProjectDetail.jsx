import { ArrowLeft, CalendarDays, Check, Clock3, Leaf, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/resources.js';
import { AppShell } from '../components/AppShell.jsx';
import { Button } from '../components/Button.jsx';
import { MatchBreakdown } from '../components/MatchBreakdown.jsx';

export function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.getProject(id).then(({ project: item }) => setProject(item)); }, [id]);
  const apply = async () => { setBusy(true); try { await api.apply(id); setMessage('Application sent. The project owner has been notified.'); } catch (error) { setMessage(error.message); } finally { setBusy(false); } };
  if (!project) return <AppShell><div className="loading">Loading project…</div></AppShell>;
  return <AppShell>
    <Link className="back-link app-back" to="/dashboard"><ArrowLeft />Discover</Link>
    <div className="project-detail__head"><div><span className="tag">{project.domain}</span><h1>{project.title}</h1><p>{project.description}</p></div><div className="score-ring score-ring--large" style={{ '--score': `${project.match.score * 3.6}deg` }}><strong>{project.match.score}%</strong><span>match</span></div></div>
    <div className="project-detail__layout"><div className="project-detail__main"><section><h2>What the team is building</h2><p>{project.longDescription ?? project.description}</p></section><section><h2>Skills this project needs</h2><div className="skill-requirements">{project.skills.map((skill) => <div key={skill.id}><span><Check />{skill.name}</span><small>{skill.importance}</small></div>)}</div></section><MatchBreakdown match={project.match} domain={project.domain} /></div>
      <aside className="project-detail__aside"><div className="project-icon"><Leaf /></div><dl><div><dt><UsersRound />Team</dt><dd>{project.memberCount} of {project.teamSize} spots filled</dd></div><div><dt><Clock3 />Commitment</dt><dd>{project.commitmentHoursPerWeek} hours per week</dd></div><div><dt><CalendarDays />Deadline</dt><dd>{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(project.deadline))}</dd></div></dl><p>Led by <strong>{project.owner_name}</strong></p><Button onClick={apply} disabled={busy || Boolean(message)}>{busy ? 'Sending…' : message ? 'Application sent' : 'Apply to join'}</Button>{message && <p className="success-message" role="status">{message}</p>}</aside>
    </div>
  </AppShell>;
}
