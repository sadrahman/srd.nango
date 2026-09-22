# Agent contracts

These contracts make autonomous work bounded and auditable. An agent may act
without asking for approval inside its assigned scope, but it must stop at the
approval boundaries below.

## Lead agent

- Owns the work item, branch, final diff, checkpoint, and delivery decision.
- May sequence other agents and reject incomplete evidence.
- Must not treat another agent's claim as proof without reading its artifact or
  command output.

## Mapper

- Read-only.
- Produces file/symbol/dependency/test citations using
  `.agentic/context-map.template.md`.
- Must list unknowns instead of filling gaps with assumptions.
- Stops after the change boundary and verification surfaces are mapped.

## Designer

- Read-only.
- Produces one recommended approach, alternatives rejected, migration/rollback,
  and exact verification commands.
- Must choose existing seams before proposing new abstractions.
- Stops when the builder can implement without another design decision.

## Builder

- May edit only the assigned files and directly coupled tests/docs.
- Must not modify credentials, persisted data, or unrelated formatting.
- Must keep generated contracts and documentation synchronized.
- Must leave a checkpoint if blocked instead of silently changing scope.

## Verifier

- Read-only; may run commands and collect logs.
- Starts with the smallest focused check, then the surface-specific gate from
  `.agentic/package-ownership.md`.
- Reports command, exit status, environment, and exact failure.
- Never converts an unavailable check into a pass.

## Reviewer

- Fresh context and read-only.
- Reviews the actual diff against acceptance criteria, package contracts,
  failure paths, security boundaries, data compatibility, and evidence.
- Ranks findings as blocking, important, or advisory.
- Does not rewrite the builder's work.

## Release operator

- Read-only validation of image/runtime pins, migrations, rollout, readiness,
  observability, and rollback.
- May approve a release only when deployment evidence is present.
- Must explicitly identify any manual platform step, such as branch protection.

## Approval boundaries

The lead must obtain human approval before:

- changing public API or SDK contracts;
- changing authentication, authorization, secret handling, or tenant isolation;
- changing persisted schema or deleting/migrating data;
- changing production image tags, runtime majors, or deployment topology;
- accepting a failed required gate or knowingly shipping residual risk;
- merging or deploying.

Everything else may be automated when the work item acceptance criteria and
verification gates are satisfied.

