# Categorical Machinery

Status: source-backed working spine. This file records the categorical machinery that must control SPOTCOMP before any implementation can claim conformance. It is not a final proof, but it names the actual mathematical obligations the implementation probe must follow.

## 0. Specification Family And PAM

Primary sources:

- `development/experimental/spotcomp/library/pam/specification.md`
- `development/experimental/emsenn/active/hacking/spotcomp/HANDROLLED-SPOTCOMP-SPEC.html`
- `lab/archive/research/operations/engineering/research/archive/esm-predication/docs/architecture/layering.md`
- `lab/archive/research/operations/engineering/research/archive/esm-predication/docs/architecture/principles.md`

Invariant:

PAM is Predicate Algebra Modeling, the concrete model layer for the
predication algebra. It is not an application domain. It receives reified SPO
messages, dispatches declared morphisms over predicate fibers, closes to a
fixed point or declared partial boundary, and returns witnesses.

SPOTCOMP consequence:

The specification family must own its layers explicitly. PAM specifies the
model kernel; TRC/TDP specifies the on-disk typed resource catalog as the
running theory derivation program; SHP specifies semantic hypertext packets;
modeled players and CGS specify play. Treating any of those as PAM internals
collapses the category/generator path.

The operations layer is similarly categorical. Process, procedure,
derivation, inquiry, ledger, budget, and cost are typed substrate objects and
morphisms. Cost lives in a Lawvere quantale; stationarity and Laplacian claims
must expose sheaf/global-section or fixed-point evidence rather than relying
on host runtime counters.

The declaration probe [src/operations-profile.mjs](./src/operations-profile.mjs)
guards that boundary at profile shape level only. It is subordinate to the
Hoare/stage, sigma/delta, witness-projection, cost, and Laplacian derivations.

External I/O belongs at the same categorical boundary, not outside it. Bytes,
prompts, completions, argv vectors, hooks, HTTP messages, and tool-call
envelopes are presentations until token/claim/utterance and articulating place
them in the proof tree. [IO-ARTICULATION.md](./IO-ARTICULATION.md) records this
SPOTCOMP-local reading and [src/io-articulation-profile.mjs](./src/io-articulation-profile.mjs)
guards it as a declaration profile.

The same proof-tree reading controls unresolved and partial functions.
SPOTCOMP keeps them staged rather than collapsing them into host exceptions or
silent defaults. Partial-map support, bottom/default extension, fixed-point
evidence, trajectory prefixes, obstructions, and downgrades are proof-tree
positions. [PROOF-TREE-IRRESOLUTION.md](./PROOF-TREE-IRRESOLUTION.md) records
that surface.

## 1. Trace Is Richer Than A Row List

Primary sources:

- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/library/predication-cell-set/library/predication-cell/tracing/library/trace/docs/dev/journal/2026-05-24.md`
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/settling/hacking/trace-monoid/docs/dev/journal/2026-05-24.md`

Invariant:

A trace at a predication cell carries at least six axes:

- discrete events: positings, closure firings, and originating articulating acts;
- temporal and causal precedence: transaction order plus closure-imposed partial order;
- bilattice-valued evidence trajectory;
- recognition fiber;
- categorical refinement structure between traces;
- constitutive-act provenance.

EAVT JSONL is therefore a finite computer-operating-system carrier for trace events, not the whole trace object. The row set is adequate only when the projection or law being checked uses these axes through an explicitly declared forgetful map.

SPOTCOMP consequence:

The current `src/trace.mjs` law probe checks row identity, append monotonicity, idempotent merge, and finite SHP projection. It does not yet model causal precedence, recognition fibers, provenance DAGs, or trace-refinement morphisms. Any conformance matrix must say which trace axes a checker preserves and which ones it intentionally forgets.

The candidate checker surface for this boundary is [TRACE-AXES.md](./TRACE-AXES.md) and [src/trace-axis-profile.mjs](./src/trace-axis-profile.mjs). It validates declarations for the six axes, exact EAVT event rows, causal/provenance accumulativity, trace-monoid independence, directed event-union joins, and projection preservation/forgetting. It is a boundary checker, not a derivation of the trace object from positing.

## 2. Positing Naturality

Primary source:

- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/settling/positing/hacking/library/positing-naturality/docs/dev/journal/2026-05-24.md`

Invariant:

For base parameters `(L, C, E)`, valuation `v`, cell `phi = (s, p, o)`, datum `q in L^bowtie`, and predicate-category morphism `f : p' -> p`, positing commutes with reindexing:

`f*(posit_(phi,q)(v)) = posit_(f*(phi),q)(f*(v))`

The datum is value-side invariant under reindexing; the cell position changes according to the generator action. The source states this as a proved theorem with supporting Lean witnesses for the fibration lemmas, while the full 2-cell corollary remains not fully formalized.

SPOTCOMP consequence:

SPOTCOMP implementations must not treat a row append as a context-free "assert" operation. A positing is valid relative to the active predicate fibration, its reindexing action, and the value fiber. Reindexing, dual filing, projection, and federation must preserve this naturality or explicitly downgrade conformance.

The candidate boundary checker is [POSITING.md](./POSITING.md) and [src/positing-profile.mjs](./src/positing-profile.mjs). It records the least-extension morphism, the naturality generator-action table, datum preservation, 2-cell status, and the separation between categorical positing, pure event presentation, and perlocutionary effects.

[PRELOCUTIONARY-INGRESS.md](./PRELOCUTIONARY-INGRESS.md) adds the handler side of this boundary: token/claim/utterance ground articulating before locution, and environmental decoding cannot become hidden positing or closure evidence.

## 3. Fiber Algebra And FOUR

Primary sources:

- `development/experimental/spotcomp/RESEARCH-LEDGER.md`
- `development/experimental/spotcomp/PREDICATION-FIBER-ALGEBRA.md`
- `development/active/articulating/library/aperiodic-predication-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/positing/library/predication-fibration/library/predication-fiber-algebra/docs/dev/journal/2026-05-24.md`
- `development/active/articulating/library/aperiodic-predication-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/positing/library/predication-fibration/docs/dev/journal/2026-05-24.md`
- `development/active/articulating/library/aperiodic-predication-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/positing/library/predication-fibration/library/predication-hyperdoctrine/docs/dev/journal/2026-05-24.md`
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/prose/learning/claims/twist-product-residuation.md`
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/prose/learning/claims/predicate-generator-exhaustiveness.md`
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/settling/positing/hacking/library/positing-naturality/docs/dev/journal/2026-05-24.md`

Invariant:

For each predicate `p`, the valuation fiber is `A_p = L^bowtie^(E x E)` with pointwise bilattice-residuated structure. FOUR is the boolean specialization where `L` is the two-element lattice. It is useful, but it is not the global substrate.

SPOTCOMP consequence:

A SPOTCOMP trace can carry values for any declared fiber algebra supported by the active predicate context. A FOUR checker is a projection checker. It cannot be the normative trace checker. The candidate declaration surface is [PREDICATION-FIBER-ALGEBRA.md](./PREDICATION-FIBER-ALGEBRA.md) and [src/predication-fiber-profile.mjs](./src/predication-fiber-profile.mjs).

## 4. Closure 2-Monad And Settling Apex

Primary source:

- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/settling/library/predication-fibration-2-category/hacking/closure-2-monad/docs/dev/journal/2026-05-24.md`
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/settling/library/predication-fibration-2-category/hacking/settling-endofunctor/docs/dev/journal/2026-05-24.md`
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/settling/library/predication-fibration-2-category/hacking/closure-2-monad/hacking/library/closure-merge-commutation/docs/dev/journal/2026-05-24.md`
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/settling/hacking/perlocuting/library/perlocution/sigma-delta-cycle/docs/dev/journal/2026-05-24.md`

Invariant:

Closure is a lax-idempotent 2-monad on predication fibrations, defined fiberwise by closure operators natural in predicate-category morphisms. Its unit is inflationary inclusion, its multiplication is nested-closure collapse, and its algebras are closed predication fibrations. The settling apex is the Knaster-Tarski least fixed point of the closure orbit from the initial valuation.

The source also separates the closure axis from the fibration-structure 2-comonad axis. These axes commute strictly because they act on disjoint data: values versus cleavage. This yields a strict bigraded apparatus rather than an informal pair of passes.

SPOTCOMP consequence:

A settlement output is not merely "whatever the implementation produces after running rules." It must be the least fixed point or a declared finite projection of the least fixed point for the relevant closure operator family. If an implementation only has bounded fuel, it must report partiality rather than final settlement.

[CLOSURE-SETTLING.md](./CLOSURE-SETTLING.md) and [src/closure-settling-profile.mjs](./src/closure-settling-profile.mjs) provide the current declaration surface for this boundary: closure 2-monad axioms, settling endofunctor shape, closure-merge bridge, Knaster-Tarski apex evidence, sigma/delta roles, local settling as bounded restriction, and finite-only FOUR placement.

## 5. Regimes And Cohomology

Primary source:

- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/settling/library/predication-settling-category/library/predication-settling/hacking/library/four-regime-dichotomy/docs/dev/journal/2026-05-24.md`

Invariant:

The closure ordinal `kappa` stratifies settlings into exactly four regimes:

- strict: `kappa < omega`;
- Scott-continuous: `kappa = omega`;
- transfinite-bounded: `omega < kappa < omega_1`;
- aperiodic: `omega_1 <= kappa`.

Strict and Scott-continuous regimes collapse enough 2-categorical content that first cohomology is trivial. Transfinite-bounded and aperiodic regimes can carry non-trivial first cohomology, including orbit invariants unrecoverable from finite or omega-bounded prefixes.

SPOTCOMP consequence:

Federation must be regime-aware. Endpoint-state shipping can be adequate only when the regime proof says endpoint projections preserve the relevant invariants. In transfinite-bounded and aperiodic cases, a conforming swarm needs trajectory or audit data sufficient to preserve non-trivial 2-categorical/cohomological content.

## 6. Extension And Restriction

Primary sources:

- `development/experimental/spotcomp/RESEARCH-LEDGER.md`
- `development/experimental/spotcomp/CHUNK-MAP.md`
- `development/experimental/spotcomp/GENERATOR-VARIANCE.md`
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/settling/library/predication-cell/slicing-to-predication-cell-trace/slicing-to-predication-cell-trace.schema.json`
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/library/predication-cell-set/docs/dev/journal/2026-05-27.md`
- `lab/hacking/articulating/library/stable-articulation-cell/predicating/hacking/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/object/hacking/extending/extending.md`
- `lab/hacking/articulating/library/stable-articulation-cell/predicating/hacking/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/object/specializing/specializing.md`

Invariant:

Generator variance is load-bearing:

- extension admits structure, product positions, traces, rows, or codomain objects while preserving a structure-preserving embedding of the domain;
- restriction selects a subcategory, subfiber, subobject, finite frontier, trace slice, local settling, certified projection, or view;
- coincidence cites a theorem that two distinct morphism positions agree on a specified scope without collapsing them elsewhere.

The variance determines the codomain shape and the required proof obligations. It is not directory ornament.

SPOTCOMP consequence:

Each SPOTCOMP-managed generator needs an extension/restriction declaration. Unknown variance blocks strong conformance because the implementation cannot know whether to admit new rows, select a view, or produce a finite projection.

The candidate checker surface is [GENERATOR-VARIANCE.md](./GENERATOR-VARIANCE.md) and [src/generator-variance-profile.mjs](./src/generator-variance-profile.mjs). It records examples from product-position enumeration, cell-trace slicing, assembling from predication settling, sampling a cell, and local settling.

## 7. CHL Apex And Morphism Separation

Primary sources:

- `development/experimental/spotcomp/RESEARCH-LEDGER.md`
- `development/emsenn/active/hacking/spotcomp/HANDROLLED-SPOTCOMP-SPEC.html`
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/hacking/library/chl-apex-recursion/docs/dev/journal/2026-05-26.md`
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/hacking/library/chl-apex-recursion/hacking/library/lambek-lemma/docs/dev/journal/2026-05-26.md`
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/transfinite-predication-category/library/predication-cell-set/library/predicate-set/library/predicate-category/library/category/library/language/docs/dev/journal/2026-05-24.md`
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/transfinite-predication-category/library/predication-cell-set/library/predicate-set/library/predicate-category/library/category/library/language/hacking/path-resolving/library/path-resolution/docs/dev/journal/2026-05-24.md`

Invariant:

Each CHL stratum is organized around an apex produced as a closure least fixed point and as an initial algebra of the relevant endofunctor. Lambek's lemma gives the fixed-point/initial-algebra isomorphism. Morphisms in different CHL columns or strata remain distinct unless a coincidence theorem proves their equivalence.

SPOTCOMP consequence:

SPOTCOMP must keep articulating, predicating, positing, settling, proof, term-instantiation, existential push-forward, path-resolving, and SHP projection distinct. A runtime may expose a compact command, but the conformance explanation must name the composed morphisms and their positions.

[PREDICATION-STAGES.md](./PREDICATION-STAGES.md) fixes the core stage/category distinction used by this separation: articulating generates the aperiodic predication category, predicating generates the transfinite predication category, positing generates the Scott-continuous predication category, and settling generates the finite predication category. The candidate checker [src/predication-stage-profile.mjs](./src/predication-stage-profile.mjs) verifies declaration shape for this mapping and rejects finite settlement as an upstream ontology.

[CHL-LANGUAGE-CONES.md](./CHL-LANGUAGE-CONES.md) adds the current declaration surface for the language-cone side: CHL columns project from a shared language apex by cone-leg functors, but their morphisms remain distinct unless a scoped coincidence theorem applies. The candidate checker [src/chl-language-profile.mjs](./src/chl-language-profile.mjs) prevents profiles from collapsing column morphisms into one implementation operation.

## 8. Local Settling And Modeled Players

Primary source:

- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/settling/hacking/library/local-settling/docs/dev/journal/2026-05-24.md`

Invariant:

Local settling is the sigma/delta closure cycle restricted to a sub-region of the predication-cell set, usually cells involving an object `X`. Every object with local closure rules has a local settling bounded above by the universal settling. The same source says a modeled player's settling is SPOTCOMP's model of that player's predication state.

SPOTCOMP consequence:

A modeled player is not just a key, peer ID, or message queue. It is an object with local closure behavior, partial observation, and a sub-settling embedded in the universal settling. Player-local observation and action bounds must be represented as trace-governed structure, not only network metadata.

The local-settling part of [CLOSURE-SETTLING.md](./CLOSURE-SETTLING.md) records this as a bounded restriction obligation before modeled-player state can be treated as final settlement evidence.

[PLAYER-CHARACTER-BOUNDARY.md](./PLAYER-CHARACTER-BOUNDARY.md) records the terminology boundary needed here: the external player is not the system-held model, a character is one possible player kind, and character/persona/role/skill records do not become a modeled player until they are bound to local settling and CGS strategy evidence.

## 9. Concurrent Games With Symmetry

Primary sources:

- `lab/hacking/articulating/library/stable-articulation-cell/predicating/hacking/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/object/library/thing/library/category/hacking/library/computing/code/structures/cgs.md`
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/library/predication-cell-set/library/predication-cell/hacking/library/event/hacking/library/event-structure/hacking/library/prime-event-structure/docs/dev/journal/2026-05-26.md`
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/library/predication-cell-set/library/predication-cell/hacking/library/event/hacking/library/event-structure/hacking/library/arena/hacking/library/strategy/hacking/library/concurrent-strategy/docs/dev/journal/2026-05-26.md`
- `development/active/articulating/library/articulation-cell/library/potential-articulation-cell/predicating/library/predication-category/library/predication-cell-set/library/predication-cell/hacking/library/event/hacking/library/event-structure/hacking/library/arena/hacking/library/strategy/hacking/library/innocent-strategy/docs/dev/journal/2026-05-26.md`

Invariant:

CGS objects are prime event structures with causality, conflict, polarity, and symmetry. CGS morphisms are concurrent strategies on `A^perp || B`. Sequential and innocent strategies are special cases; they cannot define the general swarm model.

SPOTCOMP consequence:

The modeled-player layer must map trace events, observations, settlements, and federated deliveries into event structures with explicit causality, conflict, polarity, symmetry, and strategy equivalence. Player/Opponent polarity is game-theoretic structure; it must not be confused with the SPOTCOMP modeled-player record itself.

[CGS-STRATEGY-LAWS.md](./CGS-STRATEGY-LAWS.md) records the morphism-level declaration surface for this consequence: receptivity, symmetry quotienting, interaction-and-hiding composition, and sequential/innocent restrictions.

## 10. Bigraded Diamond Swarms

Primary sources:

- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/kz-diamond-strict-commutation.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/narratives/two-disentangled-kz-structures.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/bigraded-common-knowledge.md`
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/code/structures/bigraded-settling-cohomology.md`
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/prose/learning/claims/bigraded-aperiodic-regime-trichotomy.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/multi-observer-system.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/network-sheaf-consensus-on-agent-graphs.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/crdt-convergence-with-per-observer-rules.md`

Invariant:

The swarm-facing diamond is the strict commutation of the closure KZ axis and the fibration KZ axis. It is not a single runtime pass. It preserves axis-orthogonality: closure advances values; fibration refinement advances cleavage/indexing. The multi-agent epistemic layer is also bigraded: truth-axis and knowledge-axis common knowledge are distinct greatest fixed points. The cohomology layer has truth and inconsistency rows, and the aperiodic regime splits into consistent, paraconsistent, and mixed sub-strata.

SPOTCOMP consequence:

Modeled-player swarms must be read as multi-observer systems over local settlings before CGS strategy claims are final. Aperiodic tiling claims require a substitution, patch, direct-limit, or regime witness; peer count and asynchronous clocks are insufficient. If the swarm is a UAS deployment, DRIP/Remote ID RFCs bind the identity and authentication layer separately from the tiling law.

[BIGRADED-DIAMOND-SWARMS.md](./BIGRADED-DIAMOND-SWARMS.md) and [src/bigraded-diamond-swarm-profile.mjs](./src/bigraded-diamond-swarm-profile.mjs) provide the current declaration surface. They do not prove the KZ diamond or compute cohomology.

## 11. Aperiodic Swarm Witnesses

Primary sources:

- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/code/structures/anderson-putnam-direct-limit.md`
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/code/structures/aperiodic-classifying-invariant.md`
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/code/structures/aperiodic-co-classifying-invariant.md`
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/code/structures/step-n-substitution-rule.md`
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/code/structures/step-n-classifying-invariant.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/mutually-locally-derivable.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/aperiodic-regime-classification.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/step-n-and-bilattice-correspondence.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/examples/benchmark-2-thue-morse.md`

Invariant:

An aperiodic swarm claim requires a substitution, patch, direct-limit, MLD, or
regime-classification witness. The Anderson-Putnam pattern supplies finite
approximants and direct-limit cohomology. MLD equivalence is witnessed by
invertible settling morphisms and, in common-base scope, equality of the
aperiodic classifying invariant. Step-n rank claims require matrix hypotheses;
singular cases downgrade generic rank claims. Bilattice alignment requires a
named operation and commutation witness, not just cardinality.

SPOTCOMP consequence:

Modeled-player swarms need an explicit aperiodic witness before using tiling or
quasicrystalline language as conformance evidence. [APERIODIC-SWARM-WITNESS.md](./APERIODIC-SWARM-WITNESS.md)
and [src/aperiodic-swarm-witness-profile.mjs](./src/aperiodic-swarm-witness-profile.mjs)
provide the current declaration surface. They do not compute cohomology,
construct tiling spaces, prove MLD equivalence, or decide weighted stability.

## 12. Moduli Descent And Laplacian Cohomology

Primary sources:

- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/meta-moduli-stack-theorem.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/meta-stratification-by-regime.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/regime-decomposition.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/narratives/d-frame-cohomology-framework.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/narratives/cellular-extension-plan.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/verdier-duality-bitopological-site.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/q-enriched-sheaf-direct-inverse-image.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/strong-mld-via-composed-duality.md`

Invariant:

Closure-rule systems descend as closure operators in the meta-moduli stack,
with closure-equivalence as the invariant. Regime information is two-level:
one settling has an actual closure-ordinal regime, while one rule system has a
maximum attainable meta-regime. The d-frame cohomology route is
Tarski/Lawvere-Laplacian and Q-enriched; Verdier duality gives the sheaf/cosheaf
presentation and composes with bilattice negation. Strong MLD refines ordinary
MLD by the firing-orbit type function.

SPOTCOMP consequence:

A modeled-player swarm claim must not stop at ordinary MLD or endpoint
summary. It needs descent evidence for closure-rule systems, regime-sensitive
substitution placement, declared cohomology route, Verdier/six-functor scope
when those are invoked, and strong-MLD orbit data when claiming strong
equivalence.

[MODULI-DESCENT-LAPLACIAN.md](./MODULI-DESCENT-LAPLACIAN.md) and
[src/moduli-descent-laplacian-profile.mjs](./src/moduli-descent-laplacian-profile.mjs)
provide the current declaration surface. They do not compute cohomology or
validate strong MLD for a live swarm.

## 13. Regime Substitution Ladder

Primary sources:

- `development/experimental/spotcomp/REGIME-SUBSTITUTION-LADDER.md`
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/code/structures/step-n-substitution-rule.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/step-n-moduli-substack.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/examples/benchmark-1-fibonacci.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/examples/benchmark-3-padovan.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/step-n-and-bilattice-correspondence.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/canonical-step-shift-resolution.md`

Invariant:

Substitution family names are not regime labels. A named family has a staged
placement in the SPOTCOMP predication ladder, a step-n moduli coordinate, and
possibly one or more benchmark lifts over selected bases. Those axes commute
only when the profile declares the evidence. Padovan is finite/strict
placement, Fibonacci is Scott-continuous placement, and Tribonacci is
transfinite placement, even though benchmark lifts over `E = omega_1` can be
aperiodic.

SPOTCOMP consequence:

Profiles must declare substitution name, step depth, stage placement,
base/cofinality, lift status, and operation-level bilattice alignment evidence
when applicable. Name-only, alphabet-only, step-depth-only, and benchmark-only
classification blocks strong conformance.

[REGIME-SUBSTITUTION-LADDER.md](./REGIME-SUBSTITUTION-LADDER.md) and
[src/regime-substitution-ladder-profile.mjs](./src/regime-substitution-ladder-profile.mjs)
provide the current declaration surface. They do not compute substitution
cohomology or classify a live rule system.

## 14. Realizability And Deformation

Primary sources:

- `development/experimental/spotcomp/REALIZABILITY-DEFORMATION.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/meta-realizability-map.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/narratives/realizability-program.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/realizability-cardinality-bound.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/c-naturality-coupling-realizability-refinement.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/tangent-dimension-constructible-non-semicontinuous.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/chl-recursion-stabilization-check.md`

Invariant:

Realizability is the stack morphism `pi^real : M^SKH -> M^meta`, with
closure-equivalence as target identity and increment-sequence moduli as
fibers. It is regime-respecting in the upper-bound direction. The realized
image is refined by regime, bigraded value type, predicate-category
naturality, and rule-language fragment. Tangent dimension is `Ext^1`, agrees
with `H1` in the declared scope, and is constructible but not semicontinuous.

SPOTCOMP consequence:

A swarm profile must not infer realized class, meta-point identity,
per-predicate firing patterns, tangent dimension, or CHL stabilization from a
small run or endpoint state. It must declare the stack morphism, fiber,
realizability axes, predicate coupling, tangent evidence, and stabilization
scope.

[REALIZABILITY-DEFORMATION.md](./REALIZABILITY-DEFORMATION.md) and
[src/realizability-deformation-profile.mjs](./src/realizability-deformation-profile.mjs)
provide the current declaration surface. They do not compute Ext groups or
decide live realizability.

## 15. Void Relationlessness And Stage Translation

Primary sources:

- `development/experimental/spotcomp/VOID-RELATIONLESSNESS-STAGES.md`
- `development/active/library/void/void.schema.json`
- `development/active/articulating/library/aperiodic-articulation-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/potential-aperiodic-predication-cell.schema.json`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/void-cone-cohomology.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/void-cone-associated-graded-direct.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/value-agnostic-void-cone.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/lorentzian-apex-void-as-timelike-spacelike.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/tropical-rank-collapse-classification.md`

Invariant:

Void-cone and failure-geometry vocabulary is translated into the current
four-stage predication chain. Void is the null case of relationlessness at
articulating, witnessed finitely as `null` in the active tree, not a process
exception or a finite-only FOUR value. The descending void filtration has an
associated graded paired with apex `H1`, while permanent limit void remains a
separate invariant. The value-agnostic construction covers bilattice,
stochastic, Lawvere, and Lorentzian cases.

SPOTCOMP consequence:

Profiles must declare the stage translation, relationless null witness,
void-filtration regime behavior, cohomology pairing route, value instance, and
weighted stability boundary before using void or failure-geometry claims as
swarm evidence. Exception handling, parse rejection, or finite FOUR projection
does not by itself witness void.

[VOID-RELATIONLESSNESS-STAGES.md](./VOID-RELATIONLESSNESS-STAGES.md) and
[src/void-relationlessness-profile.mjs](./src/void-relationlessness-profile.mjs)
provide the current declaration surface. They do not compute void filtrations,
cohomology, rank stability, or live relationless frontiers.

## 16. Trace Monoid Settlement Bridge

Primary sources:

- `development/experimental/spotcomp/TRACE-MONOID-SETTLEMENT.md`
- `development/active/articulating/library/aperiodic-articulation-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/positing/library/scott-continuous-posit-category/settling/hacking/trace-monoid/docs/dev/journal/2026-05-24.md`
- `development/active/articulating/library/aperiodic-articulation-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/positing/hacking/library/positing-naturality/docs/dev/journal/2026-05-24.md`
- `development/active/articulating/library/aperiodic-articulation-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/positing/library/predication-fibration-2-category/hacking/closure-2-monad/hacking/library/closure-merge-commutation/docs/dev/journal/2026-05-24.md`
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/lean/PredicationCategories/Homebrew/Settling/CRDT.lean`
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/prose/learning/claims/settling-merge-semilattice.md`
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/prose/learning/claims/modeling-preorder-independence.md`

Invariant:

Independent staged steps form a trace monoid only after step identity and
independence are declared. The valuation action maps steps to atomic or batch
positings and is constrained by positing naturality. Closure-driven distributed
convergence depends on closed initial state, common closure operator,
closure-merge commutation, and same-multiset writes. Knowledge-order merge is
semilattice structure; truth-order modeling is a separate preorder.

SPOTCOMP consequence:

Trace equality, row merge, and federation delivery order are not interchangeable.
Profiles must declare the trace monoid, Foata/prefix evidence, independence
criteria, valuation action, and CRDT convergence scope before claiming
order-independent settlement. Endpoint states and projection artifacts do not
carry history evidence unless separately declared.

[TRACE-MONOID-SETTLEMENT.md](./TRACE-MONOID-SETTLEMENT.md) and
[src/trace-monoid-settlement-profile.mjs](./src/trace-monoid-settlement-profile.mjs)
provide the current declaration surface. They do not compute normal forms,
infer independence from rows, execute closure, or prove live convergence.

## 17. Modeled-Player Swarm Dynamics

Primary sources:

- `development/experimental/spotcomp/MODELED-PLAYER-SWARM-DYNAMICS.md`
- `lab/hacking/articulating/library/stable-articulation-cell/predicating/hacking/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/library/object/library/thing/library/category/hacking/library/computing/spotcomp/settling/library/player/player.schema.json`
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/code/structures/multi-observer-system.md`
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/code/structures/multi-observer-system-with-rules.md`
- `lab/archive/library/humanities/library/math/library/categories/theories/predication-theory/code/transformers/agentive-positing-morphism.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/network-sheaf-consensus-on-agent-graphs.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/bilattice-network-sheaf-consensus.md`
- `lab/archive/relationality-repo/relationality-repo/library/theories/humanities/theories/math/theories/categories/theories/predication-categories/narratives/tunneling-and-agential-dynamics.md`

Invariant:

Modeled players are observer objects represented by local settlings, with
per-observer closure rules when rules differ. Agentive positings are
attributed local actions whose assertion/claim status is relational to the
merged settling. Agent graphs admit network-sheaf and d-frame consensus
surfaces, while CGS strategies are built over that ruled observer-local
settling rather than over peer records alone.

SPOTCOMP consequence:

Strong modeled-player conformance requires ruled multi-observer declarations,
agentive positing semantics, graph-sheaf/d-frame consensus boundaries,
strategy obligations, and transition/aperiodic evidence. Key identity,
mailboxes, local loops, and finite endpoint state are implementation data, not
the modeled-player object.

[MODELED-PLAYER-SWARM-DYNAMICS.md](./MODELED-PLAYER-SWARM-DYNAMICS.md) and
[src/modeled-player-swarm-dynamics-profile.mjs](./src/modeled-player-swarm-dynamics-profile.mjs)
provide the current declaration surface. They do not compute consensus,
cohomology, MLD, or CGS composition.

## 18. Continuous Learning

Primary sources:

- `development/experimental/spotcomp/CONTINUOUS-LEARNING.md`
- `development/active/articulating/library/aperiodic-articulation-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/positing/hacking/learning/hacking/answering/docs/dev/journal/2026-05-24.md`
- `development/active/articulating/library/aperiodic-articulation-category/library/aperiodic-predication-cell/library/potential-aperiodic-predication-cell/predicating/library/transfinite-predication-category/positing/hacking/learning/hacking/teaching/hacking/referencing/docs/dev/journal/2026-05-24.md`
- `lab/hacking/articulating/library/stable-articulation-cell/predicating/hacking/library/predication-cell-set/library/predicate-set/library/predicate-category/hacking/teaching/teaching.md`
- `lab/archive/old-archive/triage/engineering-archive/library/humanities/theories/philosophy/theories/relationality/triage/provenance/relationality-archive/sscu-sprint/domains/universes/semiotic-universe/domains/interactive-semioverse/domains/agential-semioverse/agential-semioverse.md`
- `lab/archive/old-archive/triage/engineering-archive/library/humanities/theories/philosophy/theories/relationality/triage/provenance/relationality-archive/sscu-sprint/domains/universes/semiotic-universe/domains/interactive-semioverse/domains/agential-semioverse/domains/computing/agential-semioverse-repository/theory/agent-skill-interaction.md`

Invariant:

Learning is not an implementation-private event. It is a governed morphism on
modeled-player representation: answering posits into `Phi`, referencing
projects from the predication-cell-set, teaching adds bearer-side
predications, skill improvement is closure on a specification, and durable
memory is a local fragment. Rule learning acts on `r(o)` and therefore
changes the ruled multi-observer system unless closure equivalence is proved.

SPOTCOMP consequence:

A runtime can continuously adapt only if the adaptation is exposed as a
trace-bearing predication or transition record and remains admissible in the
ludic/CGS strategy surface when it affects play. Hidden weight updates,
context presence, and installation events are not learning evidence.

[CONTINUOUS-LEARNING.md](./CONTINUOUS-LEARNING.md) and
[src/continuous-learning-profile.mjs](./src/continuous-learning-profile.mjs)
provide the current declaration surface. They do not inspect model weights,
score learning quality, compute skill fixed points, or prove closure
equivalence for rule changes.

## 19. Implementation Subordination

The implementation probe is useful only as a law microscope. The required order is:

`repo-derived categorical invariant -> derivation obligation -> conformance criterion -> implementation check`

The reverse order is invalid. When code behavior conflicts with this file, the code changes.
