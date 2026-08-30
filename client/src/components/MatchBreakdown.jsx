import { Clock3, Code2, Leaf, Sparkles, Star } from 'lucide-react';

const rows = [
  ['Required skills', 'requiredSkills', 50, Code2],
  ['Preferred skills', 'preferredSkills', 20, Star],
  ['Climate Tech interest', 'domainInterest', 15, Leaf],
  ['Availability', 'availability', 15, Clock3]
];

export function MatchBreakdown({ match, domain = 'Domain', recommendation }) {
  const values = match?.breakdown?.contributions ?? {};
  return <div className="breakdown">
    <h3>Why this match</h3>
    {rows.map(([label, key, max, Icon]) => {
      const value = values[key] ?? 0;
      return <div className="breakdown__row" key={key}>
        <span className="breakdown__icon"><Icon /></span>
        <span>{key === 'domainInterest' ? `${domain} interest` : label}</span>
        <span className="bar"><i style={{ width: `${Math.min(value / max * 100, 100)}%` }} /></span>
        <strong>{value}/{max}</strong>
      </div>;
    })}
    {recommendation && <>
      <h3>Semantic match</h3>
      <div className="breakdown__row">
        <span className="breakdown__icon"><Code2 /></span>
        <span>Skill overlap score</span>
        <span className="bar"><i style={{ width: `${recommendation.skillScore}%` }} /></span>
        <strong>{recommendation.skillScore}/100</strong>
      </div>
      <div className="breakdown__row">
        <span className="breakdown__icon"><Sparkles /></span>
        <span>Profile-description similarity</span>
        <span className="bar"><i style={{ width: `${recommendation.cosineScore}%` }} /></span>
        <strong>{recommendation.cosineScore}/100</strong>
      </div>
      {recommendation.matchedSkills?.length > 0 && <p className="breakdown__note">Matched skills: {recommendation.matchedSkills.map((skill) => skill.name).join(', ')}</p>}
      {recommendation.relatedSkills?.length > 0 && <p className="breakdown__note">Semantically related: {recommendation.relatedSkills.map((skill) => skill.name).join(', ')}</p>}
    </>}
  </div>;
}
