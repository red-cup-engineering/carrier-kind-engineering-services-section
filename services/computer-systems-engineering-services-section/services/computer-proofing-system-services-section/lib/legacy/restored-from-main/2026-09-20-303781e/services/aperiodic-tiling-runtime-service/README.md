# Aperiodic Tiling Runtime Service

This runtime realizes finite aperiodic-tiling autocorrelation, Jeandel-Rao AP cohomology witnesses, and tile charge/cover calculations. The corresponding tiling theory remains in Science.

## Holdings

- `src/aperiodic-autocorrelation.mts` — aperiodic tiling autocorrelation receipts.
- `src/jeandel-rao-witness.mts` — finite Jeandel-Rao AP cohomology witnesses (the executable finite shadow of the one-vertex Anderson-Putnam cochain complexes from the Lean module).
- `src/tile.mts` — Construction 4.1 witnessed tile structure (cell set, cell graph, charge valuation), built on this section's own `coloring` export.

## Founding (2026-09-11)

Cannibalized from `@red-cup-engineering/feltos`'s `src/lib/math/tilings/{aperiodic- autocorrelation,jeandel-rao-witness,tile}.mts` per the Founder's ruling that FeltOS carries no functionality beyond what it needs as a MUD server.

`math/tilings/{aperiodic-classification,chromatic-lorentzian,chromatic-marking,sofic}.mts` were deliberately **not** moved here: they import feltos's own `math/order/causal.mts`, `math/topology/bigraded-diamond.mts`, and `fixpoint/value-category.mts`, all owned by the sheaf/predication/topology/causal cluster being handled separately.
They remain in feltos pending that cluster's own migration.
