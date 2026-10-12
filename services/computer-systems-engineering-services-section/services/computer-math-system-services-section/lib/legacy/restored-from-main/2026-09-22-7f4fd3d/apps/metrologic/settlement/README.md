# Obsmetrologic settlement engineering services section

The **settlement** node of the Obsmetrologia proof tree, in JSNode.
Theorem-locus: `Obsmetrologia/Settlement.lean` — a top-level Lean module
(sibling of `Cohomology/`, `CausalSets/`, `AperiodicOrder/`) whose
`Settlement Content Admits base` structure pairs a base with accreted
content the base's own law admits, proved in
`tiles_beads_hole_cech1_are_settlements` to be instantiated independently
by tilings, beadwork threads, causal holes, and Čech cocycles.

This section carries the **operational** half: reaching a settlement.
`content/text/documents/articles/teaching-articles/explanations/what-is-a-settlement.md`
gives the full account and the honest grading (proved / implemented /
documented / open) — read it before claiming any correspondence.

## `src/settlement.mjs`

Carrier-generic. Nothing about a particular four-valued representation is
baked in; the cell fiber is a parameter, exactly as `Content` and `Admits`
are parameters of the Lean structure.

- `settle(step, start, { merge, equal, maxIter, divergenceMessage })` —
  iterate a knowledge-monotone, inflationary step to its least fixed point.
  `merge` is the content semilattice's join, `equal` its equality; both
  belong to the caller's carrier. Returns `{ state, iterations }`; raises
  `SettlementDivergence` when the budget is exhausted.
- `orbitMonotone(orbit, { leq })`, `assertSettlingMonotone(orbit, { leq,
  target })`, `guardSettlingMonotone(before, after, { leq, cell })` — the
  settling-monotonicity gate, in orbit, assertion, and single-step forms.
  A dedicated check, not a byproduct of convergence: it holds on any orbit
  handed to it. Violations raise `SettlingMonotonicityViolation`.
- `settlementAlgebra({ join, equal, bottom, container })` — lift a cell
  algebra to the settling level. `container` is `"object"` (a plain record
  keyed by cell) or `"map"` (a `Map`). Returns the bound operation set:
  `merge` (pointwise join), `mergeAll`, `equalSettling`, `leqCell`,
  `settle`, the three gate forms, and `CellSettlement`.
- `CellSettlement` — per-cell committed knowledge state, judged
  independently of any writer's self-reported "before". Every successful
  write only advances or holds a cell; a backward write is refused before
  it is recorded, and before the caller's own log append.
- `chargeCellAlgebra` / `chargeSettlement` — the one bound instance, over
  `@lenticule-science/articulating`'s Charge/FOUR. Its join, order, and
  equality are that package's own; no arithmetic is computed here.

## The rest of the section

- `src/wire.mjs` — the JSON reading of a settling (`cell -> charge value
  name`, the names being articulating's own `absurd`/`potential`/
  `active`/`stable`), schema'd at `data/records/schema/settling.schema.json`.
- `scripts/merge-set-of-settlings.mjs` — fold the pointwise join over a
  list of settlings.
- `scripts/check-settling-orbit.mjs` — judge one cell's orbit against the
  monotonicity gate; exits 1 on a violation.
- `apps/settlement-cli.mjs` — the composed face (`merge`, `check-orbit`).

## Consumers

- `@lenticule-science/metrologic`'s `bilattice/descent.mjs` composes it:
  `settle(category)` supplies the step (the commutating closure) and this
  carrier's equality, and the iteration is this node's. Metrologic composes
  the seated nodes; code never lands in it directly.
- `@red-cup-engineering/predicated-inference-kernel`'s `nuclei.mjs`
  parameterizes `settlementAlgebra` over `chargeCellAlgebra` in a `Map`-held
  container and delegates its σ/Δ convergence loop to `settle`, keeping only
  its own ledger, H-theorem, and witness accounting around the iteration.
- `@red-cup-engineering/feltos`'s flatfile kernel `witness.mjs`
  parameterizes `settlementAlgebra` over the FOUR wire reading its records
  are written in, for `makeWitness`'s settling-monotonicity gate. The copy
  of this code that used to sit in that kernel is gone.
