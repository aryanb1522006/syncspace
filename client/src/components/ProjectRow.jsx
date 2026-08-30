import { ChevronDown, Leaf, ShoppingCart, GraduationCap } from 'lucide-react';
import { useState } from 'react';
import { Button } from './Button.jsx';
import { MatchBreakdown } from './MatchBreakdown.jsx';
import { SimilarProjects } from './SimilarProjects.jsx';

const icons = { 'Climate Tech': Leaf, 'EdTech': GraduationCap, 'Civic Tech': ShoppingCart };

export function ProjectRow({ project, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = icons[project.domain] ?? Leaf;
  const date = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(new Date(project.deadline));
  const recommendation = project.recommendation;
  const description = recommendation?.summary || project.description;
  // Prefer the new combined score when available so the ring reflects the
  // skill-overlap + semantic-similarity blend; fall back to the existing
  // match score for any project the combined score couldn't be computed for.
  const displayScore = recommendation?.finalScore ?? project.match.score;
  return <article className={`project-row project-row--${project.domain.toLowerCase().replace(/\s/g, '-')} ${open ? 'is-open' : ''}`}>
    <div className="project-row__summary">
      <div className="project-emblem"><Icon /></div>
      <div className="project-row__identity">
        <h2>{project.title}</h2><span className="tag">{project.domain}</span>
        <p>{description}</p>
        <div className="skills"><span>Required skills</span>{project.skills.filter((skill) => skill.importance === 'required').map((skill) => <b key={skill.id}>{skill.name}</b>)}</div>
        {recommendation?.relatedSkills?.length > 0 && <div className="skills skills--related">
          <span>Related to skills you have</span>
          {recommendation.relatedSkills.map((skill) => <b key={skill.skillId} title={`${Math.round(skill.similarity * 100)}% similar to ${skill.relatedTo}`}>{skill.name}</b>)}
        </div>}
      </div>
      <div className="score-ring" style={{ '--score': `${displayScore * 3.6}deg` }}><strong>{displayScore}%</strong><span>match</span></div>
      <dl><div><dt>{project.memberCount} of {project.teamSize}</dt><dd>team</dd></div><div><dt>{date}</dt><dd>deadline</dd></div></dl>
      <Button to={`/projects/${project.id}`} variant={project.domain === 'Climate Tech' ? 'primary' : project.domain === 'EdTech' ? 'lavender' : 'coral'}>View project</Button>
      <button className="chevron" onClick={() => setOpen((value) => !value)} aria-label={`${open ? 'Hide' : 'Show'} match breakdown`} aria-expanded={open}><ChevronDown /></button>
    </div>
    {open && <>
      <MatchBreakdown match={project.match} domain={project.domain} recommendation={recommendation} />
      {project.similarProjects?.length > 0 && <SimilarProjects similarProjects={project.similarProjects} />}
    </>}
  </article>;
}
