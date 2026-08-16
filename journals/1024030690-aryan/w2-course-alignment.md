# W2 — Aligning an existing deployment with the UCS503 template

**Date:** 2026-08-16  
**Owner:** Aryan Bansal  
**Area:** repository structure, documentation CI, and traceability

## Task

Adapt the existing SyncSpace monorepo to the UCS503 master-template requirements while preserving its Appwrite and Render build paths.

## Context

The course template expects `docs`, `journals`, `code`, `project-proposal`, `project-report-prototype-stage`, and `project-report-final`. SyncSpace already used root-level `client` and `server` folders in deployment configuration. Moving the application into `code` would break configured root directories; copying it would create a second source of truth.

## Observation

Course compliance and deployment stability are both possible if `code/README.md` acts as an explicit source manifest and the canonical application remains in the same repository at its working paths. The template states that all deliverables belong in one repository, while allowing the remaining organization to be adapted.

## Decision and implementation

I added:

- a MkDocs Material project site under `docs/`;
- a dedicated GitHub Actions documentation pipeline;
- problem/objective, requirements, UML/design, backlog, test, pilot, and compliance pages;
- the required LaTeX proposal and staged-report folders;
- per-member journal structure and templates;
- a root submission-status checklist that separates implemented evidence from manual/future work.

The main product CI remains separate and still starts PostgreSQL, migrates, seeds, runs server/client tests, builds the React bundle, starts the API, and executes a smoke journey.

## Validation

I checked the course website, semester schedule, project-selection criteria, master template, proposal guide, and report guide. Every stated deliverable now has a repository location or an explicit unchecked item. Unknown roll numbers, team members, instructor details, pilot results, and TBA report templates were left as placeholders rather than fabricated.

## Next step

Fill the team metadata, activate GitHub Pages once, compile and review the W4 proposal PDF, and add the next journal entry after the W3 pitch/backlog review.
