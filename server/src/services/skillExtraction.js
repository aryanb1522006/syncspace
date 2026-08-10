function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractSkills(resumeText, skillDictionary) {
  const normalized = resumeText.toLowerCase().replace(/[\u2013\u2014]/g, '-');
  const matches = [];

  for (const skill of skillDictionary) {
    const candidates = [skill.name, ...(skill.aliases ?? [])]
      .map((candidate) => candidate.trim().toLowerCase())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);

    const matchedAlias = candidates.find((candidate) => {
      const leadingBoundary = /^[a-z0-9]/i.test(candidate) ? '(^|[^a-z0-9+#.])' : '';
      const trailingBoundary = /[a-z0-9]$/i.test(candidate) ? '(?=$|[^a-z0-9+#.])' : '';
      const pattern = new RegExp(`${leadingBoundary}${escapeRegExp(candidate)}${trailingBoundary}`, 'i');
      return pattern.test(normalized);
    });

    if (matchedAlias) matches.push({ skillId: Number(skill.id), name: skill.name, matchedAlias });
  }

  return matches;
}
