// evidenceScoring.js
//
// Turns individual pieces of skill evidence into an explainable
// confidence and evidence class. Confidence answers "how strong is the
// evidence that this student has USED this technology?" - it is NOT a
// proficiency level. New skills use the app's default internal rating.
//
// Per-item confidence (fixed, documented weights):
//   manifest_dependency    0.60  declared in package.json / requirements.txt / ...
//   config_file            0.50  Dockerfile, workflow file, Kubernetes manifest
//   language_bytes         0.30 + 0.40 * share of the repository's code
//   repo_topic             0.40  topic chosen by the repository owner
//   readme_mention         0.20  named in the README only
//   linkedin_certification 0.50, linkedin_position 0.45, linkedin_project 0.40
//   linkedin_skill         0.30  listed under LinkedIn Skills (self-declared)
//   linkedin_summary       0.20  named in headline / summary
// GitHub items are multiplied by 0.5 for forks (the code may not be the
// student's) and by 0.8 when the repository was last pushed > 1 year ago.
//
// Per-skill confidence combines items with a noisy-OR,
//   1 - PRODUCT(1 - c_i), capped at 0.95,
// so independent evidence accumulates but never reaches certainty.

export const METHOD_CONFIDENCE = Object.freeze({
  manifest_dependency: 0.6,
  config_file: 0.5,
  repo_topic: 0.4,
  readme_mention: 0.2,
  linkedin_certification: 0.5,
  linkedin_position: 0.45,
  linkedin_project: 0.4,
  linkedin_skill: 0.3,
  linkedin_summary: 0.2
});

const MAX_CONFIDENCE = 0.95;
const FORK_FACTOR = 0.5;
const STALE_FACTOR = 0.8;
const STALE_AFTER_MS = 365 * 86_400_000;
const REPEATED_REPOSITORY_COUNT = 3;
const PROFESSIONAL_METHODS = new Set(['linkedin_position', 'linkedin_project', 'linkedin_certification']);

const round3 = (value) => Math.round(value * 1000) / 1000;

export function itemConfidence(method, { languageShare = 0, fork = false, pushedAt = null, now = Date.now() } = {}) {
  let confidence = method === 'language_bytes'
    ? 0.3 + 0.4 * Math.min(Math.max(languageShare, 0), 1)
    : METHOD_CONFIDENCE[method];
  if (!confidence) throw new Error(`Unknown detection method: ${method}`);
  if (fork) confidence *= FORK_FACTOR;
  if (pushedAt && now - new Date(pushedAt).getTime() > STALE_AFTER_MS) confidence *= STALE_FACTOR;
  return round3(confidence);
}

export function combineConfidence(confidences) {
  const missing = confidences.reduce((product, value) => product * (1 - Number(value)), 1);
  return round3(Math.min(MAX_CONFIDENCE, 1 - missing));
}

/**
 * Evidence class, strongest first:
 *   repeated_project_evidence  GitHub evidence in >= 3 different repositories
 *   github_detected            GitHub evidence in 1-2 repositories
 *   professional_experience    LinkedIn position / project / certification
 *   self_declared              only self-listed (LinkedIn Skills, summary)
 */
export function classifyEvidence(items) {
  const repositories = new Set(items.filter((item) => item.source === 'github').map((item) => item.sourceRef));
  if (repositories.size >= REPEATED_REPOSITORY_COUNT) return 'repeated_project_evidence';
  if (repositories.size > 0) return 'github_detected';
  if (items.some((item) => PROFESSIONAL_METHODS.has(item.detectionMethod))) return 'professional_experience';
  return 'self_declared';
}

/**
 * Groups evidence rows by skill. Rows without a dictionary skill are kept
 * under their raw name so the student can see what was detected but is
 * not (yet) a SyncSpace skill.
 */
export function summarizeEvidence(items) {
  const groups = new Map();
  for (const item of items) {
    const key = item.skillId ? `skill:${item.skillId}` : `raw:${item.rawName.toLowerCase()}`;
    if (!groups.has(key)) {
      groups.set(key, { skillId: item.skillId ?? null, name: item.skillName ?? item.rawName, items: [] });
    }
    groups.get(key).items.push(item);
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      confidence: combineConfidence(group.items.map((item) => item.confidence)),
      evidenceClass: classifyEvidence(group.items),
      sources: [...new Set(group.items.map((item) => item.source))],
      repositoryCount: new Set(group.items.filter((item) => item.source === 'github').map((item) => item.sourceRef)).size
    }))
    .sort((a, b) => b.confidence - a.confidence || a.name.localeCompare(b.name));
}
