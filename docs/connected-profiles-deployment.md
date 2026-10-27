# Connected profiles: deployment and verification

Implemented from the supplied ZIP on 2026-10-28. Primary sign-in remains the existing college Google identity (or password where already enabled).

## Local phases

1. **Profile links:** HTTPS provider URL validation; owner/team/college visibility; manual GitHub and LinkedIn links; editable audience, private by default. Three service tests and a profile UI save/display test passed before connection work continued.
2. **Account connections:** GitHub authorization-code flow with PKCE; LinkedIn OIDC with signature, issuer, audience, expiry, nonce, and userinfo subject checks; browser-bound completion, single-use state, encrypted credentials, external identity uniqueness, expiration, and disconnect. Provider unit tests and real PostgreSQL journeys pass with synthetic provider HTTP responses.
3. **Reviewed imports:** GitHub bio/name/photo/link, up to three selected public repositories, and reviewed language-based dictionary skills. LinkedIn name/photo only. The demo offers an explicitly labelled sample; live account buttons depend on server configuration. UI tests cover cancellation, saved selections, preserved fields, proficiency, unsaved edits, provider failures, and disconnect confirmation.
4. **Release checks:** full server/database and client regressions, production build, config/course validation, and browser review at mobile and desktop widths. Final exact outcomes are in GATES.md.

The untouched ZIP baseline had 70 passing server tests, six database tests skipped before local database setup, and one failing client test (24 passing). The failing test submitted a now-past seeded project deadline; the updated test selects a future date. Product deadline validation remains intact.

## Configuration

Manual profile links work after the new migrations even with both providers disabled. Do not put provider secrets or the encryption key into any VITE_ variable.

Set the following **server** environment variables in Render:

| Variable | Production value |
|---|---|
| `API_PUBLIC_URL` | `https://syncspace-53r3.onrender.com` (bare origin, no `/api`) |
| `EXTERNAL_ACCOUNTS_KEY` | A new random 32-byte key encoded as base64; preserve it across deploys |
| `GITHUB_CLIENT_ID` | GitHub OAuth application client ID |
| `GITHUB_CLIENT_SECRET` | Matching GitHub OAuth application secret |
| `LINKEDIN_CLIENT_ID` | LinkedIn developer application client ID, if enabling LinkedIn |
| `LINKEDIN_CLIENT_SECRET` | Matching LinkedIn application secret |

To generate the encryption key privately:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Configure one provider at a time if desired. Each provider's ID and secret must be supplied together. An enabled provider also requires a valid API origin and encryption key. Partial configuration intentionally fails startup; empty provider pairs keep that provider disabled. Losing/replacing the encryption key requires existing connections to reconnect. Tokens are stored only in the external account tables, encrypted with AES-256-GCM and bound to the user/provider or transaction context.

Keep existing `DATABASE_URL`, SSL, `CLIENT_ORIGIN`, Google, storage, and college settings. `CLIENT_ORIGIN` must include the frontend's exact origin. No new frontend environment variables are needed. Preserve Appwrite's existing `VITE_DEMO_MODE=false`, API URL, and Google settings.

## Provider registration

### GitHub

Create a GitHub **OAuth App** for the production site. Use:

- Homepage: `https://syncspace.appwrite.network`
- Authorization callback: `https://syncspace-53r3.onrender.com/api/connections/github/callback`

Use a separate OAuth app for local development with callback `http://localhost:4000/api/connections/github/callback`. GitHub authorization requests use no additional scopes: no private repository, write, or email access. The implementation intentionally handles expiry by requesting reconnection rather than requesting offline access.

### LinkedIn

Create/configure a LinkedIn developer app and request the **Sign In with LinkedIn using OpenID Connect** product. Register:

- Production callback: `https://syncspace-53r3.onrender.com/api/connections/linkedin/callback`
- Local callback (if using that application locally): `http://localhost:4000/api/connections/linkedin/callback`

The flow requests `openid profile`, and imports available name/photo fields. It does not request email or attempt to import employment, education, endorsements, or a full resume. The public LinkedIn URL stays user-entered and is labelled accordingly. OIDC account linking does not prove that this URL belongs to that account.

Both providers return to the API callback. The API then redirects to `https://syncspace.appwrite.network/#/profile?connection=<opaque-id>`, matching the deployed HashRouter. The browser completes linking with the existing SyncSpace bearer token and a verifier held in that tab's sessionStorage. No third-party cookies are required across Appwrite and Render. Account authorization codes, state, tokens, and verifiers are not included in request logs.

## Local setup

Install the locked dependencies with `pnpm install --frozen-lockfile`. Configure `server/.env` from `.env.example` with a local PostgreSQL URL and `API_PUBLIC_URL=http://localhost:4000`. Add local provider credentials only when performing a real consent test. Configure `client/.env.local` with `VITE_DEMO_MODE=false` and `VITE_API_URL=/api` for API-backed testing, or omit it for the sample demo.

```powershell
pnpm db:migrate
pnpm db:seed  # local/staging only
pnpm dev
```

Open `http://localhost:5173/#/profile`. Local seeded login: `isha@northstar.edu` / `demo1234` (password authentication enabled locally).

Tests with a **disposable local/staging database**:

```powershell
$env:RUN_DB_TESTS='true'
pnpm test
node scripts/verify-connections-db.mjs
pnpm validate:config
pnpm verify:course
pnpm build
```

Set `DATABASE_URL` and `DATABASE_SSL_MODE` for that database before these commands. Provider tests substitute synthetic HTTP responses and signed test tokens. They never need real provider credentials or consent. Run these tests only on local/staging data.

## Production release order

1. Preserve a current database backup and the previous Render/Appwrite deployment references. Review the PR and its CI result against the current `main` revision.
2. With production database access in a private shell, apply pending migrations using `pnpm db:migrate`. New migrations are `009_profile_links.sql` and `010_connected_accounts.sql`; the migration runner also detects any earlier unapplied migrations. **Do not seed production.** If using Supabase SQL Editor instead, apply the new SQL in order and record each filename in `schema_migrations` within the same transaction, following the existing migration history.
3. Deploy the API from the reviewed commit. Providers can initially remain disabled. Confirm `/api/health/ready` and, with a normal user token, `/api/connections` return success. A disabled provider should report `false`, not break profile editing.
4. Configure the desired provider callback, ID/secret pair, API origin, and encryption key in Render; redeploy and confirm readiness. Do not publish credentials in the repository, screenshots, PR, or chat.
5. Deploy the matching Appwrite frontend build with the existing production environment. Confirm its build points at the production API and uses real mode.
6. Complete the live acceptance journey below with real accounts. Record the deployed commit and actual outcomes. A passing mock test does not establish a successful live OAuth integration.

## Live acceptance

- Sign in through the college Google flow. Add both manual links, save, and reload.
- Try an invalid/lookalike provider URL; it must be rejected.
- Connect GitHub, accept provider consent, return to the profile, and see its account name without any profile fields being overwritten.
- Review the preview, select one public repository and a proposed skill with proficiency, save, and reload. Existing skill levels and unselected profile fields must remain intact.
- Cancel an authorization and a preview; both must leave saved profile content unchanged.
- Reconnect with a second GitHub identity while already connected; the app must require disconnect first. Try linking the same GitHub identity to a second SyncSpace account; it must reject the duplicate.
- For LinkedIn, confirm the authorized basic name/photo import. A manually entered LinkedIn URL must remain labelled user-provided.
- Use a second same-college account to check each visibility mode: private, accepted teammates, college. A different-college account must receive no profile access. College social visibility must not disclose email contacts.
- Refresh twice within a minute; the second attempt must be limited. Revoke provider access and refresh; reconnect must be offered while the saved profile remains usable.
- Disconnect once while retaining imported content, and once with removal selected. Edited bio/name and reviewed skills must be retained according to the displayed explanation.
- Check the profile and import review on a phone-width viewport and desktop, then repeat an existing project/application/team journey.

## Operational limits and rollback

GitHub imports inspect at most the 100 most recently updated owned public repositories. Forks, archived projects, private data, and repository contents are excluded. Skills are suggested by exact language/dictionary matches, never inferred proficiency. Matching uses the reviewed skills already stored in the existing student skill table; connecting an account alone adds no ranking advantage. Refresh is explicit, with a one-minute cooldown, not a background poll.

Provider timestamps describe the last attempt and successful preview. A saved portfolio is a snapshot and can become stale if the provider repository changes. Revisit its preview to update the selected projects. Profiles stay usable during provider outages.

Disconnect deletes SyncSpace's stored credentials and pending transactions. Users may also revoke the application in provider settings. Imported names and reviewed skills remain editable profile facts. Optional cleanup removes untouched imported bio/photo/GitHub link and portfolio; later manual edits are preserved.

To roll back, redeploy the previous API and frontend versions. Leave the additive columns/tables in place; do not drop them during a normal application rollback. Disable provider ID/secret pairs together if only account connections need to be turned off. Preserve the encryption key. Database restoration is a separate recovery procedure, not a routine release rollback.

## External work still required

Real provider consent needs configured developer applications. Production migration/deployment needs authenticated Render, Supabase, and Appwrite access. No production database seed, live account linking, or successful provider authorization should be claimed from the local fixtures.
