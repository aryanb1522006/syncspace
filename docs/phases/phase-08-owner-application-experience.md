# Phase 8 — Owner and application experience

Status: Complete in the repository; production deployment pending

## Goal

Complete the browser workflow that previously required direct API calls: project owners can publish projects, review incoming student applications, accept or reject them, and open the resulting team workspace. Students can track those decisions from a live application page.

## Delivered scope

- Role-aware dashboard routing:
  - students keep the explainable project recommendation dashboard;
  - owners receive a project-management dashboard with live application counts.
- Owner-only project creation page backed by the canonical skill dictionary.
- Owner application inbox with a 15-second refresh interval and manual refresh control.
- Accept and reject controls wired to the existing transactional application workflow.
- Student application tracker backed by PostgreSQL data, with pending, accepted, and rejected states.
- Dynamic team discovery for owners and students; no navigation link contains a hard-coded team ID.
- Team list and empty states for users who do not yet have a workspace.
- Role-aware project detail actions and safe rendering when a project has no recommendation score.
- Login responses now include the saved profile name so owner identity is rendered correctly.
- Demo-mode parity for project creation, application decisions, and multi-team navigation.

## API additions

| Endpoint | Role | Purpose |
|---|---|---|
| `GET /api/applications` | Student | List the authenticated student's applications and accepted team links |
| `GET /api/projects?mine=true` | Owner | List only projects owned by the authenticated owner, with application counts |
| `GET /api/teams` | Student or owner | List only team workspaces the authenticated user can access |

Existing endpoints power the write workflow:

- `POST /api/projects`
- `GET /api/projects/:id/applications`
- `PUT /api/applications/:id`

Accepting an application still delegates to the existing locked PostgreSQL transaction. It creates or reuses the project team, rechecks capacity, adds the student, records the decision, and sends the notification atomically.

## Verification

- Server: 22 passed, 0 failed, 1 SQL-backed test skipped locally because PostgreSQL is not running.
- Client: 4 passed, 0 failed.
- Production React build: passed; 1,706 modules transformed.
- Interactive desktop journey:
  - owner login;
  - owner dashboard and project counts;
  - create project with a required skill;
  - open the live application inbox;
  - accept a student;
  - open the generated team workspace.
- Interactive mobile journey:
  - student application status;
  - accepted-state action;
  - four-item role-aware mobile navigation.
- Browser console after the final reload: no new warnings or errors.

## Deployment boundary

The repository implementation is complete, but the public Appwrite and Render services do not receive this phase until the branch is pushed and both providers finish their automatic deployments. After deployment, repeat the owner-to-student journey against the live Supabase database before marking Phase 8 production-verified.
