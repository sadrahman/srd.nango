## Context Map

### Files to Modify

| File | Purpose | Changes Needed |
|---|---|---|
| `docker-compose.yaml` | Self-hosted runtime topology | Remove cross-folder container collisions, make image/data/credentials selectable, gate the server on Redis health, and reduce default host exposure. |
| `.env.example` | Configuration reference | Document the production image, project-scoped data path, database/Redis binding, and required public URLs. |
| `docs/self-hosted-production.md` | Operator runbook | Explain clean deployment, validation, safe project cleanup, backups, and image selection. |
| `ARCHITECTURE.md` | Architecture source of truth | Update the Docker topology and failure diagnosis to match the hardened Compose contract. |
| `.agentic/work-item.md` | Work contract | Record this Docker hardening scope and acceptance criteria. |
| `.agentic/session-checkpoint.md` | Resume state | Record implementation and the exact verification blocker/action. |

### Dependencies (may need updates)

| File | Relationship |
|---|---|
| `.github/workflows/docker.yaml` | Exercises the Compose topology and health endpoints. |
| `.github/copilot-instructions.md` | Defines Docker verification and safety rules. |
| `scripts/build_docker.sh` | Produces a different image naming scheme and must be documented as distinct from the self-hosted image. |
| `Dockerfile` | Builds the application image consumed only when `NANGO_IMAGE` points at it. |

### Test Files

| Test | Coverage |
|---|---|
| `scripts/agentic-check.mjs` | Repository workflow contract. |
| `.github/workflows/docker.yaml` | Compose render, PostgreSQL health, `/ready`, `/health`, diagnostics, and cleanup. |
| `docker compose config --quiet` | Compose interpolation and schema validity. |

### Reference Patterns

| File | Pattern |
|---|---|
| `docker-compose.yaml` | Existing service health checks and conditional startup. |
| `AGENTIC_DEVELOPMENT.md` | Bounded mapping, verification evidence, and safe resume. |

### Risk Assessment

- [ ] Breaking changes to public API
- [ ] Database migrations needed
- [x] Configuration changes required
- [x] Existing persisted data must be preserved
- [x] Live Docker validation requires a host with working container networking
