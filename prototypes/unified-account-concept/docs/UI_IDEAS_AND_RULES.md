# UI ideas and product rules

## Recommended UI changes

1. Replace permanent `student` versus `owner` navigation with one account navigation. Ownership is
   a relationship to a project, not a permanent user identity.
2. After login, make the first decision explicit: `Post a project` or `Join a project`. Keep both
   actions visible on the same screen.
3. Rename the account area to `My projects` and show two filters later: `I lead` and `I joined`.
   This scales better than separate role dashboards.
4. Keep `Applications` centralized. A user should see applications they sent and applications
   received for projects they own, distinguished by a simple `Sent` / `Received` filter.
5. Make `Teams` dynamic: list every accepted team, regardless of whether the user owns or joined
   the project.
6. Put contact details inside the accepted team surface, not on public project listings or pending
   application screens.
7. Use an email-copy button and a `mailto:` action near each accepted member. Avoid exposing emails
   in search, discovery, or public HTML metadata.

## Contact privacy rule

The production API—not only the React interface—must enforce this rule:

```text
viewer may read a member email when
viewer is the project owner OR an accepted collaborator
AND the requested person is the owner OR an accepted collaborator
AND both belong to the same project team
```

Pending, rejected, withdrawn, blocked, unauthenticated, and unrelated users must receive no team
email field. Returning `null` or omitting the field is safer than sending it and hiding it with CSS.

## Scope of this experiment

The landing page and transition into one unified account are the design focus. Post and join flows
are deliberately small local mocks. They do not call the SyncSpace API, alter PostgreSQL, upload a
resume, or change the deployed Appwrite/Render applications.

## Later production integration

- Remove any permanent `owner`/`student` gate from registration and login responses.
- Derive project-owner permissions from `projects.owner_id`.
- Derive collaborator permissions from an accepted application or team membership record.
- Add API authorization tests for same-team email access and cross-team denial.
- Add a migration only if the current user-role column blocks one account from taking both actions.
- Reuse the existing project creation and application endpoints behind the two unified actions.
