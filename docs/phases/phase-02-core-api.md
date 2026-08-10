# Phase 2 — Core API

## Delivered

- Express application shell with CORS, JSON limits, health route, static uploads, 404 handling, and consistent error envelopes.
- Registration/login with bcrypt cost 12, signed JWTs, authentication middleware, expired-token handling, and owner role guards.
- Student profile read/update, current-profile lookup, PDF-only resume upload, PDF text parsing, proposed-skill extraction, and explicit reviewed-skill replacement.
- Local resume storage behind a small adapter so business logic does not depend on a storage vendor.
- Project create/read/list/update/delete with college scoping, owner checks, parameterized filters, and transactional skill replacement.
- Zod validation at every mutable route boundary.

## API groups

- `POST /api/auth/register`, `POST /api/auth/login`
- `GET /api/students/me`, `GET/PUT /api/students/:id`
- `POST /api/students/:id/resume`, `PUT /api/students/:id/skills`
- `GET /api/students/skills/dictionary`
- `POST/GET /api/projects`, `GET/PUT/DELETE /api/projects/:id`

## Verification

- All server source files pass Node syntax validation.
- Automated API-shell tests verify the public health route, malformed JWT rejection, expired JWT rejection, owner-only role enforcement, and request validation before database access.
- Dependencies install successfully with pnpm.
- Full database-backed curl verification is deferred because this environment has no PostgreSQL service.

## Security notes

- SQL values are always parameterized.
- File uploads accept one PDF up to 5 MiB and use generated filenames.
- Profile edits require ownership; project edits/deletes require both owner role and resource ownership.
- Production startup rejects missing `DATABASE_URL` and `JWT_SECRET`.
