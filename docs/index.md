# SyncSpace

**UCS503: Software Engineering semester project, 2026-27 odd semester**

[Open the live application](https://syncspace.appwrite.network){ .md-button .md-button--primary }
[View the source repository](https://github.com/aryanb1522006/syncspace){ .md-button }

## Project at a glance

SyncSpace is a campus project and teammate-matching platform for Thapar students. A single verified account can publish an idea, discover projects ranked against the student's skills and availability, apply to join, review applicants as an owner, and collaborate in a shared task workspace.

The engineering problem is not simply listing projects. Project information, suitable collaborators, application decisions, and team contact details are normally fragmented across informal messages. SyncSpace turns that process into one auditable workflow while explaining every recommendation score.

| Item | Current evidence |
|---|---|
| Product | React client deployed on Appwrite Sites |
| API | Express API deployed on Render |
| Data | PostgreSQL and private S3-compatible storage on Supabase |
| Identity | Server-verified Google identity with exact `thapar.edu` restriction support |
| Delivery | GitHub Actions build, test, PostgreSQL integration, API smoke, and documentation pipelines |
| Scope | One college pilot, targeted initially at 50 Thapar students |

## Team

| Member | Roll number |
|---|---|
| Aryan Bansal | `1024030690` |
| Yashika | `1024030680` |
| Rumani | `1024030678` |

**Lab instructor:** Raghav B. Venkataramaiyer

## Two-week value increment

The current vertical slice supports the complete critical path:

```text
verified sign-in -> profile and skills -> discover or publish
                 -> apply -> owner decision -> team workspace
```

This path is available as a deployed prototype and is backed by automated client, server, SQL-integration, and production-build checks. Pilot outcomes are intentionally not claimed yet; the measurement protocol and target values are recorded in [Testing and evaluation](course/testing-and-evaluation.md).

## Course evidence

- [Problem, objectives, project-selection fit, and elevator pitch](course/project-overview.md)
- [Elicited requirements, user stories, and acceptance criteria](course/requirements.md)
- [Architecture, UML models, and design decisions](course/design-and-uml.md)
- [Prioritized backlog, milestones, and definition of done](course/backlog.md)
- [Test strategy, metrics, and 50-student pilot protocol](course/testing-and-evaluation.md)
- [Course-template compliance and remaining manual actions](course/course-compliance.md)
- [Weekly technical progress](course/weekly-progress.md)

## Academic deliverables

The repository contains the required LaTeX `project-proposal`, a living `project-report-prototype-stage`, a final-report placeholder awaiting the official TBA template, per-member weekly journal structure, a `code` source manifest, and this GitHub Pages documentation source.

The canonical status and handoff checklist is [course-submission-status.md](https://github.com/aryanb1522006/syncspace/blob/main/course-submission-status.md).

!!! warning "Final administrative details"
    The team and instructor are recorded. Yashika's and Rumani's institutional email addresses, the official team-sheet entry, and first-time GitHub Pages activation still require student input.
