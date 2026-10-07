# SignGraph

A general graphing library whose semantic specialization organizes the assembled bilattice as a Chu space
-- points (SignCell's cells, and the things they are addressed by) against
observations (attributes, queries, indexes) under an evaluation, with Chu
morphisms (forward map, backward demand, adjointness) as the contract
between two organizations. That is its most boring reading, and it is the
brand name it uses.

A contract of data carried between parties with demand transported back is
what networking is. Pure.

## What lives here

- `cell-graph` — `cellGraph(cells, observations)` builds the Chu-space
  relation of a cell set under a list of named, total observations
  (`{ name, evaluate(cell) }`), over metrologic's generic Chu-relation
  math (`bilattice-relation`) and SignCell's `cellCoincides` as point
  sameness. Re-exports `transpose`, `dual`, `checkRelationTransform`,
  `relationTransform`, `composeTransforms`, `dualTransform` from that
  math, unchanged, for organizing and comparing two such graphs.
- `graph` — the deterministic typed directed-multigraph carrier and its
  traversal, cycle, path, merge, and text-rendering operations.
- `relation-adapters` — projections from already-parsed Markdown, JavaScript,
  and EAVT evidence into relation observations.
- `pam` — graph-backed predicate-algebra modeling over EAVT's relation web
  (`@red-cup-engineering/eavt/relation-web`), which is data: content-addressed
  relation observations over plain JSON terms, with no cell, valuation or FOUR.

## Depends on

`@lenticule-science/metrologic` for mathematics, SignCell for cells, and
SignChain for cell order and FOUR evidence profiles. Nothing here imports
SignCraft; SignCraft imports this.
