# SyncSpace Deployment Status

Last updated: 2026-08-11

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

## Remaining deployment work

- [ ] Confirm that the database password exposed in setup screenshots was rotated and that Render uses the replacement URI
- [ ] Commit and push this deployment status document to GitHub

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
