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
- `cellular-sheaf` — cellular sheaves on a graph (vector stalks on vertices and edges, restriction matrices on
  incidences), the coboundary δ⁰, the sheaf Laplacian L = δᵀδ, exact cohomology over ℚ (dim H⁰ = dim C⁰ − rank δ,
  dim H¹ = dim C¹ − rank δ, ranks from the data layer's `number/rational-matrix`), and the deterministic heat flow
  x ← x − αLx (Gershgorin step, pinned vertices as boundary evidence, firing steps where an edge residual crosses its
  tolerance). It is the numeric side of Obsmetrologia's Laplacianizability (the Hodge isomorphism H• ≅ ker Δ, with the
  inner product supplied here), LawvereKernelH0 (the harmonic kernel is H⁰, the global sections, and diffusion converges
  to the harmonic section), CoordinationCohomology (Ȟ⁰ = |V| − ρ, Ȟ¹ = |E| − ρ; the constant sheaf agrees with
  `cohomologyOfCells`) and ClosureFlowDynamics (firing versus smooth steps). `rigiditySheaf` is the bar-framework
  rigidity matrix as such a sheaf: H⁰ is the infinitesimal motions (rigid iff d(d+1)/2), H¹ the self-stresses.
- `relation-adapters` — projections from already-parsed Markdown, JavaScript,
  and EAVT evidence into relation observations.
- `pam` — graph-backed predicate-algebra modeling over EAVT's relation web
  (`@red-cup-engineering/eavt/relation-web`), which is data: content-addressed
  relation observations over plain JSON terms, with no cell, valuation or FOUR.

## Depends on

`@lenticule-science/metrologic` for mathematics, SignCell for cells, and
SignChain for cell order and FOUR evidence profiles. Nothing here imports
SignCraft; SignCraft imports this.
