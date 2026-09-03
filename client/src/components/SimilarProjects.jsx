import { GitCompare } from 'lucide-react';

function formatDeadline(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// Shows projects whose descriptions are highly similar to this one. These
// are intentionally NOT labelled "duplicates" - a similar description can
// still describe a genuinely different, valid project - so we surface the
// structured differences (technologies, skills, domain, focus, project
// lead, team composition, and timeline) instead.
export function SimilarProjects({ similarProjects = [] }) {
  if (!similarProjects.length) return null;
  return <div className="similar-projects">
    <h3><GitCompare size={16} /> Similar projects</h3>
    {similarProjects.map((item) => {
      const { onlyInFirst, onlyInSecond, shared } = item.differences?.technologies ?? {};
      const { lead, teamComposition, timeline } = item.differences ?? {};
      const secondDeadline = formatDeadline(timeline?.second);
      return <div className="similar-projects__item" key={item.projectId}>
        <div className="similar-projects__header">
          <strong>{item.title}</strong>
          <span className="tag tag--muted">{Math.round(item.similarityScore * 100)}% similar</span>
        </div>
        {item.differences?.domain && !item.differences.domain.same && <p>Different domain: {item.differences.domain.first} vs {item.differences.domain.second}</p>}
        {onlyInSecond?.length > 0 && <p>Uses different technologies: {onlyInSecond.join(', ')}</p>}
        {onlyInFirst?.length > 0 && <p>This project uniquely uses: {onlyInFirst.join(', ')}</p>}
        {shared?.length > 0 && <p className="similar-projects__shared">Shared skills: {shared.join(', ')}</p>}
        {lead && !lead.same && lead.second && <p>Led by {lead.second}</p>}
        {teamComposition && !teamComposition.same && <p>Team size: {teamComposition.second.teamSize ?? '?'} (this one has {teamComposition.first.teamSize ?? '?'})</p>}
        {timeline && !timeline.same && secondDeadline && <p>Deadline: {secondDeadline}{timeline.daysApart != null ? ` (${timeline.daysApart} days apart)` : ''}</p>}
      </div>;
    })}
  </div>;
}
