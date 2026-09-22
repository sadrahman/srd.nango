---
name: nango-agentic-workflow
description: Use for Nango feature work, debugging, multi-agent execution, resumable checkpoints, and verification routing.
---

# Nango agentic workflow

Use the repository's [AGENTIC_DEVELOPMENT.md](../../../AGENTIC_DEVELOPMENT.md)
as the policy source. Before editing:

1. Load the work-item contract and the relevant row in
   `.agentic/package-ownership.md`.
2. Create or update a checkpoint from
   `.agentic/session-checkpoint.template.md`.
3. Map files, symbols, direct dependencies, tests, and CI gates.
4. Use the smallest existing seam and write the focused verification command.

While working:

- keep the context pack bounded;
- separate mapper, designer, builder, verifier, and reviewer responsibilities;
- checkpoint after mapping, design, implementation, verification, and review;
- preserve exact failures and environment blockers;
- never claim an unexecuted command passed.

When stopping, leave an exact next action in the checkpoint. When resuming,
read the checkpoint first, verify the branch/commit still matches, then perform
only the next bounded action before expanding context.

