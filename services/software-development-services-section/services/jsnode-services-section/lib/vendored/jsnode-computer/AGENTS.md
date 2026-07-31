# AGENTS — @emsenn/jsnode-computer

Node workspace computing: reads package.json manifests into jsnode-topology carriers, discovers all workspace packages, resolves dependency structure.

## Before touching this package

- Read `package.json` — the `description`, `exports`, and `dependencies` are the contract.
- Run `pnpm run check` before any edit; `pnpm run verify` before committing.
- Tests are theorem-shaped: the test name is a claim the test proves.

## Key dependencies

- `@emsenn/javascript-computer`
- `@emsenn/jsnode-topology`

## Public surface

- `@emsenn/jsnode-computer`
- `@emsenn/jsnode-computer/workspace`
- `@emsenn/jsnode-computer/cli`

## Invariants to preserve

- This package performs no I/O it was not handed (fetch, clock, fs all enter as values).
- No runtime dependency may be added without a corresponding new export or documented rationale.
- `sideEffects: false` — no module-level side effects.
