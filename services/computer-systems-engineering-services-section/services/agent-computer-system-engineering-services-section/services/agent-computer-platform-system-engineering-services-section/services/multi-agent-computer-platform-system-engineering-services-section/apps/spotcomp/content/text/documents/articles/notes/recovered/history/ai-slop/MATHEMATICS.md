# Mathematical Model

## 0. Sub-Specification Family

The handrolled SPOTCOMP text already names subsystem views. This workspace
treats them as a specification family rather than as prose labels. PAM is
Predicate Algebra Modeling: the model/kernel that realizes predication-fiber
algebra as reified messages, morphism dispatch, closure wavefront, event
replay, and witness returns.

Mathematically, PAM is the concrete model layer for the abstract
predication-fiber structure. It must remain parameterized by value algebra and
regime. The finite FOUR profile is a finite instance. It is not the whole
value theory.

[library/pam/specification.md](./library/pam/specification.md) records the
first PAM sub-specification skeleton.

The operating sub-specification is the same move for the computer-operating
layer. It treats operations as substrate content: Hoare strata become
learning/doing/teaching, doing refines into governing/planning/working, the
operations loop is sigma/delta and global-section work, and costs are
continuous-valued settlement in a Lawvere quantale.

[library/operations/specification.md](./library/operations/specification.md)
records the first operations sub-specification skeleton.
[src/operations-profile.mjs](./src/operations-profile.mjs) checks only that
an implementation profile declares the required operational carriers and
handoffs; it does not prove the operating mathematics.

I/O is handled by the same staged mathematics. External presentations become
SPOTCOMP evidence only through token/claim/utterance, articulating, and the
downstream predicating/positing/settling chain. This is recorded in
[IO-ARTICULATION.md](./IO-ARTICULATION.md).

Unresolved and partial functions are also handled by the staged mathematics:
partial support and bottom/default extension are declared, closure produces a
fixed point only with evidence, and non-final results remain typed prefixes,
obstructions, audits, or downgrades. This is recorded in
[PROOF-TREE-IRRESOLUTION.md](./PROOF-TREE-IRRESOLUTION.md).

## 1. Trace Domain

Let `Row` be the set of valid EAVT JSON objects. A finite trace is a finite subset of `Row` modulo canonical row identity.

Define:

`T = P_f(Row)`

ordered by inclusion. `T` is an omega-complete partial order for increasing finite approximants when embedded in `P(Row)`. Directed joins are unions.

An append operation is:

`append_r(x) = x union {r}`

It is monotone, inflationary, and Scott-continuous:

`append_r(sup D) = sup { append_r(d) | d in D }`

for directed `D`, because union distributes over directed union.

## 2. EAVT Is The Trace

EAVT is not a database encoding of a separate trace. The EAVT row is the atomic trace event. JSONL is a finite presentation of a prefix/frontier of the trace.

The value component `v` is polymorphic over the active fiber. For one projection it may be boolean. For another it may be a FOUR element. For another it may be a content-addressed JSON object. The substrate does not change.

Canonical row identity is part of the finite computer presentation of this trace domain. It is `sha256(jcs(row))` over the exact EAVT row, not the row's line position or local parse object. [CANONICAL-IDENTITY.md](./CANONICAL-IDENTITY.md) records the IETF-boundary requirements that make this identity reproducible.

## 3. Predication Fiber Algebra

For each predicate `p`, the general predication fiber is:

`A_p = (L x L)^(E x E)`

where `L` is the declared parameter lattice and `E x E` indexes subject/object positions for the fixed predicate. Each cell value is an evidence charge in `L x L`, with independent positive and negative evidence components.

All bilattice operations lift pointwise to `A_p`: knowledge meet/join, truth meet/join, negation, twist-product fusion, and twist-product residual. When `L` carries fusion `.` residuated by `->`, fusion and residual satisfy truth-order residuation pointwise.

The predication fibration packages these uniform fibers over the predicate category. Reindexings along specialization, converse, subject-projection, and object-projection preserve the pointwise bilattice-residuated structure. The hyperdoctrine layer adds property-like quantifier adjoints, Frobenius for both meets, Beck-Chevalley, and dual comprehension. FOUR is the boolean specialization of this structure, not its definition.

[PREDICATION-FIBER-ALGEBRA.md](./PREDICATION-FIBER-ALGEBRA.md) records the candidate declaration surface for this layer.

## 4. Finite Projections

A finite projection is a Scott-continuous map:

`p : Trace -> A`

where `A` is a finite algebra or finite artifact carrier ordered by information inclusion.

Because `A` is finite, a projection of a directed trace is determined by some finite frontier. A Semantic Hypertext Packet is such a finite projection: it is not the trace, but a finite settled view of trace rows for a semantic hypertext carrier.

## 5. Settlement

A settlement rule set is a monotone endofunction:

`F : A -> A`

on a finite algebra `A` produced from a trace frontier by projection. By Knaster-Tarski, `F` has a least fixed point. Since `A` is finite, iteration from bottom reaches the least fixed point in finitely many steps.

FOUR-valued settlement is one instance:

`A = FOUR^Phi`

for a finite cell set `Phi`. This is useful and often central, but it is not the only possible `A`.

The finite presentation is downstream of the broader closure machinery. Closure is a lax-idempotent 2-monad on predication fibrations, and the settling orbit is generated by:

`F_U(E)_tau = Cl(E) join_k u_tau`

Close-then-merge and merge-then-close presentations are bridged by:

`cl(cl(X) join_k Y) = cl(X join_k Y)`

The settling apex is the Knaster-Tarski least fixed point of that orbit. Bounded sigma/delta iteration is therefore evidence for a prefix unless it also carries fixed-point evidence. [CLOSURE-SETTLING.md](./CLOSURE-SETTLING.md) records the candidate declaration surface for these claims.

## 6. Category Roots And Generators

Each `library/$thing/` category root denotes an initial object for the category of resources generated under that root.

For a root category `C`:

- a sibling `$morphism/` is a generator of `C`;
- a child `library/$object/` is a codomain object generated from `C`;
- `scripts/` provide executable witnesses of generator action;
- `schema.json` provides a finite type/proposition witness;
- `jsonl` provides the trace;
- SHP provides the semantic hypertext projection surface when the codomain is a finite hypertext packet.

This is proof-tree organization. A path is justified by the derivation that places it, not by class inheritance.

## 7. Extension And Restriction

A generator is an extension when it admits new structure while preserving a structure-preserving embedding of its input. Typical signs:

- new codomain objects appear under `library/`;
- new traces become admissible;
- new projection targets become available.

A generator is a restriction when it selects a subcategory, subfiber, finite frontier, local settling, trace slice, or certified view. Typical signs:

- admissible rows are filtered;
- a finite algebra is chosen;
- a settlement or certification result is emitted.

Path derivation MUST ask: is this node a category, a generator, or a codomain object? If a generator, does it extend, restrict, or cite a scoped coincidence theorem? The codomain shape follows that answer. Extension evidence names the embedding and added structure; restriction evidence names the source frontier or subobject and the forgotten axes; coincidence evidence names theorem, scope, and off-scope distinctness. [GENERATOR-VARIANCE.md](./GENERATOR-VARIANCE.md) records the candidate declaration surface.

## 8. Aperiodic To Finite Direction

The foundational direction is:

`articulating -> predicating -> positing -> settling`

The stage-category reading is:

- articulating generates the aperiodic predication category;
- predicating generates the transfinite predication category;
- positing generates the Scott-continuous predication category;
- settling generates the finite predication category.

The implementation consequence is strict: finite settlement cannot be the ontology of the upstream trace. It can only be a projection from a trace frontier.

[PREDICATION-STAGES.md](./PREDICATION-STAGES.md) records the candidate declaration surface for this regime/category chain.

The ingress boundary before locution is also mathematical. The active tree's articulating generator takes an `utterance`, an ordered token/claim pair, and generates the aperiodic predication category. External trigger bytes are not this object. A locutionary handler must parse and validate them into typed internal input while preserving the declared stage. [PRELOCUTIONARY-INGRESS.md](./PRELOCUTIONARY-INGRESS.md) records the candidate declaration surface for that boundary.

## 9. CHL Language Cone Separation

A CHL language is a categorical apex with column-leg functors into type-theoretic, proof-theoretic, category-theoretic, domain-theoretic, and path-theoretic columns. In SPOTCOMP, the path-theory column is realized through the POSIX path category and Yoneda path identity.

Column morphisms are distinct until a theorem proves a scoped coincidence. The relevant coincidence for positing/illocution/term-instantiation/existential-push-forward is scoped to the predication-settling category; it does not define all column morphisms as identical. [CHL-LANGUAGE-CONES.md](./CHL-LANGUAGE-CONES.md) records the candidate declaration surface for this separation.

## 10. Concurrency

Independent appends commute. If two rows affect disjoint cells or independent generator positions, then:

`append_r(append_s(x)) = append_s(append_r(x))`

This induces a trace monoid over atomic positing steps with independence relation `I`. The local source tree marks the full functor from abstract history systems into settlement valuation lattices as an open proof obligation. This profile therefore requires only the operational CRDT law for trace merge and records the stronger categorical derivation as open.

## 11. Categorical Control Surface

[CATEGORICAL-MACHINERY.md](./CATEGORICAL-MACHINERY.md) is load-bearing for this mathematical model. In particular:

- row-level traces are finite carrier presentations of richer trace objects with causal, recognition, refinement, and provenance axes;
- positing must be natural under predicate-category reindexing;
- closure is a lax-idempotent 2-monad whose apex is the Knaster-Tarski least fixed point;
- regime classification controls which federation summaries preserve invariants;
- local settling is the basis for modeled-player predication state;
- CGS supplies the event-structure and strategy target for swarm semantics.

The current finite laws are therefore minimum law probes, not a complete semantics.

## 12. Positing Boundary

Positing is the Scott-continuous generator:

`posit_(phi,q)(v) = v join_k delta_(phi,q)`

The EAVT row is the finite event presentation of the act, not the whole morphism. A SPOTCOMP implementation must keep the categorical valuation update, pure event presentation, and downstream closure/write effects separated. [POSITING.md](./POSITING.md) records the candidate declaration surface for that boundary.

## 13. Recognition And Admission

Recognition is a trace fiber and receiver-relative admission discipline. Shape recognition checks that a finite carrier satisfies declared laws; mathematical recognition settles whether an event, delivery, move, or role is admitted as evidence under a receiver's closure, governance, and observation bounds.

This distinction matters for swarms. A valid row can be unauthenticated, authenticated but unauthorized, authorized but outside a player's observation map, or shape-valid but not admitted to the receiver's settlement. [RECOGNITION.md](./RECOGNITION.md) records the candidate declaration surface.

## 14. CGS Strategy Laws

The game-facing modeled-player layer needs morphism laws, not just event records. A CGS morphism `A -> B` is a concurrent strategy on `A^perp || B`, read modulo the symmetry groupoid. Receptivity, causality preservation, conflict preservation, and interaction-and-hiding composition are therefore part of the mathematical target.

Sequential and innocent strategies are restrictions of this surface. They are legal when declared and justified, but they are not the general swarm model. [CGS-STRATEGY-LAWS.md](./CGS-STRATEGY-LAWS.md) records the candidate declaration surface.

## 15. Bigraded Diamond Swarms

The lab predication-categories material makes the modeled-player layer stricter. The relevant diamond is the strict commutation of the closure KZ axis with the fibration KZ axis: closure acts on values, fibration refinement acts on cleavage and indexing, and the comparison 2-cell is identity when the remaining 2-categorical bookkeeping is supplied.

The same sources make common knowledge bigraded. Truth-order and knowledge-order adjoint systems yield distinct fixed-point operators, `C^t` and `C^k`, which generally diverge. A modeled-player swarm therefore cannot use one consensus value as a substitute for truth-axis and knowledge-axis evidence.

Swarm structure is also multi-observer structure: `V : O -> Settlings_B`, with agent graphs treated as incidence-poset observer categories. Consensus is the limit or `H0`; disagreement and paraconsistency live in bilattice joins and, when the observer topology is non-trivial, cohomological obstruction. Per-observer rule systems converge at the supremum of their closure ordinals.

[BIGRADED-DIAMOND-SWARMS.md](./BIGRADED-DIAMOND-SWARMS.md) records this as the current declaration surface and keeps aperiodic tiling claims separate from IETF DRIP/Remote ID conformance.

## 16. Aperiodic Swarm Witnesses

An aperiodic modeled-player swarm claim needs its own witness object. The
claim is not implied by peer count, graph topology, asynchronous delivery, or
clock jitter. It is a claim about local settlings arranged by a substitution,
patch, direct-limit, or regime-classification structure.

The predication-theory sources import the Anderson-Putnam pattern
structurally: finite approximants and transition maps assemble direct-limit
cohomology, and the aperiodic classifying invariant is an `H1` class of the
settling-associated sheaf. Under the common-base classification theorem,
mutually locally derivable settlings are exactly those with equal classifying
invariants in the comparison ambient.

For substitution-shaped swarms, step-n data must include an alphabet, a rule
whose antecedent reads the previous n stages, a substitution matrix, and rank
or singular-status evidence. Singular matrices do not inherit the generic
rank-n conclusion. Bilattice alignment also requires an operation-level
commutation witness; cardinality coincidences at n = 2, 3, and 4 are not
enough.

[APERIODIC-SWARM-WITNESS.md](./APERIODIC-SWARM-WITNESS.md) records this as a
separate declaration surface from the broader KZ-diamond and DRIP boundary.

## 17. Moduli, Descent, And Laplacian Layer

Swarm conformance also depends on the moduli layer. Closure-rule systems live
in a meta-moduli stack whose invariant is closure-equivalence and effective
descent of closure operators, not rule-source equality. Regime labels appear
at two levels: the actual regime of one settling, and the maximum attainable
regime of a rule system. Named substitutions must be placed by regime rather
than used interchangeably: Padovan in the finite/strict placement, Fibonacci
in the Scott-continuous placement, Tribonacci in the transfinite placement.

D-frame cohomology uses the Tarski/Lawvere Laplacian route, with shadow
cohomology as scaffold where the native route is not the declared evidence.
Verdier duality supplies sheaf/cosheaf presentations and composes with
bilattice negation in the d-frame setting. Strong MLD refines ordinary MLD by
adding the composed-duality firing-orbit type function.

[MODULI-DESCENT-LAPLACIAN.md](./MODULI-DESCENT-LAPLACIAN.md) records this as a
separate declaration surface from row-level traces, ordinary MLD, and
DRIP/UAS identity binding.

## 18. Regime Substitution Ladder

Substitution names have two separate readings in SPOTCOMP. The benchmark-lift
reading describes computations over a selected base such as `E = omega_1` and
`lambda = omega_1 + 1`; those lifts can be aperiodic. The staged-placement
reading describes where the family belongs in the predication derivation:
Padovan at the finite/strict settling boundary, Fibonacci at the
Scott-continuous positing boundary, and Tribonacci at the transfinite
predicating boundary.

Step depth remains a moduli coordinate: Fibonacci is step 2, Padovan and
Tribonacci are step 3, and Tetranacci is step 4. It does not by itself decide
staged placement. Bilattice cardinality coincidence at n = 2, 3, and 4 is
also not enough for structural alignment; an alignment claim needs an
operation-level commutation witness.

[REGIME-SUBSTITUTION-LADDER.md](./REGIME-SUBSTITUTION-LADDER.md) records this
as a separate declaration surface from aperiodic swarm witnesses and moduli
descent.

## 19. Realizability And Deformation Layer

Realizability connects the settling moduli stack to the meta-moduli stack by
`pi^real : M^SKH -> M^meta`, sending a settling to the closure-equivalence
class of its generating rule system. The fiber over a rule-system class is
the moduli of increment sequences modulo MLD-equivalence of the resulting
settlings, and the actual settling regime is bounded by the rule system's
meta-regime.

The realizability image is refined by regime, bigraded value type,
predicate-category naturality, and rule-language fragment. For non-discrete
predicate categories, firing-ordinal sets are coupled by the predicate
generator class; they cannot be declared independently.

The deformation layer identifies tangent directions with `Ext^1`, transported
to `H1` for the settling-associated sheaf. Tangent dimension is constructible
by regime plus firing-cardinality substrata, but not semicontinuous along
knowledge-order enhancement. The CHL stabilization check compares meta-tangent
directions to the non-fiber quotient of settling tangent directions through
the derivative of `pi^real`.

[REALIZABILITY-DEFORMATION.md](./REALIZABILITY-DEFORMATION.md) records this as
a separate declaration surface from moduli descent and runtime trace checks.

## 20. Void Relationlessness And Stage Translation

Older void-cone notes are read through the current stage chain:

`articulating -> predicating -> positing -> settling`

Void is the null case because it records relationlessness at an articulation
slot. The active finite witness is JSON `null`, and the potential aperiodic
predication cell has void in both articulation-content slots. That witness does
not make void a finite-only object; it fixes the null reading at the
articulating boundary.

The void filtration is descending. For a closure-pointed value category with
null element `0_V`, `V_tau` is the set of cells whose stage-`tau` value is
`0_V`. Its associated graded records cells leaving the null case at firing
ordinals, and the lab theorem pairs that associated graded with apex `H1` by
Verdier duality and by a direct chain-level proof. The limiting void
`V_infty` is separate: permanent relationlessness is not the same invariant as
the associated graded of void exits.

The null case is value-agnostic. Bilattice, stochastic, Lawvere, and
Lorentzian instances all have their own closure-trivial value. In FOUR-shaped
finite projections, conflation belongs to the void/fullness axis while
negation belongs to the truth axis.

Failure geometry is the obstruction geometry of staged predication, especially
non-Scott-continuous firings and void-shrinkage discontinuities. It is not
runtime error handling. Weighted continuous variants additionally require
shape-specific stability cones; rank collapse downgrades strong swarm claims.

[VOID-RELATIONLESSNESS-STAGES.md](./VOID-RELATIONLESSNESS-STAGES.md) records
this as a separate declaration surface from realizability, cohomology audit,
and runtime rejection paths.

## 21. Trace Monoid Settlement Bridge

For independent staged steps, SPOTCOMP uses the trace monoid:

`M(Sigma, I) = Sigma* / ~_I`

where `Sigma` is the finite step set and `I` is a symmetric irreflexive
independence relation. The quotient identifies adjacent independent steps, and
Foata normal form gives a canonical block presentation whose prefix order is
the history category.

The bridge into settling is an action of history steps on predication
valuations. Atomic positings act by knowledge-order join with a cell indicator;
batch positings act by finite joins. Positing naturality requires datum
preservation under predicate reindexing, so a row presentation cannot be used
as an untyped write action.

Same trace class should imply same valuation after the declared closure
policy. In the closure-driven distributed case, the Lean-backed CRDT theorem
supplies the operational core: from a closed initial state, applying writes
with closure after each merge equals one final closure of the folded
knowledge-join, hence is invariant under permutation of the same multiset of
writes.

This is a knowledge-order statement. It does not imply truth-order modeling:
the lab theorem on modeling and preorder morphisms proves the two preorder
structures are independent. Federation profiles therefore keep history-bearing
payloads distinct from endpoint states and projection artifacts.

[TRACE-MONOID-SETTLEMENT.md](./TRACE-MONOID-SETTLEMENT.md) records this as a
separate declaration surface from raw trace rows, regime federation, and
canonical identity.

## 22. Modeled-Player Swarm Dynamics

SPOTCOMP means Subject-Predicate-Object Trace Computer Operating
Modeled-Players. The modeled-player part is not optional runtime metadata. A
modeled player is an external player represented by an observer-local settling
inside a ruled multi-observer system:

`(O, V, r)`

where `V : O -> Settlings_B` gives each observer/player its local settling and
`r(o)` gives its closure-rule system. Consensus is the limit or graph-sheaf
`H0` where that surface is declared. Disagreement can be pointwise bilattice
join, top/con-failure in the d-frame, or `H1` obstruction in non-trivial
observer topology. These quantities must not be collapsed.

An agentive positing `posit^a_(phi,q)` is an attributed positing into the
observer-local settling and into the merged settling. Whether it is an
assertion or a contested claim is determined relationally after comparing the
observer-local value with the merged/closed state.

Modeled-player dynamics are settling paths. Smooth paths preserve MLD class.
Transitions arise from regime jumps, increment events, or rule perturbations.
For aperiodic swarm claims, modeled-player local settlings are the tiles or
finite windows, and substitution, patch, direct-limit, MLD, or regime evidence
is required.

[MODELED-PLAYER-SWARM-DYNAMICS.md](./MODELED-PLAYER-SWARM-DYNAMICS.md)
records this as a separate declaration surface from player registries,
ordinary CGS event-shape declarations, and DRIP identity.

## 23. Continuous Learning

Continuous learning is a path operation on modeled-player representation, not
an untracked side channel. Let a modeled player be represented at observer
`o` by local settling `V(o)` and closure-rule system `r(o)`. A learning step
is admitted only when it is visible as monotone governed change in one of:

- evidence under the existing `r(o)`;
- skill/capability predication carried by the modeled-player state;
- memory as a local fragment closed under the relevant closure operator;
- the rule system `r(o)` itself.

Answering and referencing give the minimal learn/use loop. Referencing is a
projection from the predication-cell-set. Answering is positing into
`Phi = E x Pi x E`. Closure and settlement then update the local settling
frontier from which later references read. This is continuous when the loop
iterates along a settling path while preserving monotonicity, provenance,
recognition, and governance.

Teaching is a bearer-side predication transformer. It changes the modeled
player's represented capability or memory surface by adding a relation such
as `has-skill(player, skill)` or `bears(player, record)`. It does not mutate
the conferred object. Skill improvement is a closure operation over a skill
specification: monotone, inflationary, and idempotent at fixed points.

Rule learning is different. A change to `r(o)` is a rule perturbation and
therefore a transition event unless a proof gives closure equivalence between
old and new rule systems. When learning occurs in play, the learning step is
also a ludic/CGS event whenever it changes observation, inference, capability,
or strategy behavior.

[CONTINUOUS-LEARNING.md](./CONTINUOUS-LEARNING.md) records this as a
declaration surface. It does not prove learning quality, skill fixed points,
or closure equivalence.
