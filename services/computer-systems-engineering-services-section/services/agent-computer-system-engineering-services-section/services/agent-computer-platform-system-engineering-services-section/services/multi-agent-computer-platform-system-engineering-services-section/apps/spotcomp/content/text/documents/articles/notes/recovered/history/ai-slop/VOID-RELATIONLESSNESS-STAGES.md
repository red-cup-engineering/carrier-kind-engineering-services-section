# Void Relationlessness And Stage Translation

Status: source-backed declaration surface. This file translates older void-cone
and failure-geometry notes into the current SPOTCOMP stage vocabulary:
articulating, predicating, positing, and settling.

Lab theorem claims are treated as proven even when archived status metadata is
stale. The point here is not to re-prove the lab; it is to prevent SPOTCOMP
implementation probes from losing the stage boundary, the null case, or the
cohomological content.

## 1. Translation Rule

The void-cone vocabulary is an earlier expression of the same staged
predication machinery now recorded as:

`articulating -> predicating -> positing -> settling`

with regimes:

`aperiodic -> transfinite -> Scott-continuous -> finite`

Use this translation when reading old void-cone notes:

| Older vocabulary | Current SPOTCOMP reading |
| --- | --- |
| void as relationless origin | articulating null case before either side of the utterance is articulated |
| void shrinkage by firing | predicating/positing movement from relationless potential toward fired predication cells |
| void cone filtration | staged filtration across aperiodic, transfinite, Scott-continuous, and finite predication categories |
| apex/void duality | settling cohomology pairing between fired cells and the associated graded of relationless cells |
| failure geometry | obstruction geometry of stage movement, not process exceptions |

This makes void-cone material usable without making it a new fifth stage or a
special exception to the four-stage chain.

## 2. Void Is The Null Case

Void is the null case because it records relationlessness at a slot. The active
tree currently gives the finite carrier witness: `library/void/void.schema.json`
is the JSON `null` literal, and a potential aperiodic predication cell carries
void in both articulation-content slots. That finite witness is not the whole
mathematical object, but it fixes the intended null reading.

Token and claim remain the two non-assembling primitives of an utterance. Void
is sibling to them at the articulating boundary as the unarticulated slot value.
It is not a parse failure, transport error, rejected envelope, or exception
handler output. Those may be audited downstream, but they are not the void
case unless a declared morphism relates them to relationlessness.

The potential cell is therefore not a failed active cell. It is the
relationless/null articulating state from which predicating and positing may
move by stage-preserving morphisms.

## 3. Void Filtration

Older notes describe a descending void filtration:

`V_0 superset V_1 superset ...`

where `V_tau` is the set of cells whose value is the closure-trivial element
at stage `tau`. In value-agnostic form, a closure-pointed value category
declares a null element `0_V` and support-respecting closure, and:

`V_tau = { cell | value_tau(cell) = 0_V }`

This is the stage-theoretic reading:

- in articulating, void is the relationless slot of the aperiodic cell;
- in predicating, void shrinkage records transfinite predication firing
  structure;
- in positing, void shrinkage is constrained by Scott-continuous least
  extension;
- in settling, finite projections may present the surviving or fired cells in a
  finite algebra.

The limit void `V_infty` is a separate invariant: cells that never leave the
null/relationless case. It must not be counted as the same thing as the
associated graded firing invariant.

## 4. Associated Graded And Apex Pairing

The void cone carries the associated graded of the void filtration:

`gr(Void_v) = direct sum_tau (V_<tau \\ V_tau)`

Under the lab theorem, this associated graded is canonically paired with the
apex cohomology `H1(F_v)`. There are two equivalent proof routes in the lab:
Verdier sheaf/cosheaf duality and a direct chain-level proof identifying
firing events with graded void-exit events.

Implementation consequence: a profile may cite either route, but it must not
treat permanent void cells as `H1`, and it must not read legacy `H0(Void_v)`
phrasing as ordinary connected-component homology. In this workspace, that
legacy phrase is interpreted as the associated graded or its cosheaf homology
presentation.

## 5. Value-Agnostic Instances

The void/null case is not restricted to FOUR:

- in bilattice instances, the null case is bottom/unknown on the relevant
  evidence axis;
- in stochastic instances, the null case is zero probability or zero support;
- in Lawvere-quantale instances, the null case is no path or infinite distance;
- in Lorentzian causal instances, void is spacelike separation, while apex
  records causally connected or timelike pairs.

FOUR remains one finite specialization. Its conflation involution acts on the
void/fullness axis, while negation acts on the truth axis. A SPOTCOMP profile
that collapses those axes has lost the void/apex duality.

## 6. Failure Geometry

Failure geometry is the geometry of obstruction in staged predication. It is
not a substitute for normal runtime error handling.

Non-Scott-continuous firings, void-shrinkage discontinuities, and associated
graded generators are the mathematical content. A failure-event profile, where
used, records ordinal position, firing type, predicate incidence, and
consistency-failure pattern. Those declarations belong to the predication and
settling machinery, not to transport parsing.

The agentic reading follows from the regime reading: finite and bounded
transfinite systems can exhaust their relevant void; aperiodic systems retain
continuing relationless frontier at every finite or countable presentation.
That continuing frontier is one reason modeled-player swarms must be treated
as aperiodic/quasicrystalline structures when making strong agency claims.

## 7. Weighted Continuous Boundary

Continuous, tropical, probabilistic, trust-weighted, or drone-swarm weighted
deployments must declare a shape-specific stability cone before they claim
rank preservation. The lab rank-collapse theorem is not arity-only:

- Fibonacci stability is governed by its own weight cone;
- Tribonacci and Tetranacci have different admissible cones;
- Padovan favors the opposite monotonic weight direction from the usual
  n-bonacci pattern.

If weights are outside the declared cone, the correct behavior is downgrade:
rank and strong aperiodic conformance claims fail even if the finite carrier
shape still parses.

## 8. Declaration Probe

[schema/void-relationlessness-profile.schema.json](./schema/void-relationlessness-profile.schema.json)
and [src/void-relationlessness-profile.mjs](./src/void-relationlessness-profile.mjs)
validate declaration shape for:

- translation from old void-cone vocabulary into the four stage categories;
- void as the null relationless case at articulating;
- descending void filtration and separate limit-void invariant;
- associated graded, apex pairing, Verdier, and direct chain proof routes;
- non-FOUR value instances;
- failure geometry as obstruction geometry rather than runtime error handling;
- weighted stability cone and rank-collapse downgrade policy.

The checker does not compute cohomology, decide void shrinkage for a live
swarm, validate real weights, or prove a live modeled-player swarm's agency
claim. It blocks declaration shapes that would erase relationlessness, collapse
the stage categories, or treat finite FOUR projection as the whole theory.
