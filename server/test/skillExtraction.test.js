import test from 'node:test';
import assert from 'node:assert/strict';
import { extractSkills } from '../src/services/skillExtraction.js';

const dictionary = [
  { id: 1, name: 'React', aliases: ['react.js', 'reactjs'] },
  { id: 2, name: 'PostgreSQL', aliases: ['postgres', 'psql'] },
  { id: 3, name: 'Machine Learning', aliases: ['ml'] },
  { id: 4, name: 'C++', aliases: ['cpp'] }
];

test('extracts canonical skills from names and aliases without duplicates', () => {
  const matches = extractSkills('Built React.js apps with Postgres and machine learning models. React is my daily tool.', dictionary);
  assert.deepEqual(matches.map(({ skillId }) => skillId), [1, 2, 3]);
});

test('short aliases require token boundaries', () => {
  const matches = extractSkills('I write HTML and documentation. No machine-learning claims here.', dictionary);
  assert.equal(matches.some(({ name }) => name === 'Machine Learning'), false);
});

test('matches punctuation-bearing skill names', () => {
  const matches = extractSkills('Experience: C++17 and Python.', dictionary);
  assert.equal(matches[0].name, 'C++');
});
