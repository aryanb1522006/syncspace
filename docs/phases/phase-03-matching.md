# Phase 3 — Matching and recommendations

## Delivered

- Pure, database-free matching functions for project fit, skill gaps, weighted coverage, teammate ranking, and eligibility constraints.
- A single exported weight configuration: 50% required skills, 20% preferred skills, 15% domain interest, 15% availability.
- Human-readable score breakdown with individual weighted contributions for the UI.
- Complementarity-first teammate ranking: missing required skills weigh twice as much as preferred skills.
- Student project recommendations and owner-only teammate recommendations, both college-scoped and top-K limited.
- Resume alias extraction tests including punctuation and short-token boundaries.

## Worked example

A team already covers Machine Learning and Backend. Its remaining gap is Frontend (required, weight 2) plus UI/UX (preferred, weight 1). A candidate with Frontend + UI/UX earns 100% coverage; a second Machine Learning candidate earns 0%. The complementary candidate ranks first.

## Verification

- Project-score arithmetic and contribution breakdown are unit-tested.
- Team complementarity, weighted gaps, and hard eligibility constraints are unit-tested.
- Skill extraction name/alias matching and false-positive boundaries are unit-tested.
- Matching functions contain no imports from the database layer.

## Product behavior

- Project recommendation results include `match.score` (0–100) and `match.breakdown`.
- Teammate results include the current `skillGap` and each candidate's `coverageScore` (0–100).
- Closed, full, expired, already-applied, and already-joined projects are removed before scoring.
