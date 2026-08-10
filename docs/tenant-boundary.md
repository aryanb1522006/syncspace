# College boundary decision

## Decision

SyncSpace will not add a college-administrator console to this MVP. New public registrations are assigned to `DEFAULT_COLLEGE_ID`; clients cannot select an arbitrary `collegeId`. A deployment therefore has one managed onboarding college unless a future invitation or verified-domain service explicitly assigns another college.

Seeded accounts from multiple colleges remain useful for isolation testing, but new account placement is server-controlled.

## Enforcement layers

- JWTs receive `collegeId` from the persisted user record, never from a client claim.
- Project, recommendation, student, application, team, and task access paths filter or authorize against that persisted college.
- Project model reads, writes, and deletes carry the college boundary into SQL.
- Team access carries the college boundary into SQL in addition to checking owner or membership.
- Migration `004_tenant_boundaries.sql` makes college keys non-null.
- The database enforces that a project owner, project, applicant, and accepted team member all belong to the same college.

## Why no admin console yet

An admin interface would require an institution identity model, domain ownership verification, invitations, administrator recovery, audit logs, and explicit support processes. Adding a role label without those controls would create the appearance of tenant administration without a safe operating model.

## Trigger for revisiting

Add college administration when a second institution must onboard users independently. At that point implement:

1. Verified email-domain or invitation-based college assignment.
2. A distinct administrator role and scoped audit log.
3. College settings and membership lifecycle endpoints.
4. Administrator recovery and support procedures.
5. Row-level security or an equivalent database access policy if direct data tools are introduced.
