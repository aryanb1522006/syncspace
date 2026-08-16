# SyncSpace source manifest

The UCS503 master template places source under `code/`. SyncSpace was already deployed as a pnpm monorepo before course-template adoption, and Appwrite/Render build paths depend on its root layout. Moving or duplicating the code would create deployment breakage and two drifting source copies.

This manifest is therefore the course-facing index to the canonical source in the same repository:

| Area | Canonical path | Purpose |
|---|---|---|
| React application | [`../client`](../client) | Vite entry, routes, signed-in shell, landing experience, tests, and styles |
| Express API | [`../server`](../server) | Routes, controllers, services, models, migrations, seed, scripts, and tests |
| Production deployment | [`../deploy`](../deploy), [`../compose.production.yml`](../compose.production.yml) | Reverse proxy, metrics, alerts, backup/restore, and container topology |
| Workspace scripts | [`../scripts`](../scripts) | Cross-service configuration validation |
| CI/CD | [`../.github/workflows`](../.github/workflows) | PostgreSQL integration, test/build/smoke, and course Pages publication |
| Documentation | [`../docs`](../docs) | Academic project page and engineering evidence |
| Prototypes | [`../prototypes`](../prototypes) | Isolated UI explorations excluded from the production source path |

## Reproduce the product

```bash
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm db:seed
pnpm test
pnpm build
```

See the root [`README.md`](../README.md) for local environment configuration and [`docs/production-runbook.md`](../docs/production-runbook.md) for deployment operations.
