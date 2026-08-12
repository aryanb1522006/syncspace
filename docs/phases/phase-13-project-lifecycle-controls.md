# Phase 13 - Project lifecycle controls

## Status

Complete in the repository and verified locally. Production deployment is pending a commit, push, and successful Appwrite redeploy.

## Delivered

- Creator-only Edit actions on every project in the owner dashboard.
- A protected edit route at `/projects/:id/edit` that loads the existing brief, team shape, deadline, and skill requirements.
- Save behavior backed by the existing `PUT /api/projects/:id` endpoint.
- Creator-only Delete actions on the owner dashboard.
- A destructive-action confirmation explaining that the project, applications, and team workspace will be removed.
- Delete behavior backed by the existing `DELETE /api/projects/:id` endpoint.
- Immediate dashboard removal after a successful delete, with an inline error if the API rejects the operation.
- Equivalent update and delete behavior in the local demo adapter.
- A neutral black/charcoal signed-in dark palette, retaining lime only as the primary SyncSpace accent.

## Authorization and data behavior

The frontend hides edit controls from general project browsing and checks ownership before showing the edit form. This is only a usability guard. The Express API remains authoritative: both update and delete load the tenant-scoped project and reject any user whose ID does not match `owner_id`.

Deleting a PostgreSQL project also removes dependent applications and team-workspace records through the database foreign-key cascade rules. The confirmation message makes that scope explicit before the request is sent.

## Verification

- Client tests: 11 passed.
- Production React build: passed.
- Desktop and 390 x 844 mobile browser QA: passed with no relevant console warnings or errors.
- Computed dark-theme surfaces verified as neutral values: page `#090909`, surface `#141414`, raised surface `#1e1e1e`, and border `#343434`.
- Automated UI coverage proves:
  - an owner can load and save the populated edit form;
  - a non-owner cannot see the edit form;
  - the owner dashboard exposes edit and delete actions;
  - deletion requires a confirmation dialog;
  - a confirmed deletion removes the project from the dashboard.

## Production checklist

- [ ] Commit and push Phase 13.
- [ ] Confirm Appwrite deploys the new React bundle.
- [ ] Confirm the public dark theme uses neutral black/grey surfaces on desktop and mobile.
- [ ] Sign in with a real Thapar account that owns a test project.
- [ ] Edit the project title or description and confirm the public detail page updates.
- [ ] Create a disposable project, delete it, and confirm its applications/workspace are no longer available.
- [ ] Confirm another authenticated account cannot open the owner's edit URL or call the mutation endpoints successfully.
