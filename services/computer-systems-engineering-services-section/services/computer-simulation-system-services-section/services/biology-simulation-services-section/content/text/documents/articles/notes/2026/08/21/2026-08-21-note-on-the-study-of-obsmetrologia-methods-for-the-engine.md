---
title: "Study of Obsmetrologia Methods for the Engine"
description: "A direct read of the obsmetrological Lean corpus hunting methods for the open questions S1-S6 left, finding far more than the earlier audit reported: the ReactionNetworks module has seven files not two, including a proved reaction-regime H-theorem with termination bounds; FreeEnergyLyapunov proves convergence-in-bounded-steps with the closure ordinal as the rate and H1=0 as uniqueness; joinList_congr proves the claim layer's merge is order- and multiplicity-independent, discharging the claim-side half of both the replay concern and the splitting-order question and narrowing V7 to chemistry; quiescence is proved equivalent to being a closure fixed point; markov_stationary_is_closure_fixpoint identifies stationary distributions with settling fixed points over an abstract stochastic semiring, unifying the engine's two layers as one settling at two value carriers; PoissonSettling derives V2's closed-form target as machine-checked mathematics; the truth-knowledge long exact sequence gives the interior LLD's truth-order ruling real content by refining the disagreement observable into truth and inconsistency sectors; and MolecularChaosGluing formalizes the well-mixed assumption itself as a vanishing correlation obstruction, giving the engine a measurable check on its own founding premise."
date-created: 2026-08-21
type: notes
name: 2026-08-21-note-on-the-study-of-obsmetrologia-methods-for-the-engine
authors:
  - claude-fable-5
status: draft-for-owner-review
keywords: ["natural-computer-simulation-engine", "obsmetrologia", "lyapunov", "convergence", "calm", "confluence", "truth-order", "long-exact-sequence", "poisson", "molecular-chaos", "quiescence"]
tags: ["draft", "study"]
---


S1–S6 checked the drafts against the external literatures and left a
set of open questions. This study reads the obsmetrological Lean
corpus directly — the full module listing and the source of the
files named below, read this session — hunting house methods for
those questions. The finding overturns part of the earlier
mathematics audit: that audit read `MassActionRate` and
`DetailedBalance` and reported "no convergence theorem exists"; the
`ReactionNetworks` module in fact has **seven** files
(`Network`, `Reachability`, `MassActionRate`, `DetailedBalance`,
`FreeEnergyDescent`, `Entropy`, `SupportProjection`), and the
corpus's `Dynamics/Flow` and `Cohomology` trees carry convergence,
confluence, and order-independence theorems that bear directly on
what S1, S2, and S4 flagged. Everything below cites the file read;
nothing is from a note about a note.

## 1. Convergence exists in the corpus, in the regimes it honestly
covers

`Dynamics/Flow/FreeEnergyLyapunov.lean` proves the H-theorem of
settling: the free-energy deficit to the fixed point (built from
knowledge-order heights, Nat-valued) is a Lyapunov function that
strictly decreases at each firing, the orbit **converges in bounded
steps** (`converges_in_bounded_steps`), the firing-step count κ is
the ordinal invariant with `κ ≤ Φ 0`, the convergence rate is read
off the initial free energy, and `H¹ = 0 ⟺ unique equilibrium` ties
uniqueness to the flat regimes. `ReactionNetworks/FreeEnergyDescent.
lean` is the same phenomenon in the reaction regime: for a
**catabolic** network (every reaction strictly decreases total
count), total particle count is the Lyapunov potential, every firing
sequence is bounded by the initial total, and empty soup is terminal
(`step_strict_decrease`, `catabolic_descent`,
`catabolic_steps_bounded`).

What this changes: the audit's gap was real only for the *driven
rate dynamics* — the Euler flow of `MassActionRate` — and that is
exactly the regime where S0's quasi-stationarity finding says a
convergence theorem *should not* exist, because the driven living
state is not a fixed point. The corpus proves convergence where
convergence is true (undriven settling; catabolic chemistry) and is
silent where the physics says metastability rules. The engine's
claim layer settles under proved convergence with a proved bound;
the chemistry layer's long-run behavior is survival analysis. That
division of labor is now backed on both sides.

## 2. The claim layer's order-independence is a theorem, not a test
wish

`Cohomology/CRDTCohomologicalCALM.lean` pins the equivalence chain
**`H¹ = 0 ⟺ order-independent merge ⟺ confluence ⟺ unique settled
fixed point`**, each link a reuse of a proved theorem:
`h1_vanishes` (every agreeing family glues), **`joinList_congr`**
(the knowledge-join of a list of deltas depends only on the *set* of
deltas — not their order, not their multiplicity), and
`confluent_joinK` (any two settling paths join at the lub, which
always exists). The corpus's own gloss is the CALM theorem and CRDT
convergence.

Three open items discharge or narrow at once. S1's replay revision
worried about fold order in the merge: for the claim layer this is
`joinList_congr`, proved — the conformance test transcribes a
theorem rather than hoping. S2's V7 (splitting-order sensitivity)
splits cleanly: the claim-side of the frame interleaving is
order-independent by this chain, so **V7's scope narrows to the
chemistry side** — frame width and operator-splitting error in the
kinetics, which is where PhysiBoSS's documented failure lives
anyway. And S4's multiplicity question (evidence lists growing
without bound): `joinList_congr`'s multiplicity-independence is the
formal license for deduplication — pruning duplicate evidence
provably cannot change any settled value.

## 3. Quiescence detection is Eilenberg–Moore, proved

`Closure/SettlingMonotonicityQuiescence.lean`:
`settling_quiescent_is_algebra` — a valuation is quiescent iff it is
a fixed point of the closure (`cl v = v`), the orbit is ≤ₖ-monotone,
and the settled valuation is the least fixed point above the seed.
The engine's per-tick quiescence check is therefore not a heuristic
("nothing changed this tick") but the algebra condition itself, and
the module's cosettling structure (the preimage set of a settled
state is a join-subsemilattice with the state as top) is a proved
diagnostic frame for "what could have settled here."

## 4. The two layers are one settling at two value carriers

`Calculus/Probability/Stochastic.lean` generalizes settling over an
abstract value category and proves
**`markov_stationary_is_closure_fixpoint`**: a distribution is
stationary for a Markov kernel iff it is a fixed point of the
stochastic closure over the stochastic semiring — probability *is*
settling at the value carrier `([0,1], ·, +)`. The engine's shell
draft split state into a claim layer (FOUR-valued settling) and a
chemistry layer (Markov kinetics) as an engineering decision; this
theorem says the split is two instances of one construction — the
same closure machinery at two values of V. The HLD should state
this: it is the difference between "two subsystems glued by a
bindings table" and "one settling functor instantiated twice, with
the bindings table as the map between value carriers." The
architecture stops being ad hoc at exactly the point the theory
already unified it.

## 5. V2's target is machine-checked house mathematics

`Calculus/Probability/PoissonSettling.lean` derives the Poisson
shape as the stationary distribution of the birth–death chain via
the cleared detailed-balance identity
(`poisson_detailed_balance`) — exp-free, division-free, routed
through `markov_stationary_is_closure_fixpoint`. Validation target
V2 (birth–death → Poisson stationary) therefore asserts against a
closed form the house has already proved, and the corpus's
`conformance/ConformanceVectors.lean` shows a conformance-vector
mechanism already exists for exactly this transcription discipline.
The test plan should route V2 through it.

## 6. The truth-order ruling gets real content

S4 found the substrate's truth order present and unused.
`Language/Positing/TruthOrder.lean`, `OrderSwapDuality.lean`, and
above all `Cohomology/BigradedTruthKnowledgeLES.lean` supply what
the interior LLD's use-or-defer ruling should actually say: the
corpus proves a six-term long exact sequence
`0 → H⁰_t → H⁰_k → H⁰_⊤ → H¹_t → H¹_k → H¹_⊤ → 0` relating
truth-graded, knowledge-graded, and inconsistency-sector cohomology,
with the connecting homomorphism ("the quench") carrying content
exactly when the grading is dynamic across a settling stage. The
concrete engine consequence: the disagreement observable should not
be one number. The h1rank the drafts already compute refines into a
**truth sector and an inconsistency (⊤) sector**, and the LES is the
proved statement of how they exchange. Stage 1 can defer active
truth-order *operations* while still adopting the sectored
observable — which is a middle answer S4's binary question didn't
have available.

## 7. The well-mixed premise becomes measurable

`KineticTheory/Gas/MolecularChaosGluing.lean` formalizes Boltzmann's
Stosszahlansatz as separated gluing: a two-particle joint
factorizes iff every 2×2 connected-correlation minor vanishes, and
the obstruction direction is proved (chaos forces the minors to
zero; a maximally correlated joint provably fails factorization).
The engine's entire Stage-1 chemistry rests on the well-mixed
assumption; this gives it a *checkable form* — estimate joint
occupation statistics from trajectory samples and the nonvanishing
minors measure departure from the premise. Not a Stage-1 test
target, but the named diagnostic for Stage 2, where nested
compartments are precisely a controlled breaking of well-mixedness.

## 8. Entropy carriers, and what stays external

`ReactionNetworks/Entropy.lean` lifts the corpus's Boltzmann
H-theorem to reaction firing (occupation-multiset entropy
non-decreasing along relaxing trajectories, with a concrete
isomerization realizing it), over `Thermodynamics/BoltzmannEntropy`;
`Cohomology/LandauerEntropy` and `AntiLandauerEntropy` exist beside
them. These are the *undriven* entropy statements — complementary
to, not substitutes for, the Schnakenberg cycle σ that S5 verified
as the driven-regime observable. The finite-sampling bias policy for
the σ estimator remains external work exactly as S5 ruled;
`CausalSets/Continuum/Sprinkling.lean` (Poisson sprinkling
expectations, linearity through layer sums, moment responses) is the
nearest house machinery to inhomogeneous event statistics and is
noted for S1's time-dependent-propensity treatment rather than
claimed to solve it.

## 9. Verdict changes and filings

To the ADR docket: the frame ADR's V7 obligation is **rescoped to
chemistry-side splitting error**, claim-side order-independence
cited to `joinList_congr` and transcribed as a conformance property.
The replay ADR keeps its chemistry-side PRNG obligations; the
claim-side fold-order concern is closed. The interior-semantics ADR
adopts the **sectored disagreement observable** (truth / ⊤ split per
the LES) as the form of its truth-order ruling, active truth-order
operations still deferred. The two-layer ADR gains the
one-settling-two-carriers statement as its rationale. V2 routes
through the house conformance-vector mechanism. New filing against
the mathematics section, alongside the existing admission-guard and
truth-order-lifting items: none — this study's traffic runs the
other way, five proved theorems the engine was about to not use.

And one correction filed against this program's own record: the
2026-08-21 mathematics audit's statement "no convergence theorem
exists" is amended to "no convergence theorem for the driven Euler
rate flow — convergence is proved for undriven settling
(`FreeEnergyLyapunov`) and catabolic reaction networks
(`FreeEnergyDescent`), and its absence for the driven regime is
physically correct per quasi-stationarity."
