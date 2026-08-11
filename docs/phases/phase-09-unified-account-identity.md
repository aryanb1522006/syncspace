# Phase 9 — immersive landing, unified accounts, and verified identity

Status: complete in the repository; production configuration and public end-to-end verification remain.

## Outcome

- The accepted Three.js and Anime.js landing page now replaces the previous production landing route.
- Every authenticated account can discover and apply to projects, publish projects, review applicants for projects it owns, and use team workspaces.
- Project ownership remains the authorization boundary for edit, delete, application review, and accept/reject actions.
- Creator and accepted collaborator emails are returned only by the access-controlled team endpoint.
- Google Sign-In is implemented with exact `@thapar.edu` Google Workspace enforcement on the Express server.

## Completed checklist

- [x] Replace the routed React landing page with the approved immersive design.
- [x] Connect all landing calls to action to real registration, dashboard, and project routes.
- [x] Lazy-load the landing animation bundle.
- [x] Dispose animation frames, listeners, observers, WebGL resources, and CSS fallback state.
- [x] Give both legacy account roles the join and post capabilities.
- [x] Keep creator-only checks for project mutation and applicant decisions.
- [x] Prevent creators from applying to their own projects.
- [x] Add Discover, Applications, My projects, Post project, Teams, and Profile to one navigation.
- [x] Show creator and accepted collaborator email addresses inside authorized team workspaces.
- [x] Add Google Identity Services to React.
- [x] Verify Google ID tokens with Google's official server library.
- [x] Require `email_verified=true`, exact email domain `thapar.edu`, and hosted domain `hd=thapar.edu`.
- [x] Add migration `005_verified_identity.sql`.
- [x] Add domain-validation tests and update unified-capability tests.
- [x] Document local, Appwrite, Render, Docker, and Compose environment variables.

## Why Google instead of email OTP

Google Sign-In is the easier first production option because SyncSpace does not need to operate an email delivery service, OTP expiration store, resend throttling, or spam/deliverability handling. The Google client ID is public; the server still verifies every ID token and enforces the institution domain.

The `hd` value shown by the browser is only a hint. Express verifies the signed token and rejects a token unless all three checks match:

1. Google says the email is verified.
2. The address ends with exactly `@thapar.edu`.
3. Google says the account belongs to the `thapar.edu` Workspace domain.

If Thapar does not manage `@thapar.edu` accounts through Google Workspace, this method will reject legitimate accounts. Confirm one real student account before disabling password authentication. In that case, implement OTP through a transactional email provider or Supabase Auth instead.

## One-time production setup

### 1. Google Cloud Console

1. Create or select a Google Cloud project.
2. Configure the OAuth consent screen.
3. Create an OAuth 2.0 Client ID with application type **Web application**.
4. Add these Authorized JavaScript origins:
   - `https://syncspace.appwrite.network`
   - `http://localhost:5173` for local testing
5. Copy the client ID ending in `.apps.googleusercontent.com`.
6. Do not create or store a client secret; the popup ID-token flow does not need one in React.

### 2. Render API environment

Set these on the SyncSpace API service:

```text
GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
AUTH_ALLOWED_EMAIL_DOMAIN=thapar.edu
PASSWORD_AUTH_ENABLED=false
```

Keep the existing `DATABASE_URL`, `JWT_SECRET`, `CLIENT_ORIGIN`, and storage values. Deploy the API and confirm `/api/health/ready`.

### 3. Database migration

Run this once against the production database:

```powershell
pnpm.cmd db:migrate
```

Confirm that `005_verified_identity.sql` appears as applied in the command output.

### 4. Appwrite Sites build variables

Set these on the Appwrite site:

```text
VITE_DEMO_MODE=false
VITE_API_URL=https://syncspace-53r3.onrender.com/api
VITE_GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
VITE_AUTH_ALLOWED_EMAIL_DOMAIN=thapar.edu
VITE_PASSWORD_AUTH_ENABLED=false
```

Redeploy the site after saving them. Vite variables are embedded at build time, so a restart without a rebuild is not enough.

## Public verification checklist

- [ ] A real `@thapar.edu` Google Workspace account can sign in.
- [ ] A personal Gmail account is rejected by Express.
- [ ] An account from another college domain is rejected.
- [ ] The signed-in account can apply to a project.
- [ ] The same account can publish a different project.
- [ ] Only that project's creator can see its applicants and accept or reject them.
- [ ] A creator cannot apply to their own project.
- [ ] Pending applicants cannot open team contact data.
- [ ] Accepted collaborators can see the creator and collaborator emails.
- [ ] Landing animation and scroll reveals work in current Chrome and Firefox.
- [ ] Render and Appwrite redeploy successfully from GitHub.

## Real-world readiness gate

The feature code is ready for a limited pilot, but the public service is not ready for unsupervised real-world use until the public checklist passes and these operational items are complete:

- [ ] Publish privacy policy, terms, acceptable-use rules, and a contact address.
- [ ] Add account deletion and data-export handling.
- [ ] Confirm resume retention/deletion rules and bucket access logging.
- [ ] Add error tracking, uptime alerts, and an alert receiver.
- [ ] Confirm automated off-host database backups and perform a restore drill.
- [ ] Run the SQL-backed GitHub integration job with migration 005.
- [ ] Perform an accessibility and keyboard pass.
- [ ] Run a small Thapar pilot before broad promotion.

## Verification evidence

- Server: 25 tests passed; one PostgreSQL integration test skipped because no test database was supplied.
- Client: 4 tests passed.
- Production Vite build: passed.
- Browser: replacement landing, real CTA destinations, scroll-triggered reveals, and signup page verified with no console errors.

