# Phase 1 — Foundation and data model

## Delivered

- pnpm workspace with isolated `client` and `server` packages.
- Environment template for PostgreSQL, JWT, CORS, uploads, and the seeded college.
- Three ordered PostgreSQL migrations covering all MVP tables, indexes, enums, and automatic `updated_at` triggers.
- Nullable `college_id` on both `users` and `projects`, without implementing multi-tenant product behavior.
- Idempotent seed script with two colleges, six demo profiles, four projects, and 50 categorized skills with aliases.
- Architecture boundaries and ER diagram.

## Decisions

- PostgreSQL is the only application database.
- Database access uses a shared `pg` pool and an explicit transaction helper.
- Migrations are tracked in `schema_migrations`; every migration executes atomically.
- Seed accounts share `demo1234` only for local demonstration and must not be used in production.

## Verification

- Migration files were reviewed in filename order and include indexes for all required foreign keys plus project/application status.
- Server-side JavaScript files pass Node syntax checks.
- Live migration execution is deferred because PostgreSQL is not installed in the execution environment.

## Exit criteria

The schema and seed contract are stable enough for the API to build against without later table rewrites.
