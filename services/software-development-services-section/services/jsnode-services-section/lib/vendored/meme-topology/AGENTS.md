# AGENTS — @emsenn/meme-topology

Meme topology as an inductive carrier and morphism derivation.

## Before touching this package

- Read `package.json` — the `description`, `exports`, and `dependencies` are the contract.
- Run `pnpm run check` before any edit; `pnpm run verify` before committing.
- Tests are theorem-shaped: the test name is a claim the test proves.

## Key dependencies

- `@emsenn/meme-algebra`
- `@emsenn/meme-logic`

## Public surface

- `@emsenn/meme-topology`
- `@emsenn/meme-topology/dynamics`
- `@emsenn/meme-topology/arithmetic`
- `@emsenn/meme-topology/internal`

## Invariants to preserve

- This package performs no I/O it was not handed (fetch, clock, fs all enter as values).
- No runtime dependency may be added without a corresponding new export or documented rationale.
- `sideEffects: false` — no module-level side effects.
