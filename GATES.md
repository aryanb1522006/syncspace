# Gates: connected profiles

Scope: extend the ZIP application locally with optional profile links, provider connections, reviewed public GitHub imports, privacy controls, and a tested deployment handoff.

- [x] G1: the original ZIP baseline is measured and inherited failures are identified
  EVIDENCE: Untouched ZIP copy: 70 server tests passed, 6 database tests skipped before database setup; 24 client tests passed and the project-edit test failed because its seeded deadline is past. Reproduced independently; the working copy now sets a future deadline in that test and all 26 client tests pass.

- [x] G2: profile links validate provider URLs and respect owner/team/college visibility
  CHECK: node --test server/test/profileLinks.test.js
  EXPECT: fail 0
  EVIDENCE: exit=0; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\Aryan\Documents\Codex\2026-10-28\s-2\work\syncspace-main; path=3f4524162de4/35 entries; EXPECT=matched; output-sha256=3697eafa3b0d8be19560c5d846b9d3c8851ff3f41284ed179e41971404b6e515; output-bytes=370

- [x] G3: provider requests use browser challenges, least privilege, encrypted credentials, and validated signed identity claims
  CHECK: node --test server/test/accountConnections.test.js
  EXPECT: fail 0
  EVIDENCE: exit=0; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\Aryan\Documents\Codex\2026-10-28\s-2\work\syncspace-main; path=3f4524162de4/35 entries; EXPECT=matched; output-sha256=8a6ada69e343314882695c6b0a2f9d3d23a9afba1e66a88e40471894f13cdd16; output-bytes=790

- [x] G4: real PostgreSQL migrations and account import endpoints preserve authorization and reviewed selections
  CHECK: node scripts/verify-connections-db.mjs
  EXPECT: CONNECTION DATABASE VERIFIED
  EVIDENCE: exit=0; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\Aryan\Documents\Codex\2026-10-28\s-2\work\syncspace-main; path=3f4524162de4/35 entries; EXPECT=matched; output-sha256=90ac2479cfac81932ea722abe29a6d2231d69f24eccaa5029899f499aaac49cd; output-bytes=382

- [x] G5: profile interface supports links, import review, failures, and disconnect without changing unselected fields
  CHECK: pnpm.cmd --filter ./client test
  EXPECT: Test Files
  EVIDENCE: exit=0; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\Aryan\Documents\Codex\2026-10-28\s-2\work\syncspace-main; path=3f4524162de4/35 entries; EXPECT=matched; output-sha256=b70f2d9c5542a3975441ec3d0d40f81fe15e8da7d2dc7ae31d736546f26155b2; output-bytes=1706

- [x] G6: the integrated server and client regression suites succeed
  CHECK: pnpm.cmd test
  EXPECT: Test Files
  EVIDENCE: exit=0; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\Aryan\Documents\Codex\2026-10-28\s-2\work\syncspace-main; path=3f4524162de4/35 entries; EXPECT=matched; output-sha256=603254a17dcfdb56dee1e60dad4d82ca8c122a0b3dda363ee1c7ad2a92c09560; output-bytes=9295

- [x] G7: the final production frontend compiles
  CHECK: pnpm.cmd build
  EXPECT: built in
  EVIDENCE: exit=0; shell=C:\Windows\system32\cmd.exe; cwd=C:\Users\Aryan\Documents\Codex\2026-10-28\s-2\work\syncspace-main; path=3f4524162de4/35 entries; EXPECT=matched; output-sha256=bd8ae4cf27ecbf90fa3925b0284165d1caa1957b341ca8034b019c074f169439; output-bytes=4139

- [x] G8: desktop and narrow-screen browser review shows usable controls and import results
  EVIDENCE: Browser reviewed the actual profile at a narrow viewport and a 1440px desktop iframe. Verified two-column provider cards on desktop, stacked controls on mobile, import review checkboxes and proficiency, explicit sample label, and successful selected sample import.

- [x] G9: deployment instructions cover migration order, provider callbacks, configuration, rollback, and live smoke tests
  EVIDENCE: docs/connected-profiles-deployment.md specifies exact callbacks, HashRouter return URL, separate server credentials, no production seed, ordered additive migrations, API-first deployment, real-account acceptance, and rollback preserving schema/key. Provider authorization and production release remain external checks, not local gate claims.
