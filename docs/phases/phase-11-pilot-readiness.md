# Phase 11 - 50-student pilot readiness and data hygiene

## Status

Pilot preparation is complete in the repository. The production cleanup is intentionally pending until its dry-run output is reviewed with the live Supabase connection.

## Delivered

- A dry-run-first cleanup command for known seeded, QA, and smoke projects.
- Parameterized PostgreSQL selection and deletion queries.
- An explicit confirmation phrase before destructive mode is accepted.
- A short transaction, 15-second statement timeout, deterministic project locking, and cascade-count preview.
- Unit coverage proving that ordinary projects owned by Thapar accounts are never selected by name alone.
- A pilot checklist for the first 50 invited students.

## Cleanup scope

The command can select:

- Seeded projects GreenGrid, StudyCircle, BuildLog, and PocketPulse only when they belong to the seeded Northstar or Riverdale owners.
- The exact QA title [QA] Phase 8 Live Check.
- Titles beginning with Smoke Project only when the owner uses the smoke.syncspace.test domain.

It does not delete users, colleges, skills, resumes, or ordinary Thapar-owned projects. Deleting a selected project uses the existing foreign keys to cascade its project skills, applications, teams, team memberships, and team tasks.

## Run the production cleanup

Use the Supabase Session pooler connection. Do not paste the database URL into chat, documentation, or Git.

~~~powershell
cd "C:\Users\Aryan\Documents\Codex\2026-08-10\bu\outputs\syncspace"

$env:DATABASE_URL = "YOUR_ROTATED_SUPABASE_POOLER_URL"
$env:DATABASE_SSL_MODE = "require"

# Read-only preview
pnpm.cmd db:cleanup:pilot

# Run only after every previewed project is confirmed as disposable
pnpm.cmd db:cleanup:pilot -- --apply --confirm=REMOVE_TEST_PROJECTS

# A second preview should return candidateCount: 0
pnpm.cmd db:cleanup:pilot

Remove-Item Env:DATABASE_URL
Remove-Item Env:DATABASE_SSL_MODE
Clear-History
~~~

## Pilot launch gate

SyncSpace is suitable for a controlled 50-student beta after all of these are true:

- [ ] The cleanup preview contains only disposable projects and apply mode completes.
- [ ] Production college ID 1 is confirmed to represent Thapar rather than the Northstar seed label.
- [ ] Five internal students complete sign-in, profile, post, apply, accept/reject, team contact, task, and resume flows.
- [ ] A short privacy notice explains resume storage and when accepted teammates can see email addresses.
- [ ] A support contact and a way to report an abusive or incorrect project are visible.
- [ ] Render readiness and Appwrite homepage checks are performed immediately before invitations.
- [ ] Supabase backup/export and recovery ownership are recorded.
- [ ] One person watches Render logs and Supabase usage during the first invitation window.

## Recommended cohort

- Invite 5 project creators first and have them publish real projects.
- Invite 10 early collaborators for a two-day dress rehearsal.
- Expand to the remaining 35 students only after the first applications and team acceptances succeed.
- Keep the pilot invitation-only and Thapar-domain-only.

## Pilot measurements

Record only product-level metrics needed to improve the beta:

- Successful Google sign-ins and failed sign-ins.
- Completed profiles.
- Real projects created.
- Applications submitted and decisions made.
- Teams formed and collaborators who can reach the workspace.
- Resume upload failures, API 5xx responses, and median response time.
- A short opt-in feedback survey after three to seven days.

Do not treat this phase as an unrestricted public launch. Monitoring, moderation, privacy communication, backups, and a support process remain launch responsibilities even when the technical workflow passes.
