# Graph Runtime Service

This runtime realizes finite graph incidence, coloring, port-graph, and spectral computations over `@lenticule-science/articulating`'s exact-number analysis. The graph-theoretic theory remains in Science; reusable executable calculations belong to Computer Proofing.

## Holdings

- `src/coloring.mts` — exact proper-coloring checks and constructions over integer graphs.
- `src/discrete-set-number-graph.mts` — discrete-set-number graph receipts.
- `src/port-graph.mts` — finite lenticule port-graph and condensate receipts.
- `src/spectral.mts` — exact spectral reads (Pisot test, resultant, dominant-root power iteration, Mahler measure) of integer polynomials and matrices.

## Founding (2026-09-11)

Cannibalized from `@red-cup-engineering/feltos`'s `src/lib/math/graphs/{coloring, discrete-set-number-graph,port-graph,spectral}.mts` per the Founder's ruling that FeltOS carries no functionality beyond what it needs as a MUD server.
These four modules carried no MUD/game-specific behavior -- they import only `@lenticule-science/articulating`'s exact-number analysis and `@red-cup-engineering/computer-data-engine`/`agentic-enterprise-...claim-charge`.

`math/graphs/module-cohesion.mts` was deliberately **not** moved here: it imports feltos's own `math/topology/persistent-h0.mts`, which belongs to the sheaf/predication/topology cluster being handled separately.
Moving module-cohesion alone would have required either duplicating `persistent-h0.mts` here or leaving a relative import back into the feltos app, both of which this section's law forbids.
It remains in feltos pending that cluster's own migration.
