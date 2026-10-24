# CLAUDE.md — @emsenn/web-topology

This file supplements the root CLAUDE.md with package-specific context.

## Package purpose

The categorical home of the web tier: nodes bearing client/server roles, exchanges as labeled generating morphisms, relays as their free composites (composition factors through peers by theorem), and the traversal boundary onto charged traces.

## Commands

Always scope pnpm to this package: `pnpm --filter <name> run <cmd>`

- `pnpm run check` — tsc --noEmit
- `pnpm run build` — pnpm run clean && tsc -p tsconfig.build.json && node ../../scripts/package-boundary/copy-dmts-to-dts.mjs dist
- `pnpm run test` — pnpm run build && tsc -p tsconfig.test.json && node --test --test-concurrency=1 ".tmp/test-dist/**/*.test.mjs"
- `pnpm run verify` — pnpm run check && pnpm run lint && pnpm run test && pnpm run audit:boundary

## Invariants

- Tests are theorem-shaped: the test name is a falsifiable claim.
- `sideEffects: false` — no module-level side effects.
- All I/O (fetch, clock, fs) enters as values, never as ambient globals.
