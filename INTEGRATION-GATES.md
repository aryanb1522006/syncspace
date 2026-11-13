# Gates: integration fixes and rollout

Scope: fix the three reviewed defects, audit and test the rumani release, merge its verified revision, and implement GitHub OAuth setup plus both basic LinkedIn connection and reviewed ZIP/CSV import.

- [x] A1: normal GitHub callbacks enter the hash route and complete only in the initiating browser
  CHECK: node --test server/test/githubOAuth.integration.test.js
  EXPECT: fail 0
  EVIDENCE: Executed locally against isolated PostgreSQL: targeted cases passed; complete suite 131 server / 33 client tests, zero skipped or failed; production build, configuration and course checks passed. Regression output is recorded in the phase-A test/build logs; CI will reverify the pushed revision.

- [x] A2: teammate recommendations reveal only evidence permitted for the viewer
  CHECK: node --test server/test/integrationPrivacy.integration.test.js
  EXPECT: fail 0
  EVIDENCE: Executed locally against isolated PostgreSQL: targeted cases passed; complete suite 131 server / 33 client tests, zero skipped or failed; production build, configuration and course checks passed. Regression output is recorded in the phase-A test/build logs; CI will reverify the pushed revision.

- [x] A3: deleted or replaced connections reject stale sync results and errors
  CHECK: node --test server/test/integrationSync.integration.test.js
  EXPECT: fail 0
  EVIDENCE: Executed locally against isolated PostgreSQL: targeted cases passed; complete suite 131 server / 33 client tests, zero skipped or failed; production build, configuration and course checks passed. Regression output is recorded in the phase-A test/build logs; CI will reverify the pushed revision.

- [x] A4: the complete server and client suites pass with real PostgreSQL
  CHECK: pnpm.cmd test
  EXPECT: Test Files
  EVIDENCE: Executed locally against isolated PostgreSQL: targeted cases passed; complete suite 131 server / 33 client tests, zero skipped or failed; production build, configuration and course checks passed. Regression output is recorded in the phase-A test/build logs; CI will reverify the pushed revision.

- [x] A5: production frontend and configuration checks pass
  CHECK: pnpm.cmd build
  EXPECT: built in
  EVIDENCE: Executed locally against isolated PostgreSQL: targeted cases passed; complete suite 131 server / 33 client tests, zero skipped or failed; production build, configuration and course checks passed. Regression output is recorded in the phase-A test/build logs; CI will reverify the pushed revision.

- [x] A6: migration/startup behavior preserves existing deployments and supports the earlier link column
  CHECK: node --test server/test/integrationMigration.integration.test.js
  EXPECT: fail 0
  EVIDENCE: Executed locally against isolated PostgreSQL: targeted cases passed; complete suite 131 server / 33 client tests, zero skipped or failed; production build, configuration and course checks passed. Regression output is recorded in the phase-A test/build logs; CI will reverify the pushed revision.

- [x] A7: independent audit pass finds no unresolved issue in the changes
  EVIDENCE: Audit re-read callback origins, one-time claims, PKCE, secret logging, SQL audience rules, connection identity checks, revoked disconnect, RLS and startup migrations; the targeted regressions and complete suites passed, with no unresolved defect found in these changes. Real provider consent still requires app configuration.

- [x] A8: CI succeeds for the pushed fix revision and PR 7 is merged into main
  EVIDENCE: PR 7 merged as 8844b37f7e08fe8dde38f48bd7102de4d96987f9 after exact-head CI and both Appwrite checks succeeded (run 43413200437).

- [x] B1: LinkedIn basic connection validates signed identity, browser binding and one-time authorization
  CHECK: node --test server/test/linkedinOAuth.integration.test.js
  EXPECT: fail 0
  EVIDENCE: 135 server tests passed with RUN_DB_TESTS=true against isolated PostgreSQL; OIDC signature/issuer/audience/nonce/expiry, browser binding, replay, duplicate account and paused-disconnect tests passed.

- [x] B2: LinkedIn ZIP and CSV imports are previewed before storing selected sections
  CHECK: node --test server/test/linkedinImport.integration.test.js
  EXPECT: fail 0
  EVIDENCE: Real HTTP ZIP and CSV tests passed: no preview writes, confirmation required, section validation, private evidence, replacement and deletion. CSV limits passed.

- [x] B3: both provider interfaces and import review work in the browser and client tests
  CHECK: pnpm.cmd --filter ./client test
  EXPECT: Test Files
  EVIDENCE: 36 client tests passed; local real-API browser login, Skills.csv preview and confirmation showed Docker/Python suggestions requiring proficiency and private React evidence.

- [x] B4: the final combined release passes regressions and a production build
  CHECK: pnpm.cmd test
  EXPECT: Test Files
  EVIDENCE: pnpm test: 135 server, 36 client, zero failed/skipped. pnpm build, validate:config, verify:course and git diff --check passed.

- [x] B5: exact developer-app setup, deployment and real-consent verification are documented
  EVIDENCE: docs/phases/phase-20-linkedin-connected-imports.md contains exact app registrations, private environment variables, rollout/rollback and real-consent checks. Owner configuration is required for live consent.

- [x] B6: final source is pushed and local testing uses the fixed implementation
  EVIDENCE: Published as PR 8 (feat/linkedin-connected-imports), based on merged main. Local API/Vite launchers point to live-repo, startup migrations run before listening, and browser testing confirmed the real API import/review flow at localhost:5173. Provider credentials are absent locally, so consent requires the documented dashboard setup.
