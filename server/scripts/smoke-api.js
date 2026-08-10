import { randomBytes } from 'node:crypto';

const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000/api';
const runId = `${Date.now()}-${randomBytes(3).toString('hex')}`;
const password = process.env.SMOKE_PASSWORD ?? `Smoke-${randomBytes(12).toString('base64url')}`;

async function request(path, { token, ...options } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${path} returned ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

const register = (role, name) => request('/auth/register', {
  method: 'POST',
  body: JSON.stringify({
    email: `${role}-${runId}@smoke.syncspace.test`,
    password,
    role,
    name,
    department: 'Quality Engineering',
    year: 3
  })
});

await request('/health/ready');
const owner = await register('owner', 'Smoke Owner');
const student = await register('student', 'Smoke Student');
const { skills } = await request('/students/skills/dictionary', { token: owner.token });
const selectedSkills = skills.slice(0, 2);
if (selectedSkills.length < 2) throw new Error('The skill dictionary must contain at least two skills');

const { project } = await request('/projects', {
  method: 'POST',
  token: owner.token,
  body: JSON.stringify({
    title: `Smoke Project ${runId}`,
    description: 'A staging-only project created by the production API smoke journey.',
    domain: 'Quality Engineering',
    teamSize: 2,
    commitmentHoursPerWeek: 5,
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    skills: selectedSkills.map((skill, index) => ({
      skillId: skill.id,
      importance: index === 0 ? 'required' : 'preferred'
    }))
  })
});

await request('/recommendations/projects', { token: student.token });
const { application } = await request(`/projects/${project.id}/apply`, {
  method: 'POST',
  token: student.token
});
const inbox = await request(`/projects/${project.id}/applications`, { token: owner.token });
if (!inbox.applications.some((item) => Number(item.id) === Number(application.id))) {
  throw new Error('The owner application inbox did not include the new application');
}

const { result } = await request(`/applications/${application.id}`, {
  method: 'PUT',
  token: owner.token,
  body: JSON.stringify({ status: 'accepted' })
});
const workspace = await request(`/teams/${result.teamId}`, { token: student.token });
const { task } = await request(`/teams/${result.teamId}/tasks`, {
  method: 'POST',
  token: student.token,
  body: JSON.stringify({
    title: 'Verify the staging handoff',
    assignedTo: student.user.profile.id,
    status: 'todo'
  })
});
await request(`/tasks/${task.id}`, {
  method: 'PUT',
  token: student.token,
  body: JSON.stringify({ status: 'done' })
});
const notifications = await request('/notifications', { token: student.token });

console.log(JSON.stringify({
  status: 'passed',
  projectId: Number(project.id),
  applicationId: Number(application.id),
  teamId: Number(result.teamId),
  memberCount: workspace.team.members.length,
  notificationCount: notifications.notifications.length
}, null, 2));
