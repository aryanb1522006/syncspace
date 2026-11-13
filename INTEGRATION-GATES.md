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

- [ ] A8: CI succeeds for the pushed fix revision and PR 7 is merged into main
  EVIDENCE: pending

- [ ] B1: LinkedIn basic connection validates signed identity, browser binding and one-time authorization
  CHECK: node --test server/test/linkedinOAuth.integration.test.js
  EXPECT: fail 0
  EVIDENCE: pending

- [ ] B2: LinkedIn ZIP and CSV imports are previewed before storing selected sections
  CHECK: node --test server/test/linkedinImport.integration.test.js
  EXPECT: fail 0
  EVIDENCE: pending

- [ ] B3: both provider interfaces and import review work in the browser and client tests
  CHECK: pnpm.cmd --filter ./client test
  EXPECT: Test Files
  EVIDENCE: pending

- [ ] B4: the final combined release passes regressions and a production build
  CHECK: pnpm.cmd test
  EXPECT: Test Files
  EVIDENCE: pending

- [ ] B5: exact developer-app setup, deployment and real-consent verification are documented
  EVIDENCE: pending

- [ ] B6: final source is pushed and local testing uses the fixed implementation
  EVIDENCE: pending
