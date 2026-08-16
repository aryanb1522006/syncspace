# Project overview

## Team

- Aryan Bansal — `1024030690`
- Yashika — `1024030680`
- Rumani — `1024030678`
- Lab instructor: Raghav B. Venkataramaiyer

The team will use the existing `aryanb1522006/syncspace` repository with the UCS503 master-template deliverable structure added in place. This preserves the working Appwrite and Render build paths while keeping all academic artifacts in the same repository.

## Elevator pitch

**The gap:** Thapar students do not have one reliable place to discover campus projects, identify complementary teammates, and track the join decision.

**The solution:** SyncSpace combines verified campus identity, explainable skill matching, project publishing, applications, owner decisions, contact exchange, and a shared workspace in one account.

**The impact:** A 50-student pilot will measure whether students can reach a relevant project or publish an idea faster, with less manual coordination and no unauthorized contact exposure.

## Problem statement

Student project formation is commonly coordinated through class groups, personal networks, and direct messages. These channels favor students who already know one another and give owners little structured evidence about applicants. Students looking to join a project cannot consistently compare required skills, weekly commitment, open capacity, or application state. Project owners must repeat the same brief and manually track responses. Once a team forms, contact details and work tracking move again to another tool.

The resulting engineering gap is a fragmented, non-explainable workflow. A project directory alone would not solve it: students also need verified identity, profile data, skill representation, transparent ranking, protected contact exchange, application decisions, and a handoff into collaboration. The system must protect student information, prevent cross-college access, and remain usable on mobile devices.

SyncSpace addresses the gap with a deployable web application scoped to Thapar. It uses mature web, database, identity, and object-storage services. The project focuses on software engineering and validation rather than inventing a new recommendation algorithm. Its matching model is deterministic and exposes the contribution of skill coverage, interest alignment, availability, and commitment so users can understand and challenge a result.

## SMART objectives

1. **Deliver one usable vertical slice by the prototype evaluation:** a verified student can complete a profile and either apply to a project or publish one, while owners can decide applications and accepted members can open a workspace.
2. **Pilot with at least 50 Thapar students by the final evaluation** and capture completion, time-on-task, error, and short satisfaction data for the critical workflows.
3. **Keep critical actions attributable and protected:** automated negative tests must show that non-owners cannot modify projects, non-members cannot read team contacts, and cross-college access is denied.
4. **Explain every recommendation:** all ranked project responses expose component scores and eligibility reasons; deterministic unit tests cover normalization, gaps, and ordering.
5. **Ship reproducibly throughout the semester:** every change to `main` runs installation, configuration validation, migrations, seed, server and client tests, production build, a live API smoke journey, and documentation build/deployment.

## Fit with the official selection criteria

| Criterion | SyncSpace response |
|---|---|
| Time-to-value | A usable sign-in-to-application vertical slice can be demonstrated inside a two-week sprint; later increments add owner and workspace depth. |
| CI/CD | GitHub Actions automates PostgreSQL setup, migrations, seed, tests, build, smoke testing, artifact upload, and the academic project page. |
| Local relevance | The target users are Thapar students forming course, club, research, and portfolio-project teams. |
| Engine availability | React, Express, PostgreSQL, Google identity verification, S3-compatible storage, and mature testing libraries are already available. |
| Scalability | The API is stateless, files use object storage, relational data uses PostgreSQL, and every user/project is bounded by `college_id`. |
| Evaluation | The pilot defines measurable workflow completion, time, reliability, authorization, decision-latency, and satisfaction outcomes. |
| Higher-order goal | The secondary goal is broader access to practical peer learning; it does not replace the concrete engineering plan. |

## Product boundary

### Included

- verified institutional authentication and one-account navigation;
- student profile, skills, interests, availability, and PDF resume extraction;
- project creation, editing, deletion, discovery, and explainable ranking;
- applications, owner accept/reject controls, notifications, and team creation;
- creator/collaborator contact cards and protected member profiles;
- shared team tasks and progress;
- tenant-scoped project moderation for one configured administrator;
- responsive light/dark interfaces and production deployment.

### Excluded from the evaluated core

- payments, monetization, public social feeds, and non-Thapar tenants;
- production end-to-end encrypted chat (kept as a separate prototype until its key-management model is validated);
- claims that matching predicts team success;
- native mobile applications.

## Live evidence

- Application: <https://syncspace.appwrite.network>
- API health: <https://syncspace-53r3.onrender.com/api/health>
- Database readiness: <https://syncspace-53r3.onrender.com/api/health/ready>
- Phase history: [Build record](../phases/README.md)
