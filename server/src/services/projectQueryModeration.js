const abusiveTerms = new Set([
  'asshole', 'bastard', 'bitch', 'bullshit', 'dumbass', 'fuck', 'fucker', 'fucking',
  'idiot', 'moron', 'retard', 'shit', 'stupid'
]);

const projectTerms = new Set([
  'application', 'apply', 'availability', 'build', 'collaborate', 'collaboration',
  'commitment', 'contribute', 'contribution', 'deadline', 'deliverable', 'design',
  'development', 'expectation', 'goal', 'join', 'member', 'meeting', 'milestone',
  'project', 'requirement', 'responsibility', 'roadmap', 'role', 'skill', 'stack',
  'task', 'team', 'technology', 'timeline', 'tool', 'work'
]);

const leetMap = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't' };

function normalizedTokens(value) {
  const normalized = String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\$/g, 's')
    .replace(/[013457]/g, (character) => leetMap[character] ?? character)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return normalized ? normalized.split(/\s+/) : [];
}

function contextTerms(project) {
  const skills = Array.isArray(project?.skills) ? project.skills.map((skill) => skill.name) : [];
  return new Set(normalizedTokens([
    project?.title,
    project?.domain,
    project?.description,
    ...skills
  ].filter(Boolean).join(' ')).filter((token) => token.length >= 3));
}

export function moderateProjectQuery(value, project, { response = false } = {}) {
  const text = String(value ?? '').trim();
  const tokens = normalizedTokens(text);
  const compact = tokens.join('');

  const abusive = [...abusiveTerms].find((term) => tokens.includes(term) || compact.includes(term));
  if (abusive) {
    return {
      allowed: false,
      code: 'abusive_language',
      message: 'Please rewrite this without abusive or insulting language.'
    };
  }

  const links = text.match(/https?:\/\/|www\./gi) ?? [];
  const repeatedCharacter = /(.)\1{7,}/i.test(text);
  const letterCharacters = text.match(/[a-z]/gi) ?? [];
  const uppercaseCharacters = text.match(/[A-Z]/g) ?? [];
  const mostlyUppercase = letterCharacters.length >= 20 && uppercaseCharacters.length / letterCharacters.length > 0.75;
  if (links.length > 1 || repeatedCharacter || mostlyUppercase) {
    return {
      allowed: false,
      code: 'spam',
      message: 'Please remove repeated text, excessive capitals, or promotional links.'
    };
  }

  if (!response) {
    const relevantTerms = new Set([...projectTerms, ...contextTerms(project)]);
    const relevant = tokens.some((token) => relevantTerms.has(token));
    if (!relevant) {
      return {
        allowed: false,
        code: 'off_topic',
        message: 'Keep the query related to this project, its skills, timeline, or team requirements.'
      };
    }
  }

  return { allowed: true, code: 'approved' };
}
