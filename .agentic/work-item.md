# Work item: Harden Docker startup and establish resumable agentic development

## Status

- Owner: Lead agent
- Branch: master
- Parent issue/PR: Not assigned
- State: blocked

## Outcome

The Nango repository has a health-gated self-hosted Docker stack and a
repository-owned, IDE-neutral workflow for bounded, resumable, evidence-driven
feature work.

## Scope

### In scope

- Remove obsolete Compose configuration and make PostgreSQL/Redis readiness
  explicit.
- Gate the Nango server on PostgreSQL health.
- Verify Docker startup in CI with readiness, health, diagnostics, and cleanup.
- Document architecture, modernization strategy, package ownership, agent
  contracts, context budgeting, and stop/resume behavior.
- Provide reusable work-item, context-map, and checkpoint templates plus
  role-specific agent adapters.

### Out of scope

- Choosing a production image digest without maintainer approval.
- Splitting the modular monolith into services.
- Resetting or migrating existing PostgreSQL data.
- Changing production credentials, tenants, or external integrations.

## Acceptance criteria

- [x] Compose no longer emits the obsolete `version` warning.
- [x] PostgreSQL and Redis expose health checks.
- [x] The server waits for PostgreSQL health before startup.
- [x] Docker CI validates Compose configuration, database health, `/ready`, and
      `/health`, emits diagnostics on failure, and always cleans up.
- [x] The agentic workflow is documented and checked by a repository script.
- [x] A future agent can resume from this work item and the checkpoint without
      relying on conversation history.
- [x] Self-hosted Compose is safe to run from multiple folders without fixed
      container-name collisions.
- [x] The runtime image is explicitly selectable and unrelated local images are
      not silently used.

## Context map

| Surface | Files/symbols | Why it matters |
|---|---|---|
| Entry point | `docker-compose.yaml`, `docs/self-hosted-production.md`, `packages/server` | Defines the self-hosted runtime, image selection, and operator startup path. |
| Shared/domain logic | `packages/server`, `packages/shared` | Owns database configuration and readiness behavior. |
| Persistence/data | `nango-data`, PostgreSQL service | Existing persisted data must not be reset or migrated implicitly. |
| API/provider/UI contract | `ARCHITECTURE.md`, `MODERNIZATION_PLAN.md` | Records system boundaries and operational decisions. |
| Tests/verification | `scripts/agentic-check.mjs`, `.github/workflows/docker.yaml`, `.github/workflows/tests.yaml`, `docker compose config --quiet` | Enforces workflow artifacts, service-ID health inspection, and runtime readiness gates. |
| Deployment/operations | `docker-compose.yaml`, Docker workflow, `.github/copilot-instructions.md` | Captures startup ordering, health checks, and safe rollback guidance. |

## Design and decisions

### Chosen approach

Keep the modular monolith and improve its existing Docker seams: Compose
health checks, `depends_on.condition: service_healthy`, and CI polling with
failure diagnostics. Keep the agentic system repository-owned and IDE-neutral,
with explicit role boundaries and checkpoint records.

### Alternatives rejected

- Fixed sleep-only startup waits: do not prove readiness and are timing
  dependent.
- Destructive volume reset: risks persisted PostgreSQL data.
- Premature service decomposition: no evidence currently requires it.
- Chat-only memory: is lost or compacted between sessions.

### Compatibility and migration

- Backward compatibility: application interfaces are unchanged.
- Data migration: none.
- Feature flag/rollout: none.
- Rollback: revert the Compose/CI/documentation changes; preserve
  `nango-data`.

## Verification plan

### Focused checks

```sh
npm run agentic:check
docker compose config --quiet
```

### Broader checks

```sh
npm run lint
npm run format:check
npm run ts-build
```

On a host with working container networking, also run the Docker workflow's
startup checks and verify `/ready`, `/health`, PostgreSQL health, and container
network membership.

## Evidence

- Reproduction: the original server startup failed with
  `getaddrinfo ENOTFOUND nango-db` while PostgreSQL was still recovering.
- Test output: the repository contract and Docker checks are defined, but local
  execution is blocked in this sandbox because `slirp4netns` is unavailable.
- Build/lint/format output: not claimed in this constrained session.
- CI/PR: Docker CI now performs readiness polling and unconditional cleanup.
- Screenshots/logs: original Docker logs are preserved in the user report; do
  not copy full logs or secrets into repository records.

## Review findings

- No independent review evidence is available in this session.

## Residual risk and follow-up

- Risk: live Docker validation remains unexecuted in this environment.
- Mitigation: run the focused commands on a host/CI runner with functional
  Docker networking before relying on the stack operationally.
- Follow-up issue: confirm the approved immutable self-hosted image tag/digest,
  branch protection requirements, and PostgreSQL version policy.
