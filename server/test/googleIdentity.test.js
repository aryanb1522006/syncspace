import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGoogleIdentity } from '../src/services/googleIdentity.js';

test('accepts a verified Google Workspace identity for the exact allowed domain', () => {
  const identity = validateGoogleIdentity({
    sub: 'google-user-123',
    email: 'student@thapar.edu',
    email_verified: true,
    hd: 'thapar.edu',
    name: 'Thapar Student'
  }, 'thapar.edu');

  assert.equal(identity.email, 'student@thapar.edu');
  assert.equal(identity.googleSubject, 'google-user-123');
});

test('rejects a consumer Google account even when its address resembles the domain', () => {
  assert.throws(() => validateGoogleIdentity({
    sub: 'google-user-123',
    email: 'student@thapar.edu',
    email_verified: true
  }, 'thapar.edu'), /Workspace account/);
});

test('rejects a different or nested domain', () => {
  assert.throws(() => validateGoogleIdentity({
    sub: 'google-user-123',
    email: 'student@mail.thapar.edu',
    email_verified: true,
    hd: 'mail.thapar.edu'
  }, 'thapar.edu'), /@thapar.edu/);
});

test('rejects an unverified email', () => {
  assert.throws(() => validateGoogleIdentity({
    sub: 'google-user-123',
    email: 'student@thapar.edu',
    email_verified: false,
    hd: 'thapar.edu'
  }, 'thapar.edu'), /verify/);
});
