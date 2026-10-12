# Realizability And Deformation Machinery

Status: source-backed declaration surface. This file records the lab
realizability, predicate-naturality, deformation, and CHL-stabilization
machinery that SPOTCOMP must preserve when it claims that a swarm trace,
closure-rule system, or modeled-player family realizes a mathematical class.
Lab theorem claims are treated as proven for SPOTCOMP derivation even where
archive metadata has not been cleaned up. This file is not a cohomology or
deformation calculator.

## 1. Realizability Is A Stack Morphism

The meta-realizability map is the stack morphism

`pi^real : M^SKH -> M^meta`

that sends a settling class to the closure-equivalence class of the
closure-rule system generating its closure operator. This is not a log parser
or a runtime lookup. It is a relation between the settling moduli stack and the
meta-moduli stack.

The map is essentially surjective: every meta-point has at least one settling
in its preimage, including the trivial increment settling. It is also
regime-respecting in the upper-bound direction: the actual regime of a settling
is bounded above by the meta-regime of its closure-rule system. A single
meta-aperiodic system may have fibers containing settlings in lower regimes
depending on the increment sequence.

SPOTCOMP consequence: a profile must name the closure-equivalence class, not
only a rule text. It must also distinguish the actual settling regime from the
meta-regime of the rule system, and it must record the increment-sequence fiber
when a realized class is claimed.

## 2. Realizability Has Three Axes

The realizability program decomposes along a regime layer and three refinement
axes.

Regime layer:

- strict and Scott-continuous regimes have `H1 = 0`, so realizability is
  controlled by eventually designated `H0` cell configurations;
- transfinite-bounded and aperiodic regimes have non-trivial `H1`, controlled
  by non-Scott-continuous firing ordinal sets.

Refinement axes:

- bigraded value type: truth-side, inconsistency-side, and mixed firing
  structure;
- predicate-category naturality: coupling induced by specialization,
  converse, subject-projection, and object-projection morphisms;
- rule-language fragment: bare positive `Pi_1 + <`, named-ordinal fragments,
  ordinal arithmetic, `Pi_2`, and richer fragments, each with its own
  realizability scope.

The coarse cardinality bound says that, under the finite/at-most-countable
rule-system and countable-support increment restrictions in the lab theorem,
only at most `2^aleph_0` firing-ordinal subsets are realizable. Unrestricted
increments would collapse the question by direct marking, so countable support
is load-bearing.

SPOTCOMP consequence: a live system cannot infer realizability from a
cohomology-shaped payload alone. It must declare the regime, bigraded axis,
predicate-naturality axis, rule-language fragment, and increment-support
discipline used by the claim.

## 3. Predicate Naturality Couples Firing Patterns

When the predicate category is non-discrete, closure is `C`-natural. The
predicate-generator class determines how a firing pattern at one predicate
constrains a firing pattern at another:

- specialization restricts the source firing set to firings whose cells lie in
  the specialized domain;
- converse preserves firing ordinals while swapping cell coordinates;
- subject-projection transfers only diagonal firings;
- object-projection transfers only diagonal firings, dually by swap;
- a general predicate category takes the orbit closure of all such generator
  couplings.

SPOTCOMP consequence: a profile with predicate morphisms must not list
per-predicate firing sets independently unless it also supplies the generator
coupling evidence. Otherwise the profile can pass local shape checks while
violating the global `C`-naturality of closure.

## 4. Tangent Dimension Is Constructible, Not Semicontinuous

The settling deformation theorem identifies first-order deformation directions
with `Ext^1(F_v, F_v)`. For the settling-associated sheaf, the internal Hom
identification transports this to `H1`, and vanishing above degree 1 gives
unobstructed deformation theory at each point.

Per regime, the tangent dimension is:

- strict: `0`;
- Scott-continuous: `0`;
- transfinite-bounded: cardinality of the non-Scott-continuous firing ordinal
  set;
- aperiodic: cardinality of the non-Scott-continuous firing ordinal set.

This function is constructible: it is constant on the regime plus
firing-cardinality substrata. It is not semicontinuous in either direction
along knowledge-order enhancement. The lab's explicit chain has values
`0, 1, 0`: adding information can introduce a non-Scott-continuous firing by
satisfying an antecedent, and adding more information can pre-empt that firing
by asserting its consequent first.

SPOTCOMP consequence: a runtime cannot use monotone trace growth as a
semicontinuity heuristic for regime, tangent dimension, `H1`, or deformation
stability. It must carry explicit regime and firing-ordinal evidence.

## 5. CHL Stabilization Is A Tangent Comparison

The CHL recursion stabilization check compares meta-deformations and
settling-deformations through the derivative of `pi^real`. The stabilizing
condition is that the meta-tangent space is exactly the non-fiber quotient of
the settling tangent space:

`T_[S] M^meta ~= coker(T_[v](pi^real)^-1([S]) -> T_[v] M^SKH)`

Equivalently, the derivative of the realizability map is surjective and its
kernel is the fiber tangent. In the Boolean d-frame / `Pi_1` setting, the lab
theorem gives vacuous stabilization: both tangent spaces are zero-dimensional
and both obstruction groups vanish. In richer declared enrichments, the same
comparison is substantive and must be scoped.

SPOTCOMP consequence: a conformance profile that uses CHL recursion or
meta-moduli terminality must declare the tangent comparison, the fiber
quotient, and the enrichment scope. It cannot claim terminality because a
finite checker saw no deformation in one example.

## 6. Implementation Boundary

The implementation probe may check declaration shape for this layer. It must
not:

- infer realizability from a single finite run;
- identify a meta-point by rule text instead of closure-equivalence;
- treat endpoint summaries as increment-sequence fiber evidence;
- ignore predicate-generator coupling when `C` is non-discrete;
- use monotone trace growth as a semicontinuity theorem;
- claim CHL stabilization without tangent-comparison evidence.

Unknown realizability axis, unknown increment support, unknown
predicate-naturality coupling, unknown tangent dimension, or unknown
stabilization scope blocks strong swarm conformance.

## 7. Declaration Probe

The files [schema/realizability-deformation-profile.schema.json](./schema/realizability-deformation-profile.schema.json),
[examples/realizability-deformation-profile.json](./examples/realizability-deformation-profile.json),
and [src/realizability-deformation-profile.mjs](./src/realizability-deformation-profile.mjs)
define a declaration-level checker for this boundary.

The probe checks declarations for:

- the meta-realizability stack morphism and increment-sequence fibers;
- realizability axes and countable-support discipline;
- predicate-generator coupling of firing patterns;
- deformation tangent dimension and non-semicontinuity;
- CHL stabilization tangent comparison;
- implementation downgrades.

It does not compute cohomology, decide realizability, calculate Ext groups,
derive a live tangent space, or prove CHL stabilization for a live swarm.
