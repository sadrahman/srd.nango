# Agentic development handbook

This is the repository-owned operating system for AI-assisted development in
Nango. It is intentionally IDE-neutral: an IDE, CLI, Copilot, Claude, or
another agent is only an adapter. The durable source of truth is the repository,
the work-item record, the git diff, and the verification evidence.

## 1. The operating model

Use one controlled loop for every feature, bug fix, infrastructure change, and
documentation change:

```text
Frame -> Map -> Design -> Implement -> Verify -> Review -> Record -> Deliver
```

| Stage | Required output | Stop condition |
|---|---|---|
| Frame | A bounded work item with acceptance criteria and risk | The request is testable and has an owner |
| Map | Relevant files, symbols, contracts, dependencies, and commands | No critical surface is still guessed |
| Design | Smallest safe change, affected interfaces, rollback | The change can be explained without code |
| Implement | Focused diff on a phase/work branch | No unrelated cleanup is mixed in |
| Verify | Targeted checks, then required broader gates | Evidence matches the changed surface |
| Review | Independent review of the diff and evidence | Findings are fixed or explicitly accepted |
| Record | Decision, test evidence, residual risk, next action | Another agent can resume without chat history |
| Deliver | PR with links to the work item and evidence | CI and human review policy are satisfied |

Do not skip `Map` or `Record` because an agent appears to remember the
conversation. Conversation context is disposable; repository evidence is not.

## 2. Durable context and memory

### What is authoritative

1. The current checkout and its committed files.
2. `ARCHITECTURE.md` for current-system behavior and local citations.
3. `MODERNIZATION_PLAN.md` for phased decisions and residual risks.
4. `.github/copilot-instructions.md` for canonical commands and gates.
5. A work-item record based on `.agentic/work-item.template.md`.
6. The git diff, test output, CI checks, and PR discussion.
7. A checkpoint based on `.agentic/session-checkpoint.template.md` when work
   pauses, fails, or crosses a phase boundary.

Agent memory, editor chat history, `.env`, credentials, and uncommitted local
notes are not authoritative and must never be the only place a decision lives.

### Context layers

Keep context small and load it in this order:

1. **Contract layer:** request, acceptance criteria, non-goals, safety policy.
2. **System layer:** the relevant sections of `ARCHITECTURE.md`.
3. **Change layer:** work-item map, current diff, directly related tests.
4. **Execution layer:** commands, logs, failures, and verification evidence.
5. **Decision layer:** ADR or a short decision entry when behavior or topology
   changes.

Do not paste the entire repository into an agent context. Start with the map,
then expand only when a symbol or dependency requires it.

### Context window budget

Treat context as a bounded cache, not a memory database:

- Start with the work item, package ownership row, architecture section, and
  direct entry point.
- Add only direct callers/callees, relevant tests, and the mapped CI/deployment
  files.
- Prefer summaries with file/line citations over copying whole files.
- After implementation, discard exploratory context and reload the checkpoint,
  diff, acceptance criteria, and failing evidence for verification/review.
- Never store secrets, customer payloads, access tokens, or full production logs
  in context artifacts.

The context pack is complete when the next action, its files, and its
verification command are explicit. More context is not automatically safer.

## 3. The standard work-item protocol

Create a branch from the real trunk (`master` in this checkout unless a
maintainer confirms otherwise). Copy
`.agentic/work-item.template.md` into an issue, PR description, or a local
work-item file. The record must contain:

- one-sentence outcome;
- in-scope and out-of-scope behavior;
- affected package, route, data, provider, and deployment surfaces;
- acceptance criteria expressed as observable behavior;
- exact verification commands;
- rollback plan and data-safety notes;
- current status, evidence links, and residual risk.

The agent should update the record at phase boundaries, not after every
keystroke. If the work spans multiple PRs, use one record per phase and link
them to the parent issue.

### Stop and resume protocol

To stop safely, finish the current atomic edit or command, then update a
checkpoint with the current state, last commit, exact next action, passing and
failing evidence, and residual risk. Do not leave "continue from here" in chat
only.

To resume from any IDE or agent:

1. Open the work item and checkpoint.
2. Confirm the branch and last-known commit; inspect `git diff` without
   discarding changes.
3. Run the checkpoint's exact resume action.
4. Re-map only if the branch, dependencies, or acceptance criteria changed.
5. Continue through the next state transition and update the checkpoint.

If the checkpoint is missing or inconsistent with the diff, stop and create a
new mapping checkpoint. Do not guess what the previous agent intended.

## 4. Role-based multi-agent workflow

Use specialized roles with narrow responsibilities. One lead agent owns the
work item and final diff; other agents produce bounded evidence or reviews.
Parallel agents must not edit the same files.
The detailed permissions and approval boundaries are in
`.agentic/agent-contracts.md`; the package routing table is in
`.agentic/package-ownership.md`.

| Role | Responsibility | May edit? | Output |
|---|---|---:|---|
| Mapper | Find files, symbols, contracts, and commands | No | Context map with citations |
| Designer | Propose the smallest implementation and risks | No | Design decision and test plan |
| Builder | Implement one bounded change | Yes | Focused diff |
| Verifier | Run targeted and required checks | No | Pass/fail evidence |
| Reviewer | Independently inspect the diff for correctness and regressions | No | Findings ranked by severity |
| Release operator | Validate deployment, migration, rollback, and observability | No | Release checklist |

### Safe sequencing

```text
Mapper -> Designer -> Builder -> Verifier -> Reviewer -> Lead decision
```

The mapper and designer can run in parallel only when their questions are
independent. The verifier must inspect the builder's actual diff. The reviewer
must not be the same reasoning pass that wrote the change. If a finding changes
the design, return to `Designer` and repeat the smallest affected loop.

### When not to use multiple agents

Use one agent for a small, local change that can be mapped and verified in five
or fewer tool calls. Multi-agent work is justified when the task has separate
subsystems, a long-running verification command, or a meaningful independent
review requirement. More agents do not automatically increase correctness.

## 5. Feature implementation playbook

1. **Frame:** write the work item and define the user-visible contract.
2. **Map:** inspect the route/command/provider, shared services, persistence,
   feature flags, docs, and existing tests. Search for prior art first.
3. **Design:** choose the existing seam; avoid a new abstraction unless the
   current seam cannot express the behavior. Identify additive vs. breaking
   changes and migration order.
4. **Implement:** make the smallest coherent diff. Keep generated files,
   OpenAPI, provider metadata, and docs synchronized.
5. **Verify locally:** run the smallest focused test first, then the relevant
   package build/lint/format checks.
6. **Verify integration:** for API changes run OpenAPI validation; for provider
   changes run provider validation; for Docker changes render Compose and verify
   `/health`, `/ready`, database health, and network membership.
7. **Review:** use a fresh context to review the diff, failure paths, auth,
   tenancy, retries, telemetry, and rollback.
8. **Record:** update the work item and architecture/plan docs if topology,
   commands, contracts, or operational behavior changed.

### Surface-specific verification

| Change surface | Minimum focused evidence |
|---|---|
| Server/shared TypeScript | `npm run ts-build` plus the focused Vitest test |
| Public API or route | focused server test plus `npm run test:openapi` |
| Provider metadata or integration | `npm run test:providers` plus a focused provider test |
| Webapp or Connect UI | package test/build and the applicable Playwright workflow |
| Database schema/migration | migration up/down or rollback evidence and focused database tests |
| Docker/Compose | `docker compose config --quiet`, startup, `/ready`, `/health`, and logs on failure |
| Docs only | link/index checks when applicable; no application test is invented |

The canonical command inventory remains in
[.github/copilot-instructions.md](.github/copilot-instructions.md) and
`package.json`. Do not invent a command because an agent expects it.
The repository contract itself can be checked with `npm run agentic:check`.

## 6. Debugging playbook

Debugging is an evidence loop, not trial-and-error:

1. Capture the exact error, command, environment, timestamp, and reproduction.
2. Classify it as code, configuration, dependency, data, network, or
   environment/tooling failure.
3. Reproduce with the smallest deterministic command.
4. Trace from the failing boundary to the first incorrect assumption.
5. Form one root-cause hypothesis and name the observation that would disprove
   it.
6. Apply the smallest reversible fix.
7. Re-run the original reproduction, then the focused regression test.
8. Run the relevant broader gate and record residual risk.

For Docker, inspect rendered Compose configuration, service health, network
membership, DNS/service names, mounted data, and logs before changing
application code. `nango-db` is an in-network service name; it is not replaced
with `localhost`.

## 7. Reliability rules

- Keep one concern per commit and one phase per branch.
- Never stack phase branches on sibling phase branches; merge each phase to
  trunk before starting the next.
- Preserve interfaces where possible and make schema changes backward
  compatible before deploying readers that require them.
- Treat PostgreSQL and other persisted stores as migration projects, not image
  tag edits.
- Never commit secrets, local `.env` files, agent transcripts, or customer data.
- Prefer explicit errors and observable failure over silent fallback.
- Use feature flags or parallel seams for risky behavior changes.
- Update executable documentation in the same PR as topology or command changes.
- A green test is evidence for the tested surface, not proof that unrelated
  providers or deployment environments are correct.

## 8. IDE adapters

The portable workflow is above. IDE-specific files should only translate it:

- **VS Code/Copilot:** load `.github/copilot-instructions.md`; use the work-item
  template and repository links.
- **Claude Code:** place thin role adapters in `.claude/agents/` that point back
  to this handbook; keep project-specific policy here, not in personal settings.
- **Cursor/other IDEs:** configure their project rules to load this file and
  `.github/copilot-instructions.md`.
- **Terminal/CI agents:** invoke the same npm and Docker commands and attach
  evidence to the work item or PR.

If an adapter has a different instruction, the repository contract wins. Do not
maintain separate competing workflows.

## 9. Definition of done

A change is ready only when:

- the acceptance criteria are satisfied;
- the diff is focused and reviewed independently;
- relevant tests and quality gates pass, or the exact blocker is recorded;
- API/provider/schema/docs surfaces are synchronized;
- rollback and residual risk are explicit;
- a future agent can resume from repository files without the original chat.
