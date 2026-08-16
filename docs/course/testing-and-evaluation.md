# Testing and evaluation

## Strategy

SyncSpace separates fast deterministic checks from database and browser journeys.

| Layer | Purpose | Examples |
|---|---|---|
| Unit | Validate pure decisions and transformations | matching weights, eligibility, skill aliases, admin allowlist |
| API/component | Validate HTTP schemas, authentication, authorization, and UI behavior | login, validation errors, hidden admin control, project lifecycle |
| PostgreSQL integration | Validate constraints, tenant relationships, transactions, and retained audit state | accept-to-team flow, contact visibility, admin deletion audit |
| Build/configuration | Reject invalid production configuration and broken bundles | environment validation, Vite build, YAML parse |
| Smoke | Exercise a running API from registration through protected resources | migrate, seed, start, health/readiness, API journey |
| Human acceptance | Observe representative students on desktop/mobile | sign-in, profile, discover/publish, apply/review, workspace |

The authoritative automated pipeline is `.github/workflows/ci.yml`. It starts PostgreSQL, applies every numbered migration, seeds data, runs both test suites, builds the client, starts the API, and runs the documented smoke journey.

## Security and privacy cases

The pilot cannot be considered ready unless all of these negative cases pass:

- a personal Google account is rejected by the exact institutional-domain rule;
- an owner cannot edit/delete another owner's project;
- an applicant cannot accept their own application;
- a non-member cannot see team emails or open a team workspace;
- one college cannot read another college's project/member records;
- a non-admin cannot access `/api/admin/*` even if the client route is guessed;
- an admin cannot delete across tenants or without exact title plus a durable reason;
- an uploaded non-PDF/oversized resume is rejected.

## 50-student pilot protocol

### Research question

Can a Thapar student, using one verified account, reach a suitable project or publish an idea and complete the join decision with less manual coordination than the current informal process?

### Participants and sessions

- Target: at least 50 current Thapar students across at least two course/lab groups.
- Device mix: participants use their own phones/laptops; browser and viewport are recorded, not personally identifying device IDs.
- Session A: verified sign-in, profile completion, and either discover/apply or publish.
- Session B: owners review applications; accepted pairs open the workspace and locate contact/profile/task controls.
- Consent: explain that this is a course pilot, participation is voluntary, and no resume content is included in the evaluation export.

### Metrics and targets

| Metric | Definition | Target for final evaluation |
|---|---|---|
| Onboarding completion | `%` who sign in and save a usable profile without facilitator intervention | >= 80% |
| First-value completion | `%` who apply to one eligible project or publish one valid project | >= 75% |
| Time to first value | Median from successful sign-in to valid apply/publish event | <= 10 minutes |
| Explanation comprehension | `%` who correctly identify the largest component of one recommendation | >= 75% |
| Owner decision completion | `%` of test owners who accept/reject a pending application successfully | >= 80% |
| Workspace handoff | `%` of accepted members who find teammate contact and add/move a task | >= 80% |
| Critical-flow reliability | Successful critical API responses excluding deliberate validation errors | >= 95% |
| Authorization defects | Confirmed unauthorized contact, project mutation, or cross-tenant disclosures | 0 |
| Perceived usefulness | Median 1–5 response to “This would help me form a project team” | >= 4 |

Targets are proposal criteria, not current results. The final report must show actual numerator, denominator, median, device mix, failures, and any deviation.

### Data sheet

Use a pseudonymous participant code (`P01`–`P50`) and record only:

| Field | Allowed value |
|---|---|
| participant_code | P01–P50 |
| viewport | mobile / tablet / desktop |
| onboarding_complete | yes / no |
| first_value_action | apply / publish / incomplete |
| time_to_first_value_seconds | integer or blank |
| explanation_correct | yes / no / not attempted |
| owner_decision_complete | yes / no / not assigned |
| workspace_handoff_complete | yes / no / not accepted |
| critical_error_code | short non-personal code |
| usefulness_1_to_5 | integer 1–5 |
| one_sentence_feedback | remove names, emails, and project-sensitive text |

Do not export access tokens, emails, resume text, database URLs, or storage object keys. Aggregate results before including them in the final report.

## Evaluation reporting

The prototype and final reports must distinguish:

- **implemented evidence** — source, migrations, tests, screenshots, live endpoints;
- **observed pilot results** — measured only after participant sessions;
- **limitations** — free-tier cold starts, convenience sample, project supply, and facilitator effects;
- **changes from proposal** — objective met, partially met, modified, or dropped with reason.

Current engineering verification is tracked in [Quality assurance](../qa.md) and the latest [phase record](../phases/phase-17-personal-admin-control.md).
