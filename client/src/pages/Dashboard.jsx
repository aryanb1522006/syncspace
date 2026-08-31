import { ChevronRight, Clock3, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/resources.js';
import { AppShell } from '../components/AppShell.jsx';
import { NotificationMenu } from '../components/NotificationMenu.jsx';
import { ProjectRow } from '../components/ProjectRow.jsx';

function WeekRail({ profile, applications }) {
  const latest = applications[0];
  const initials = (profile?.name ?? 'Member').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  return <>
    <div className="rail-top"><NotificationMenu /><span className="avatar avatar--ink">{initials}</span></div>
    <section><h2>Your week</h2><div className="week-time"><span><Clock3 /></span><strong>{profile?.availability_hours_per_week ?? 0}h<small>available</small></strong></div></section>
    <section><h3>Your applications</h3>{latest ? <Link className="rail-row" to="/applications"><span className="avatar avatar--lavender">{latest.title.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><span>{latest.title} · <em>{latest.status}</em></span><ChevronRight /></Link> : <p>No applications yet.</p>}</section>
    <section><h3>Finish your profile</h3><Link className="rail-plain" to="/profile"><span>{profile?.skills?.length ? `${profile.skills.length} skills added` : 'Add your skills'}</span><ChevronRight /></Link><div className="profile-ring">{initials}</div></section>
  </>;
}

function StudentDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSkill = searchParams.get('skill')?.trim() ?? '';
  const [projects, setProjects] = useState([]);
  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [domain, setDomain] = useState('All domains');
  const [sort, setSort] = useState('Best match');
  const [skill, setSkill] = useState(requestedSkill);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.recommendations(), api.getMe(), api.listApplications()])
      .then(([projectResult, profileResult, applicationResult]) => {
        setProjects(projectResult.recommendations);
        setProfile(profileResult.student);
        setApplications(applicationResult.applications);
      })
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const domains = useMemo(() => ['All domains', ...new Set(projects.map((project) => project.domain))], [projects]);
  const visible = useMemo(() => [...projects]
    .filter((project) => domain === 'All domains' || project.domain === domain)
    .filter((project) => !skill.trim() || project.skills.some((item) => `${item.name} ${item.category ?? ''}`.toLowerCase().includes(skill.trim().toLowerCase())))
    .sort((a, b) => sort === 'Best match' ? (b.recommendation?.finalScore ?? b.match.score) - (a.recommendation?.finalScore ?? a.match.score) : new Date(a.deadline) - new Date(b.deadline)), [projects, domain, skill, sort]);

  const updateSkill = (event) => {
    const nextSkill = event.target.value;
    const nextParams = new URLSearchParams(searchParams);
    setSkill(nextSkill);
    if (nextSkill.trim()) nextParams.set('skill', nextSkill);
    else nextParams.delete('skill');
    setSearchParams(nextParams, { replace: true });
  };

  return <AppShell rightRail={<WeekRail profile={profile} applications={applications} />}>
    <header className="page-header"><div><h1>{skill ? `Projects using “${skill}”` : 'Projects that fit how you build'}</h1><p>Ranked by skills, interests, and the time you have.</p></div></header>
    <div className="filters">
      <label><SlidersHorizontal /><select value={domain} onChange={(event) => setDomain(event.target.value)}>{domains.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><Sparkles /><input aria-label="Filter by skill" value={skill} onChange={updateSkill} placeholder="Filter by skill" /></label>
      <label><span className="sort-icon">↕</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option>Best match</option><option>Deadline</option></select></label>
    </div>
    <div className="project-list">{loading ? <div className="loading">Finding your strongest matches…</div> : error ? <div className="empty-panel"><h2>Projects could not be loaded</h2><p>{error}</p></div> : visible.length ? visible.map((project, index) => <ProjectRow key={project.id} project={project} defaultOpen={index === 0} />) : <div className="empty-panel"><h2>{skill ? `No project exists with “${skill}” right now` : 'No new matches right now'}</h2><p>{skill ? 'Try another skill or clear the skill filter.' : 'Projects you already applied to move into Applications.'}</p></div>}</div>
  </AppShell>;
}

export function Dashboard() {
  return <StudentDashboard />;
}
