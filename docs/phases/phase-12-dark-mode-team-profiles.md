# Phase 12 - Dark mode and trusted team contacts

## Status

Complete in the repository and verified locally. Production deployment remains pending until the changes are committed, pushed, and both Render and Appwrite finish redeploying.

## Delivered

- A signed-in light/dark theme toggle that follows the saved preference and keeps the animated public landing page unchanged.
- A cleaner five-item navigation structure with project posting promoted to a separate action.
- A compact account block that shows the signed-in member and keeps theme/sign-out actions together.
- Relationship-aware contact authorization in PostgreSQL:
  - a member always sees their own contact;
  - a project creator and accepted collaborators can see one another;
  - pending applicants and unrelated college users cannot see team email contacts.
- Project-detail contact cards for the creator and accepted collaborators.
- Shared-workspace name/email details plus links to protected teammate profiles.
- A minimal read-only teammate profile containing name and authorized email only.
- Matching behavior in the local demo adapter.

## Privacy boundary

The general project list no longer returns the creator email. GET /api/students/:id returns only the member ID, user ID, name, contact-visibility flag, and email when an accepted-team relationship authorizes it.

Bio, interests, availability, resume data, and skills are not returned by the teammate profile endpoint. The richer profile remains available to its owner through GET /api/students/me.

## Verification

- Client tests: 8 passed.
- Server tests: 29 passed; 2 PostgreSQL tests are skipped unless RUN_DB_TESTS=true.
- Production React build: passed.
- Browser desktop:
  - dashboard rendered in dark and light themes;
  - theme toggle changed the document theme;
  - GreenGrid showed creator and accepted collaborator contacts;
  - shared workspace showed names, emails, and three profile links;
  - Kabir's protected profile showed the authorized email;
  - no relevant console warnings or errors.
- Browser mobile at 390 x 844:
  - five-item navigation rendered;
  - separate post-project action remained visible;
  - workspace contacts and profile links remained reachable;
  - no relevant console warnings or errors.
- PostgreSQL integration coverage creates an isolated temporary project/team and proves:
  - creator -> collaborator contact access succeeds;
  - collaborator -> creator contact access succeeds;
  - unrelated student access fails;
  - project contact lists are empty for the unrelated student.

## Production checklist

- [ ] Commit and push Phase 12.
- [ ] Confirm Render deploys the relationship-aware API.
- [ ] Confirm Appwrite deploys the themed React client.
- [ ] Confirm the GitHub PostgreSQL integration test runs with RUN_DB_TESTS=true.
- [ ] Sign in with two real Thapar accounts, accept one into a team, and verify reciprocal email/profile visibility.
- [ ] Confirm a pending applicant cannot see project contact emails.
- [ ] Confirm an unrelated authenticated Thapar account cannot see a teammate email by changing the profile URL.
- [ ] Test dark mode in production on desktop Chrome, desktop Firefox, and one mobile browser.

