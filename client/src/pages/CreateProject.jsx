import { ArrowLeft, Check, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/resources.js';
import { AppShell } from '../components/AppShell.jsx';
import { Button } from '../components/Button.jsx';

const defaultDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const earliestDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export function CreateProject() {
  const [form, setForm] = useState({ title: '', description: '', domain: '', teamSize: 4, commitmentHoursPerWeek: 6, deadline: defaultDeadline });
  const [skills, setSkills] = useState([]);
  const [selected, setSelected] = useState({});
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { api.listSkills().then(({ skills: rows }) => setSkills(rows)).catch((reason) => setError(reason.message)); }, []);
  const visibleSkills = useMemo(() => skills.filter((skill) => skill.name.toLowerCase().includes(search.toLowerCase())).slice(0, 18), [skills, search]);
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const toggleSkill = (id) => setSelected((current) => {
    const next = { ...current };
    if (next[id]) delete next[id]; else next[id] = 'required';
    return next;
  });
  const setImportance = (id, importance) => setSelected((current) => ({ ...current, [id]: importance }));

  const submit = async (event) => {
    event.preventDefault(); setError('');
    const projectSkills = Object.entries(selected).map(([skillId, importance]) => ({ skillId: Number(skillId), importance }));
    if (projectSkills.length === 0) { setError('Select at least one required or preferred skill.'); return; }
    setBusy(true);
    try {
      const { project } = await api.createProject({
        ...form,
        teamSize: Number(form.teamSize),
        commitmentHoursPerWeek: Number(form.commitmentHoursPerWeek),
        deadline: new Date(`${form.deadline}T23:59:59`).toISOString(),
        skills: projectSkills
      });
      navigate(`/projects/${project.id}/applications`, { replace: true, state: { created: true } });
    } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  };

  return <AppShell>
    <Link className="back-link app-back" to="/dashboard"><ArrowLeft />My projects</Link>
    <header className="page-header"><div><span className="eyebrow">New project</span><h1>Give students a clear reason to join</h1><p>A focused brief and realistic commitment attract stronger applications.</p></div></header>
    <form className="project-form" onSubmit={submit}>
      <section><h2>Project brief</h2><div className="form-grid"><label>Project name<input value={form.title} onChange={update('title')} minLength="3" maxLength="120" required /></label><label>Domain<input value={form.domain} onChange={update('domain')} placeholder="Climate Tech, EdTech…" minLength="2" maxLength="80" required /></label></div><label>Description<textarea rows="6" value={form.description} onChange={update('description')} minLength="20" maxLength="4000" placeholder="What will the team build, who is it for, and what does success look like?" required /></label></section>
      <section><h2>Team shape</h2><div className="form-grid form-grid--three"><label>Team size<input type="number" min="2" max="20" value={form.teamSize} onChange={update('teamSize')} required /></label><label>Hours per week<input type="number" min="1" max="168" value={form.commitmentHoursPerWeek} onChange={update('commitmentHoursPerWeek')} required /></label><label>Application deadline<input type="date" min={earliestDeadline} value={form.deadline} onChange={update('deadline')} required /></label></div></section>
      <section><div className="section-title"><div><h2>Skills needed</h2><p>Choose at least one skill and mark how important it is.</p></div><label className="skill-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search skills" aria-label="Search skills" /></label></div><div className="skill-picker">{visibleSkills.map((skill) => <div className={selected[skill.id] ? 'is-selected' : ''} key={skill.id}><button type="button" onClick={() => toggleSkill(skill.id)}><span>{selected[skill.id] && <Check />}</span><b>{skill.name}</b><small>{skill.category}</small></button>{selected[skill.id] && <select aria-label={`${skill.name} importance`} value={selected[skill.id]} onChange={(event) => setImportance(skill.id, event.target.value)}><option value="required">Required</option><option value="preferred">Preferred</option></select>}</div>)}</div></section>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><Button type="button" variant="secondary" onClick={() => navigate('/dashboard')}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Publishing…' : 'Publish project'}</Button></div>
    </form>
  </AppShell>;
}
