# Aperiodic Swarm Witnesses

Status: source-backed declaration surface. This file refines the tiling boundary
from [BIGRADED-DIAMOND-SWARMS.md](./BIGRADED-DIAMOND-SWARMS.md) into the
witness shape a SPOTCOMP modeled-player swarm must declare before it can use
aperiodic, quasicrystalline, or substitution-tiling language in a conformance
claim.

## 1. Witness, Not Metaphor

An aperiodic swarm claim is a claim about a settling family. It is not proved by
having many peers, by asynchronous delivery, by clock drift, or by a graph with
cycles. The lab sources tie aperiodicity to closure ordinals, substitution
recurrence, direct-limit cohomology, and mutually locally derivable settlings.

For SPOTCOMP, the minimal object is therefore an aperiodic swarm witness:

- modeled-player tiles are local settlings, not peer records;
- finite message windows are finite projections of those local settlings;
- the global claim cites a substitution, patch, direct-limit, or regime
  witness;
- the cohomology audit preserves the bigraded truth and inconsistency rows.

## 2. Anderson-Putnam Shape

The predication-theory source imports the Anderson-Putnam pattern structurally:
an inverse-limit dynamical space has direct-limit cohomology. For predication
settlings, the settling endofunctor's iterates play the role of the
substitution self-map, finite bounded sub-sites play the role of finite
approximants, and the aperiodic closure ordinal assembles the first
cohomology class.

SPOTCOMP consequence: an aperiodic swarm witness must identify the finite
approximants, the transition maps between them, and the direct-limit
cohomology target. A finite trace frontier can be an approximant; it cannot be
the whole aperiodic object.

## 3. Classifying And Co-Classifying Invariants

The aperiodic classifying invariant is the `H1` class of the
settling-associated sheaf. In the common-base theorem, two aperiodic settlings
are mutually locally derivable exactly when their classifying invariants agree
in the common ambient comparison.

The co-classifying invariant presents the same data on the cosheaf-homology
side, related by Verdier duality where that duality is available. The two
presentations are operationally different:

- the sheaf cohomology presentation is natural for checking global agreement;
- the cosheaf homology presentation is natural for constructing local
  representatives.

SPOTCOMP consequence: a swarm implementation that cannot compute these
invariants may still carry declaration-level evidence, but it must downgrade
strong aperiodic swarm conformance to unknown.

## 4. Step-n Substitution Surface

For substitution-recurrence settlings, a step-n rule has:

- an alphabet of n letters;
- a closure rule whose antecedent reads the previous n stages;
- a substitution matrix whose entries count produced letters;
- a post-shift classifying invariant.

The non-singular step-n rank theorem gives rank n for the post-shift
classifying invariant. Singular substitutions are not covered by that theorem.
The Thue-Morse benchmark is the standing warning: it is aperiodic in the
substitution sense and self-dual under bilattice negation, but its singular
matrix gives a lower-rank localized invariant rather than the generic rank-2
claim.

SPOTCOMP consequence: a witness must declare the substitution matrix and its
rank/determinant status. It must not infer rank n from alphabet size alone.

Named substitution families also carry a staged-placement declaration outside
the aperiodic witness itself. A profile may cite an `omega_1` benchmark lift as
aperiodic evidence only when it declares the lift base and keeps that lift
separate from the SPOTCOMP staged placement recorded in
[REGIME-SUBSTITUTION-LADDER.md](./REGIME-SUBSTITUTION-LADDER.md).

## 5. Bilattice Alignment Boundary

The step-n and bilattice material proves a cardinality coincidence at n = 2,
3, and 4. It does not make FOUR exceptional and does not prove that every
step-n substitution commutes with a bilattice operation. A structural alignment
claim needs an explicit operation and a commutation witness.

Thue-Morse supplies a positive n = 2 case: alphabet swap corresponds to
bilattice negation under a declared bijection, and the substitution commutes
with that swap. Fibonacci does not have that negation-commuting property.

SPOTCOMP consequence: a modeled-player swarm may cite a bilattice alignment
only when it names the alphabet map, the bilattice operation, and the
commutation evidence. Cardinality alone is not enough.

## 6. Weighted And Continuous Swarms

The aperiodic-swarm question connects substitution-shaped swarm protocols to
weighted, continuous, and tropical variants. The relevant condition is not
mere weighting. Non-degenerate rank claims require weight-stability or
Pisot-alignment evidence for the protocol's induced weights.

SPOTCOMP consequence: swarm protocols that use probabilities, trust weights,
latencies, resource scores, or tactical weights must declare whether those
weights are part of the aperiodic invariant. If they are, the witness needs a
stability cone or downgrade policy.

## 7. UAS Standards Boundary

Aperiodic tiling witnesses do not satisfy UAS Remote ID. When a modeled-player
swarm is also a UAS deployment, [DRIP-UAS-BINDING.md](./DRIP-UAS-BINDING.md)
must carry the standards-layer identity, broadcast authentication, registry,
and DNS/DIME lookup declarations. This file only states the aperiodic
settling-classification evidence.

## 8. Declaration Probe

The files [schema/aperiodic-swarm-witness-profile.schema.json](./schema/aperiodic-swarm-witness-profile.schema.json),
[examples/aperiodic-swarm-witness-profile.json](./examples/aperiodic-swarm-witness-profile.json),
and [src/aperiodic-swarm-witness-profile.mjs](./src/aperiodic-swarm-witness-profile.mjs)
define a declaration-level checker for this boundary.

The probe checks declarations for:

- local-settling tile witnesses;
- step-n substitution rule and substitution matrix shape;
- Anderson-Putnam direct-limit structure;
- MLD common-base and settling-morphism criteria;
- classifying and co-classifying invariant slots;
- bigraded `H1_t` and `H1_top` preservation;
- bilattice-alignment and singular-matrix downgrade rules;
- weighted-swarm stability evidence.

It does not compute cohomology, prove MLD-equivalence, build an
Anderson-Putnam complex, decide weight-stability, or validate a live swarm.
