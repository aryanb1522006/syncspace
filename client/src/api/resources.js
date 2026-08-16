import { demoApi } from './demoStore.js';
import { request } from './http.js';

export const demoMode = (import.meta.env.VITE_DEMO_MODE ?? 'true') !== 'false';
const use = (demo, real) => demoMode ? demo() : real();
const json = (value) => JSON.stringify(value);

export const api = {
  login: (input) => use(() => demoApi.login(input), () => request('/auth/login', { method: 'POST', body: json(input) })),
  register: (input) => use(() => demoApi.register(input), () => request('/auth/register', { method: 'POST', body: json(input) })),
  googleLogin: (credential) => request('/auth/google', { method: 'POST', body: json({ credential }) }),
  getMe: () => use(() => demoApi.getMe(), () => request('/students/me')),
  getStudent: (id) => use(() => demoApi.getStudent(id), () => request(`/students/${id}`)),
  getStudentByUserId: (userId) => use(() => demoApi.getStudentByUserId(userId), () => request(`/students/by-user/${userId}`)),
  updateProfile: (id, input) => use(() => demoApi.updateProfile(id, input), () => request(`/students/${id}`, { method: 'PUT', body: json(input) })),
  uploadResume: (id, file) => use(() => demoApi.uploadResume(file), () => {
    const body = new FormData(); body.append('resume', file);
    return request(`/students/${id}/resume`, { method: 'POST', body });
  }),
  updateSkills: (id, skills) => use(() => demoApi.updateSkills(id, skills), () => request(`/students/${id}/skills`, { method: 'PUT', body: json({ skills }) })),
  listSkills: () => use(() => demoApi.listSkills(), () => request('/students/skills/dictionary')),
  updateProject: (id, input) => use(() => demoApi.updateProject(id, input), () => request(`/projects/${id}`, { method: 'PUT', body: json(input) })),
  deleteProject: (id) => use(() => demoApi.deleteProject(id), () => request(`/projects/${id}`, { method: 'DELETE' })),
  adminProjects: () => use(() => demoApi.adminProjects(), () => request('/admin/projects')),
  adminAudit: () => use(() => demoApi.adminAudit(), () => request('/admin/audit')),
  adminDeleteProject: (id, input) => use(() => demoApi.adminDeleteProject(id, input), () => request(`/admin/projects/${id}`, { method: 'DELETE', body: json(input) })),
  publicProjectSearch: (skill = '') => use(() => demoApi.publicProjectSearch(skill), () => request(`/projects/public/search?skill=${encodeURIComponent(skill)}`)),
  listProjects: (search = '') => use(() => demoApi.listProjects(search), () => request(`/projects${search}`)),
  createProject: (input) => use(() => demoApi.createProject(input), () => request('/projects', { method: 'POST', body: json(input) })),
  recommendations: () => use(() => demoApi.recommendations(), () => request('/recommendations/projects')),
  getProject: (id) => use(() => demoApi.getProject(id), () => request(`/projects/${id}`)),
  listProjectQueries: (id) => use(() => demoApi.listProjectQueries(id), () => request(`/projects/${id}/queries`)),
  createProjectQuery: (id, question) => use(() => demoApi.createProjectQuery(id, question), () => request(`/projects/${id}/queries`, { method: 'POST', body: json({ question }) })),
  answerProjectQuery: (projectId, queryId, response) => use(() => demoApi.answerProjectQuery(projectId, queryId, response), () => request(`/projects/${projectId}/queries/${queryId}/respond`, { method: 'PUT', body: json({ response }) })),
  apply: (id) => use(() => demoApi.apply(id), () => request(`/projects/${id}/apply`, { method: 'POST' })),
  listApplications: () => use(() => demoApi.listApplications(), () => request('/applications')),
  projectApplications: (id) => use(() => demoApi.projectApplications(id), () => request(`/projects/${id}/applications`)),
  decideApplication: (id, status) => use(() => demoApi.decideApplication(id, status), () => request(`/applications/${id}`, { method: 'PUT', body: json({ status }) })),
  listTeams: () => use(() => demoApi.listTeams(), () => request('/teams')),
  getTeam: (id) => use(() => demoApi.getTeam(id), () => request(`/teams/${id}`)),
  createTask: (id, input) => use(() => demoApi.createTask(id, input), () => request(`/teams/${id}/tasks`, { method: 'POST', body: json(input) })),
  updateTask: (id, input) => use(() => demoApi.updateTask(id, input), () => request(`/tasks/${id}`, { method: 'PUT', body: json(input) })),
  notifications: () => use(() => demoApi.notifications(), () => request('/notifications')),
  readNotification: (id) => use(() => demoApi.readNotification(id), () => request(`/notifications/${id}/read`, { method: 'PUT' }))
};
