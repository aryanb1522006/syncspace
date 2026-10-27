import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProfileLink, visibleSocials } from '../src/services/profileLinks.js';

test('profile links canonicalize provider profiles and allow removal', () => {
  assert.equal(normalizeProfileLink(' https://www.github.com/Octocat/?tab=repositories#top ', 'github'), 'https://github.com/Octocat');
  assert.equal(normalizeProfileLink('https://linkedin.com/in/aryan-bansal/', 'linkedin'), 'https://www.linkedin.com/in/aryan-bansal');
  assert.equal(normalizeProfileLink('', 'github'), null);
  assert.equal(normalizeProfileLink(null, 'linkedin'), null);
});

test('profile links reject executable, lookalike, credentialed and unrelated URLs', () => {
  for (const value of ['javascript:alert(1)', 'http://github.com/user', 'https://github.com.attacker.test/user', 'https://github.com@attacker.test/user', 'https://user:pass@github.com/user', 'https://github.com/user/repo', 'https://github.com:444/user']) {
    assert.throws(() => normalizeProfileLink(value, 'github'), { status: 400 });
  }
  for (const value of ['https://linkedin.com/company/test', 'https://linkedin.com/in/', 'https://attacker.test/in/test']) {
    assert.throws(() => normalizeProfileLink(value, 'linkedin'), { status: 400 });
  }
});

test('social visibility defaults private and allows only the configured audience', () => {
  const profile = { user_id: '11', github_url: 'https://github.com/user', linkedin_url: null };
  assert.deepEqual(visibleSocials(profile, 12, false), {});
  assert.equal(visibleSocials(profile, 11, false).githubUrl, profile.github_url);
  assert.deepEqual(visibleSocials({ ...profile, social_visibility: 'team' }, 12, false), {});
  assert.equal(visibleSocials({ ...profile, social_visibility: 'team' }, 12, true).githubUrl, profile.github_url);
  assert.equal(visibleSocials({ ...profile, social_visibility: 'college' }, 12, false).githubUrl, profile.github_url);
});
