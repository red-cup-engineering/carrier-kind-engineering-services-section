# CLAUDE.md — @561-group/content-topology

This file supplements the root CLAUDE.md with package-specific context.

## Package purpose

Content as a meme-topology carrier: Lasswell coordinates, editorial gates, production carriers (assignment, draft), and demand as an exact finitely additive charge over a term space.

## Commands

Always scope pnpm to this package: `pnpm --filter <name> run <cmd>`

- `pnpm run check` — tsc --noEmit
- `pnpm run build` — pnpm run clean && tsc -p tsconfig.build.json && node ../../scripts/package-boundary/copy-dmts-to-dts.mjs dist
- `pnpm run test` — pnpm run build && tsc -p tsconfig.test.json && node --test ".tmp/test-dist/**/*.test.mjs"
- `pnpm run verify` — pnpm run check && pnpm run test && pnpm run audit:boundary

## Invariants

- Tests are theorem-shaped: the test name is a falsifiable claim.
- `sideEffects: false` — no module-level side effects.
- All I/O (fetch, clock, fs) enters as values, never as ambient globals.
