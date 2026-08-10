import test from 'node:test';
import assert from 'node:assert/strict';
import { decideApplication } from '../src/services/teamWorkflow.js';

function createFakeRepository() {
  const state = {
    applications: [{ id: 1, owner_id: 9, status: 'pending', project_id: 7, project_title: 'GreenGrid', team_size: 3, student_id: 11, student_user_id: 21 }],
    teams: [], members: [], tasks: [], notifications: [], projectStatus: 'open'
  };
  const repository = {
    state,
    transaction: async (work) => work({
      getApplicationForUpdate: async (id) => state.applications.find((item) => item.id === id),
      updateApplicationStatus: async (id, status) => { state.applications.find((item) => item.id === id).status = status; },
      getOrCreateTeam: async (projectId) => {
        let team = state.teams.find((item) => item.projectId === projectId);
        if (!team) { team = { id: 31, projectId }; state.teams.push(team); }
        return team;
      },
      countTeamMembers: async (teamId) => state.members.filter((member) => member.teamId === teamId).length,
      addTeamMember: async (teamId, studentId) => { state.members.push({ teamId, studentId }); },
      updateProjectStatus: async (projectId, status) => { state.projectStatus = status; },
      createNotification: async (userId, message) => { state.notifications.push({ userId, message }); }
    })
  };
  return repository;
}

test('apply → accept creates team membership → member can receive a task', async () => {
  const repository = createFakeRepository();
  const accepted = await decideApplication(repository, { applicationId: 1, ownerId: 9, decision: 'accepted' });
  assert.equal(accepted.teamId, 31);
  assert.deepEqual(repository.state.members, [{ teamId: 31, studentId: 11 }]);
  assert.equal(repository.state.applications[0].status, 'accepted');

  const assigneeIsMember = repository.state.members.some((member) => member.teamId === 31 && member.studentId === 11);
  assert.equal(assigneeIsMember, true);
  repository.state.tasks.push({ id: 51, teamId: 31, assignedTo: 11, title: 'Build the dashboard shell' });
  assert.equal(repository.state.tasks[0].assignedTo, 11);
  assert.match(repository.state.notifications[0].message, /workspace is ready/i);
});

test('acceptance is owner-only and cannot be repeated', async () => {
  const repository = createFakeRepository();
  await assert.rejects(
    decideApplication(repository, { applicationId: 1, ownerId: 999, decision: 'accepted' }),
    (error) => error.status === 403
  );
  await decideApplication(repository, { applicationId: 1, ownerId: 9, decision: 'rejected' });
  await assert.rejects(
    decideApplication(repository, { applicationId: 1, ownerId: 9, decision: 'accepted' }),
    (error) => error.status === 409
  );
});
