# Agile backlog and semester plan

## Working method

The team uses small vertical increments. A story is complete only when its user-visible path, server authorization, persistence behavior, tests, documentation, and deployability are addressed together. Phase records under `docs/phases` provide the historical iteration log.

## Prioritized backlog

| Priority | Story/epic | State | Evaluation evidence |
|---|---|---|---|
| P0 | Verified one-account identity and tenant boundary | Implemented; production configuration to recheck | Auth/domain tests and migration 005 |
| P0 | Profile, manual skills, resume-assisted suggestions | Implemented | Storage/extraction tests and responsive UI |
| P0 | Project discovery and explainable ranking | Implemented | Pure scoring tests and visible breakdown |
| P0 | Publish, edit, close, and delete an owned project | Implemented | API ownership tests and lifecycle UI |
| P0 | Apply, track, accept/reject, and enforce capacity | Implemented | Team-workflow and SQL integration tests |
| P0 | Authorized team contacts, profiles, and tasks | Implemented | Relationship authorization tests and workspace UI |
| P1 | 50-student pilot instrumentation and feedback capture | Planned | Anonymized pilot dataset and results table |
| P1 | Production admin migration and controlled moderation drill | Implemented in repo; deployment pending | Migration 006, audit log, public test |
| P1 | Accessibility/performance measurement on representative phones | Planned | Keyboard, contrast, Core Web Vitals/error observations |
| P2 | End-to-end encrypted team chat | Prototype only; excluded from core | Separate threat model and key-management decision |
| P2 | Custom domain, off-host backups, and external alert receiver | Optional hardening | Operations checklist |

## Course-aligned weekly schedule

| Week | Engineering focus | Concrete deliverable |
|---|---|---|
| W1 | Problem framing and official selection-criteria review | Gap statement and initial vertical-slice boundary |
| W2 | Team formation and repository/template alignment | Team metadata placeholders, course project page, journal structure |
| W3 | Practise and deliver elevator pitch; backlog refinement | Three-sentence pitch, prioritized stories, UI flow |
| W4 | Proposal finalization **[CE]** | 1,000–1,500 word LaTeX proposal, SMART objectives, budget, timeline |
| W5 | Identity/profile increment and test refinement | Verified sign-in, profile, skills, negative authorization cases |
| W6 | Discovery/publishing increment | Explainable ranking and owner lifecycle demonstration |
| W7 | First integrated prototype **[MST]** | Deployed critical path and prototype-stage report |
| W8 | Improvement plan **[CE]** | Defect/feedback triage and revised measurable backlog |
| W9 | MST week | Report corrections; no risky scope expansion |
| W10 | MST week | Stabilization and evidence cleanup |
| W11 | Application/team improvement | Decision latency, capacity, contact and profile authorization |
| W12 | Progress review **[CE]** | Test results, updated UML, pilot rehearsal |
| W13 | Buffer | Resolve integration/deployment risks |
| W14 | Controlled pilot | Recruit and onboard up to 50 Thapar students |
| W15 | Second prototype **[CE]** | Pilot-ready release and preliminary measured results |
| W16 | Improvement over second prototype | Fix high-severity pilot defects and repeat measures |
| W17 | Final prototype/report/presentation **[EST]** | Validated results, final report, screenshots, demo and future work |

## Definition of done

A backlog item is done when:

1. acceptance criteria are observable through the public or local product;
2. permission checks live on the server, not only in the interface;
3. changed persistence behavior has a migration or transactional design;
4. relevant unit/integration/UI tests pass;
5. `pnpm build` completes;
6. documentation and phase status reflect the change;
7. deployment configuration and secrets remain outside source control.

## Risk register

| Risk | Trigger | Mitigation |
|---|---|---|
| Fewer than 50 pilot participants | Recruitment below target by W14 | Recruit through two lab groups and report the actual sample without inflating it. |
| Free-tier cold starts | First request is slow or times out | Warm up before lab demos, record cold/warm separately, and retain readiness checks. |
| Institutional OAuth configuration drift | Verified users cannot sign in | Keep password auth only for controlled local tests; validate Google client/domain settings before pilot. |
| Inappropriate pilot projects | Abuse or irrelevant content appears | Use exact-email tenant admin moderation with reason and retained audit history. |
| Contact-data exposure | Unauthorized profile/email response | Maintain relationship-aware API filters and negative SQL-backed tests. |
| Scope growth from chat/social features | Core path becomes unstable | Keep encrypted chat on a separate prototype branch until key lifecycle and moderation are designed. |
| Official report templates change | Upstream publishes TBA report structure | Sync the template fork and transfer the living report content into the announced format. |
