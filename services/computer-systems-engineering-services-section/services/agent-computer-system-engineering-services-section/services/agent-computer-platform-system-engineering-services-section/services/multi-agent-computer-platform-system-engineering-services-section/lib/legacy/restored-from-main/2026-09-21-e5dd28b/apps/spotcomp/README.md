# SPOTCOMP

SPOTCOMP is a computer that operates over Subject–Predicate–Object Traces and runs Modeled Players.

This package is the home for the project's SPOTCOMP research, specifications, admitted implementation, examples, and historical implementations. The current implementation is under `hacking/`: its contents are admitted engineering candidates, not yet fully derived from the mathematical substrate. The concept tree records the order in which those derivations are owed.

## Package map

- `content/text/documents/articles/notes/` contains normalized corpus notes whose primary subject is SPOTCOMP.
- `docs/` contains specifications, development notes, journals, and recovered planning sessions.
- `examples/` contains example trace material.
- `hacking/` contains the current admitted implementation and schemas.
- `lib/legacy/` preserves distinct earlier prototypes, harnesses, math-substrate snapshots, and the 2026-05-23 implementation snapshot.
- `scripts/inventory-spotcomp-artifacts.mjs` finds SPOTCOMP-named paths and textual references elsewhere in a selected tree.

## Verification

Run `npm test` to verify the collected package's defining artifacts and the JSONL example used by the current tree. Run `npm run inventory -- <path>` to report remaining SPOTCOMP paths and references beneath another tree; the path defaults to the repository root discovered from this package. Legacy trees are skipped by default because they are large historical containers; add `--include-legacy` when auditing them deliberately.

The package is intentionally honest about maturity: collection and syntax do not turn admitted code into a proved implementation. `hacking/` remains a derivation obligation.

## Preserved lineages

- `2026-03-11-prototype`: the compact runnable settling/signing prototype.
- `2026-03-11-predicate-copy`: a near-duplicate whose package metadata and README differ from the prototype, formerly filed under predicate science.
- `2026-05-23-snapshot`: the earlier SPOTCOMP concept tree.
- `2026-05-25-math-substrate`: working-tree and archived SPOTCOMP subtrees extracted from the voidmath substrate.
- `2026-06-23-agentic-harness`: the earlier Claude session-settling harness.
- `2026-08-03-fizzos-harness`: the later harness snapshot with populated JSONL records.

The two dated planning-session sets are both retained because they are not byte-identical and therefore represent distinct historical states.
