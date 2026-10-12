# Biology simulation services section

This section is the system locus for services which model, run, or observe
simulated biological systems — cells, organisms, and their populations —
through composed runtimes, engines, solvers, and observers. Descending
service sections add capability predicates; they do not grant an ancestor
authority to perform the terminal Actor's operation.

## Holdings

- `apps/natural-computer-simulation-engine` — the keystone app for a membrane-bounded,
  settling-based single-cell simulator: admission across the membrane as
  the only entry for opaque data, the interior as a predication site,
  metabolism as charge dynamics driven by a maintained gradient, death as
  the gradient's loss, division as site-splitting. See its own README and
  `dev/design/2026-08-21-natural-computer-simulation-engine-design.md` for the design this
  scaffold is declared against.
