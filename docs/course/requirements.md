# Requirements and user stories

## Stakeholders and actors

| Actor | Need |
|---|---|
| Student collaborator | Find relevant open projects, apply once, track the decision, and contact accepted teammates. |
| Student project owner | Publish an accurate brief, review applicants, protect capacity, and coordinate accepted members. |
| Accepted team member | See the same authorized workspace, teammate profiles, contact points, tasks, and progress. |
| Pilot administrator | Remove inappropriate or obsolete projects inside the same college boundary with an audit reason. |
| Lab evaluator | Inspect requirements, design, iteration history, tests, deployed evidence, and measured outcomes. |

## Functional requirements

| ID | Requirement | Acceptance evidence |
|---|---|---|
| FR-01 | The system shall authenticate only identities accepted by the configured institutional policy. | Google token verification is server-side and exact-domain tests reject personal accounts. |
| FR-02 | A student shall maintain one profile containing identity, department, year, availability, bio, interests, and proficiency-rated skills. | Profile API and responsive edit screen support manual skills and reviewed resume suggestions. |
| FR-03 | A student shall use the same account to join projects and publish projects. | Signed-in navigation exposes Discover and Post a project without changing roles. |
| FR-04 | An owner shall create, update, publish, close, and delete only their projects. | Ownership middleware/API tests and creator-only controls enforce the lifecycle. |
| FR-05 | The system shall rank eligible projects and explain score components and gaps. | The API returns required/preferred skill, interest, availability, and commitment components. |
| FR-06 | A student shall apply at most once per project and view live application state. | Database uniqueness, application endpoints, and the Applications page enforce this. |
| FR-07 | An owner shall accept or reject pending applications without exceeding team capacity. | A transaction locks the project/application and creates or extends the team safely. |
| FR-08 | Only a creator and accepted collaborators shall see team contact details and member profiles. | Relationship-aware queries and SQL-backed authorization tests gate email/profile responses. |
| FR-09 | Accepted members shall share a workspace with task creation, assignment, status, and progress. | Team and task endpoints plus the three-state board implement the workflow. |
| FR-10 | The system shall notify users about material application and team events. | Notification records and polling menu expose unread updates. |
| FR-11 | A configured verified administrator shall remove tenant projects only with exact-title confirmation and a reason. | Admin route, audit migration, UI confirmation, and negative tests enforce the action. |
| FR-12 | The system shall store uploaded resumes outside the web process in production. | The storage adapter uses a private S3-compatible Supabase bucket and presigned access. |

## Non-functional requirements

| ID | Requirement | Planned/implemented measure |
|---|---|---|
| NFR-01 Security | Authorization is enforced server-side; secrets never enter the client bundle or repository. | Ownership, relationship, domain, tenant, and admin negative tests; deployment secrets. |
| NFR-02 Privacy | Contact email and resume access follow least privilege. | List responses omit owner email; member contacts appear only after acceptance. |
| NFR-03 Reliability | Database transitions that create teams or remove moderated projects are atomic. | PostgreSQL transactions, row locks, constraints, rollback tests, and readiness checks. |
| NFR-04 Explainability | A user can inspect why an item ranked where it did. | Four visible score components, gaps, and deterministic scoring tests. |
| NFR-05 Accessibility | Core workflows remain keyboard operable, labelled, and readable in light/dark modes. | Semantic controls, contrast fixes, desktop/mobile browser review, and UI tests. |
| NFR-06 Performance | The first meaningful application page should remain usable on common mobile networks. | Production bundle monitoring and pilot page/error timing; Three.js is limited to the landing page. |
| NFR-07 Maintainability | HTTP, domain, persistence, matching, and storage concerns remain separable. | Routes/controllers/models/services structure and a pure matching module. |
| NFR-08 Portability | The application can run locally and on managed infrastructure. | Environment-driven adapters, Dockerfiles, Compose, migrations, seed, and runbook. |
| NFR-09 Auditability | Destructive administrator actions retain actor, reason, target snapshot, and time. | `admin_audit_logs` persists before the project deletion commits. |

## Story cards

### US-01 — Discover and apply

**As a** verified student, **I want** projects ranked against my profile **so that** I can apply where my contribution is useful.

Acceptance criteria:

- recommendations show score, capacity, deadline, required skills, and the four-component explanation;
- closed, full, expired, duplicate-applied, or cross-college projects are ineligible;
- a successful application appears immediately with `pending` status.

### US-02 — Publish and review

**As a** student owner, **I want** to publish a structured brief and decide applications **so that** I can form a team without spreadsheets or message threads.

Acceptance criteria:

- the owner supplies title, domain, summary, commitment, capacity, deadline, and skills;
- only the owner can edit/delete and review its applications;
- accepting an applicant never exceeds capacity and creates authorized workspace membership.

### US-03 — Collaborate after acceptance

**As an** accepted member, **I want** a shared workspace and teammate contact points **so that** the team can begin work immediately.

Acceptance criteria:

- creator and accepted members see one another's name, email, profile link, and membership role;
- outsiders receive no contact data and cannot open the workspace;
- members can create, assign, and move tasks through to done.

### US-04 — Moderate pilot content

**As the** configured pilot administrator, **I want** to remove an unusable project with an audit reason **so that** the 50-student pilot stays safe and relevant.

Acceptance criteria:

- the control is absent for ordinary users;
- exact title and a reason of at least eight characters are required;
- the action cannot cross `college_id` and its audit record survives deletion.
