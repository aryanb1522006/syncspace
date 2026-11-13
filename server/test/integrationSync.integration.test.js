import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/config/db.js';
import { integrationFixture } from '../test-fixtures/integrationHarness.js';
import { deleteConnection, getConnection, listEvidence, recordSyncError, replaceSourceEvidence, saveGitHubConnection, setEvidenceVisibility } from '../src/models/profileIntelligenceModel.js';
after(() => pool.end());
const enabled = process.env.RUN_DB_TESTS === 'true';

test('a sync finishing after disconnect cannot restore evidence', { skip: !enabled }, async () => {
  const f = await integrationFixture();
  try {
    await saveGitHubConnection({ studentId: f.candidate.profile.id, providerUserId: f.suffix, username: 'fixture', profileUrl: null, accessTokenCiphertext: 'old' });
    const snapshot = await getConnection(f.candidate.profile.id, 'github');
    const input = { studentId: f.candidate.profile.id, source: 'github', evidence: f.evidence, profileText: '', expectedConnection: snapshot };
    await replaceSourceEvidence(input);
    assert.equal((await listEvidence(f.candidate.profile.id)).length, 1);
    await deleteConnection(f.candidate.profile.id, 'github', { deleteEvidence: true, expectedConnection: snapshot });
    await assert.rejects(() => replaceSourceEvidence(input), { status: 409 });
    assert.equal(await getConnection(f.candidate.profile.id, 'github'), null);
    assert.deepEqual(await listEvidence(f.candidate.profile.id), []);
  } finally { await f.cleanup(); }
});

test('reconnect discards old results and errors, preserves valid visibility, and deletes outdated rows', { skip: !enabled }, async () => {
  const f = await integrationFixture();
  const studentId = f.candidate.profile.id;
  try {
    const connection = { studentId, providerUserId: f.suffix, username: 'fixture', profileUrl: null };
    await saveGitHubConnection({ ...connection, accessTokenCiphertext: 'old' });
    const old = await getConnection(studentId, 'github');
    await saveGitHubConnection({ ...connection, accessTokenCiphertext: 'new' });
    await assert.rejects(() => replaceSourceEvidence({ studentId, source: 'github', evidence: f.evidence, profileText: '', expectedConnection: old }), { status: 409 });
    await recordSyncError(studentId, 'github', 'old revoked response', { revoked: true, expectedConnection: old });
    const fresh = await getConnection(studentId, 'github');
    assert.equal(fresh.status, 'active');
    assert.equal(fresh.accessTokenCiphertext, 'new');
    await assert.rejects(() => deleteConnection(studentId, 'github', { deleteEvidence: true, expectedConnection: old }), { status: 409 });
    await replaceSourceEvidence({ studentId, source: 'github', evidence: [...f.evidence, { ...f.evidence[0], sourceRef: 'fixture/outdated' }], profileText: '', expectedConnection: fresh });
    const first = (await listEvidence(studentId)).find((item) => item.sourceRef === 'fixture/web');
    await setEvidenceVisibility(studentId, [first.id], 'team');
    await replaceSourceEvidence({ studentId, source: 'github', evidence: f.evidence, profileText: '', expectedConnection: fresh });
    const evidence = await listEvidence(studentId);
    assert.equal(evidence.length, 1);
    assert.equal(evidence[0].visibility, 'team');
  } finally { await f.cleanup(); }
});
