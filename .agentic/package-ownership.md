# Package ownership and verification map

This map tells an agent which context to load and which checks to run. It is a
routing aid, not a replacement for the package manifests or CI workflows.

| Area | Primary packages/files | Typical change contract | Minimum verification |
|---|---|---|---|
| HTTP server and routes | `packages/server`, `packages/shared` | Auth, tenancy, errors, route ordering, readiness | `npm run ts-build` + focused unit/integration test |
| Database and migrations | `packages/database`, `packages/records`, `packages/keystore`, `packages/kvstore` | Backward-compatible schema, rollback, data safety | Focused database test + migration up/down evidence |
| OAuth and connections | `packages/shared/lib/clients`, `packages/server` | Secret redaction, refresh, provider callback, tenant isolation | Focused auth test + `npm run ts-build` |
| Provider catalog | `packages/providers`, `docs/integrations` | Metadata/schema/index consistency | `npm run test:providers` |
| Proxy and functions | `packages/shared`, `packages/runner`, `packages/runner-sdk`, `packages/jobs` | Outbound policy, retries, execution isolation, observability | Focused unit/integration test + `npm run ts-build` |
| Syncs, webhooks, events | `packages/shared`, `packages/jobs`, `packages/orchestrator`, `packages/persist` | Idempotency, checkpoints, retries, event ordering | Focused integration test; inspect retry/dead-letter behavior |
| MCP and AI tooling | `packages/server`, `packages/shared`, MCP route/client files | OAuth registration, tool authorization, redaction | Focused server test + OpenAPI if public |
| Dashboard and Connect UI | `packages/webapp`, `packages/connect-ui`, `packages/design-system` | API contract, accessibility, session behavior | Package test/build + applicable Playwright workflow |
| CLI and SDKs | `packages/cli`, `packages/node-client`, `packages/frontend` | Public compatibility, generated types, error shape | CLI/client tests + `npm run ts-build` |
| Docker and operations | `docker-compose.yaml`, `dev/docker-compose.dev.yaml`, `Dockerfile*`, `.github/workflows/docker.yaml` | Image/runtime lockstep, readiness, network, persisted data | `docker compose config --quiet`, startup, `/ready`, `/health`, logs |
| Docs and generated artifacts | `ARCHITECTURE.md`, `MODERNIZATION_PLAN.md`, `docs`, `.github` | Links, commands, topology, generated indexes | Link/index checks applicable to the changed docs |

## Context loading order

1. Load this row and the relevant work-item contract.
2. Load the named package manifest and direct entry points.
3. Load one level of callers/callees and existing tests.
4. Load CI or deployment files only when the surface requires them.
5. Stop expanding context when acceptance criteria and verification commands
   are fully grounded in local evidence.

## Ownership rule

One builder owns one primary area per work item. If a change crosses rows, the
lead agent must record the cross-area contract and assign a verifier for each
additional row. Parallel builders must use disjoint files and merge through the
lead agent.

