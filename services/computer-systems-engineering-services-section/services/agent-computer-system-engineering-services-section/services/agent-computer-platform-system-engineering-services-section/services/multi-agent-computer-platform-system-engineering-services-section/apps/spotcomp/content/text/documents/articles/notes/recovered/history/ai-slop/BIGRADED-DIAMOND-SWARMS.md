# Bigraded Diamond Swarms

Status: source-backed declaration surface. This file records what the lab
predication-categories material adds to SPOTCOMP's modeled-player and swarm
theory. It is not a final proof of swarm conformance.

## 1. Diamond Means Two KZ Axes

The relevant diamond is not a UI shape, an event kind, or a special FOUR
construction. In the predication-categories sources, the diamond is the strict
commutation of two disentangled KZ structures:

- **Fibration KZ:** the Gray-Street/Emmenegger fibration axis on
  `Cat / C`, controlling cleavage and predicate-category indexing.
- **Closure KZ:** the closure 2-monad axis on predication fibrations,
  controlling saturation of values under closure rules.

The KZ-diamond theorem states that closure and fibration refinement commute
strictly on the common settling 2-category because they act on disjoint data:
closure touches values, while fibration refinement touches cleavage/indexing.
The canonical comparison 2-cell is therefore identity componentwise, pending
the source's remaining 2-categorical bookkeeping.

SPOTCOMP consequence: a modeled-player or swarm implementation cannot replace
this diamond with a single handler loop. It must preserve both axes:

- value closure and least-fixed-point evidence;
- fibration/cleavage/indexing evidence over the predicate category;
- the strict-commutation obligation between them.

## 2. Bigraded Epistemic Layer

The predication hyperdoctrine has two parallel adjoint systems:

- truth-order adjoints `exists^t -| f* -| forall^t`;
- knowledge-order adjoints `exists^k -| f* -| forall^k`.

For multi-agent knowledge this yields two everyone-knows operators, two
common-knowledge fixed points, and generally two different outcomes:

- `C^t(phi)`, the truth-axis greatest fixed point;
- `C^k(phi)`, the knowledge-axis greatest fixed point.

The source's benchmark shows these axes can diverge even when the visible
input looks Boolean: truth-side disagreement can settle to designated falsity,
while knowledge-side disagreement can settle to no-information. The important
point for SPOTCOMP is not the specific benchmark. The important point is that
truth-axis and knowledge-axis common knowledge are distinct fixed-point
operators.

SPOTCOMP consequence: modeled-player agreement cannot be checked by one
single-axis consensus value. A swarm profile needs to say which axis it uses
for each claim, and strong conformance needs both axes when common knowledge,
recognition, consensus, disagreement, or governance is load-bearing.

## 3. Bigraded Cohomology

The bigraded settling-cohomology object splits the settling-associated sheaf
into a truth row and an inconsistency row:

- `F_U^(t)` carries truth-side designated content;
- `F_U^(top)` carries paraconsistent top-valued content;
- the total object is a two-row bicomplex with a vertical differential from
  truth-side content into the inconsistency row.

The aperiodic regime then decomposes into three sub-strata:

- consistent: inconsistency invariant is zero;
- paraconsistent: truth invariant is zero;
- mixed: both invariants are non-zero.

The realizability-refinement theorem proves a two-parameter family of
realizable bigraded classes on discrete predicate categories: truth-side and
inconsistency-side initial ordinal segments can be chosen independently within
the theorem's scope.

SPOTCOMP consequence: a swarm audit cannot flatten all non-finite behavior
into one "aperiodic" bit. It must preserve at least the two first-order audit
slots already named elsewhere in this workspace: `H1_t` and `H1_top`.

## 4. Multi-Observer Swarm Reading

The lab's swarm-relevant object is a multi-observer system:

`V : O -> Settlings_B`

where `O` is an observer category and each observer has a settling on a common
base. When `O` is the incidence poset of an agent graph, the network-sheaf
consensus theorem identifies:

- consensus as the categorical limit/global sections/`H0`;
- disagreement as pointwise bilattice divergence and, when topology is
  non-trivial, first cohomological obstruction;
- coordination-free merge as the CRDT/Mayer-Vietoris vanishing result for
  monotone knowledge-order joins.

The per-observer-rules theorem extends convergence to observers with distinct
closure rule systems. The joint stage stabilizes at the supremum of the
observers' closure ordinals. This separates:

- evidence-layer paraconsistency: observers disagree in asserted evidence;
- inferential-layer paraconsistency: observers agree on evidence but derive
  contradictory consequences under different local rules.

SPOTCOMP consequence: a modeled player is not only a CGS strategy wrapper. It
is also an observer-local settling in a functorial multi-observer system. The
CGS surface must be built over that object, not beside it.

## 5. Aperiodic Tiling Boundary

The user-level shorthand "aperiodic quasicrystal" should be read through the
predication-categories machinery before it is used for SPOTCOMP. For this
workspace, a swarm may claim an aperiodic tiling structure only when it has a
substitution, patch, direct-limit, or regime-classification witness showing how
modeled-player local settlings and communication covers generate non-periodic
structure.

Tiling is not the same thing as a network topology. A graph names agents and
channels. A tiling law names how local settling patches substitute, recur,
fail to periodize, and preserve their bigraded invariants.

SPOTCOMP consequence: a modeled-player swarm is not aperiodic merely because
it has many peers, shuffled deliveries, or unsynchronized clocks. It needs a
source-backed aperiodic/regime witness and an audit surface that preserves the
bigraded invariants.

[APERIODIC-SWARM-WITNESS.md](./APERIODIC-SWARM-WITNESS.md) refines this
boundary into a separate witness profile: local-settling tiles, substitution
matrix, direct-limit cohomology, MLD comparison, bilattice-alignment evidence,
and weighted-swarm downgrade rules.

## 6. Drone Standards Boundary

Applicable IETF UAS work lives in DRIP/UAS Remote ID, including RFC 9153
requirements and terminology, RFC 9374 DRIP Entity Tags, RFC 9434 DRIP
architecture, RFC 9575 DRIP authentication formats for broadcast Remote ID,
and RFC 9886 DETs in DNS.

These standards bind identity, Remote ID, authentication, registry, and
admission-facing communications. They do not make an aperiodic tiling law a
drone-swarm standard by itself.

SPOTCOMP consequence: if SPOTCOMP is used for a UAS swarm, the tiling/bigraded
machinery can structure local swarm behavior, observer covers, and audit
invariants. DRIP/DET/RID profiles still bind the applicable identity and
Remote ID layer. No implementation should claim that tiling alone satisfies
IETF drone requirements.

[DRIP-UAS-BINDING.md](./DRIP-UAS-BINDING.md) records the standards-layer
binding in its own resource so DRIP identity/authentication/registry evidence
does not get conflated with the KZ diamond, multi-observer settling, or
aperiodic tiling witness.

## 7. Declaration Probe

The files [schema/bigraded-diamond-swarm-profile.schema.json](./schema/bigraded-diamond-swarm-profile.schema.json),
[examples/bigraded-diamond-swarm-profile.json](./examples/bigraded-diamond-swarm-profile.json),
and [src/bigraded-diamond-swarm-profile.mjs](./src/bigraded-diamond-swarm-profile.mjs)
define a declaration-level checker for this boundary.

The probe checks declarations for:

- KZ diamond axes and strict commutation;
- truth/knowledge common-knowledge separation;
- bigraded cohomology and aperiodic trichotomy;
- multi-observer swarm structure;
- aperiodic tiling witness boundaries;
- DRIP/Remote ID separation;
- implementation downgrade rules.

It does not prove the KZ-diamond theorem, compute common knowledge, compute
cohomology, validate UAS Remote ID exchanges, or derive the final CGS
embedding.
