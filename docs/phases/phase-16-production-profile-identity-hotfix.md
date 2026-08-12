# Phase 16 - Production profile identity hotfix

## Status

Complete in the repository and verified locally. Render must redeploy the API before the public profile route reflects this repair. The React bundle does not change in this phase.

## Root cause

PostgreSQL returns `BIGINT` identity columns as strings. The signed JWT therefore preserved `collegeId` as a string, while the profile authorization check compared it strictly with a numeric college ID. A valid same-college teammate could consequently receive `404 Student profile not found` from `/api/students/by-user/:userId`.

## Delivered

- Normalize the JWT subject and `collegeId` claim to positive safe integers in the authentication middleware.
- Serialize new `collegeId` JWT claims as numbers while retaining compatibility with existing string-valued tokens.
- Reject malformed identity claims before they can reach an authorization decision.
- Normalize both sides of the profile tenant comparison as a defense-in-depth check.
- Add a regression test using the exact string-valued identity claims produced by PostgreSQL-backed login.

## Verification

- Server tests: 31 passed and 2 SQL-backed tests skipped without `RUN_DB_TESTS=true`.
- The new regression test verifies that subject `"11"` and college ID `"1"` become numeric request identity values.
- No frontend files changed; Appwrite does not need to rebuild for this hotfix.

## Production checklist

- [ ] Commit and push Phase 16.
- [ ] Confirm Render redeploys the API.
- [ ] Sign out and sign in again to obtain a fresh token.
- [ ] Open `/profiles/users/11` from the shared workspace.
- [ ] Confirm an accepted teammate can view the profile and email address.
- [ ] Confirm an unrelated account still receives the privacy-preserving not-found response.
