# CLAUDE.md — @emsenn/llm-topology

This file supplements the root CLAUDE.md with package-specific context.

## Package purpose

LLM topology — the agentic loop as a settling trace on the trace-topology bedrock. An agent run is a monotone, append-only accumulation of turns (assistant message, tool calls, governed tool runs, cost events) that projects to a trace-topology trace; the run settles by the knowledge-join of its per-step admission judgments (settleJudgments), reaching a fixed point on a final answer, an obstruction on a step/cost bound, or a held contradiction on a contested tool. Charges are meme-algebra bilattice values; held contradictions are kept, never collapsed. Cost folds serially over emitted cost events (a projection, not a replay).

## Commands

Always scope pnpm to this package: `pnpm --filter <name> run <cmd>`

- `pnpm run check` — tsc --noEmit
- `pnpm run build` — pnpm run clean && tsc -p tsconfig.build.json && node ../../scripts/package-boundary/copy-dmts-to-dts.mjs dist
- `pnpm run test` — pnpm run build && tsc -p tsconfig.test.json && node --test ".tmp/test-dist/**/*.test.mjs"

## Invariants

- Tests are theorem-shaped: the test name is a falsifiable claim.
- `sideEffects: false` — no module-level side effects.
- All I/O (fetch, clock, fs) enters as values, never as ambient globals.
