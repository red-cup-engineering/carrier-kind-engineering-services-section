# Regime Substitution Ladder

Status: source-backed declaration surface. This file records the regime-sensitive
placement of named substitution families for SPOTCOMP, and separates that
placement from the lab benchmark convention that lifts substitutions over
`E = omega_1`. Lab theorem claims are treated as proven for SPOTCOMP derivation
even where archive metadata has not been cleaned up.

## 1. Two Axes, Not One

SPOTCOMP must track two independent axes for substitution-shaped closure rules.

The first axis is the benchmark lift axis. Several lab benchmark examples set
`E = omega_1` and `lambda = omega_1 + 1`. Under that base, primitive step-n
substitution rules can be classified as aperiodic benchmark runs because the
closure ordinal reaches the uncountable-cofinality regime. This explains why
the Fibonacci, Padovan, and Tetranacci benchmark files all report aperiodic
regime.

The second axis is the SPOTCOMP staged placement axis. This is the placement
that controls how named substitutions appear in the articulating-to-settling
ladder:

- Padovan belongs to the finite/strict placement and is used at the settling
  boundary.
- Fibonacci belongs to the Scott-continuous placement and is used at the
  positing boundary.
- Tribonacci belongs to the transfinite placement and is used at the
  predicating boundary.
- Later named families require an explicit placement declaration before they
  can be used as SPOTCOMP regime evidence.

SPOTCOMP consequence: a benchmark result can show that a family has an
`omega_1` aperiodic lift, but that result does not overwrite the family
placement in the staged predication ladder.

## 2. Step Depth Is A Moduli Coordinate

The step-n substitution rule object defines closure rules whose antecedents
depend on the prior `n` settled stages and whose matrices are `n x n`
substitution matrices. The step-n moduli substack stratifies the meta-aperiodic
stratum by step depth:

- `M^(2)` contains Fibonacci, Thue-Morse, and other two-letter substitutions;
- `M^(3)` contains Padovan, Tribonacci, and other three-letter substitutions;
- `M^(4)` contains Tetranacci and related four-letter substitutions.

This is a moduli coordinate, not a complete SPOTCOMP regime decision. The same
step depth can contain different substitution matrices with different structural
behavior. The same named family can also be seen through different bases, such
as a finite/strict placement or an `omega_1` benchmark lift.

SPOTCOMP consequence: a conformance profile must declare the substitution name,
step depth, substitution matrix or rule shape, base/cofinality, stage placement,
and whether it is using a benchmark lift. Step depth alone is never enough.

## 3. Named Placement Ladder

The current SPOTCOMP staged ladder is:

| Name | Step Depth | SPOTCOMP Placement | Stage Category |
| --- | ---: | --- | --- |
| Padovan | 3 | finite/strict | settling / finite predication category |
| Fibonacci | 2 | Scott-continuous | positing / Scott-continuous predication category |
| Tribonacci | 3 | transfinite | predicating / transfinite predication category |

This ladder is intentionally not sorted by step depth. Step depth describes
substitution arity and moduli position. Stage placement describes how the
family is used in the predication-category derivation. Implementations that
sort substitutions as "larger n means later regime" will misclassify Padovan
and Tribonacci.

SPOTCOMP consequence: any profile claiming strong conformance must carry a
`namedPlacement` declaration for these families, and must fail closed when an
unknown or later family appears without a placement theorem reference.

## 4. Benchmark Lifts

The benchmark suite records a specific computation protocol. The Fibonacci and
Padovan benchmark files both specify `E = omega_1`, `lambda = omega_1 + 1`, and
an aperiodic regime classification. The benchmark suite summary also says the
suite has no Scott-continuous case.

Those statements are not contradictions once the axes are separated:

- benchmark regime says what happens to the selected computation protocol over
  its selected base;
- staged placement says where the named family belongs in the SPOTCOMP
  articulating/predicating/positing/settling ladder;
- meta-moduli membership says which step-n substack contains the rule up to
  closure-equivalence.

SPOTCOMP consequence: an `omega_1` benchmark lift must declare its base,
cofinality, `lambda` bound, and lift status. It must not be used as evidence
that the named family defaults to aperiodic placement.

## 5. Bilattice Cardinality And Structural Alignment

The step-n / bilattice theorem proves the cardinality coincidence at `n = 2`,
`n = 3`, and `n = 4`:

- `n = 2` matches the two bilattice orders;
- `n = 3` matches the three non-bottom bilattice values;
- `n = 4` matches the full four-element bilattice carrier;
- `n >= 5` has no corresponding FOUR substructure by cardinality.

Cardinality coincidence is not enough for a structural alignment claim. A
profile must also declare the alphabet-to-value map and the operation-level
commutation evidence. Thue-Morse supplies a positive `n = 2` case for bilattice
negation commutation, while Fibonacci does not commute with the same swap.

SPOTCOMP consequence: alphabet size and FOUR cardinality are audit evidence,
not a substitute for substitution-rule dynamics. They cannot decide staged
placement or strong MLD on their own.

## 6. Implementation Boundary

The implementation probe may check declaration shape for this layer. It must
not:

- infer regime from a substitution name alone;
- infer regime from alphabet size or step depth alone;
- treat benchmark-suite aperiodicity as the family default;
- use Padovan, Fibonacci, and Tribonacci as interchangeable aperiodic examples;
- accept later named families without explicit placement evidence.

Unknown placement, unknown base/cofinality, unknown benchmark-lift status, or
unknown operation-level structural alignment blocks strong swarm conformance.

## 7. Declaration Probe

The files [schema/regime-substitution-ladder-profile.schema.json](./schema/regime-substitution-ladder-profile.schema.json),
[examples/regime-substitution-ladder-profile.json](./examples/regime-substitution-ladder-profile.json),
and [src/regime-substitution-ladder-profile.mjs](./src/regime-substitution-ladder-profile.mjs)
define a declaration-level checker for this boundary.

The probe checks declarations for:

- Padovan finite/strict placement;
- Fibonacci Scott-continuous placement;
- Tribonacci transfinite placement;
- separation between staged placement and `omega_1` benchmark lift;
- step-n moduli and bilattice cardinality boundaries;
- implementation downgrades when placement is unknown.

It does not compute substitution cohomology, classify a live rule system,
construct the meta-moduli stack, or prove a live swarm's strong MLD class.
