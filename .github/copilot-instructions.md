# Copilot instructions for this Nango checkout

## Canonical commands

| Goal | Command |
|---|---|
| Install | `npm install` then `npm run prepare` |
| Start dependencies | `npm run dev:docker` |
| TypeScript watch build | `npm run dev:watch` |
| Run applications | `npm run dev:watch:apps` |
| Backend-only development | `npm run dev:watch:headless` |
| Typecheck/build | `npm run ts-build` |
| Lint | `npm run lint` |
| Format check | `npm run format:check` |
| Unit tests | `npm run test:unit -- packages/<area>` |
| Integration tests | `npm run test:integration -- --shard=1/4` |
| CLI tests | `npm run test:cli` |
| Provider validation | `npm run test:providers` |
| OpenAPI validation | `npm run test:openapi` |
| Agentic contract | `npm run agentic:check` |
| Docker self-hosted | `docker compose up -d` |

## Change rules

1. Read `ARCHITECTURE.md` before changing Docker, routes, auth, provider
   metadata, jobs, webhooks, syncs, events, or MCP.
2. Keep credentials, encryption keys, and `.env` files out of commits.
3. Reuse the existing connection, credential-refresh, outbound-policy,
   telemetry, and audit paths.
4. Update the relevant docs and generated indexes in the same change.
5. For provider work, run `npm run test:providers`; for public API work, run
   `npm run test:openapi`.
6. For Docker work, validate `docker compose config`, then start the stack and
   verify `/health`, `/ready`, PostgreSQL health, and container network
   membership.
7. Follow [AGENTIC_DEVELOPMENT.md](../AGENTIC_DEVELOPMENT.md) for work-item
   framing, context mapping, role separation, debugging, and evidence recording.
8. Keep durable decisions in repository files or the issue/PR. Do not rely on
   agent chat history, personal IDE memory, local transcripts, or uncommitted
   notes.
9. For paused or blocked work, copy
   `.agentic/session-checkpoint.template.md` to
   `.agentic/session-checkpoint.md` and record the exact resume action.
10. Route package changes through `.agentic/package-ownership.md` and respect
    `.agentic/agent-contracts.md` approval boundaries.

## Verification gate

Before declaring a change complete, run the smallest applicable checks:

```sh
npm run lint
npm run format:check
npm run ts-build
```

Add focused unit/integration/provider/OpenAPI/Docker checks according to the
changed surface. CI runs on pull requests and merge queues, but whether checks
are required for merging is a repository-settings decision and must be verified
by a maintainer.

## Agentic workflow

Use the repository-owned loop:

```text
Frame -> Map -> Design -> Implement -> Verify -> Review -> Record -> Deliver
```

For multi-agent work, use separate Mapper, Designer, Builder, Verifier, and
Reviewer responsibilities. The lead agent owns the final diff; agents must not
edit the same files concurrently. Copy
[.agentic/work-item.template.md](../.agentic/work-item.template.md) for work
that spans more than a small local change. Use
[.agentic/session-checkpoint.template.md](../.agentic/session-checkpoint.template.md)
to stop and resume from any IDE without relying on chat memory.

## Docker safety

* The server reaches PostgreSQL at `nango-db`, never `localhost`.
* PostgreSQL data lives in `./nango-data`; back it up before upgrades.
* A new database image tag is not itself a database migration.
* Keep `nango-server` behind the PostgreSQL health check.
* Do not enable optional Elasticsearch/ClickHouse/ActiveMQ paths without
  enabling their matching environment variables and validating readiness.

## Architecture references

See [ARCHITECTURE.md](../ARCHITECTURE.md) for C4 diagrams, lifecycle
descriptions, end-to-end playbooks, business alternatives, and diagnosis
procedures.
