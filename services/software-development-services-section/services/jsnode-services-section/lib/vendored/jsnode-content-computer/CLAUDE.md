# CLAUDE.md — @emsenn/jsnode-content-computer

This file supplements the root CLAUDE.md with package-specific context.

## Package purpose

LLM-written, gate-checked documentation for jsnode workspace packages. Reads a
package's introspected surface (signatures + JSDoc), asks the model for minimal
prose per symbol, formats and verifies it with our code, and composes symbol
references upward into a package reference and a README.

## Architecture

- `surface.mts` — I/O: reads a package directory into a `PackageSurface`
  (`extractDocSurface` + manifest + existing README + injected load-bearing rank).
- `cycle.mts` — I/O: the model cycle (`documentSymbol`, `documentPackage`,
  `documentReadme`), revise-with-findings ≤ 2 times; `ask` enters as a value.
- `audit.mts` — pure: deterministic coverage reading against `dev/docs/reference/`.
- `cli.mts` — binds the cycle to the filesystem, a provider, and stdout.

The PURE documentation primitives (parse, gates, prompt, formatters) live in
`@561-group/content-topology/documentation`, not here. The keystone is its
`hallucinatedApiFindings` — never weaken it.

## Commands

Always scope pnpm to this package: `pnpm --filter <name> run <cmd>`

- `pnpm run check` — tsc --noEmit
- `pnpm run build` — pnpm run clean && tsc -p tsconfig.build.json && node ../../scripts/package-boundary/copy-dmts-to-dts.mjs dist
- `pnpm run test` — pnpm run build && tsc -p tsconfig.test.json && node --test ".tmp/test-dist/**/*.test.mjs"

## Invariants

- Tests are theorem-shaped: the test name is a falsifiable claim.
- `sideEffects: false` — no module-level side effects.
- All I/O (fetch, clock, fs) enters as values, never as ambient globals. The
  model's `ask` is injected, so the cycle runs hermetically in tests.
- Our code formats LLM output; the model is never asked to produce structure,
  and never trusted to be faithful — the gates enforce faithfulness.
- Trust boundary: the keystone gate verifies name-EXISTENCE, not usage-
  correctness (a real symbol may still be called with a fabricated argument
  shape). Generated docs are operator-review drafts; every write is a draft.
