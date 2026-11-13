# Integration repair and implementation plan

Base: rumani d50c445, main 6667f9f. The user's authorized outcomes are:

1. Repair callback routing without disrupting the existing HashRouter application.
2. Apply private/team/college audience rules to recommendation provenance.
3. Prevent in-flight sync writes and errors after disconnect or replacement; retain existing evidence visibility on valid refresh.
4. Run targeted regressions, complete database/client suites, production build and an audit before merging PR 7. Verify CI at the exact pushed revision; preserve rollback information.
5. Make GitHub OAuth deployable with a server callback, PKCE, browser-bound, single-use transactions, fixed allowlisted return origins, safe logging, and documented local/production registration.
6. Support both requested LinkedIn paths: optional basic OIDC account connection and a reviewed ZIP/CSV export import for skills and work history. Do not claim standard OIDC supplies full career data. Keep college sign-in independent of provider linking.
7. Verify final combined behavior, run the fixed code locally, publish source and give concrete developer-app setup steps. Real provider consent requires developer application credentials supplied privately by the owner; tests use synthetic credentials, HTTP and signed test identities.

Phase A: repair and harden GitHub, privacy and sync concurrency; test and audit; merge PR 7 after green CI.
Phase B: implement LinkedIn OIDC and reviewed import on top of the merged fixes; test and publish with its own reviewable commit/PR.

Every acceptance outcome is tracked in INTEGRATION-GATES.md. Tests run against the isolated local review database. No production seeding, Git history rewrite, or unrelated feature changes are part of this work.
