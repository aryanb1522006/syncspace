# SyncSpace UCS503 submission status

Last updated: 2026-08-16

## Official sources used

- Course website: https://tiet-ucs503.github.io/
- Semester project: https://tiet-ucs503.github.io/semester-project/
- Master template: https://github.com/tiet-ucs503/ucs503p-202627odd-template
- Project-selection criteria: https://tiet-ucs503.github.io/ucs503p-202627odd-template/criteria-for-project-selection/
- Linked official proposal and report writing guides

## Public links

- Product: https://syncspace.appwrite.network
- API: https://syncspace-53r3.onrender.com
- API readiness: https://syncspace-53r3.onrender.com/api/health/ready
- Repository: https://github.com/aryanb1522006/syncspace
- Planned course project page: https://aryanb1522006.github.io/syncspace/ (available after first GitHub Pages activation/workflow run)

## Completed in the repository

- [x] Course project page under `docs/` with a deploy workflow.
- [x] Project problem, elevator pitch, SMART objectives, scope, and selection-criteria mapping.
- [x] Functional/non-functional requirements, stakeholder analysis, user stories, and acceptance criteria.
- [x] UML-style system context, use-case, container, sequence, and domain diagrams.
- [x] Agile backlog, definition of done, course-aligned weekly plan, and risk register.
- [x] Automated test strategy and privacy-conscious 50-student pilot protocol with measurable targets.
- [x] Required `project-proposal/main.tex` source.
- [x] Living `project-report-prototype-stage/main.tex` source.
- [x] `project-report-final/` placeholder that does not invent the still-TBA official template or results.
- [x] Three-member team recorded: Aryan Bansal (`1024030690`), Yashika (`1024030680`), and Rumani (`1024030678`).
- [x] Lab instructor recorded: Raghav B. Venkataramaiyer.
- [x] Required `journals/ROLLNO-FIRSTNAME` structure with Aryan's initial entries and transparent first-entry scaffolds for Yashika and Rumani.
- [x] Course-facing `code/README.md` source manifest while preserving Appwrite/Render monorepo paths.
- [x] Existing deployed React/Express/PostgreSQL/S3 application and CI pipeline retained.
- [x] Existing `aryanb1522006/syncspace` repository selected and adapted with the UCS503 master-template deliverable structure.

## Must be completed manually by the team

- [ ] Add Yashika's and Rumani's institutional email addresses to their journals and the LaTeX proposal.
- [ ] Enter team, repository, GitHub Page, and live deployment URLs in the official team-details sheet.
- [ ] In GitHub **Settings -> Pages**, enable Pages once using the `gh-pages` branch after the workflow creates it.
- [ ] Confirm `https://aryanb1522006.github.io/syncspace/` loads.
- [ ] Have every member add at least one individual technical journal entry each week.
- [ ] Prepare an audiovisual progress update for every lab.
- [ ] Have Yashika and Rumani replace their W1 journal scaffolds with their own technical evidence.
- [ ] Compile the LaTeX proposal to PDF and check the final 2–4 page / 1,000–1,500 word expectation after the two missing emails are filled.
- [ ] Sync the official upstream when the prototype/final report templates marked TBA are published.
- [ ] Run the controlled 50-student pilot and replace targets/placeholders with actual aggregate results.
- [ ] Complete W4 proposal, W7 prototype, W8 improvement plan, W12 progress, W15 second prototype, and W17 final evaluation artifacts on schedule.

## Production items still relevant to the pilot

- [ ] Confirm the previously exposed Supabase database password was rotated.
- [ ] Apply `006_admin_controls.sql` and configure the verified admin allowlist on Render.
- [ ] Re-run the public two-account apply/accept/workspace/profile journey.
- [ ] Verify a personal Google account is rejected and two real Thapar accounts can complete the workflow.
- [ ] Remove disposable/demo projects before participant onboarding.
- [ ] Configure an alert receiver and off-host backup destination if the pilot becomes relied upon beyond classroom testing.

## Local verification completed on 2026-08-16

- [x] 34 server tests passed; 3 SQL-backed tests skipped locally because no database credentials were supplied.
- [x] 16 React tests passed.
- [x] Production Vite build passed with 1,768 transformed modules.
- [x] Course-structure verification passed; the proposal is approximately 1,334 words after LaTeX markup is removed.
- [x] `mkdocs build --strict` passed.
- [x] `git diff --check` passed.
- [ ] LaTeX PDFs still require compilation after team metadata is filled; no TeX engine is installed in the current workspace.

## Status statement

SyncSpace is a developed, deployed prototype with a complete three-member team and the software-engineering evidence required to begin UCS503 evaluation. It is ready for instructor review and a controlled rehearsal, not yet for an unmonitored real-world launch. The remaining blockers are the two missing institutional emails, course administration, production re-verification, individual journal completion, and collection of real pilot results—not missing core project documentation.
