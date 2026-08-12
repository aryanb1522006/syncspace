import test from 'node:test';
import assert from 'node:assert/strict';
import { isKnownPilotTestProject } from '../src/services/pilotCleanup.js';

test('matches seeded projects only when they belong to seeded demo owners', () => {
  assert.equal(isKnownPilotTestProject({ title: 'GreenGrid', ownerEmail: 'arjun@northstar.edu' }), true);
  assert.equal(isKnownPilotTestProject({ title: 'GreenGrid', ownerEmail: 'student@thapar.edu' }), false);
});

test('matches the exact QA project title', () => {
  assert.equal(isKnownPilotTestProject({ title: '[QA] Phase 8 Live Check', ownerEmail: 'tester@thapar.edu' }), true);
  assert.equal(isKnownPilotTestProject({ title: '[QA] Real Pilot', ownerEmail: 'tester@thapar.edu' }), false);
});

test('matches smoke projects only when they belong to smoke accounts', () => {
  assert.equal(isKnownPilotTestProject({ title: 'Smoke Project 123', ownerEmail: 'owner-123@smoke.syncspace.test' }), true);
  assert.equal(isKnownPilotTestProject({ title: 'Smoke Project Society', ownerEmail: 'student@thapar.edu' }), false);
});

test('does not match ordinary pilot projects', () => {
  assert.equal(isKnownPilotTestProject({ title: 'Campus Robotics Team', ownerEmail: 'student@thapar.edu' }), false);
});
