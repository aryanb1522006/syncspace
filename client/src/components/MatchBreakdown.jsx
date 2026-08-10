import { Clock3, Code2, Leaf, Star } from 'lucide-react';

const rows = [
  ['Required skills', 'requiredSkills', 50, Code2],
  ['Preferred skills', 'preferredSkills', 20, Star],
  ['Climate Tech interest', 'domainInterest', 15, Leaf],
  ['Availability', 'availability', 15, Clock3]
];

export function MatchBreakdown({ match, domain = 'Domain' }) {
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
  </div>;
}
