const seed = {
  users: [
    { id: 1, email: 'isha@northstar.edu', password: 'demo1234', role: 'student', collegeId: 1, profileId: 1, name: 'Isha Mehta' },
    { id: 4, email: 'arjun@northstar.edu', password: 'demo1234', role: 'owner', collegeId: 1, profileId: 4, name: 'Arjun Rao' },
    { id: 11, email: 'abansal6_be24@thapar.edu', password: 'demo1234', role: 'student', collegeId: 1, profileId: 11, name: 'Aryan Bansal', isAdmin: true }
  ],
  directory: [
    { id: 4, userId: 4, name: 'Arjun Rao', email: 'arjun@northstar.edu', department: 'Electrical Engineering', year: 4, bio: 'Building practical climate tools for campus teams.', interests: ['Climate Tech', 'IoT'], availabilityHoursPerWeek: 10, skills: [{ id: 5, name: 'Node.js', category: 'Backend', proficiency: 4 }, { id: 6, name: 'PostgreSQL', category: 'Data', proficiency: 4 }] },
    { id: 2, userId: 2, name: 'Kabir Shah', email: 'kabir@northstar.edu', department: 'Computer Science', year: 3, bio: 'ML and data collaborator interested in useful campus systems.', interests: ['Machine Learning', 'Climate Tech'], availabilityHoursPerWeek: 8, skills: [{ id: 7, name: 'Machine Learning', category: 'AI', proficiency: 4 }, { id: 8, name: 'Data Science', category: 'Data', proficiency: 4 }] }
  ],
  profile: {
    id: 1, user_id: 1, name: 'Isha Mehta', email: 'isha@northstar.edu', department: 'Computer Science',
    year: 3, bio: 'Frontend engineer who cares about inclusive interfaces.', interests: ['Climate Tech', 'EdTech'],
    availability_hours_per_week: 12,
    skills: [
      { id: 1, name: 'React', category: 'Web', proficiency: 5 },
      { id: 2, name: 'TypeScript', category: 'Web', proficiency: 4 },
      { id: 3, name: 'UI/UX Design', category: 'Design', proficiency: 4 },
      { id: 4, name: 'Figma', category: 'Design', proficiency: 3 }
    ]
  },
  skills: [
    { id: 1, name: 'React', category: 'Web' }, { id: 2, name: 'TypeScript', category: 'Web' },
    { id: 3, name: 'UI/UX Design', category: 'Design' }, { id: 4, name: 'Figma', category: 'Design' },
    { id: 5, name: 'Node.js', category: 'Backend' }, { id: 6, name: 'PostgreSQL', category: 'Data' },
    { id: 7, name: 'Machine Learning', category: 'AI' }, { id: 8, name: 'Data Science', category: 'Data' }
  ],
  projects: [
    {
      id: 1, title: 'GreenGrid', domain: 'Climate Tech', description: 'Turn live campus energy data into actions students can see.',
      longDescription: 'GreenGrid connects campus meter readings to a clear student dashboard. The first milestone is a live energy loop for one academic block, followed by practical nudges that make usage patterns understandable.',
      teamSize: 4, memberCount: 2, deadline: '2026-09-12', commitmentHoursPerWeek: 10, ownerId: 4, owner_name: 'Arjun Rao', pendingApplicationCount: 0, applicationCount: 0,
      ownerProfileId: 4,
      skills: [{ id: 1, name: 'React', importance: 'required' }, { id: 5, name: 'Node.js', importance: 'required' }, { id: 3, name: 'UI/UX Design', importance: 'preferred' }, { id: 8, name: 'Data Science', importance: 'preferred' }],
      match: { score: 92, breakdown: { contributions: { requiredSkills: 45, preferredSkills: 17, domainInterest: 15, availability: 15 } } }
    },
    {
      id: 2, title: 'StudyCircle', domain: 'EdTech', description: 'Smart peer study groups built around pace, courses, and availability.',
      longDescription: 'StudyCircle helps students find a study rhythm that fits. Teams are matched around course overlap, preferred pace, and the hours they can reliably protect each week.',
      teamSize: 5, memberCount: 3, deadline: '2026-08-28', commitmentHoursPerWeek: 8, ownerId: 4, owner_name: 'Arjun Rao', pendingApplicationCount: 1, applicationCount: 1,
      ownerProfileId: 4,
      skills: [{ id: 1, name: 'React', importance: 'required' }, { id: 6, name: 'PostgreSQL', importance: 'required' }, { id: 7, name: 'Machine Learning', importance: 'preferred' }],
      match: { score: 86, breakdown: { contributions: { requiredSkills: 42, preferredSkills: 14, domainInterest: 15, availability: 15 } } }
    },
    {
      id: 3, title: 'CampusCart', domain: 'Civic Tech', description: 'A trusted exchange for borrowing and reusing useful campus gear.',
      longDescription: 'CampusCart is a simple campus-only exchange for lab kits, calculators, books, and project equipment—with lightweight trust signals and clear handoff coordination.',
      teamSize: 4, memberCount: 1, deadline: '2026-10-03', commitmentHoursPerWeek: 6, ownerId: 9, owner_name: 'Naina Bose', pendingApplicationCount: 0, applicationCount: 0,
      skills: [{ id: 2, name: 'TypeScript', importance: 'required' }, { id: 3, name: 'UI/UX Design', importance: 'required' }],
      match: { score: 78, breakdown: { contributions: { requiredSkills: 38, preferredSkills: 10, domainInterest: 15, availability: 15 } } }
    }
  ],
  applications: [{ id: 1, projectId: 2, title: 'StudyCircle', domain: 'EdTech', status: 'pending', appliedAt: '2026-08-10T12:00:00Z', studentId: 1, name: 'Isha Mehta', department: 'Computer Science', year: 3, bio: 'Frontend engineer who cares about inclusive interfaces.', availabilityHoursPerWeek: 12, skills: [{ id: 1, name: 'React', proficiency: 5 }, { id: 2, name: 'TypeScript', proficiency: 4 }] }],
  queries: [{ id: 1, projectId: 1, askerUserId: 1, askerName: 'Isha Mehta', question: 'Does the React role include dashboard accessibility work?', response: null, status: 'open', createdAt: '2026-08-11T10:00:00Z', answeredAt: null }],
  adminAudit: [],
  notifications: [
    { id: 1, message: 'StudyCircle viewed your application.', is_read: false, created_at: '2026-08-10T12:00:00Z' },
    { id: 2, message: 'GreenGrid added a new workspace task.', is_read: false, created_at: '2026-08-10T10:00:00Z' }
  ],
  teams: [{
    id: 1, project_id: 1, project_title: 'GreenGrid', project_status: 'open', owner_id: 4, ownerId: 4, ownerName: 'Arjun Rao', ownerEmail: 'arjun@northstar.edu', teamSize: 4, domain: 'Climate Tech',
    ownerProfileId: 4, ownerUserId: 4,
    members: [
      { id: 1, profileId: 1, user_id: 1, userId: 1, name: 'Isha Mehta', email: 'isha@northstar.edu', role_label: 'Frontend', initials: 'IM' },
      { id: 2, profileId: 2, user_id: 2, userId: 2, name: 'Kabir Shah', email: 'kabir@northstar.edu', role_label: 'ML & data', initials: 'KS' }
    ],
    tasks: [
      { id: 1, title: 'Build dashboard shell', assigned_to: 1, assignee_name: 'Isha Mehta', status: 'todo', due_date: '2026-09-12' },
      { id: 2, title: 'Connect meter API', assigned_to: 2, assignee_name: 'Kabir Shah', status: 'todo', due_date: '2026-09-13' },
      { id: 3, title: 'Interview facilities team', assigned_to: null, assignee_name: null, status: 'todo', due_date: '2026-09-14' },
      { id: 4, title: 'Draft recommendation logic', assigned_to: 1, assignee_name: 'Isha Mehta', status: 'in_progress', due_date: null },
      { id: 5, title: 'Map empty states', assigned_to: 2, assignee_name: 'Kabir Shah', status: 'in_progress', due_date: null },
      { id: 6, title: 'Define data schema', assigned_to: 1, assignee_name: 'Isha Mehta', status: 'done', due_date: '2026-09-09' },
      { id: 7, title: 'Set up repository', assigned_to: 2, assignee_name: 'Kabir Shah', status: 'done', due_date: '2026-09-08' },
      { id: 8, title: 'Project brief', assigned_to: 1, assignee_name: 'Isha Mehta', status: 'done', due_date: '2026-09-07' },
      { id: 9, title: 'Agree on tech stack', assigned_to: 2, assignee_name: 'Kabir Shah', status: 'done', due_date: '2026-09-06' }
    ]
  }]
};

const key = 'syncspace-demo-v4';
const clone = (value) => JSON.parse(JSON.stringify(value));

function load() {
  if (typeof localStorage === 'undefined') return clone(seed);
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : clone(seed);
}

function save(state) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(state));
}

const wait = (value) => new Promise((resolve) => setTimeout(() => resolve(clone(value)), 140));

function validateDemoQuery(value) {
  const normalized = value.trim().toLowerCase()
    .replace(/\$/g, 's')
    .replace(/[013457]/g, (character) => ({ '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't' })[character])
    .replace(/[^a-z0-9]+/g, ' ');
  const compact = normalized.replace(/\s/g, '');
  if (/(asshole|bastard|bitch|bullshit|dumbass|fuck|fucker|fucking|idiot|moron|retard|shit|stupid)/i.test(compact)) {
    throw new Error('Please rewrite this without abusive or insulting language.');
  }
}

export const demoApi = {
  async login({ email, password }) {
    const state = load();
    const user = state.users.find((item) => item.email === email.toLowerCase() && item.password === password);
    if (!user) throw new Error('Use a demo account and password demo1234.');
    return wait({ token: `demo-token-${user.role}`, user });
  },
  async register(input) {
    const user = { id: Date.now(), email: input.email, role: 'student', collegeId: 1, profileId: 1, name: input.name, capabilities: ['join_projects', 'post_projects'] };
    return wait({ token: `demo-token-${user.role}`, user });
  },
  async getMe() { return wait({ student: load().profile }); },
  async getStudent(id) {
    const state = load();
    const user = JSON.parse(localStorage.getItem('syncspace-user') ?? 'null');
    const profileId = Number(id);
    const profile = profileId === Number(state.profile.id)
      ? { ...state.profile, userId: state.profile.user_id, availabilityHoursPerWeek: state.profile.availability_hours_per_week }
      : state.directory.find((item) => Number(item.id) === profileId);
    if (!profile) throw new Error('Student profile not found');
    const viewerProfileId = Number(user?.profileId ?? user?.profile?.id);
    const related = state.teams.some((team) => {
      const viewerCanAccess = Number(team.owner_id) === Number(user?.id)
        || team.members.some((member) => Number(member.profileId ?? member.id) === viewerProfileId);
      const targetIsMember = Number(team.ownerProfileId) === profileId
        || team.members.some((member) => Number(member.profileId ?? member.id) === profileId);
      return viewerCanAccess && targetIsMember;
    });
    const contactVisible = Number(profile.userId) === Number(user?.id) || related;
    return wait({ student: { ...profile, email: contactVisible ? profile.email : undefined, contactVisible } });
  },
  async getStudentByUserId(userId) {
    const state = load();
    const profile = Number(state.profile.user_id) === Number(userId)
      ? state.profile
      : state.directory.find((item) => Number(item.userId) === Number(userId));
    if (!profile) throw new Error('Student profile not found');
    return this.getStudent(profile.id);
  },
  async updateProfile(id, input) {
    const state = load();
    state.profile = { ...state.profile, ...input, availability_hours_per_week: input.availabilityHoursPerWeek ?? state.profile.availability_hours_per_week };
    save(state);
    return wait({ student: state.profile });
  },
  async uploadResume() {
    return wait({ proposedSkills: [{ skillId: 5, name: 'Node.js', matchedAlias: 'node.js' }, { skillId: 6, name: 'PostgreSQL', matchedAlias: 'postgres' }], message: 'Review these skills before saving them.' });
  },
  async updateSkills(id, skills) {
    const state = load();
    const lookup = new Map(state.skills.map((skill) => [skill.id, skill]));
    state.profile.skills = skills.map(({ skillId, proficiency }) => ({ ...lookup.get(Number(skillId)), proficiency }));
    save(state);
    return wait({ student: state.profile });
  },
  async listSkills() { return wait({ skills: load().skills }); },
  async publicProjectSearch(skill = '') {
    const projects = load().projects.filter((project) => project.status !== 'cancelled' && (!skill.trim() || project.skills.some((item) => `${item.name} ${item.category ?? ''}`.toLowerCase().includes(skill.trim().toLowerCase()))));
    return wait({ projects: projects.slice(0, 6), count: projects.slice(0, 6).length });
  },
  async listProjects(search = '') {
    const state = load();
    const user = JSON.parse(localStorage.getItem('syncspace-user') ?? 'null');
    const mine = new URLSearchParams(search.replace(/^\?/, '')).get('mine') === 'true';
    return wait({ projects: mine ? state.projects.filter((project) => Number(project.ownerId) === Number(user?.id)) : state.projects });
  },
  async createProject(input) {
    const state = load();
    const user = JSON.parse(localStorage.getItem('syncspace-user') ?? 'null');
    const lookup = new Map(state.skills.map((skill) => [Number(skill.id), skill]));
    const project = {
      id: Date.now(), ownerId: user?.id, owner_name: user?.name ?? user?.profile?.name ?? 'Project owner',
      ownerProfileId: user?.profileId ?? user?.profile?.id,
      ...input, memberCount: 0, applicationCount: 0, pendingApplicationCount: 0,
      skills: input.skills.map(({ skillId, importance }) => ({ ...lookup.get(Number(skillId)), importance })),
      match: { score: 72, breakdown: { contributions: { requiredSkills: 32, preferredSkills: 10, domainInterest: 15, availability: 15 } } }
    };
    state.projects.unshift(project); save(state); return wait({ project });
  },
  async updateProject(id, input) {
    const state = load();
    const user = JSON.parse(localStorage.getItem('syncspace-user') ?? 'null');
    const project = state.projects.find((item) => Number(item.id) === Number(id));
    if (!project) throw new Error('Project not found');
    if (Number(project.ownerId) !== Number(user?.id)) throw new Error('Only the project owner can change this project');
    const lookup = new Map(state.skills.map((skill) => [Number(skill.id), skill]));
    Object.assign(project, input, {
      ...(input.skills ? { skills: input.skills.map(({ skillId, importance }) => ({ ...lookup.get(Number(skillId)), importance })) } : {})
    });
    save(state);
    return wait({ project });
  },
  async deleteProject(id) {
    const state = load();
    const user = JSON.parse(localStorage.getItem('syncspace-user') ?? 'null');
    const project = state.projects.find((item) => Number(item.id) === Number(id));
    if (!project) throw new Error('Project not found');
    if (Number(project.ownerId) !== Number(user?.id)) throw new Error('Only the project owner can change this project');
    const projectId = Number(id);
    state.projects = state.projects.filter((item) => Number(item.id) !== projectId);
    state.applications = state.applications.filter((item) => Number(item.projectId) !== projectId);
    state.teams = state.teams.filter((team) => Number(team.project_id) !== projectId);
    save(state);
    return wait({ deleted: true });
  },
  async adminProjects() {
    const state = load();
    const user = JSON.parse(localStorage.getItem('syncspace-user') ?? 'null');
    if (!user?.isAdmin) throw new Error('Administrator access required');
    return wait({ projects: state.projects.map((project) => {
      const owner = state.users.find((item) => Number(item.id) === Number(project.ownerId));
      return { ...project, status: project.status ?? 'open', createdAt: project.createdAt ?? '2026-08-10T10:00:00Z', ownerName: project.owner_name, ownerEmail: owner?.email ?? 'owner@thapar.edu', teamCount: state.teams.some((team) => Number(team.project_id) === Number(project.id)) ? 1 : 0 };
    }) });
  },
  async adminAudit() {
    const state = load();
    const user = JSON.parse(localStorage.getItem('syncspace-user') ?? 'null');
    if (!user?.isAdmin) throw new Error('Administrator access required');
    return wait({ audit: state.adminAudit });
  },
  async adminDeleteProject(id, { confirmation, reason }) {
    const state = load();
    const user = JSON.parse(localStorage.getItem('syncspace-user') ?? 'null');
    if (!user?.isAdmin) throw new Error('Administrator access required');
    const project = state.projects.find((item) => Number(item.id) === Number(id));
    if (!project) throw new Error('Project not found');
    if (confirmation !== project.title) throw new Error('Project title confirmation does not match');
    if (reason.trim().length < 8) throw new Error('Reason must contain at least 8 characters');
    const projectId = Number(id);
    state.projects = state.projects.filter((item) => Number(item.id) !== projectId);
    state.applications = state.applications.filter((item) => Number(item.projectId) !== projectId);
    state.teams = state.teams.filter((team) => Number(team.project_id) !== projectId);
    const audit = { id: Date.now(), action: 'project.delete', targetType: 'project', targetId: projectId, reason: reason.trim(), metadata: { title: project.title, ownerName: project.owner_name }, adminEmail: user.email, createdAt: new Date().toISOString() };
    state.adminAudit.unshift(audit);
    save(state);
    return wait({ deletedProject: project, audit });
  },
  async recommendations() { return wait({ recommendations: load().projects }); },
  async getProject(id) {
    const state = load();
    const user = JSON.parse(localStorage.getItem('syncspace-user') ?? 'null');
    const project = state.projects.find((item) => Number(item.id) === Number(id));
    if (!project) throw new Error('Project not found');
    const team = state.teams.find((item) => Number(item.project_id) === Number(project.id));
    const viewerProfileId = Number(user?.profileId ?? user?.profile?.id);
    const canViewTeamContacts = Number(project.ownerId) === Number(user?.id)
      || team?.members.some((member) => Number(member.profileId ?? member.id) === viewerProfileId);
    const teamContacts = canViewTeamContacts ? [
      { profileId: project.ownerProfileId, userId: project.ownerId, name: project.owner_name, email: team?.ownerEmail ?? state.directory.find((item) => Number(item.id) === Number(project.ownerProfileId))?.email, roleLabel: 'Creator' },
      ...(team?.members ?? []).map((member) => ({
        profileId: member.profileId ?? member.id, userId: member.userId ?? member.user_id, name: member.name, email: member.email, roleLabel: member.role_label ?? 'Collaborator'
      }))
    ].filter((contact) => contact.profileId && contact.email) : [];
    return wait({ project: { ...project, teamContacts, canViewTeamContacts: teamContacts.length > 0 } });
  },
  async listProjectQueries(id) {
    const state = load();
    const user = JSON.parse(localStorage.getItem('syncspace-user') ?? 'null');
    const project = state.projects.find((item) => Number(item.id) === Number(id));
    const queries = (state.queries ?? []).filter((item) => Number(item.projectId) === Number(id) && (Number(project?.ownerId) === Number(user?.id) || Number(item.askerUserId) === Number(user?.id)));
    return wait({ queries });
  },
  async createProjectQuery(id, question) {
    const state = load();
    const user = JSON.parse(localStorage.getItem('syncspace-user') ?? 'null');
    const project = state.projects.find((item) => Number(item.id) === Number(id));
    if (!project) throw new Error('Project not found');
    if (Number(project.ownerId) === Number(user?.id)) throw new Error('Project owners cannot raise a query on their own project');
    validateDemoQuery(question);
    const created = { id: Date.now(), projectId: Number(id), askerUserId: user?.id, askerName: user?.name ?? user?.profile?.name ?? 'Student', question: question.trim(), response: null, status: 'open', createdAt: new Date().toISOString(), answeredAt: null };
    state.queries ??= [];
    state.queries.unshift(created);
    state.notifications.unshift({ id: Date.now() + 1, message: `New query on ${project.title}.`, is_read: false, created_at: new Date().toISOString() });
    save(state);
    return wait({ query: created });
  },
  async answerProjectQuery(projectId, queryId, response) {
    const state = load();
    const user = JSON.parse(localStorage.getItem('syncspace-user') ?? 'null');
    const project = state.projects.find((item) => Number(item.id) === Number(projectId));
    if (!project) throw new Error('Project not found');
    if (Number(project.ownerId) !== Number(user?.id)) throw new Error('Only the project owner can answer queries');
    validateDemoQuery(response);
    const projectQuery = (state.queries ?? []).find((item) => Number(item.id) === Number(queryId) && Number(item.projectId) === Number(projectId));
    if (!projectQuery) throw new Error('Open project query not found');
    Object.assign(projectQuery, { response: response.trim(), status: 'answered', answeredAt: new Date().toISOString() });
    save(state);
    return wait({ query: projectQuery });
  },
  async apply(id) {
    const state = load();
    const project = state.projects.find((item) => Number(item.id) === Number(id));
    if (!state.applications.some((item) => Number(item.projectId) === Number(id))) {
      state.applications.push({ id: Date.now(), projectId: Number(id), title: project.title, domain: project.domain, status: 'pending', appliedAt: new Date().toISOString(), studentId: state.profile.id, name: state.profile.name, department: state.profile.department, year: state.profile.year, bio: state.profile.bio, availabilityHoursPerWeek: state.profile.availability_hours_per_week, skills: state.profile.skills });
      project.applicationCount = (project.applicationCount ?? 0) + 1;
      project.pendingApplicationCount = (project.pendingApplicationCount ?? 0) + 1;
      save(state);
    }
    return wait({ application: state.applications.at(-1) });
  },
  async listApplications() { return wait({ applications: load().applications }); },
  async projectApplications(id) { return wait({ applications: load().applications.filter((item) => Number(item.projectId) === Number(id)) }); },
  async decideApplication(id, status) {
    const state = load();
    const application = state.applications.find((item) => Number(item.id) === Number(id));
    if (!application || application.status !== 'pending') throw new Error('Application has already been decided.');
    application.status = status;
    const project = state.projects.find((item) => Number(item.id) === Number(application.projectId));
    if (project) project.pendingApplicationCount = Math.max((project.pendingApplicationCount ?? 1) - 1, 0);
    if (status === 'accepted') {
      let team = state.teams.find((item) => Number(item.project_id) === Number(application.projectId));
      if (!team) {
        team = {
          id: Date.now(), project_id: project.id, project_title: project.title, project_status: project.status ?? 'open',
          owner_id: project.ownerId, ownerId: project.ownerId, ownerProfileId: project.ownerProfileId,
          ownerName: project.owner_name, ownerEmail: state.directory.find((item) => Number(item.id) === Number(project.ownerProfileId))?.email,
          teamSize: project.teamSize, domain: project.domain,
          members: [{ id: state.profile.id, profileId: state.profile.id, user_id: state.profile.user_id, name: state.profile.name, email: state.profile.email, role_label: 'Team member' }], tasks: []
        };
        state.teams.push(team);
      }
      application.teamId = team.id;
    }
    save(state);
    return wait({ result: { applicationId: application.id, status, teamId: application.teamId ?? null } });
  },
  async listTeams() {
    const state = load();
    const user = JSON.parse(localStorage.getItem('syncspace-user') ?? 'null');
    const profileId = user?.profileId ?? user?.profile?.id;
    const teams = state.teams.filter((team) => Number(team.owner_id) === Number(user?.id) || team.members.some((member) => Number(member.user_id ?? member.id) === Number(profileId)))
      .map((team) => ({ id: team.id, projectId: team.project_id, projectTitle: team.project_title, projectStatus: team.project_status, teamSize: team.teamSize, memberCount: team.members.length, domain: team.domain }));
    return wait({ teams });
  },
  async getTeam(id) {
    const team = load().teams.find((item) => Number(item.id) === Number(id));
    if (!team) throw new Error('Team not found');
    return wait({ team });
  },
  async createTask(teamId, input) {
    const state = load();
    const team = state.teams.find((item) => Number(item.id) === Number(teamId));
    const member = team.members.find((item) => Number(item.id) === Number(input.assignedTo));
    const task = { id: Date.now(), team_id: Number(teamId), title: input.title, status: input.status ?? 'todo', assigned_to: input.assignedTo ?? null, assignee_name: member?.name ?? null, due_date: input.dueDate ?? null };
    team.tasks.push(task); save(state); return wait({ task });
  },
  async updateTask(id, input) {
    const state = load();
    const team = state.teams.find((item) => item.tasks.some((task) => Number(task.id) === Number(id)));
    const task = team?.tasks.find((item) => Number(item.id) === Number(id));
    if (!task) throw new Error('Task not found');
    Object.assign(task, input);
    if (input.assignedTo !== undefined) {
      task.assigned_to = input.assignedTo;
      task.assignee_name = team.members.find((item) => Number(item.id) === Number(input.assignedTo))?.name ?? null;
    }
    save(state); return wait({ task });
  },
  async notifications() { return wait({ notifications: load().notifications }); },
  async readNotification(id) {
    const state = load();
    const notification = state.notifications.find((item) => Number(item.id) === Number(id));
    notification.is_read = true; save(state); return wait({ notification });
  }
};
