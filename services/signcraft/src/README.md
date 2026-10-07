# SignCraft

A sign settling engine: the operating engine over SignCell, SignChain and
SignGraph -- admission of marks, the descent to settlement (`articulate ->
predicate -> (cohere) -> posit -> (commutate) -> settle`), fixed-point
readings, the merge principle (compute disagreement energy; glue uniquely
or refuse with a quantity), replay and durable traces. That is its most
boring reading, and it is the brand name used for the system.

It is where effects enter. It is a system, downstream of
`@red-cup-engineering/computer-system-engine`.

## The model

An utterance `[token, claim]` settles to a finite fixed point through
`articulate -> predicate -> posit -> settle`. Nothing is seeded: every
cell's charge is measured from what was given. `absurd` is only ever
reached (by the meet, under contradiction), never stamped; the evidence
carrier only ever grows (knowledge never falls). The charge algebra
itself (`bilattice-charge`) is not defined here: it is metrologic's, one
implementation of Obsmetrologia's Charge/FOUR.

A **charge** is `{ value: [a+, a-], evidence: [pos-witnesses, neg-witnesses] }`.
Two sigma-dual orders run on the pair -- knowledge (`absurd <-> stable`,
how determined) and truth (`potential <-> active`, which way).

## What lives here

The descent itself (`descent`, `cone`, `void`, `internal`) and everything
that operates it over SignCell's cells: `fiber` (posit: value enters
predication by evidence), `topology`/`utterance-reading` (the composed
descent and ergonomic readers over it), `valuation-closure` (the
knowledge closure and `settle`), the settlement-filtration bookkeeping
that is inseparable from a real settled cell set (`filtration`,
`increment`, `invariant`, `limit`, `stage`, `classification`, `firing`,
`gap`), its cohomology (`cohomology`, `first-cohomology`,
`monotonicity-certificate`), its fixed points (`fixed-point`,
`fixed-point-gap`, `fixed-point-reading`, `sheaf`), its
consistency (`valuation-consistency`), its graph readings
(`graph/document`, `graph/section`, `graph/geometry/temporal`), the
obstruction cohomology built on top of a live settling (`cochain`,
`floor`), evidence-trace admission (`semantic-evidence`), EAVT-row
admission into a cell (`eavt`), and `closure-bridge` (the floor's
`settle` as the finite-regime restriction of metrologic's general
closure morphism).

## Depends on

`@red-cup-engineering/computer-system-engine`, `@lenticule-science/metrologic`
for its metrology, and the three seats below it -- `@red-cup-engineering/sign-cell`,
`@red-cup-engineering/sign-chain`, `@red-cup-engineering/sign-graph`.
