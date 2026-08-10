import { ChevronRight, Clock3, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/resources.js';
import { AppShell } from '../components/AppShell.jsx';
import { NotificationMenu } from '../components/NotificationMenu.jsx';
import { ProjectRow } from '../components/ProjectRow.jsx';

function WeekRail() {
  return <><div className="rail-top"><NotificationMenu /><span className="avatar avatar--ink">IM</span></div><section><h2>Your week</h2><div className="week-time"><span><Clock3 /></span><strong>12h<small>available</small></strong></div></section><section><h3>Your applications</h3><button className="rail-row"><span className="avatar avatar--lavender">SC</span><span>StudyCircle · <em>Pending</em></span><ChevronRight /></button></section><section><h3>Finish your profile</h3><button className="rail-plain"><span>Add 2 skills</span><ChevronRight /></button><div className="profile-ring">IM</div></section></>;
}

export function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [domain, setDomain] = useState('All domains');
  const [sort, setSort] = useState('Best match');
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.recommendations().then(({ recommendations }) => setProjects(recommendations)).finally(() => setLoading(false)); }, []);
  const visible = useMemo(() => projects.filter((project) => domain === 'All domains' || project.domain === domain).toSorted((a, b) => sort === 'Best match' ? b.match.score - a.match.score : new Date(a.deadline) - new Date(b.deadline)), [projects, domain, sort]);
  return <AppShell rightRail={<WeekRail />}>
    <header className="page-header"><div><h1>Projects that fit how you build</h1><p>Ranked by skills, interests, and the time you have.</p></div></header>
    <div className="filters"><label><SlidersHorizontal /><select value={domain} onChange={(event) => setDomain(event.target.value)}><option>All domains</option><option>Climate Tech</option><option>EdTech</option><option>Civic Tech</option></select></label><label><Sparkles /><select><option>My skills</option><option>All skills</option></select></label><label><span className="sort-icon">↕</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option>Best match</option><option>Deadline</option></select></label></div>
    <div className="project-list">{loading ? <div className="loading">Finding your strongest matches…</div> : visible.map((project, index) => <ProjectRow key={project.id} project={project} defaultOpen={index === 0} />)}</div>
  </AppShell>;
}
