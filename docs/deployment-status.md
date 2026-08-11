# SyncSpace Deployment Status

Last updated: 2026-08-12

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

## Remaining deployment work

- [ ] Commit and push Phase 10, confirm Appwrite redeploys, and repeat the landing smoke test on the public URL

- [ ] Confirm that the database password exposed in setup screenshots was rotated and that Render uses the replacement URI
- [ ] Commit and push this deployment status document to GitHub
- [ ] Commit and push the Phase 8 application and owner workflow changes
- [ ] Confirm Render automatically deploys the updated Express API
- [ ] Confirm Appwrite Sites automatically deploys the updated React bundle
- [ ] Run the owner create → student apply → owner accept/reject → team workspace journey against the public site
- [ ] Create the Google OAuth web client and authorize the Appwrite and localhost origins
- [ ] Set Render `GOOGLE_CLIENT_ID`, `AUTH_ALLOWED_EMAIL_DOMAIN=thapar.edu`, and `PASSWORD_AUTH_ENABLED=false`
- [ ] Run migration `005_verified_identity.sql` against production PostgreSQL
- [ ] Set Appwrite `VITE_GOOGLE_CLIENT_ID`, `VITE_AUTH_ALLOWED_EMAIL_DOMAIN=thapar.edu`, and `VITE_PASSWORD_AUTH_ENABLED=false`
- [ ] Confirm one real Thapar Workspace account works and personal Gmail is rejected
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
