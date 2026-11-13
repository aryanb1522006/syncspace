import test from 'node:test';
import assert from 'node:assert/strict';
import { createSkillResolver, proseDictionary } from '../src/services/skillNormalization.js';
import { extractSkills } from '../src/services/skillExtraction.js';
import { dictionary } from '../test-fixtures/skillDictionary.js';

const resolve = createSkillResolver(dictionary);

test('aliases of the same technology normalize to one dictionary skill', () => {
  assert.equal(resolve('JS').name, 'JavaScript');
  assert.equal(resolve('TS').name, 'TypeScript');
  assert.equal(resolve('React.js').name, 'React');
  assert.equal(resolve('react-dom').name, 'React');
  assert.equal(resolve(' postgresql ').name, 'PostgreSQL');
  assert.equal(resolve('psycopg2-binary').name, 'PostgreSQL');
  assert.equal(resolve('machine-learning').name, 'Machine Learning');
  assert.equal(resolve('golang').name, 'Go');
});

test('related but different technologies are NOT merged', () => {
  assert.equal(resolve('next').name, 'Next.js');
  // An ORM does not prove a specific database; free-form topics are noise.
  assert.equal(resolve('sequelize'), null);
  assert.equal(resolve('hacktoberfest'), null);
  assert.equal(resolve(''), null);
});

test('prose matching ignores short ambiguous names and aliases', () => {
  const prose = proseDictionary(dictionary);
  const text = 'Attach your CV by 3 PM. Let us go build it. Deployed with containers using FastAPI.';
  const names = extractSkills(text, prose).map((match) => match.name).sort();
  assert.deepEqual(names, ['Docker', 'FastAPI']);
});
