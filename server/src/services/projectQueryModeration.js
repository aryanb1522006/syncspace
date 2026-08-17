const abusiveTerms = new Set([
  'asshole', 'bastard', 'bitch', 'bullshit', 'dumbass', 'fuck', 'fucker', 'fucking',
  'idiot', 'moron', 'retard', 'shit', 'stupid'
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

export function moderateProjectQuery(value) {
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

  return { allowed: true, code: 'approved' };
}
