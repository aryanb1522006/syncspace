import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { integrationFixture } from '../test-fixtures/integrationHarness.js';

after(() => pool.end());

test('team contacts and group invites follow live membership and stay out of applicant profiles', {
  skip: process.env.RUN_DB_TESTS !== 'true'
}, async (t) => {
  const fixture = await integrationFixture();
  t.after(() => fixture.cleanup());
  const otherCollege = await integrationFixture();
  t.after(() => otherCollege.cleanup());
  const { owner, candidate, stranger, project } = fixture;
  const api = (method, path, user) => request(app)[method](`/api${path}`).set('Authorization', `Bearer ${user.token}`);
  const settings = '/students/me/team-contacts';
  const empty = { whatsappNumber: '', discordUsername: '', contactEmail: '' };
  const phone = '+12025550123';
  const discordUsername = 'campus.fixture';
  const contactEmail = 'optional@contact.test';
  const whatsappInvite = 'https://chat.whatsapp.com/FixtureInvite';
  const discordInvite = 'https://discord.com/invite/FixtureInvite';
  const projectPath = `/projects/${project.id}`;
  const apply = async (user) => (await api('post', `${projectPath}/apply`, user).expect(201)).body.application.id;
  const accept = async (id) => (await api('put', `/applications/${id}`, owner).send({ status: 'accepted' }).expect(200)).body.result.teamId;
  const assertPrivate = ({ body }) => {
    const value = JSON.stringify(body);
    for (const privateValue of [phone, discordUsername, contactEmail, whatsappInvite, discordInvite]) {
      assert.ok(!value.includes(privateValue), 'private team data was returned to an unintended audience');
    }
  };

  await request(app).get(`/api${settings}`).expect(401);
  await api('get', settings, candidate).expect(200).expect('Cache-Control', 'no-store').expect(({ body }) => {
    assert.deepEqual(body.contacts, { whatsappNumber: null, discordUsername: null, contactEmail: null });
  });
  for (const invalid of [{ whatsappNumber: '1234' }, { discordUsername: 'a..b' }, { contactEmail: 'not an email' }]) {
    await api('put', settings, candidate).send({ ...empty, ...invalid }).expect(400);
  }
  await api('put', settings, candidate).send({
    whatsappNumber: '+1 (202) 555-0123', discordUsername: 'Campus.Fixture', contactEmail,
    studentId: owner.profile.id
  }).expect(200).expect(({ body }) => assert.deepEqual(body.contacts, { whatsappNumber: phone, discordUsername, contactEmail }));
  await api('get', settings, owner).expect(200).expect(assertPrivate);
  const applicationId = await apply(candidate);
  const applicantPath = `${projectPath}/applications/${applicationId}/profile`;
  await api('get', applicantPath, owner).expect(200).expect(assertPrivate);
  const teamId = await accept(applicationId);
  const teamPath = `/teams/${teamId}`;
  const invitePath = `${teamPath}/group-invite`;
  const pendingId = await apply(stranger);

  await api('get', '/notifications', candidate).expect(200).expect(({ body }) => {
    assert.ok(body.notifications.some((item) => Number(item.team_id) === teamId && !item.is_read));
  });
  await api('put', settings, owner).send({ ...empty, contactEmail: 'leader@contact.test' }).expect(200);
  await api('get', teamPath, owner).expect(200).expect('Cache-Control', 'no-store').expect(({ body }) => {
    assert.equal(body.team.groupInviteUrl, null);
    assert.deepEqual(body.team.contacts, [{
      studentId: Number(candidate.profile.id), name: 'candidate', role: 'Collaborator',
      whatsappNumber: phone, discordUsername, contactEmail
    }]);
  });
  for (const invalid of ['https://chat.whatsapp.com.example.net/fixture', 'https://discord.com/channels/fixture', 'http://discord.gg/fixture']) {
    await api('put', invitePath, owner).send({ groupInviteUrl: invalid }).expect(400);
  }
  await api('put', invitePath, candidate).send({ groupInviteUrl: whatsappInvite }).expect(403);
  await api('put', invitePath, owner).send({ groupInviteUrl: `${whatsappInvite}?mode=share` }).expect(200);
  await api('get', teamPath, candidate).expect(200).expect(({ body }) => {
    assert.equal(body.team.groupInviteUrl, whatsappInvite);
    assert.equal(body.team.contacts[0].contactEmail, 'leader@contact.test');
  });
  await api('get', teamPath, stranger).expect(403).expect(assertPrivate);
  await api('get', teamPath, otherCollege.owner).expect(403).expect(assertPrivate);
  await api('get', '/teams', stranger).expect(200).expect(assertPrivate);
  await api('get', projectPath, stranger).expect(200).expect(assertPrivate);
  await api('get', applicantPath, owner).expect(200).expect(assertPrivate);
  await api('get', `/students/by-user/${candidate.id}`, stranger).expect(200).expect(assertPrivate);
  await api('get', `${projectPath}/applications`, owner).expect(200).expect(assertPrivate);
  await api('get', `/recommendations/teammates/${project.id}`, owner).expect(200).expect(assertPrivate);

  await accept(pendingId);
  await api('get', teamPath, stranger).expect(200).expect(({ body }) => {
    assert.ok(body.team.contacts.some((contact) => contact.whatsappNumber === phone));
  });
  await api('put', settings, candidate).send(empty).expect(200);
  await api('get', teamPath, stranger).expect(200).expect(({ body }) => {
    assert.ok(body.team.contacts.every((contact) => contact.whatsappNumber === null));
  });
  await api('put', invitePath, owner).send({ groupInviteUrl: discordInvite }).expect(200);
  await api('get', teamPath, candidate).expect(200).expect(({ body }) => assert.equal(body.team.groupInviteUrl, discordInvite));

  const candidateMembership = `${teamPath}/members/${candidate.profile.id}`;
  await api('delete', candidateMembership, stranger).expect(404);
  await api('delete', candidateMembership, owner).expect(204);
  await api('get', teamPath, candidate).expect(403).expect(assertPrivate);
  await api('get', '/applications', candidate).expect(200).expect(({ body }) => assert.equal(body.applications[0].teamId, null));
  await api('get', '/notifications', candidate).expect(200).expect(({ body }) => {
    assert.ok(body.notifications.every((item) => item.team_id === null));
  });
  await api('delete', `${teamPath}/members/${stranger.profile.id}`, stranger).expect(204);
  await api('get', teamPath, stranger).expect(403).expect(assertPrivate);
  await api('put', invitePath, owner).send({ groupInviteUrl: '' }).expect(200);
  await api('get', teamPath, owner).expect(200).expect(({ body }) => assert.equal(body.team.groupInviteUrl, null));
});
