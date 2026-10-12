# SignCraft

A sign settling engine: the operating engine over SignCell, SignChain and
SignGraph -- admission of marks, the descent to settlement (`articulate ->
predicate -> (cohere) -> posit -> (commutate) -> settle`), fixed-point
readings, the merge principle (compute disagreement energy; glue uniquely
or refuse with a quantity), replay and durable traces. That is its most
boring reading, and it is the brand name used for the system.

SignCraft's settlement and inference operators are pure mathematical
operations over admitted inputs; the returned evidence is not permission to
perform an external effect. Hosts arrange storage, authority and execution
separately. In particular, a SignCraft theorem, fixed point, or review
derivation does not authorize a brokerage order.

## The model

An utterance `[token, claim]` settles to a finite fixed point through
`articulate -> predicate -> posit -> settle`. A cell with no tellings
reads `absurd` (the *knowledge-bottom* point); it is **missing
evidence**, not itself a contradiction. Contradictory support and
refutation together read `stable` (knowledge top). The evidence
carrier only grows under monotone settlement. A separate lattice meet
may write a value not measured directly by its retained witnesses;
such a written value must not be mistaken for fresh observed evidence.
FOUR and its operations are upstream, not reimplemented by SignCraft.

The current SignCell representation has a `for` witness set and an
`against` witness set. Its FOUR value is derived from those sets unless a
non-Measured lattice operation writes an explicit `value` field. In the
knowledge naming, `absurd` means nothing was told, `potential` means support
alone, `active` means refutation alone, and `stable` means both were told.
Knowledge and truth are distinct lattice orders; `stable` is **not** an
endorsement of a proposition or statistical confidence.

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

The actual package dependencies are `@red-cup-engineering/metrologic`,
`@red-cup-engineering/signcell`, `@red-cup-engineering/signchain`,
`@red-cup-engineering/signgraph`, and their declared content-addressing,
EAVT, data and document providers. The root `package.json` is the
versioned dependency authority, not legacy hyphenated package names.

## Mathematical receiving into Alpaca research (2026-10-12)

The Alpaca consumer in
`red-cup-engineering/computer-web-engineering-services-section`, under the
existing web2-financial-brokerage Alpaca section, composes:

1. **SignCell**: one content-addressed return-sign proposition per forecast
   coordinate, with each named model's witnessed positive or negative telling.
   The same model's different horizons are distinct propositions. A
   low-confidence *utterance* remains witnessed; its quality threshold is
   metadata, not a retroactive deletion of what the model said.
2. **SignChain**: a version-2 rule whose premise is a FOUR `stable` cell
   (told both ways), concluding only
   `market-forecast-conflict-requires-review`. Its derivation witness binds
   the full rule identity and premise address, not issuer authentication.
3. **SignCraft**: `settleCells` computes that review rule's least finite
   fixed point and `settlementAdmits` replays the full stage sequence.
   `settledAt` and `derivationVersion` remain visible in the consumer's
   recorded research assay; none of these records is an order intent.
4. **SignGraph**: `cellularSheaf`, `completeCochain`, `coboundary` and
   `applyLaplacian` model weighted signed rank-one observation comparison.
   Missing measured values refuse rather than becoming zero-filled algebraic
   cochains. A low residual may show compatibility under declared restriction
   maps; it is not empirical proof of a market-wide sheaf or of positive alpha.
5. **Calibrated finance models only after scientific receiving**: FOUR,
   source provenance, and the Dirichlet energy neither estimate return
   probabilities nor justify a position-size multiplier. Those must be
   qualified separately using time-correct data, forward outcomes, execution
   costs and independent benchmark comparison. A forecast observed by a model
   before the decision clock is not proof that every cited filing/news item
   was publicly available then.

This is the existing shared mathematics realized in a real consumer, not a
second SignCraft, valuation format or financial executor. Current
implementation status is source-only until the complete workspace tests and
production receiving are independently verified.
