import test from 'node:test';
import assert from 'node:assert/strict';
import { moderateProjectQuery } from '../src/services/projectQueryModeration.js';

const project = {
  title: 'GreenGrid',
  domain: 'Climate Tech',
  description: 'Build a campus energy dashboard.',
  skills: [{ name: 'React' }, { name: 'Node.js' }]
};

test('project query moderation accepts respectful questions without relevance filtering', () => {
  assert.equal(moderateProjectQuery('What React experience does the team need?', project).allowed, true);
  assert.equal(moderateProjectQuery('What is your favourite movie?', project).allowed, true);
  assert.equal(moderateProjectQuery('BUY THIS NOWWWWWWWWW https://one.test https://two.test', project).allowed, true);
});

test('project query moderation rejects abusive language and common obfuscation', () => {
  const direct = moderateProjectQuery('Is the project owner an idiot?', project);
  const obfuscated = moderateProjectQuery('Why is this project $h1t?', project);
  assert.deepEqual([direct.code, obfuscated.code], ['abusive_language', 'abusive_language']);
});

test('owner responses receive the same abusive-language-only screening', () => {
  assert.equal(moderateProjectQuery('Yes, that works.', project, { response: true }).allowed, true);
  assert.equal(moderateProjectQuery('You are stupid.', project, { response: true }).code, 'abusive_language');
});
