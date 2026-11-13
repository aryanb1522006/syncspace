# Phase 19 — integration repair and GitHub OAuth

This phase repairs the three merge-review findings in Phase 18. College sign-in, project ownership, matching formulas, and skill proficiency remain governed by their existing APIs.

## Callback and authorization

Register the public **API** callback with the GitHub OAuth app:

- Local: `http://localhost:4000/api/integrations/github/callback`
- Production: `https://syncspace-53r3.onrender.com/api/integrations/github/callback`

The API validates signed state and the stored request, then redirects to the allowed frontend origin's `/#/integrations/github/callback` route. Code exchange also requires the current SyncSpace session and a verifier from the initiating browser tab. Existing frontend callback paths are normalized into hash routes during startup, preserving older registrations where the static host serves its SPA fallback.

Authorization requests use PKCE S256, unique signed state, a ten-minute database request, and a separate browser challenge. Requests are consumed atomically before token exchange. Expiry, replay, wrong user, and wrong browser are rejected. Codes/state are omitted from application request logs and cleared from the visible callback. Tokens and PKCE verifiers stay encrypted server-side. Public-only repository analysis is preserved.

Use separate GitHub OAuth apps for local and production. Set all four server variables together: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI`, and `TOKEN_ENCRYPTION_KEY` (32 random bytes in base64). No secret belongs in a VITE variable. The button remains unavailable until configured.

## Visibility

Profile contact checks and teammate provenance queries share one SQL relationship predicate. Private sources never appear in another student's recommendation payload. College sources are available within the same college; team sources require an accepted shared-team relationship. Tests include unrelated users, accepted teammates, and owner/self controls.

## Disconnect and synchronization

Writes, reconnects, and deletes serialize on the student profile row. A GitHub sync commits only if the connection ID, provider identity, encrypted token and active status match its pre-fetch snapshot. Stale results and revoked-token errors are discarded. Deleted evidence cannot return after disconnect, and an old disconnect cannot delete a new connection. Valid refresh preserves visibility; absent evidence is removed by the set of touched IDs, without relying on transaction timestamps.

Disconnect removes local access before waiting for GitHub. Remote cleanup revokes the specific token rather than a whole grant, protecting a concurrent new connection. If GitHub is unavailable, local authorization is still removed and users can revoke the app in GitHub Settings.

## Deployment and migration

Migration `010_integration_oauth.sql` creates the request table and enables row-level security on server-only integration tables. The API database role must own those tables or have the intended server-side access. Supabase public client roles receive no policies. Phase 18's migration tolerates an existing `linkedin_url` column from earlier link-only SQL without deleting its contents.

The server applies pending migrations before opening its HTTP listener. A PostgreSQL advisory lock serializes simultaneous runners; each migration stays transactional. Render/Docker startup therefore needs no manual seed or migration job. Never seed production. Retain a backup and previous deploy revision; application rollback leaves additive schema in place.

## Regression coverage

- `githubOAuth.integration.test.js`: API bridge, PKCE, browser proof, wrong user, replay, expiry, duplicate account, encrypted storage, and a paused HTTP sync/disconnect interleaving.
- `integrationPrivacy.integration.test.js`: private/team/college provenance and profile audience parity.
- `integrationSync.integration.test.js`: disconnect/reconnect races, stale errors, visibility persistence, outdated-row deletion.
- `integrationMigration.integration.test.js`: earlier link column, concurrent runners, row-level security.
- `oauthCallback.test.jsx`: normal-path bridge, one exchange, missing browser proof, URL cleanup, ordinary routes.

Tests use real local/CI PostgreSQL and synthetic provider HTTP. Real consent requires a registered developer app's private configuration.
