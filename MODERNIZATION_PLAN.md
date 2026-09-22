# Nango Modernization and Reliability Plan

## 1. Executive summary

This plan modernizes operations around the existing Nango architecture without
rewriting a working integration platform. The recommended path is conservative:
keep the TypeScript modular monorepo and public contracts, make local/self-hosted
Docker reproducible, close verification gaps around readiness and persisted
PostgreSQL data, then improve seam-level tests and operational observability.
The immediate business value is fewer failed starts, safer provider/API changes,
and a clearer path from an authenticated connection to a proxy request, sync,
webhook, action, or MCP tool. The evidence base is
[ARCHITECTURE.md](ARCHITECTURE.md).

## 2. Current-state assessment

Nango already has a supported Node 22 toolchain, a committed npm lockfile,
TypeScript builds, Vitest suites, provider/OpenAPI validation, and CI workflows
([ARCHITECTURE.md](ARCHITECTURE.md#L24-L52),
[ARCHITECTURE.md](ARCHITECTURE.md#L104-L130)). The main operational weaknesses
are:

1. Self-hosted Compose uses a mutable `nangohq/nango-server:hosted` tag, so the
   exact application version is not reproducible
   ([docker-compose.yaml](docker-compose.yaml#L25-L32)).
2. Development and self-hosted Compose use different PostgreSQL majors
   ([ARCHITECTURE.md](ARCHITECTURE.md#L130-L142)).
3. Docker startup depends on a persisted bind mount; an image-major change is
   not a data migration.
4. CI verifies containers are running but does not yet prove `/ready` or a
   successful application request ([.github/workflows/docker.yaml](.github/workflows/docker.yaml#L69-L95)).
5. Whether CI checks are required branch-protection gates is not visible in the
   checkout and remains **[UNVERIFIED]**.
6. The current live Docker failure (`ENOTFOUND nango-db`) needs a reproducible
   network/volume diagnosis before any application-level rewrite.

The Docker boundary now accepts `NANGO_IMAGE`, removes fixed container names
that caused cross-folder collisions, gates the server on Redis as well as
PostgreSQL, and defaults database/Redis host bindings to localhost. Production
operators still must select and approve an immutable application image.

## 3. Feasibility spike, strategy, and safety ladder

### Spike result

The repository is **partially alive**:

* The lockfile and Node 22 build/runtime pins are present.
* Unit, integration, CLI, provider, OpenAPI, and Docker checks are defined.
* The self-hosted Compose stack has a documented database-readiness fix.
* A live Docker rerun and full test execution are **[UNVERIFIED]** in this
  environment because the sandbox blocked container execution due a missing
  `slirp4netns` runtime dependency.

The spike must be time-boxed to one working day. Its question is whether the
stack can boot once and capture useful behavior, not whether every historical
suite is green.

### Per-component strategy

| Component | Strategy | Testability milestone | Initial safety rung | Residual risk |
|---|---|---|---|---|
| Self-hosted Docker | **B: beachhead/walking skeleton** | Phase 1: Compose renders, DB reaches healthy, server reaches `/ready`, and one API smoke check passes | L2 | Live Docker network behavior is not yet captured in this environment. |
| Core server/auth/proxy | **A: freeze-then-lift** | Phase 2: `npm run ts-build`, focused unit test, and one integration seam pass in CI | L3 | Provider-specific combinations remain broader than the focused gate. |
| Jobs/runner/persist/orchestrator | **A: freeze-then-lift** | Phase 3: each process starts with its required dependencies and one meaningful job/sync test passes | L3 | Full distributed failure/retry behavior needs later tests. |
| Webapp/Connect UI | **A: freeze-then-lift** | Existing client/Playwright CI is green in Phase 2 | L3 | Browser/provider OAuth matrix is not exhaustive. |
| CLI/SDKs | **A: freeze-then-lift** | Existing CLI/client workflow is green in Phase 2 | L4 | External registry publish path is environment-dependent. |
| Provider catalog/integrations | **A: freeze-then-lift** | Provider validation plus one provider auth/proxy/sync seam pass in Phase 3 | L3 | Third-party API drift cannot be completely controlled. |

### CI milestone

**Phase 2 is the CI Milestone.** It consolidates the authoritative lint,
format, typecheck, unit, integration, client, provider, OpenAPI, and Docker
checks around the tested runtime. Authoring workflow changes is agent-doable;
making checks required through GitHub branch protection is a manual maintainer
action and remains an explicit handoff.

## 4. Target architecture

### Recommendation

Keep a modular monolith plus separately deployable worker/runtime packages.
Treat the HTTP routes, connection/credential service, provider catalog, and
database interfaces as stable seams. Improve deployment reproducibility and
observability before splitting services. A service split now would multiply
network, migration, auth, and retry failure modes without solving the observed
startup problem.

### Agentic development foundation

The repository now has a portable, IDE-neutral agentic workflow in
[AGENTIC_DEVELOPMENT.md](AGENTIC_DEVELOPMENT.md). It is deliberately
repository-owned so VS Code/Copilot, Claude Code, Cursor, JetBrains, terminal
agents, and CI automation can use the same process rather than maintaining
parallel memories or conflicting rules.

This is a process and evidence layer, not a new runtime service. It adds:

- a `Frame -> Map -> Design -> Implement -> Verify -> Review -> Record ->
  Deliver` lifecycle;
- durable work-item and context-map templates in `.agentic/`;
- role separation for Mapper, Designer, Builder, Verifier, Reviewer, and
  Release Operator;
- explicit boundaries for parallel agents so they do not edit the same files;
- surface-specific verification tied to the real npm scripts and Docker
  readiness contract;
- a debugging protocol that distinguishes code, configuration, data, network,
  and sandbox failures;
- bounded context packs, resumable checkpoints, package ownership routing, and
  explicit approval boundaries for autonomous work;
- thin Claude role adapters and a repository skill that reuse the same policy
  instead of creating a second agent-specific workflow;
- a single source of truth for context: committed docs, work items, diffs,
  tests, CI, and PR evidence.

The first adoption step is process-only and therefore safe to roll back: use
the templates for new work and link the handbook from the existing Copilot
instructions. IDE-specific adapters are optional and must remain thin. Personal
agent memory, `.env` files, transcripts, and customer data are explicitly not
durable project context.

#### ADR: Keep TypeScript and Node 22

- **Context:** The repository has a Node 22 pin, a committed lockfile, and
  working TypeScript/CI definitions.
- **Decision:** Keep Node 22 and upgrade dependencies in place only when a
  measured security or maintenance need exists.
- **Alternatives considered:** Rewrite in another language; rejected because the
  current code and SDK ecosystem are TypeScript-native.
- **Consequences:** Runtime upgrades must move `.nvmrc`, Docker build/runtime
  images, CI setup actions, and package engines together.

#### ADR: Pin self-hosted application images

- **Context:** `:hosted` is mutable and makes rollback/reproduction ambiguous.
- **Decision:** Replace the mutable tag with a release tag or immutable digest
  after the image provenance is confirmed.
- **Alternatives considered:** Build every self-hosted image locally; rejected
  as a larger operational burden for users who consume the published image.
- **Consequences:** Upgrades become explicit and auditable; operators must
  update the image intentionally.

#### ADR: Preserve PostgreSQL as the system of record

- **Context:** migrations, records, keystore, audit, and application state are
  PostgreSQL-backed ([ARCHITECTURE.md](ARCHITECTURE.md#L155-L181)).
- **Decision:** Keep PostgreSQL and document a supported major-version upgrade
  path before changing the persisted image.
- **Alternatives considered:** Replace with a managed vendor-specific database;
  rejected because it does not address the current readiness/network failure.
- **Consequences:** Backups, migration locks, and rollback procedures remain
  first-class operational responsibilities.

#### ADR: Use readiness as the deployment contract

- **Context:** `/health` is process liveness while `/ready` represents
  application readiness ([ARCHITECTURE.md](ARCHITECTURE.md#L185-L199)).
- **Decision:** Docker/CI/load-balancers use `/ready`; `/health` remains liveness.
- **Alternatives considered:** Fixed sleeps; rejected because timing is not a
  correctness guarantee.
- **Consequences:** CI and Compose must fail clearly when migrations or backing
  services are unavailable.

### What stays and what changes

| Area | Decision |
|---|---|
| Express route families and public contracts | ✅ Keep as-is; add contract tests. |
| OAuth/connection service | ✅ Keep; harden seams and telemetry. |
| Provider YAML catalog | ✅ Keep; validate generated/indexed artifacts. |
| Docker Compose topology | ⬆️ Upgrade in place: pin image, readiness checks, smoke verification. |
| PostgreSQL data | ✅ Keep; document staged major upgrades, never destructive reset for real data. |
| Redis/pub-sub | ✅ Keep; make dependency usage and readiness explicit. |
| Jobs/runner/orchestrator | 🔄 Wrap/adapt with explicit health and job contracts; do not split prematurely. |
| Webapp/Connect UI | ✅ Keep; preserve API/Connect session contracts. |
| Existing mutable `hosted` image reference | 🗑️ Remove after a verified immutable replacement exists. |
| Full rewrite or microservice split | ⏭️ Deferred; no evidence it solves current problems. |

## 5. Per-feature migration analysis

| Feature | Current implementation | Strategy/tactic | Milestone/rung | Size | Acceptance criteria |
|---|---|---|---|---|---|
| Auth/connections | Provider metadata, OAuth client, encrypted credentials | A / incremental refactor | Phase 2 / L3 | L | OAuth callback, refresh, redaction, and tenant identity seams remain compatible. |
| Proxy | Shared outbound request service and provider credential resolution | A / leave interface, improve tests | Phase 2 / L3 | M | Existing proxy contract tests plus blocked-URL and refresh cases pass. |
| Syncs/actions/functions | Runner/jobs SDK and durable state | A / strangler at job boundaries | Phase 3 / L3 | XL | One sync and one action execute, checkpoint, retry, and report errors. |
| Webhooks/events | Webhook service, pub/sub, task processing | A / incremental refactor | Phase 3 / L3 | L | Signature verification, deduplication, enqueue, retry, and audit are proven. |
| MCP/tool calling | Management MCP routes and MCP OAuth registration | A / additive contract work | Phase 4 / L3 | L | Tool auth uses existing connection policy and never returns credentials. |
| Dashboard/Connect UI | Webapp and embeddable UI | A / leave in place | Phase 2 / L3 | M | Build, browser accessibility suite, and connection completion event pass. |
| CLI/SDKs | CLI deployment and Node/frontend clients | A / leave in place | Phase 2 / L4 | M | CLI/client workflow and CJS/ESM checks pass. |
| Provider catalog | YAML providers/scopes and validation | A / incremental additions | Phase 3 / L3 | M | Provider validation and a representative provider smoke test pass. |

## 6. Phased implementation plan

Phases are gated. A lit component advances only on the runnable command/CI
criteria below. A dark component advances on evidence, reversibility, and smoke
checks—not on a test suite that cannot yet execute.

### Phase 1: Reproducible Docker beachhead (T-shirt size: M)

**Goal:** Prove the smallest self-hosted stack can render, start, become ready,
and be diagnosed without changing application behavior.

**Regime:** pre-testability for live Docker; existing code packages are lit.  
**Safety rung:** L2; live container validation was blocked in this environment.  
**Prerequisites:** architecture baseline.  
**Duration estimate:** 1-2 sprints.

#### Tasks

| ID | Task | Component | Blocked by |
|---|---|---|---|
| 1.1 | Pin the self-hosted image to a reviewed release/digest | Docker | Image provenance decision |
| 1.2 | Add `/ready` and DB health checks to the Docker smoke procedure | Docker/CI | 1.1 |
| 1.3 | Verify both containers share the Compose network and capture diagnostics on failure | Docker | 1.2 |
| 1.4 | Document bind-volume backup and PostgreSQL major-upgrade procedure | Data | 1.1 |
| 1.5 | Run `docker compose config`, `up -d`, `ps`, health checks, and logs on a host with working Docker networking | Operations | 1.2 |

#### Risks and mitigations

* **Risk:** an existing volume was created under an incompatible PostgreSQL
  major. **Mitigation:** backup and verify before changing image tags.
* **Risk:** mutable image changes behavior unexpectedly. **Mitigation:** pin
  digest and retain the previous image reference for rollback.

#### Decisions made

* No destructive `down -v`; persisted data is treated as real.
* Fixed sleeps are dropped; readiness polling is the contract.
* Service splitting is deferred.

#### Verification and exit criteria

- [ ] `docker compose config` succeeds with no obsolete-version warning.
- [ ] `nango-db` is healthy and `nango-server` is running on the same network.
- [ ] `/health` and `/ready` both return expected success responses.
- [ ] A server log shows migrations complete and the listener is active.
- [ ] A deliberate stopped-network/container test produces actionable logs.
- [ ] Residual L2 risk is recorded until Phase 2 CI runs Docker smoke checks.

### Phase 2: CI milestone and seam safety net (T-shirt size: L)

**Goal:** Make the supported Node 22 path continuously verifiable.

**Regime:** post-testability.  
**Safety rung:** L3 initially, targeting L4 for CLI/SDK and core build seams.  
**Prerequisites:** Phase 1.  
**Duration estimate:** 2-4 sprints.

#### Tasks

| ID | Task | Component | Blocked by |
|---|---|---|---|
| 2.1 | Run install/build/lint/format/unit/integration smoke on Node 22 | CI | 1.5 |
| 2.2 | Add focused auth, proxy, readiness, and migration seam tests | Server/shared | 2.1 |
| 2.3 | Replace Docker fixed wait with health/readiness polling | Docker workflow | 2.1 |
| 2.4 | Confirm client, CLI, provider, and OpenAPI workflows are included in PR status | CI | 2.1 |
| 2.5 | Ask a repository maintainer to enable required branch-protection checks | Governance | 2.4 |

#### Verification and exit criteria

- [ ] `npm ci` installs without hand patching.
- [ ] `npm run ts-build`, `npm run lint`, and `npm run format:check` pass.
- [ ] `npm run test:unit -- packages/<focused-area>` passes for changed seams.
- [ ] At least one integration test and one client/CLI test pass in CI.
- [ ] Docker workflow verifies `/ready`, not only process existence.
- [ ] Human action: required status checks are enabled in repository settings.

### Phase 3: Durable jobs, syncs, webhooks, and data operations (T-shirt size: XL)

**Goal:** Make asynchronous integration behavior observable and recoverable.

**Regime:** post-testability.  
**Safety rung:** L3; target L4 for critical job contracts.  
**Prerequisites:** Phase 2.  
**Duration estimate:** 3-6 sprints.

#### Tasks

| ID | Task | Component | Blocked by |
|---|---|---|---|
| 3.1 | Define job lifecycle states, retry policy, timeout, and idempotency seams | Jobs/runner | 2.2 |
| 3.2 | Add one sync checkpoint/replay contract test | Sync/records | 3.1 |
| 3.3 | Add webhook signature/deduplication/enqueue contract test | Webhooks | 3.1 |
| 3.4 | Add dashboards/alerts for readiness, migration failures, retries, and dead letters | Operations | 3.1 |
| 3.5 | Document PostgreSQL backup/restore rehearsal and migration rollback | Data | 3.4 |

#### Verification and exit criteria

- [ ] One sync and one action run through the real runner boundary.
- [ ] A duplicate webhook does not duplicate business state.
- [ ] A transient external failure retries and a permanent failure is visible.
- [ ] Backup restore is rehearsed without overwriting the source volume.
- [ ] Integration shards and focused tests pass in CI.

### Phase 4: MCP and advanced integrations (T-shirt size: L)

**Goal:** Expand agent/tool capabilities without creating a parallel credential
or policy system.

**Regime:** post-testability.  
**Safety rung:** L3.  
**Prerequisites:** Phase 3.  
**Duration estimate:** 2-4 sprints.

#### Tasks and exit criteria

1. Define typed MCP tool contracts and tenant authorization.
2. Reuse connection lookup, OAuth refresh, outbound policy, rate limits,
   telemetry, audit, and idempotency.
3. Test MCP registration, callback, successful tool call, denied tool call, and
   secret redaction.
4. Run `npm run ts-build`, focused unit/integration tests, OpenAPI validation,
   lint, and format checks.

### Phase 5: Runtime/data modernization (T-shirt size: M per change)

**Goal:** Upgrade Node, PostgreSQL, Redis, or dependencies only when justified
by support/security evidence.

**Regime:** post-testability.  
**Safety rung:** L4 for code; L3 for stateful data until restore is rehearsed.  
**Prerequisites:** Phases 1-4.  
**Duration estimate:** one isolated change per 1-3 sprints.

#### Rules

* Move `.nvmrc`, `engines`, Docker build/runtime images, CI setup-node versions,
  and client matrices in one runtime change.
* For PostgreSQL, choose a staged supported upgrade or an explicitly destructive
  reset only for disposable data; retain the previous-major image for rollback.
* Run the hazard checklist below before each dependency/runtime major.

## 7. Hazard red-team checklist

| Hazard | Status/action |
|---|---|
| H1 transitive quarantine | Cleared for the current plan: no dependency family is removed; any future removal must grep every workspace manifest and lockfile. |
| H2 framework-major codemods | Cleared: no framework-major upgrade is proposed in Phases 1-4. Add codemod and test-engine tasks before any major bump. |
| H3 runtime/deployment lockstep | Fired: Node pins exist in `.nvmrc`, Dockerfiles, package engines, and CI matrix. Phase 5 moves them together. |
| H4 route/security class loss | Cleared: no route rewrite proposed. Any API/MCP change must preserve health/readiness, OAuth, public, private, and internal route classes. |
| H5 stateful-store major upgrade | Fired: PostgreSQL 15/16 drift and persisted `nango-data`. Phase 1 requires backup/upgrade procedure; image bump alone is prohibited. |
| H6 transitional insecure state | Cleared: no new permit-all or placeholder-secret state is introduced. |
| H7 stacked PR/trunk drift | Cleared: one branch per phase, merge to trunk before the next phase. |
| H8 living documentation drift | Fired: Docker/CI topology changes must update `ARCHITECTURE.md` and `.github/copilot-instructions.md` in the same PR. |

## 8. Execution governance

* Confirm the repository trunk name before creating phase branches; the local
  workflows currently target `master`, which is a governance fact to verify.
* Cut each phase branch from trunk, open one PR, and merge it before starting
  the next phase. Never silently stack sibling phase branches.
* Record the phase status in this file: `✅ complete`, `⏭️ deferred`, or
  `🗑️ dropped`.
* Lit phases advance on green CI; dark Phase 1 advances on Docker evidence and
  reversible operational checks.
* A maintainer, not an agent, must enable required status checks/branch
  protection.

## 9. Migration safety net

### Feature flags and coexistence

Use existing feature flags for incremental behavior. Keep old/new paths behind a
tenant- or environment-scoped flag, emit comparison telemetry, and remove a flag
only after the replacement has a stable seam test and rollback window.

### Data migration

Use additive schema changes, backfill in batches, verify counts/checksums, and
retain rollback scripts. For PostgreSQL major upgrades, take a logical/physical
backup, rehearse restore, follow the supported sequential upgrade route, and
retain the prior image until post-upgrade validation completes.

### Rollback

* Docker: restore the previous immutable image and previous Compose file; do
  not delete the data volume.
* Application: redeploy the previous image/commit.
* Schema: roll back only additive changes or restore into a separate database
  and cut traffic back after verification.
* Provider/API behavior: disable the feature flag and preserve the connection.

### Oracle and seams

The primary oracle is a running current Nango instance plus API/OpenAPI,
provider validation, and existing integration tests. If live execution is
unavailable, use source and docs as the specification and create a self-frozen
golden master at the first successful run; that proves later consistency, not
initial correctness.

### Observability

Track readiness failures, migration duration/failure, connection auth/refresh
errors, proxy latency/status/rate-limit responses, sync checkpoints, webhook
deduplication/retry/dead-letter counts, MCP tool denials, and credential
redaction/audit events.

## 10. Open questions and manual handoffs

1. **Manual:** Which GitHub checks are required before merge, and is `master`
   the intended trunk? Confirm branch protection with a repository maintainer.
2. Which immutable Nango server image tag/digest is approved for self-hosting?
3. Is the existing `nango-data` volume production data or disposable local data?
4. Should development use PostgreSQL 16 to match self-hosted Compose, or should
   self-hosted Compose use the development major?
5. Which optional backends (Elasticsearch, ClickHouse, ActiveMQ, Orb, audit
   backend) are required for the target deployment?
6. What is the required recovery point/recovery time objective for connection
   credentials, sync records, and audit data?
7. Which provider/API is the first business-critical integration to use as the
   representative end-to-end seam?
