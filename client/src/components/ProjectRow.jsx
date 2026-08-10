import { ChevronDown, Leaf, ShoppingCart, GraduationCap } from 'lucide-react';
import { useState } from 'react';
import { Button } from './Button.jsx';
import { MatchBreakdown } from './MatchBreakdown.jsx';

const icons = { 'Climate Tech': Leaf, 'EdTech': GraduationCap, 'Civic Tech': ShoppingCart };

export function ProjectRow({ project, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = icons[project.domain] ?? Leaf;
  const date = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(new Date(project.deadline));
  return <article className={`project-row project-row--${project.domain.toLowerCase().replace(/\s/g, '-')} ${open ? 'is-open' : ''}`}>
    <div className="project-row__summary">
      <div className="project-emblem"><Icon /></div>
      <div className="project-row__identity">
        <h2>{project.title}</h2><span className="tag">{project.domain}</span>
        <p>{project.description}</p>
        <div className="skills"><span>Required skills</span>{project.skills.filter((skill) => skill.importance === 'required').map((skill) => <b key={skill.id}>{skill.name}</b>)}</div>
      </div>
      <div className="score-ring" style={{ '--score': `${project.match.score * 3.6}deg` }}><strong>{project.match.score}%</strong><span>match</span></div>
      <dl><div><dt>{project.memberCount} of {project.teamSize}</dt><dd>team</dd></div><div><dt>{date}</dt><dd>deadline</dd></div></dl>
      <Button to={`/projects/${project.id}`} variant={project.domain === 'Climate Tech' ? 'primary' : project.domain === 'EdTech' ? 'lavender' : 'coral'}>View project</Button>
      <button className="chevron" onClick={() => setOpen((value) => !value)} aria-label={`${open ? 'Hide' : 'Show'} match breakdown`} aria-expanded={open}><ChevronDown /></button>
    </div>
    {open && <MatchBreakdown match={project.match} domain={project.domain} />}
  </article>;
}
