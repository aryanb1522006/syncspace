# Production runbook

## What is automated

- The API image runs as a non-root user and performs pending migrations before accepting traffic.
- The client image serves the optimized Vite bundle through unprivileged Nginx and proxies `/api` to Express.
- Caddy terminates TLS, renews certificates, and applies baseline transport headers.
- PostgreSQL and object storage have persistent volumes and health checks in the self-hosted Compose baseline.
- Resumes use private S3-compatible storage and five-minute signed downloads.
- Express exposes liveness, database readiness, and authenticated Prometheus metrics.
- API logs are structured JSON with request IDs and redacted authorization data.
- Prometheus rules cover API availability, 5xx rate, and p95 latency.
- A verified `pg_dump` backup job and guarded restore script are included.
- GitHub Actions provisions PostgreSQL, migrates, seeds, runs SQL-backed and unit tests, builds the client, and executes the API journey.

## Required choices before a public launch

The repository cannot choose a hosting account, DNS zone, alert receiver, or secret store. Decide those four items before executing this runbook. A managed PostgreSQL service and managed S3-compatible object store are preferred; the Compose services are suitable as a self-hosted baseline, but their durability still depends on the host and off-host backups.

## Prepare secrets

Copy `.env.production.example` to `.env.production` and replace every placeholder. Generate independent high-entropy values for:

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `MINIO_ROOT_PASSWORD` or managed S3 credentials
- `METRICS_TOKEN`

Also configure `GOOGLE_CLIENT_ID`, `AUTH_ALLOWED_EMAIL_DOMAIN=thapar.edu`, and `PASSWORD_AUTH_ENABLED=false` for Google-only production access. Set `ADMIN_EMAILS` to a comma-separated exact allowlist, such as `abansal6_be24@thapar.edu`; it is identity configuration rather than a secret. The OAuth client ID is not secret, but it must match `VITE_GOOGLE_CLIENT_ID` in the client build. Production startup rejects a Google client ID without a domain restriction, a domain restriction without a Google client ID, or an admin address outside the allowed domain.

Never commit `.env.production` or `deploy/secrets/metrics-token`. The API refuses to boot in production if the database URL, client origin, JWT secret, S3 settings, or metrics token are missing. The JWT secret must be at least 32 characters.

If the database password contains URL-reserved characters, percent-encode it in `DATABASE_URL`; keep the original value in `POSTGRES_PASSWORD` for the database container.

For managed PostgreSQL, set `DATABASE_SSL_MODE=verify-full` and provide the provider CA through `DATABASE_SSL_CA` when required. `require` encrypts without CA verification and should only be a temporary compatibility setting.

## Self-hosted deployment

Requirements: Docker Engine with Compose, a public Linux host, a domain whose A/AAAA records point to the host, and ports 80/443 open.

```bash
cp .env.production.example .env.production
# edit .env.production and deploy/secrets/metrics-token
docker compose --env-file .env.production -f compose.production.yml up -d --build
docker compose --env-file .env.production -f compose.production.yml --profile tools run --rm seed
```

Caddy will request TLS certificates after DNS reaches the host. Confirm:

```bash
curl --fail https://your-domain.example/api/health/live
curl --fail https://your-domain.example/api/health/ready
API_BASE_URL=https://your-domain.example/api pnpm --filter @syncspace/server smoke:api
```

Run the mutation-heavy smoke journey against staging after each deployment. It creates isolated users, a project, an application, a team, and a task.

## Managed deployment

1. Build `server/Dockerfile` as the API service and `client/Dockerfile` as the web service, or serve `client/dist` on a static host.
2. Provision PostgreSQL and run `pnpm db:migrate`; only run `pnpm db:seed` in demo or staging environments.
3. Provision a private S3-compatible bucket and configure endpoint, region, credentials, and bucket name. AWS S3 can omit `S3_ENDPOINT` and `S3_FORCE_PATH_STYLE`.
4. Configure every value from `.env.production.example` in the platform secret store.
5. Route `/api` to Express or set `VITE_API_URL` to the public API origin before building the client. Set `VITE_GOOGLE_CLIENT_ID`, `VITE_AUTH_ALLOWED_EMAIL_DOMAIN`, and `VITE_PASSWORD_AUTH_ENABLED` before that build.
6. Configure health probes to `/api/health/live` and `/api/health/ready`.
7. Run the smoke journey against staging, promote the same images, and then run read-only health checks in production.

After adding or removing an administrator, redeploy the API. The user must sign out and sign in again to receive a fresh claim. Middleware also rechecks the live allowlist on every request, so removing an address stops admin requests even if an older token has not expired.

### Appwrite Sites SPA route fallback

SyncSpace uses React Router with browser-history URLs such as `/projects/1` and `/team/2`. Appwrite must return the client `index.html` file when a user reloads or directly opens one of these routes.

In Appwrite Console, open **Sites → SyncSpace → Settings → Build settings** and set:

- Rendering strategy: **Static site**
- Output directory: keep the existing working value (`client/dist` when the site root is `.`, or `./dist` when the site root is `client`)
- Fallback file: `index.html`

Save the settings and redeploy the site. Directly open and reload `/dashboard`, `/projects/1`, `/projects/mine`, and `/team/1`. Each route should load the React application instead of Appwrite's page-not-found response.

## Pilot data cleanup

Before inviting a real cohort, preview known seeded, QA, and smoke projects against the production database:

~~~powershell
$env:DATABASE_URL = "YOUR_ROTATED_SUPABASE_POOLER_URL"
$env:DATABASE_SSL_MODE = "require"
pnpm.cmd db:cleanup:pilot
~~~

Review every returned ID, title, owner, and cascade count. Apply the deletion only when the preview is fully understood:

~~~powershell
pnpm.cmd db:cleanup:pilot -- --apply --confirm=REMOVE_TEST_PROJECTS
pnpm.cmd db:cleanup:pilot
Remove-Item Env:DATABASE_URL
Remove-Item Env:DATABASE_SSL_MODE
~~~

The second preview must report zero candidates. The cleanup intentionally leaves users, colleges, skills, resumes, and ordinary Thapar projects unchanged.

## Monitoring and alerts

The metrics endpoint is `GET /api/metrics` and requires `Authorization: Bearer <METRICS_TOKEN>`. To use the included Prometheus profile:

```bash
# deploy/secrets/metrics-token must contain the same METRICS_TOKEN value
docker compose --env-file .env.production -f compose.production.yml --profile observability up -d prometheus
```

Connect `deploy/alertmanager.example.yml` to the team's chosen email, PagerDuty, Slack, or webhook receiver. Treat these as initial thresholds and tune them from real traffic:

- Critical: API scrape unavailable for two minutes.
- Warning: 5xx responses exceed 5% for ten minutes.
- Warning: p95 request latency exceeds one second for ten minutes.

Container logs remain JSON and can be forwarded to the hosting platform or a log drain. Alert on repeated readiness failures, database connection exhaustion, authentication spikes, and backup failures.

## Backups and restore drills

Run an on-demand backup:

```bash
docker compose --env-file .env.production -f compose.production.yml --profile ops run --rm db-backup
```

The job creates a compressed custom-format dump, verifies it with `pg_restore --list`, and keeps 14 days by default. Copy backups to a separate account or region; a backup on the same host is not disaster recovery.

Test restore in a disposable database at least quarterly:

```bash
ALLOW_RESTORE=yes PGDATABASE=syncspace_restore sh deploy/restore-postgres.sh backups/syncspace-TIMESTAMP.dump
```

Never test restoration against the live database. Record recovery time and verify users, projects, applications, team membership, and tasks after restore.

## Rollback

- Keep the previous API and client image tags until the new release passes readiness and smoke checks.
- Application rollback is safe when the previous code understands the current schema.
- Database migrations are forward-only. Correct a bad migration with a new numbered migration; do not rewrite an applied file.
- Restore the database only for confirmed data loss or corruption, with an incident record and an explicit target check.

## Current execution status

This workspace does not have Docker or PostgreSQL installed, and no hosting credentials were supplied. The images, Compose topology, CI, smoke journey, S3 adapter, monitoring rules, and runbooks are ready, but container pulls, live migration/seed, TLS issuance, external alert delivery, and a public URL must be executed in the selected environment.
