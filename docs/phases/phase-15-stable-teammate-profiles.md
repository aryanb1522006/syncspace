# Phase 15 - Stable teammate profiles and simplified navigation

## Status

Complete in the repository and verified locally. Production deployment requires both Render and Appwrite to redeploy because this phase changes the API contract and the React routes.

## Delivered

- Removed the redundant Profile item from desktop and mobile application navigation.
- Kept the signed-in name and avatar as the single entry point for editing the current user's profile at `/profile`.
- Added a stable teammate route at `/profiles/users/:userId` instead of relying on profile, membership, or row IDs that can be confused across API responses.
- Added `GET /api/students/by-user/:userId` while preserving `GET /api/students/:profileId` for backward compatibility.
- Returned the teammate's department, year, bio, availability, interests, and skill proficiency for the profile screen.
- Kept email visibility protected by the existing creator/accepted-teammate relationship check.
- Added explicit `userId` fields to team owner/member responses and demo data.
- Added a compatibility fallback to the older profile-ID URL when an older API response does not yet contain a user ID.
- Rebalanced mobile bottom navigation from five columns to four.

## Verification

- Server tests: 29 passed and 2 SQL-backed tests skipped without `RUN_DB_TESTS=true`.
- Client tests: 13 passed.
- Production React build: passed.
- Regression coverage verifies that the sidebar has no Profile link, the account name still links to `/profile`, teammate links use stable user IDs, and an accepted teammate profile renders instead of the former not-found state.
- Desktop browser journey: team workspace -> Kabir Shah profile -> authorized email, bio, department, availability, interests, and skills rendered.
- Mobile browser QA at 390 x 844: four navigation items, no horizontal overflow, and the teammate profile remains readable.
- Browser console: no warnings or errors during the verified journey.

## Production checklist

- [ ] Commit and push Phase 15.
- [ ] Confirm Render redeploys the new `/api/students/by-user/:userId` endpoint.
- [ ] Confirm Appwrite deploys the updated team links and profile screen.
- [ ] Open a real shared workspace and visit both the creator and collaborator profiles.
- [ ] Confirm accepted teammates see each other's email while an unrelated account does not.
- [ ] Confirm clicking the signed-in name opens the current user's editable profile.

