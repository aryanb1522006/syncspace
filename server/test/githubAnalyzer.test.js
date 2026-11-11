import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeRepositories,
  parsePackageJson,
  parsePomXml,
  parsePyprojectToml,
  parseRequirementsTxt
} from '../src/services/githubAnalyzer.js';
import { summarizeEvidence } from '../src/services/evidenceScoring.js';
import { dictionary } from '../test-fixtures/skillDictionary.js';

const NOW = Date.parse('2026-11-01T00:00:00Z');
const repo = (overrides) => ({
  fullName: 'asha/project', description: '', topics: [], fork: false, private: false,
  pushedAt: '2026-10-01T00:00:00Z', size: 120, languages: {}, rootEntries: [], workflowFiles: [],
  manifests: {}, readme: null, ...overrides
});
const names = (evidence) => [...new Set(evidence.map((item) => item.rawName))].sort();

test('manifest parsers read dependency names, not versions or comments', () => {
  assert.deepEqual(parsePackageJson('{"dependencies":{"react":"^19"},"devDependencies":{"typescript":"5"}}').sort(), ['react', 'typescript']);
  assert.deepEqual(parsePackageJson('{not json'), []);
  assert.deepEqual(parseRequirementsTxt('Django>=4.2  # web\n-r base.txt\nscikit-learn==1.5; python_version>"3.9"\n\nuvicorn[standard]'), ['django', 'scikit-learn', 'uvicorn']);
  assert.deepEqual(parsePyprojectToml([
    '[project]', 'keywords = ["ml", "react"]', 'dependencies = [', '  "fastapi>=0.110",', '  "uvicorn[standard]",', '  "torch",', ']',
    '[tool.poetry.dependencies]', 'python = "^3.11"', 'pandas = "^2.2"'
  ].join('\n')).sort(), ['fastapi', 'pandas', 'torch', 'uvicorn']);
  assert.ok(parsePomXml('<dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>').includes('spring-boot'));
});

test('multi-language repository: each language >= 5% of the code becomes evidence weighted by its share', () => {
  const { evidence } = analyzeRepositories([repo({ languages: { TypeScript: 6200, Python: 3500, Shell: 200, CSS: 100 } })], dictionary, { now: NOW });
  const languages = evidence.filter((item) => item.detectionMethod === 'language_bytes');
  assert.deepEqual(names(languages), ['Python', 'TypeScript']);
  const typescript = languages.find((item) => item.rawName === 'TypeScript');
  assert.equal(typescript.confidence, 0.548);
  assert.match(typescript.evidence, /62% of the code/);
});

test('dependencies, config files, topics and README mentions are all detected and normalized', () => {
  const { evidence, profileText } = analyzeRepositories([repo({
    fullName: 'asha/campus-api',
    description: 'Attendance API for campus labs',
    topics: ['machine-learning', 'hacktoberfest'],
    languages: { Python: 9000 },
    rootEntries: ['Dockerfile', 'k8s', '.github', 'requirements.txt'],
    workflowFiles: ['ci.yml', 'notes.txt'],
    manifests: { 'requirements.txt': 'fastapi\npsycopg2-binary\nsqlalchemy' },
    readme: 'Served with FastAPI and PostgreSQL. Attach your CV.'
  })], dictionary, { now: NOW });

  const methods = (name) => evidence.filter((item) => item.rawName === name).map((item) => item.detectionMethod).sort();
  assert.deepEqual(methods('FastAPI'), ['manifest_dependency', 'readme_mention']);
  assert.deepEqual(methods('PostgreSQL'), ['manifest_dependency', 'readme_mention']);
  assert.deepEqual(methods('Docker'), ['config_file']);
  assert.deepEqual(methods('Kubernetes'), ['config_file']);
  assert.deepEqual(methods('GitHub Actions'), ['config_file']);
  assert.deepEqual(methods('Machine Learning'), ['repo_topic']);
  assert.ok(!evidence.some((item) => item.rawName === 'Computer Vision'), '"CV" in prose is not Computer Vision');
  assert.ok(!evidence.some((item) => /sqlalchemy|hacktoberfest/i.test(item.rawName)), 'unknown packages/topics are ignored');
  assert.match(profileText, /Attendance API for campus labs/);
});

test('empty repositories and repositories without a README are handled without errors', () => {
  const result = analyzeRepositories([
    repo({ fullName: 'asha/empty', size: 0 }),
    repo({ fullName: 'asha/no-readme', languages: { Go: 500 }, readme: null })
  ], dictionary, { now: NOW });
  assert.equal(result.analyzedRepositories, 1);
  assert.deepEqual(names(result.evidence), ['Go']);
  assert.deepEqual(analyzeRepositories([], dictionary).evidence, []);
});

test('the same skill in several repositories stays one skill with repeated-project evidence', () => {
  const repos = ['one', 'two', 'three'].map((name) => repo({
    fullName: `asha/${name}`,
    manifests: { 'package.json': '{"dependencies":{"react":"19","react-dom":"19"}}' }
  }));
  const { evidence } = analyzeRepositories(repos, dictionary, { now: NOW });
  assert.equal(evidence.length, 3, 'react and react-dom in one repo are one piece of evidence');
  const [react] = summarizeEvidence(evidence);
  assert.equal(react.name, 'React');
  assert.equal(react.repositoryCount, 3);
  assert.equal(react.evidenceClass, 'repeated_project_evidence');
});

test('private repositories are never analyzed and forks carry lower confidence', () => {
  const { evidence, profileText } = analyzeRepositories([
    repo({ fullName: 'asha/secret', private: true, description: 'private plans', languages: { Java: 100 } }),
    repo({ fullName: 'asha/forked', fork: true, description: 'upstream', manifests: { 'package.json': '{"dependencies":{"express":"5"}}' } })
  ], dictionary, { now: NOW });
  assert.ok(!evidence.some((item) => item.sourceRef === 'asha/secret'));
  assert.doesNotMatch(profileText, /private plans|upstream/);
  const express = evidence.find((item) => item.rawName === 'Express');
  assert.equal(express.confidence, 0.3);
  assert.match(express.evidence, /forked repository/);
});

test('languages outside the dictionary are kept as unmatched evidence; tooling languages are ignored', () => {
  const { evidence } = analyzeRepositories([repo({ languages: { Elixir: 900, Dockerfile: 100 } })], dictionary, { now: NOW });
  assert.deepEqual(evidence.map((item) => [item.rawName, item.skillId]), [['Elixir', null]]);
});
