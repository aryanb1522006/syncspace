# Phase 20: LinkedIn connection and reviewed export import

## Delivered behavior

The existing SyncSpace college login stays authoritative. GitHub connects with a browser-bound, one-time state request and S256 PKCE, and analyzes public repositories. LinkedIn is an optional secondary connection using `openid profile`; it requests no email, publishing, contacts, skills or employment API permissions. Signed ID tokens are validated against LinkedIn's fixed JWKS endpoint, RS256, exact allowlisted issuer, audience, expiry and issue time. The user-info subject must match. New LinkedIn code-flow requests use browser-bound single-use state without requesting a nonce; earlier pending nonce-bearing requests still require a matching nonce. See [the provider compatibility repair](linkedin-oidc-provider-hotfix.md). A LinkedIn connection authenticates the account; it does not verify the person's identity or prove ownership of a manually entered public LinkedIn URL.

LinkedIn name/photo details are shown privately for review. Neither is copied automatically. Selected details update the college profile; choosing a photo makes it visible to profile visitors in the same college. Account tokens are used in memory once and discarded. Disconnect deletes the stored account details, outstanding connection requests and the imported LinkedIn photo, while a copied name remains. Disconnect is local; users can additionally revoke access in LinkedIn settings. The account connection and export import can be removed independently.

Users can upload the LinkedIn ZIP archive or a named Skills, Positions, Projects, Certifications, Profile or Education CSV (5 MB upload limit). Preview shows section names, detected skill evidence and profile text with no database writes. Users select sections and confirm. The server reparses the file and saves only those sections. Confirmation replaces all prior LinkedIn export evidence; importing a single CSV also replaces it. Approved profile skills remain. New evidence is private, and recurring evidence retains its previous visibility. Skill approval and proficiency selection remain separate from import. Unrelated ZIP entries, contact information and messages are ignored. Files are never stored on disk. CSV row/field limits, per-entry and total expanded-byte limits bound parsing. The preview file is held in browser memory until confirm, cancel or leaving the page.

## Dashboard setup: GitHub

1. Open [GitHub OAuth Apps](https://github.com/settings/developers) and register a dedicated SyncSpace production OAuth App. Use the running frontend origin for Homepage URL. Use **`https://syncspace-53r3.onrender.com/api/integrations/github/callback`** for Authorization callback URL. Register a separate development app with `http://localhost:4000/api/integrations/github/callback` for local testing. Callback URLs have no `#` fragment.
2. In the Render API service's Environment page, privately set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI` and `TOKEN_ENCRYPTION_KEY`. Generate the encryption key locally with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Keep the key stable and private; replacing it makes saved GitHub tokens unreadable and requires reconnection. Never put these secrets in Appwrite frontend variables, GitHub code, screenshots or chat.
3. Match `GITHUB_REDIRECT_URI` exactly to the registered callback. `CLIENT_ORIGIN` must include the exact deployed frontend origin (scheme and hostname, no path or trailing slash). For multiple frontends use comma-separated origins. Keep the normal `JWT_SECRET`, database and college-auth settings unchanged. OAuth credentials are optional; leave all provider values blank to disable that connection.
4. Save/redeploy the API. In Appwrite verify the frontend deploys `main` and uses `VITE_DEMO_MODE=false`, the correct public `VITE_API_URL`, and the existing Google/college-auth variables. Frontend environment changes need a rebuild. The frontend never receives provider secrets.

## Dashboard setup: LinkedIn

1. Create/select an app in [LinkedIn Developers](https://www.linkedin.com/developers/apps). Complete LinkedIn's app/company-page requirements. Under **Products**, request **Sign In with LinkedIn using OpenID Connect**. Availability is controlled by LinkedIn; app creation alone does not enable the product.
2. Under **Auth**, register **`https://syncspace-53r3.onrender.com/api/integrations/linkedin/callback`**. For development register `http://localhost:4000/api/integrations/linkedin/callback` in the appropriate app. Request only `openid profile` permissions; this implementation does not need the email product scope.
3. Privately set `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI` in the Render API environment and redeploy. Match the redirect URL exactly. LinkedIn has no stored access token and does not require a new encryption key. ZIP/CSV import works even when the OIDC product or credentials are unavailable.
4. If the frontend host applies its own Content Security Policy, allow profile images from `https://media.licdn.com` and `https://media.licdn-ei.com` in `img-src`. Photo links may expire; reconnect to refresh them. Images are fetched by the browser only, with no referrer. Account details do not expose a public LinkedIn profile URL; that optional URL remains user-entered and follows teammate-contact visibility rules.

## Release and smoke checks

API startup applies additive migrations before listening, under a database advisory lock. Migration 011 creates the server-only LinkedIn account table with RLS and adds optional photo columns. Use the API's normal migration-capable database role. Do not run production seeds or paste alternative PR 6 migrations into this schema. No changes to Appwrite authentication or Supabase auth providers are needed; these connections are handled by the SyncSpace API.

After deployment:

- Check `/api/health/ready` returns 200. An invalid state on either API callback must return 400, with no redirect.
- Sign in through the existing college login. Connect GitHub, consent, return to the profile, sync, review one suggestion with a chosen proficiency, and disconnect with evidence deletion. Cancel/reconnect and confirm no old results return. Inspect the provider app permissions: no private repository permissions are required.
- Connect LinkedIn, consent, return to the name/photo preview. Check that profile fields did not change automatically. Select one field, copy it, inspect the teammate profile and disconnect. Confirm the LinkedIn photo disappears and export data stays until explicitly deleted.
- Upload a LinkedIn ZIP or Skills.csv. Preview and cancel: no import should appear. Preview again, deselect a section, confirm and check only selected evidence appears. Approve a suggestion separately. Verify Only me / teammates / college behavior with a second account.

Automated provider tests use synthetic signing keys and mocked provider responses with a real isolated PostgreSQL database. They do not prove real provider product approval, credentials, consent or the deployed host configuration. Those checks require the app owner to configure the dashboards and consent with their account. Never paste secrets into this guide.

Rollback: deploy the preceding tested code revision while retaining the additive tables/columns. Do not drop evidence tables or rotate the encryption key as a rollback step. Disable one optional provider by clearing that provider's credential trio together; preserve GitHub's encryption key for existing connections.

## Tradeoffs

The connection gives low-friction basic account details and confirms control of that account. It depends on LinkedIn product availability and may return an expiring photo URL. Export import supports skills/work-history evidence without restricted APIs, but exports can be old, require a manual upload and remain user-provided evidence rather than independently verified proficiency. Neither flow scrapes LinkedIn or imports contacts. Section replacement is explicit and predictable, but users needing several sections should upload a ZIP rather than successive CSVs.

Provider references: [LinkedIn OIDC](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2), [GitHub OAuth web flow and PKCE](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps).
