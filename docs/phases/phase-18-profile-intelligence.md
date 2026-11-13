# Phase 18 - GitHub and LinkedIn profile intelligence

## Status

Implemented in the repository. Unit, API and UI tests pass locally. The PostgreSQL test `profileIntelligence.integration.test.js` runs in CI (`RUN_DB_TESTS=true`) and was not run locally. A real GitHub OAuth round trip needs a registered GitHub OAuth App (see Setup).

## Delivered

- Students connect GitHub through OAuth. SyncSpace requests **no scopes**, so the token can read public data only; it is used to prove the student owns the account.
- Only **public** repositories are analyzed (`/users/:login/repos`, plus a defensive `private` filter): languages, topics, README, `package.json`, `requirements.txt`, `pyproject.toml`, `pom.xml`, Dockerfile / compose files, `.github/workflows`, and Kubernetes manifests. The 20 most recently pushed repositories are read (`GITHUB_MAX_REPOS`).
- Students upload their **LinkedIn data export** ZIP. LinkedIn's public APIs (Sign In with LinkedIn) expose only name, email and photo; skills and positions require partner programs, and scraping violates LinkedIn's terms. The export is the supported, user-authorized alternative. It is parsed in memory and never stored. Only Skills, Positions, Projects, Certifications, Education and the profile headline/summary are read.
- Every detection is stored as evidence: skill, raw name, source, source location (repository or export section), evidence text, detection method, confidence, last verified date and visibility.
- Suggestions are reviewed on the profile page. Approving requires the student to choose a proficiency, which is never inferred. Approving only **adds** a missing skill, so a manually entered skill and its level are never overwritten. Rejections are remembered across re-syncs.
- Evidence visibility is per skill: only me (default), my teammates, or students at my college.
- Disconnecting GitHub revokes the OAuth grant at GitHub, deletes the stored token and can optionally delete all GitHub evidence. Deleting the LinkedIn import deletes its evidence.
- Re-sync replaces outdated evidence (deleted repositories, removed dependencies) and keeps visibility choices.

## Evidence model

| Method | Confidence |
|---|---|
| Dependency in a manifest file | 0.60 |
| Config file (Docker, workflow, Kubernetes) | 0.50 |
| GitHub language breakdown | 0.30 + 0.40 × share of the code (≥ 5%) |
| Repository topic | 0.40 |
| README mention | 0.20 |
| LinkedIn certification / position / project | 0.50 / 0.45 / 0.40 |
| LinkedIn Skills list (self-declared) | 0.30 |
| LinkedIn headline / summary | 0.20 |

GitHub evidence is multiplied by 0.5 for forks and by 0.8 for repositories not pushed in a year. A skill's confidence combines its evidence with a noisy-OR, `1 − Π(1 − cᵢ)`, capped at 0.95. Confidence describes how strong the evidence of *use* is. It is not a proficiency level.

Evidence classes, strongest first: `repeated_project_evidence` (3+ repositories), `github_detected`, `professional_experience` (LinkedIn position/project/certification), and `self_declared`.

Normalization is exact (`JS` → JavaScript, `react-dom` → React, `psycopg2` → PostgreSQL). Related but different technologies (Next.js vs React) are not merged; the existing semantic skill matcher already relates them at recommendation time. Prose matching (README, LinkedIn text) ignores names and aliases shorter than three characters ("CV", "PM", "Go") to avoid false positives.

## Recommendation integration

The architecture is unchanged. Approved skills are written to `student_skills`, so project scoring, teammate coverage and semantic skill matching use them automatically. Text from connected sources (public repository descriptions and topics, LinkedIn headline, summary and roles) joins the profile text for the cosine-similarity signal. Match explanations show which matched skills are backed by GitHub or LinkedIn evidence. The scoring weights were not changed: no validation data exists to justify weighting evidence-backed skills differently, and no SVM model was introduced.

## Security and privacy

- OAuth `state` is a 10-minute JWT bound to the signed-in user. The callback is a client page that sends `code` and `state` to the API with the user's own bearer token. The API rejects a state issued to someone else, which prevents linking a victim's GitHub to another account (login CSRF).
- Access tokens are encrypted with AES-256-GCM (`TOKEN_ENCRYPTION_KEY`, never stored in the database). A tampered ciphertext fails to decrypt.
- One GitHub account can back only one SyncSpace profile (unique index on `provider_user_id`).
- A revoked GitHub token is reported as `409` and marks the connection revoked. It is not a `401`, which the client would treat as an expired SyncSpace session.
- GitHub rate limits are reported as `429` with the retry time.
- Integration endpoints that call GitHub or parse uploads have their own rate limit. LinkedIn ZIPs are capped at 5 MB, and only the needed CSVs (≤ 5 MB each) are decompressed.
- Evidence is private by default. The LinkedIn profile URL is shown only to accepted teammates, under the same rule as email.

## Setup

1. GitHub → Settings → Developer settings → OAuth Apps → New. Set the callback URL to `<API origin>/api/integrations/github/callback`. [Phase 19](phase-19-integration-repair.md) adds the callback bridge, PKCE, browser binding and replay protection.
2. Set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI` (the same callback URL) and `TOKEN_ENCRYPTION_KEY` (32 random bytes, base64). In production, all four must be set together or not at all.
3. Run `pnpm db:migrate` to apply `009_profile_intelligence.sql`.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/integrations` | Connections and the skill review list |
| GET | `/api/integrations/github/authorize` | GitHub authorization URL |
| POST | `/api/integrations/github/exchange` | `{ code, state }` from the callback page; connects and syncs |
| POST | `/api/integrations/github/sync` | Re-analyze public repositories |
| DELETE | `/api/integrations/github?deleteEvidence=true` | Revoke, disconnect, optionally delete evidence |
| POST | `/api/integrations/linkedin/import` | Multipart `export` ZIP |
| DELETE | `/api/integrations/linkedin` | Delete the import and its evidence |
| POST | `/api/integrations/skills/:skillId/decision` | `{ decision: approved \| rejected, proficiency? }` |
| PUT | `/api/integrations/evidence/visibility` | `{ evidenceIds, visibility }` |

## Verification

- `githubAnalyzer.test.js`: multi-language repositories, empty repositories, missing README, duplicate skills across repositories, forks, private repositories, unknown languages, manifest parsers.
- `githubClient.test.js`: public-only listing, rate limits (primary and secondary), revoked tokens, unknown users, OAuth exchange errors, grant revocation, state binding.
- `linkedinExport.test.js`: CSV edge cases, "Notes:" preambles, a realistic export, non-ZIP and empty uploads. It also confirms addresses, birth dates and contacts are never read.
- `skillReview.test.js`: approval requires a proficiency, approval never overwrites manual skills, rejection, review statuses, and the effect on recommendation scoring and explanations.
- `integrationRoutes.test.js`: authentication, unconfigured GitHub, input validation, ZIP-only upload, LinkedIn URL validation.
- `profileIntelligence.integration.test.js` (CI): re-sync replacement, visibility persistence, account uniqueness, approval semantics, recommendation context.
- `connectedProfiles.test.jsx`: review, approve/reject, visibility, consent text, unconfigured server.
