# Phase 17 - Personal admin project control

## Status

Complete in the repository and verified locally. Migration `006_admin_controls.sql`, the Render `ADMIN_EMAILS` setting, and fresh sign-in tokens are required before the control is available on the public site.

## Delivered

- Add an exact-email administrator allowlist controlled through `ADMIN_EMAILS`.
- Grant the administrator claim only to verified allowlisted users when a new access token is issued.
- Enforce administrator access again on every `/api/admin/*` request; hiding the client navigation is only a usability layer.
- List only projects inside the administrator's current `college_id` boundary.
- Permit an administrator to remove a project owned by another user only after the exact title and an 8-500 character reason are supplied.
- Record the actor, target, reason, project snapshot, and timestamp in `admin_audit_logs` before deleting the project.
- Add a responsive Project control screen with search, status filtering, summary metrics, owner contact, destructive confirmation, and recent activity.
- Keep the control invisible and inaccessible to ordinary users.

## Security decisions

- No admin email is hard-coded into production source. The deployment platform owns the allowlist.
- `ADMIN_EMAILS` uses exact normalized addresses; suffix or substring matches are never accepted.
- Production admin addresses must also belong to `ALLOWED_EMAIL_DOMAIN`.
- The user must already be email verified before the server places `isAdmin: true` in a new JWT.
- Authentication middleware accepts the claim only while the email remains on the current server allowlist, so removing the address revokes admin requests even before an old token expires.
- The delete query is tenant scoped and locked in a short transaction. Audit insertion and deletion succeed or roll back together.
- Project deletion is permanent and cascades through its applications, team workspace, membership, and tasks according to the existing foreign keys; the audit row remains.

## Verification

- Unit/API coverage rejects ordinary tokens, validates exact allowlist matching, and accepts only an explicit valid admin identity.
- Client coverage confirms that an admin sees Project control, can delete another owner's project only after confirmation, and that a normal user cannot see the control.
- The SQL-backed integration test covers title confirmation, cross-tenant denial, deletion, and the retained audit snapshot.
- Production React build completes successfully.

## Production checklist

- [ ] Commit and push Phase 17.
- [ ] Run `pnpm db:migrate` against the production Supabase database to apply migration 006.
- [ ] Set Render `ADMIN_EMAILS=abansal6_be24@thapar.edu` without quotes or spaces.
- [ ] Redeploy Render and confirm `/api/health/ready` returns `status: ok`.
- [ ] Confirm Appwrite finishes the matching frontend deployment.
- [ ] Sign out and sign in with the allowlisted verified Google account to obtain a fresh admin JWT.
- [ ] Open **Admin control** and confirm it is absent for a normal Thapar account.
- [ ] Delete only a disposable pilot project and confirm the reason appears in Recent admin activity.

## Known constraint

This is a focused project-moderation role, not a general superuser system. It does not let the administrator read private resumes, impersonate users, edit teams, or access another college.
