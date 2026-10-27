# Gates: connected profiles

Scope: extend the ZIP application locally with optional profile links, provider connections, reviewed public GitHub imports, privacy controls, and a tested deployment handoff.

- [x] G1: the original ZIP baseline is measured and inherited failures are identified
  EVIDENCE: Untouched ZIP copy: 70 server tests passed, 6 database tests skipped before database setup; 24 client tests passed and the project-edit test failed because its seeded deadline is past. Reproduced independently; the working copy now sets a future deadline in that test and all 26 client tests pass.

- [x] G2: profile links validate provider URLs and respect owner/team/college visibility
  CHECK: node --test server/test/profileLinks.test.js
  EXPECT: fail 0
  EVIDENCE: exit=0; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\Aryan\Documents\Codex\2026-10-28\s-2\work\syncspace-main; path=3f4524162de4/35 entries; EXPECT=matched; output-sha256=aa893794e581497da45760b9d2a3e964d0e57bbfb4ea59dadd482b492e46cc2c; output-bytes=371

- [x] G3: provider requests use browser challenges, least privilege, encrypted credentials, and validated signed identity claims
  CHECK: node --test server/test/accountConnections.test.js
  EXPECT: fail 0
  EVIDENCE: exit=0; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\Aryan\Documents\Codex\2026-10-28\s-2\work\syncspace-main; path=3f4524162de4/35 entries; EXPECT=matched; output-sha256=23d7afd678e93d91715e1165485d5da048d8408ca749d2ed0929fcbc2e5a7810; output-bytes=791

- [x] G4: real PostgreSQL migrations and account import endpoints preserve authorization and reviewed selections
  CHECK: node scripts/verify-connections-db.mjs
  EXPECT: CONNECTION DATABASE VERIFIED
  EVIDENCE: exit=0; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\Aryan\Documents\Codex\2026-10-28\s-2\work\syncspace-main; path=3f4524162de4/35 entries; EXPECT=matched; output-sha256=9c57428402bdcac1821b2b7bd23dcedfe3f25d980d7b81513cfbde83ab9e2eba; output-bytes=382

- [x] G5: profile interface supports links, import review, failures, and disconnect without changing unselected fields
  CHECK: pnpm.cmd --filter ./client test
  EXPECT: Test Files
  EVIDENCE: exit=0; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\Aryan\Documents\Codex\2026-10-28\s-2\work\syncspace-main; path=3f4524162de4/35 entries; EXPECT=matched; output-sha256=3b1cb594e0014ca6580052be3e3f2e7090027e892837fbf8057269559589e70c; output-bytes=1706

- [x] G6: the integrated server and client regression suites succeed
  CHECK: pnpm.cmd test
  EXPECT: Test Files
  EVIDENCE: exit=0; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\Aryan\Documents\Codex\2026-10-28\s-2\work\syncspace-main; path=3f4524162de4/35 entries; EXPECT=matched; output-sha256=2a2201d1b284e145e67da3f8dca771dd0b1b55f8aadef1d2b56b8fdf5c4830eb; output-bytes=9294

- [x] G7: the final production frontend compiles
  CHECK: pnpm.cmd build
  EXPECT: built in
  EVIDENCE: exit=0; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\Aryan\Documents\Codex\2026-10-28\s-2\work\syncspace-main; path=3f4524162de4/35 entries; EXPECT=matched; output-sha256=f64229cfd02537ba5cf3e0efe138ad04fffc2ff93ca47e7cfe82ec27daab1318; output-bytes=4139

- [x] G8: desktop and narrow-screen browser review shows usable controls and import results
  EVIDENCE: Browser reviewed the actual profile at a narrow viewport and a 1440px desktop iframe. Verified two-column provider cards on desktop, stacked controls on mobile, import review checkboxes and proficiency, explicit sample label, and successful selected sample import.

- [x] G9: deployment instructions cover migration order, provider callbacks, configuration, rollback, and live smoke tests
  EVIDENCE: docs/connected-profiles-deployment.md specifies exact callbacks, HashRouter return URL, separate server credentials, no production seed, ordered additive migrations, API-first deployment, real-account acceptance, and rollback preserving schema/key. Provider authorization and production release remain external checks, not local gate claims.
