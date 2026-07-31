# AGENTS — @emsenn/jsnode-topology

Node.js packages as a meme-topology carrier: layer, exports, and dependencies as relational utterances; workspace-level sheaf settlement via induceJSNodeTopology.

## Before touching this package

- Read `package.json` — the `description`, `exports`, and `dependencies` are the contract.
- Run `pnpm run check` before any edit; `pnpm run verify` before committing.
- Tests are theorem-shaped: the test name is a claim the test proves.

## Key dependencies

- `@emsenn/javascript-algebra`
- `@emsenn/meme-topology`

## Public surface

- `@emsenn/jsnode-topology`

## Invariants to preserve

- This package performs no I/O it was not handed (fetch, clock, fs all enter as values).
- No runtime dependency may be added without a corresponding new export or documented rationale.
- `sideEffects: false` — no module-level side effects.
