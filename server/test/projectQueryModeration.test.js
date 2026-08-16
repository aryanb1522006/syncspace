import test from 'node:test';
import assert from 'node:assert/strict';
import { moderateProjectQuery } from '../src/services/projectQueryModeration.js';

const project = {
  title: 'GreenGrid',
  domain: 'Climate Tech',
  description: 'Build a campus energy dashboard.',
  skills: [{ name: 'React' }, { name: 'Node.js' }]
};

test('project query moderation accepts relevant, respectful questions', () => {
  assert.equal(moderateProjectQuery('What React experience does the team need?', project).allowed, true);
  assert.equal(moderateProjectQuery('Can I contribute for six hours each week?', project).allowed, true);
});

test('project query moderation rejects abusive language and common obfuscation', () => {
  const direct = moderateProjectQuery('Is the project owner an idiot?', project);
  const obfuscated = moderateProjectQuery('Why is this project $h1t?', project);
  assert.deepEqual([direct.code, obfuscated.code], ['abusive_language', 'abusive_language']);
});

test('project query moderation rejects spam and unrelated submissions', () => {
  assert.equal(moderateProjectQuery('BUY THIS NOWWWWWWWWW https://one.test https://two.test', project).code, 'spam');
  assert.equal(moderateProjectQuery('What is your favourite movie?', project).code, 'off_topic');
});

test('owner responses still receive abuse and spam screening without over-restricting short answers', () => {
  assert.equal(moderateProjectQuery('Yes, that works.', project, { response: true }).allowed, true);
  assert.equal(moderateProjectQuery('You are stupid.', project, { response: true }).code, 'abusive_language');
});
