# SyncSpace Deployment Status

Last updated: 2026-08-13

## Public services

- API origin: https://syncspace-53r3.onrender.com
- API health: https://syncspace-53r3.onrender.com/api/health
- Database readiness: https://syncspace-53r3.onrender.com/api/health/ready
- Appwrite site: https://syncspace.appwrite.network

## Completed

- [x] Connect the GitHub repository to Render
- [x] Deploy the Express API as a Render web service
- [x] Configure the Supabase Session pooler connection
- [x] Confirm the live API can query PostgreSQL
- [x] Apply `001_core.sql`
- [x] Apply `002_projects_and_teams.sql`
- [x] Apply `003_tasks_and_notifications.sql`
- [x] Apply `004_tenant_boundaries.sql`
- [x] Seed the database with demo accounts and projects
- [x] Verify live login for `isha@northstar.edu`
- [x] Verify the live API returns `GreenGrid` and `StudyCircle`
- [x] Configure `VITE_DEMO_MODE=false` in Appwrite Sites
- [x] Configure `VITE_API_URL=https://syncspace-53r3.onrender.com/api` in Appwrite Sites
- [x] Redeploy the Appwrite site
- [x] Set Render `CLIENT_ORIGIN` to the Appwrite site origin
- [x] Test login through the deployed frontend
- [x] Configure the private Supabase S3-compatible bucket and server credentials
- [x] Upload a PDF resume through the deployed frontend
- [x] Confirm the resume upload is persisted through Supabase Storage
- [x] Record the public Appwrite site URL
- [x] Confirm `GreenGrid` and `StudyCircle` render through the deployed frontend
- [x] Confirm the public Appwrite site returns HTTP 200
- [x] Confirm the Render API accepts CORS preflight requests from the Appwrite origin
- [x] Complete Phase 8 role-based owner pages in the repository
- [x] Add owner project creation and live application review controls
- [x] Add student application tracking backed by the API
- [x] Add dynamic accessible-team navigation without hard-coded team IDs
- [x] Verify the Phase 8 demo journey at desktop and mobile sizes
- [x] Replace the production landing route with the approved immersive Three.js and Anime.js page
- [x] Unify join and post capabilities under every authenticated account
- [x] Preserve creator-only project mutation and applicant decision authorization
- [x] Restrict team email contacts to creators and accepted collaborators
- [x] Add server-verified Google Sign-In with exact `thapar.edu` checks
- [x] Add `005_verified_identity.sql` and Google domain tests
- [x] Verify Phase 9 locally: 25 server tests, 4 client tests, production build, browser motion and CTA pass
- [x] Diagnose the deployed landing page content being left at opacity zero
- [x] Make all critical landing content visible without depending on Anime.js completion
- [x] Add the complete Discover -> Apply -> Review -> Build -> Deliver feature journey
- [x] Verify Phase 10 locally: 5 client tests, production build, desktop/mobile rendering, reveal state, and CTA navigation
- [x] Push Phase 10 and confirm the repaired landing page is live on Appwrite
- [x] Redeploy Render with the Google-auth route and confirm a real Thapar sign-in works
- [x] Remove the obsolete role field from the CI smoke payload and push commit d1ecf2e
- [x] Add dry-run-first pilot cleanup tooling with four selector safety tests
- [x] Add a persistent signed-in light/dark theme preference
- [x] Refine dark mode to a neutral black/charcoal palette while retaining the lime brand accent
- [x] Simplify signed-in navigation and separate the post-project action
- [x] Restrict project email contacts to creators and accepted collaborators
- [x] Remove creator email from the general project-list response
- [x] Add authorized project contact cards, workspace contact links, and minimal teammate profiles
- [x] Add PostgreSQL relationship-authorization integration coverage
- [x] Verify Phase 12 locally: 29 runnable server tests, 8 client tests, production build, and desktop/mobile browser QA
- [x] Add creator-only project edit controls backed by the existing authorized update endpoint
- [x] Add confirmed project deletion backed by the existing authorized delete endpoint
- [x] Verify Phase 13 locally: 11 client tests, production React build, and desktop/mobile browser QA
- [x] Replace fixed skill ratings with editable 1-5 proficiency controls
- [x] Add manual dictionary-based skill entry alongside reviewed resume suggestions
- [x] Fix dark-mode contrast for skill chips, controls, and lime primary actions
- [x] Remove the duplicate My Projects right-rail create action
- [x] Fit the landing typography and Three.js constellation to narrow mobile viewports
- [x] Verify Phase 14 locally: 12 client tests, production React build, and desktop/mobile browser QA
- [x] Remove the redundant Profile item while retaining the signed-in name as the edit-profile link
- [x] Add stable user-ID teammate profile routes with backward-compatible profile-ID lookup
- [x] Show teammate bio, department, year, availability, interests, and skills without weakening contact privacy
- [x] Verify Phase 15 locally: 29 server tests, 13 client tests, production React build, and desktop/mobile browser QA
- [x] Diagnose the public teammate-profile failure as a PostgreSQL `BIGINT` to JWT string-type mismatch
- [x] Normalize authenticated user and college IDs before tenant authorization checks
- [x] Verify the Phase 16 regression locally: 31 server tests pass and 2 database-only tests skip without credentials
- [x] Add exact-email, verified-account administrator authorization without hard-coding production identity
- [x] Add tenant-scoped project moderation with exact-title confirmation, required reason, and durable audit history
- [x] Add a responsive Project control screen hidden from ordinary accounts
- [x] Document production chat-encryption alternatives while keeping the Web Crypto chat prototype outside `main`

## Remaining deployment work

- [ ] Confirm that the database password exposed in setup screenshots was rotated and that Render uses the replacement URI
- [x] Commit and push Phase 12
- [ ] Confirm Render deploys the relationship-aware API
- [ ] Confirm Appwrite deploys the dark-mode and teammate-profile client
- [ ] Confirm CI executes the accepted-team PostgreSQL authorization test
- [ ] Test reciprocal teammate email/profile visibility with two real Thapar accounts
- [x] Commit and push Phase 13 project lifecycle controls
- [ ] Confirm Appwrite deploys the project edit and delete controls
- [ ] Edit and delete a disposable owner-created project on the public site
- [x] Commit and push Phase 14 profile-skill and responsive-polish changes
- [ ] Confirm Appwrite deploys the Phase 14 React bundle
- [ ] Verify manual skills, resume suggestions, dark contrast, and mobile landing fit on the public site
- [x] Commit and push Phase 15 stable teammate-profile changes
- [ ] Confirm Render deploys `GET /api/students/by-user/:userId`
- [ ] Confirm Appwrite deploys the four-item navigation and stable teammate links
- [ ] Test creator and collaborator profile links from a real public team workspace
- [x] Commit and push Phase 16 production profile identity hotfix
- [ ] Confirm Render redeploys the Phase 16 API (no Appwrite rebuild is required)
- [ ] Sign in again and confirm `/profiles/users/11` loads from the public shared workspace
- [ ] Apply `006_admin_controls.sql` to the production Supabase database
- [ ] Set Render `ADMIN_EMAILS=abansal6_be24@thapar.edu` and redeploy the API
- [ ] Sign out and sign in again with that verified Google account to receive the admin claim
- [ ] Confirm **Admin control** is visible only to that account on the public site
- [ ] Delete one disposable project and confirm its reason is retained in Recent admin activity
- [x] Commit and push Phase 17 personal administrator controls
- [ ] Commit and push this deployment status document to GitHub
- [ ] Confirm Render automatically deploys the updated Express API
- [ ] Run the owner create → student apply → owner accept/reject → team workspace journey against the public site
- [ ] Confirm a personal Gmail account is rejected by the production Google sign-in flow
- [ ] Run the pilot cleanup dry run against Supabase and review every selected project
- [ ] Apply the cleanup and confirm the second preview returns zero candidates
- [ ] Confirm production college ID 1 is labeled for Thapar rather than the Northstar seed tenant
- [ ] Complete a five-student dress rehearsal of the full workflow
- [ ] Invite the first controlled cohort of 50 Thapar students
- [ ] Repeat the complete join + post workflow with one account on the public site

## Optional production hardening

- [ ] Connect a custom domain and DNS
- [ ] Connect an external uptime/alert receiver
- [ ] Configure an automated off-host database backup destination
- [ ] Decide whether college-level tenant administration is required beyond the current `college_id` boundary
- [ ] Remove the unused Render PostgreSQL resource after confirming Supabase is the sole production database

## Verified live API journey

On 2026-08-11, the deployed API authenticated the seeded student account and returned two tenant-scoped projects:

- `GreenGrid`
- `StudyCircle`

The deployed frontend was subsequently verified to authenticate against the live API and upload a PDF resume through the S3-compatible storage adapter to Supabase Storage.

The public Appwrite site returned HTTP 200, and the Render API returned HTTP 204 to a CORS preflight from `https://syncspace.appwrite.network` with that exact allowed origin. The deployed dashboard displayed both seeded projects.

No credentials, database URLs, JWTs, or storage secrets are recorded in this document.

## Phase 9 development status

The immersive landing replacement, unified account capabilities, creator-only authorization, protected team contact emails, and Thapar-restricted Google token verification are complete and verified locally. The current public URL remains https://syncspace.appwrite.network, but Phase 9 must be treated as pending there until the Google credentials and build variables are configured, migration 005 is applied, GitHub triggers successful Render and Appwrite deployments, and the public end-to-end checklist passes. See `docs/phases/phase-09-unified-account-identity.md`.
