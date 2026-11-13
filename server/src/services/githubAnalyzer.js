// githubAnalyzer.js
//
// Pure analysis of PUBLIC GitHub repository data (already fetched by
// githubClient.js) into skill evidence. No network access here, so every
// rule is unit-testable with fixtures.
//
// Evidence sources per repository, strongest first:
//   manifest_dependency  package.json, requirements.txt, pyproject.toml, pom.xml
//   config_file          Dockerfile / compose file, .github/workflows/*.yml,
//                        Kubernetes manifests (k8s/, kubernetes/, helm/, Chart.yaml)
//   language_bytes       GitHub's language breakdown (>= 5% of the code)
//   repo_topic           topics the owner tagged the repository with
//   readme_mention       technology named in the README
// A language or dependency only shows the technology was USED in that
// repository; it is never treated as proof of proficiency.

import { itemConfidence } from './evidenceScoring.js';
import { createSkillResolver, proseDictionary } from './skillNormalization.js';
import { extractSkills } from './skillExtraction.js';

const MIN_LANGUAGE_SHARE = 0.05;
const MAX_PROFILE_TEXT = 4000;
// Build/tooling "languages" that say nothing about a student's skills, or
// that are detected more reliably as config files.
const IGNORED_LANGUAGES = new Set([
  'shell', 'powershell', 'batchfile', 'makefile', 'dockerfile', 'procfile', 'cmake', 'jupyter notebook', 'roff'
]);
const DOCKER_FILES = new Set(['dockerfile', 'docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml']);
const KUBERNETES_ENTRIES = new Set(['k8s', 'kubernetes', 'helm', 'chart.yaml']);

export const MANIFEST_FILES = Object.freeze(['package.json', 'requirements.txt', 'pyproject.toml', 'pom.xml']);

const clip = (value, length) => String(value).slice(0, length);

export function parsePackageJson(text) {
  try {
    const manifest = JSON.parse(text);
    return [...new Set(['dependencies', 'devDependencies', 'peerDependencies']
      .flatMap((section) => Object.keys(manifest?.[section] ?? {})))];
  } catch {
    return [];
  }
}

// PEP 508 requirement -> distribution name ("Django>=4.2; python_version > '3'" -> "django").
const requirementName = (line) => line.trim().split(/[\s<>=!~;[\]@]/)[0].toLowerCase();

export function parseRequirementsTxt(text) {
  return [...new Set(String(text).split(/\r?\n/)
    .map((line) => line.replace(/#.*/, '').trim())
    .filter((line) => line && !line.startsWith('-'))
    .map(requirementName)
    .filter(Boolean))];
}

/**
 * Reads dependency names from the PEP 621 `dependencies = [...]` /
 * `optional-dependencies` arrays and from `[tool.poetry.*dependencies]`
 * tables. A small section-aware scan, not a full TOML parser.
 */
export function parsePyprojectToml(text) {
  const names = new Set();
  let section = '';
  let inArray = false;
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, '').trim();
    if (!line) continue;
    const header = line.match(/^\[+([^\]]+)\]+$/);
    if (header) {
      section = header[1].trim();
      inArray = false;
      continue;
    }
    // [project] has other arrays (keywords, classifiers), so only its
    // `dependencies` key counts; every key of optional-dependencies does.
    const opensArray = section === 'project'
      ? /^dependencies\s*=\s*\[/.test(line)
      : section === 'project.optional-dependencies' && /^[A-Za-z0-9_.-]+\s*=\s*\[/.test(line);
    if (opensArray) inArray = true;
    if (inArray) {
      const value = opensArray ? line.slice(line.indexOf('[') + 1) : line;
      for (const [, quoted] of value.matchAll(/["']([^"']+)["']/g)) names.add(requirementName(quoted));
      // Extras such as "uvicorn[standard]" contain brackets inside quotes.
      if (value.replace(/["'][^"']*["']/g, '').includes(']')) inArray = false;
      continue;
    }
    if (/^tool\.poetry(\.group\.[^.]+)?\.(dev-)?dependencies$/.test(section)) {
      const key = line.match(/^([A-Za-z0-9_.-]+)\s*=/);
      if (key && key[1].toLowerCase() !== 'python') names.add(key[1].toLowerCase());
    }
  }
  names.delete('');
  return [...names];
}

export function parsePomXml(text) {
  const names = new Set();
  for (const [, block] of String(text).matchAll(/<dependency>([\s\S]*?)<\/dependency>/g)) {
    const groupId = block.match(/<groupId>\s*([^<]+?)\s*<\/groupId>/)?.[1];
    const artifactId = block.match(/<artifactId>\s*([^<]+?)\s*<\/artifactId>/)?.[1];
    if (!artifactId) continue;
    if (groupId) names.add(`${groupId}:${artifactId}`.toLowerCase());
    names.add(artifactId.toLowerCase());
    if (artifactId.startsWith('spring-boot-starter')) names.add('spring-boot');
  }
  return [...names];
}

const MANIFEST_PARSERS = {
  'package.json': parsePackageJson,
  'requirements.txt': parseRequirementsTxt,
  'pyproject.toml': parsePyprojectToml,
  'pom.xml': parsePomXml
};

/**
 * repositories: [{ fullName, description, topics, fork, private, pushedAt,
 *   size, languages: { Name: bytes }, rootEntries: [name], workflowFiles: [name],
 *   manifests: { 'package.json': text, ... }, readme: text | null }]
 * Returns { evidence, profileText, analyzedRepositories }.
 */
export function analyzeRepositories(repositories, dictionary, { now = Date.now() } = {}) {
  const resolve = createSkillResolver(dictionary);
  const prose = proseDictionary(dictionary);
  const evidence = new Map();
  const profileParts = [];
  let analyzedRepositories = 0;

  for (const repo of repositories) {
    // Never analyze private data, even if a broader token were supplied.
    if (repo.private || !repo.fullName) continue;
    const context = { fork: Boolean(repo.fork), pushedAt: repo.pushedAt, now };
    const forkNote = repo.fork ? ' (forked repository)' : '';

    const add = (rawName, method, text, options = {}) => {
      const skill = resolve(rawName);
      if (!skill && !options.keepUnknown) return;
      const key = `${repo.fullName}|${method}|${skill ? `id:${skill.id}` : `raw:${String(rawName).toLowerCase()}`}`;
      const confidence = itemConfidence(method, { ...context, languageShare: options.languageShare });
      const existing = evidence.get(key);
      if (existing && existing.confidence >= confidence) return;
      evidence.set(key, {
        skillId: skill ? Number(skill.id) : null,
        skillName: skill?.name ?? null,
        rawName: clip(skill?.name ?? rawName, 120),
        source: 'github',
        sourceRef: clip(repo.fullName, 300),
        evidence: clip(`${text}${forkNote}`, 500),
        detectionMethod: method,
        confidence
      });
    };

    // An empty repository (size 0, no languages) contributes nothing.
    if (!repo.size && !Object.keys(repo.languages ?? {}).length) continue;
    analyzedRepositories += 1;

    const languageEntries = Object.entries(repo.languages ?? {});
    const totalBytes = languageEntries.reduce((sum, [, bytes]) => sum + Number(bytes), 0);
    for (const [language, bytes] of languageEntries) {
      if (IGNORED_LANGUAGES.has(language.toLowerCase()) || !totalBytes) continue;
      const share = Number(bytes) / totalBytes;
      if (share < MIN_LANGUAGE_SHARE) continue;
      add(language, 'language_bytes', `${language} is ${Math.round(share * 100)}% of the code`, { languageShare: share, keepUnknown: true });
    }

    for (const [file, text] of Object.entries(repo.manifests ?? {})) {
      const parse = MANIFEST_PARSERS[file];
      if (!parse || typeof text !== 'string') continue;
      for (const dependency of parse(text)) add(dependency, 'manifest_dependency', `"${dependency}" is a dependency in ${file}`);
    }

    const rootEntries = (repo.rootEntries ?? []).map((entry) => String(entry).toLowerCase());
    const dockerFile = rootEntries.find((entry) => DOCKER_FILES.has(entry));
    if (dockerFile) add('docker', 'config_file', `${dockerFile} at the repository root`);
    const kubernetesEntry = rootEntries.find((entry) => KUBERNETES_ENTRIES.has(entry));
    if (kubernetesEntry) add('kubernetes', 'config_file', `Kubernetes configuration (${kubernetesEntry}) at the repository root`);
    const workflows = (repo.workflowFiles ?? []).filter((file) => /\.ya?ml$/i.test(file));
    if (workflows.length) add('github-actions', 'config_file', `${workflows.length} workflow file(s) in .github/workflows`);

    for (const topic of repo.topics ?? []) add(topic, 'repo_topic', `Repository topic "${topic}"`);

    if (repo.readme) {
      for (const match of extractSkills(String(repo.readme).slice(0, 50_000), prose)) {
        add(match.name, 'readme_mention', `Mentioned in the README ("${match.matchedAlias}")`);
      }
    }

    if (!repo.fork && (repo.description || repo.topics?.length)) {
      const name = repo.fullName.split('/')[1] ?? repo.fullName;
      const topics = repo.topics?.length ? ` Topics: ${repo.topics.join(', ')}.` : '';
      profileParts.push(`${name}: ${repo.description ?? ''}.${topics}`);
    }
  }

  return {
    evidence: [...evidence.values()],
    profileText: clip(profileParts.join(' '), MAX_PROFILE_TEXT),
    analyzedRepositories
  };
}
