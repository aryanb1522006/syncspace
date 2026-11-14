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
  getApplicantProfile: (projectId, applicationId) => use(
    () => demoApi.getApplicantProfile(projectId, applicationId),
    () => request(`/projects/${projectId}/applications/${applicationId}/profile`)
  ),
  updateProfile: (id, input) => use(() => demoApi.updateProfile(id, input), () => request(`/students/${id}`, { method: 'PUT', body: json(input) })),
  addSkill: (id, skillId) => use(() => demoApi.editSkill(skillId), () => request(`/students/${id}/skills/${skillId}`, { method: 'PUT' })),
  removeSkill: (id, skillId) => use(() => demoApi.editSkill(skillId, true), () => request(`/students/${id}/skills/${skillId}`, { method: 'DELETE' })),
  listSkills: () => use(() => demoApi.listSkills(), () => request('/students/skills/dictionary')),
  updateProject: (id, input) => use(() => demoApi.updateProject(id, input), () => request(`/projects/${id}`, { method: 'PUT', body: json(input) })),
  deleteProject: (id) => use(() => demoApi.deleteProject(id), () => request(`/projects/${id}`, { method: 'DELETE' })),
  adminProjects: () => use(() => demoApi.adminProjects(), () => request('/admin/projects')),
  adminAudit: () => use(() => demoApi.adminAudit(), () => request('/admin/audit')),
  adminDeleteProject: (id, input) => use(() => demoApi.adminDeleteProject(id, input), () => request(`/admin/projects/${id}`, { method: 'DELETE', body: json(input) })),
  publicProjectSearch: (skill = '') => use(() => demoApi.publicProjectSearch(skill), () => request(`/projects/public/search?skill=${encodeURIComponent(skill)}`)),
  listProjects: (search = '') => use(() => demoApi.listProjects(search), () => request(`/projects${search}`)),
  createProject: (input) => use(() => demoApi.createProject(input), () => request('/projects', { method: 'POST', body: json(input) })),
  recommendations: (limit) => use(() => demoApi.recommendations(), () => request(`/recommendations/projects${limit ? `?limit=${limit}` : ''}`)),
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
  readNotification: (id) => use(() => demoApi.readNotification(id), () => request(`/notifications/${id}/read`, { method: 'PUT' })),
  // GitHub / LinkedIn profile intelligence needs real OAuth and real
  // uploads, so demo mode reports it as unavailable instead of faking data.
  integrations: () => use(() => Promise.resolve({ demo: true }), () => request('/integrations')),
  githubAuthorizeUrl: (browserChallenge) => liveOnly(() => request(`/integrations/github/authorize?browserChallenge=${encodeURIComponent(browserChallenge)}`)),
  githubExchange: (code, state, verifier) => liveOnly(() => request('/integrations/github/exchange', { method: 'POST', body: json({ code, state, verifier }) })),
  githubSync: () => liveOnly(() => request('/integrations/github/sync', { method: 'POST' })),
  githubDisconnect: (deleteEvidence) => liveOnly(() => request(`/integrations/github?deleteEvidence=${deleteEvidence ? 'true' : 'false'}`, { method: 'DELETE' })),
  linkedinAuthorizeUrl: (browserChallenge) => liveOnly(() => request(`/integrations/linkedin/authorize?browserChallenge=${encodeURIComponent(browserChallenge)}`)),
  linkedinExchange: (code, state, verifier) => liveOnly(() => request('/integrations/linkedin/exchange', { method: 'POST', body: json({ code, state, verifier }) })),
  linkedinUseDetails: (fields) => liveOnly(() => request('/integrations/linkedin/profile', { method: 'POST', body: json({ fields }) })),
  linkedinDisconnect: () => liveOnly(() => request('/integrations/linkedin/account', { method: 'DELETE' })),
  linkedinPreview: (file) => liveOnly(() => {
    const body = new FormData(); body.append('export', file);
    return request('/integrations/linkedin/preview', { method: 'POST', body });
  }),
  linkedinImport: (file, sections) => liveOnly(() => {
    const body = new FormData(); body.append('export', file);
    body.append('confirm', 'true'); body.append('sections', JSON.stringify(sections));
    return request('/integrations/linkedin/import', { method: 'POST', body });
  }),
  linkedinDelete: () => liveOnly(() => request('/integrations/linkedin', { method: 'DELETE' })),
  decideSkill: (skillId, decision, proficiency) => liveOnly(() => request(`/integrations/skills/${skillId}/decision`, {
    method: 'POST', body: json(proficiency ? { decision, proficiency } : { decision })
  })),
  setEvidenceVisibility: (evidenceIds, visibility) => liveOnly(() => request('/integrations/evidence/visibility', { method: 'PUT', body: json({ evidenceIds, visibility }) }))
};

function liveOnly(real) {
  return demoMode ? Promise.reject(new Error('Connected profiles need the live API (set VITE_DEMO_MODE=false).')) : real();
}
