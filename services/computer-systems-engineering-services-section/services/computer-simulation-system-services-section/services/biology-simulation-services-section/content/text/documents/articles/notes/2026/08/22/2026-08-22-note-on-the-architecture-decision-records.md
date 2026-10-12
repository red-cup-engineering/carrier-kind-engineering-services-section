---
title: "Architecture Decision Records of the Natural Computer Simulation Engine"
description: "The acceptance pass over the planning program's decision docket, run under the owner's standing direction that acceptance is evidence-gated rather than owner-gated: eleven decisions, each recorded with its context, the decision taken, the study evidence bearing on it, its accepted status, and the obligations it carries into the high-level and low-level designs — ten accepted with obligations and one (the report-frame boundary) accepted conditionally on validation target V7 landing green — plus the standing rule that any ADR reopens automatically if an obligation's check fails."
date-created: 2026-08-22
type: notes
name: 2026-08-22-note-on-the-architecture-decision-records
authors:
  - claude-fable-5
status: current
keywords: ["natural-computer-simulation-engine", "adr", "architecture-decision-records", "acceptance", "evidence-gated"]
tags: ["adr"]
---


The acceptance pass over the planning program §2.3's docket,
2026-08-22. Per the owner's standing direction, acceptance is
evidence-gated: a decision is accepted when every study verdict
bearing on it is folded and no blocking OPEN remains; the owner
vetoes at will but is not a checkpoint. Each record carries its
obligations — the specific checks and design duties the accepting
evidence demanded — and the standing rule is that **an ADR reopens
automatically if any of its obligations' checks fails**. Sources:
the S1–S8 study notes and S0, all in this section's notes tree,
dated 2026-08-21.

## ADR-1 — Stochastic simulation as the native stepper, with a
deterministic conformance backend. **Accepted.**

One integrator interface, two backends: the Gillespie direct method
as the engine's native dynamics, a deterministic mass-action ODE
backend for Lean-conformance property tests and large-N
cross-validation. Evidence: S1 confirmed the direct method matches
or beats next-reaction variants at stage-1 scale and confirmed
large-N cross-validation as standard practice; S0/S5 ground the
stochastic level as the physically primary one. Obligations: the
upgrade path (tau-leaping, then hybrid partitioning; Anderson 2007
for sub-frame time dependence) stays documented in the chemistry
LLD; the conformance tests bind to the ODE backend and state
machine-checked-versus-tested status per the house
conformance-vector discipline.

## ADR-2 — Two-layer state: chemistry counts and claim charges,
coupled only through a declared bindings table. **Accepted.**

Evidence: S2 confirmed it as the universal model/solver separation
of every mature system surveyed; S4 confirmed the claim layer as a
genuine relating-fiber join store and the bindings table as sole
coupling. Rationale upgraded by S7: the two layers are one settling
construction at two value carriers (`markov_stationary_is_closure_
fixpoint`), the bindings table the map between carriers — the HLD
states the split in those terms. Obligations: an order-sensitivity
check on binding application (S2); no module other than the
interior wrapper imports `relating`.

## ADR-3 — Thermodynamic coupling through equilibrium constants,
with Wegscheider consistency checked at scenario load. **Accepted.**

The gradient enters through equilibrium constants (`ΔG = ΔG° −
m·F·Δp`), never as an ad-hoc rate multiplier; cycle affinities and
the Schnakenberg decomposition are first-class load-time and
run-time objects. Evidence: S5 verified Schnakenberg via Seifert
2012, confirmed the null-space cycle check as the field's standard,
and confirmed the coupling form. Obligations: the σ observable's
LLD states a finite-sampling bias-correction policy (S5: plug-in
estimators bias upward); the Kolmogorov↔Wegscheider equivalence
citation remains an OPEN scholarly item that does not block but
stays on S5's ledger.

## ADR-4 — Report frames as the discrete/continuous boundary.
**Accepted conditionally: V7 must land green before the frame
design is load-bearing in any published run.**

Fixed-width frames where claims, bindings, lifecycle, and journal
meet the continuous kinetics. Evidence: S1 confirmed frame-frozen
propensities as exact for the declared piecewise-constant model
*only with* an explicit checked width bound (60–90% error measured
without one); S2 found the shape identical to Karr/PhysiBoSS
splitting with PhysiBoSS's quantified failure; S7 narrowed the
sensitivity scope — claim-side interleaving is order-independent by
`joinList_congr`, so V7 (frame-size convergence,
splitting-order sensitivity) is a chemistry-side obligation.
Obligations: the width bound as a load-time check; V7 in the test
plan; Anderson's method named as the sub-frame upgrade.

## ADR-5 — Integer copy numbers with derived concentrations,
scoped by species class. **Accepted as rescoped.**

Evidence: S6 confirmed the low-copy premise for regulatory species
(1–10², Taniguchi 2010) and refuted it for metabolites (10⁵–10⁷,
Bennett 2009). The decision carries its scope boundary: integer
counts are the representation for all species at stage 1 (where
totals stay small by construction), and the species-class boundary
is what triggers the hybrid upgrade path, not wall-clock pain.
Obligation: scenario schemas carry species-class annotations from
the start.

## ADR-6 — Adder division trigger with binomial partitioning.
**Accepted.**

Evidence: S6 verified the adder literature (Amir 2014,
Taheri-Araghi 2015, Campos 2014) and binomial partitioning as the
null model (Huh & Paulsson 2011). Obligations: V5 partition
statistics in the test plan; the division fidelity gate is the
naturality square (settle∘split = split∘settle on settled state)
with `no_periodic_orbits` as the settledness certificate (S0 §5,
house-proved); non-bacterial size-control exceptions logged for
later stages.

## ADR-7 — The membrane as an ordered mosaic of named admission
predicates with a site-presence floor. **Accepted, with the
corrected distinctiveness justification.**

Evidence: S3 confirmed the contract shape (order cheapest-first,
digest-check last) and corrected the justification — bounded
source-counting is absorbed by Kappa's counters; the genuine escape
is open-domain digest-identity deduplication and multi-tick closure
conditions, so the provenance gate is a stage-1 requirement on the
corrected ground. The probe result stands: the substrate guards
nothing; admission is wholly this service's job. Obligations:
KaSim-style sub-pattern indexing and incremental applicability
updates evaluated in the membrane LLD; the proofreading cost
prediction (S0 §2: discrimination beyond the equilibrium floor
scales with membrane dissipation) instrumented as an engine-honesty
check; receptor-style transduction reserved as a distinct predicate
shape for stage 3.

## ADR-8 — Deterministic seeded replay as an architectural
invariant. **Accepted as revised.**

Evidence: S1 revised — the trace header pins the SSA algorithm
identity and the per-frame PRNG draw order is a versioned invariant;
S7 closed the claim-side fold-order concern by theorem
(`joinList_congr`, transcribed as a conformance property); S2 found
per-frame state hashing has no surveyed precedent and kept it as a
deliberate novelty. Obligations: exactly those three.

## ADR-9 — The four-mode death taxonomy: bioenergetic, boundary,
programmed, ossification. **Accepted, with quasi-stationarity as
the reporting frame.**

Evidence: S6 confirmed the taxonomy including the NCCD-grounded
orthogonality of the programmed/boundary axes; S0/S5 established
the living state as quasi-stationary, so a run's headline statistic
is survival behavior and absorption hazard, not steady-state
attainment. Obligations: independently inspectable post-mortem
evidence per mode, never one flag; the two mandatory
non-aliasing runs (PCD with live flux; bioenergetic death with PCD
never invoked); hazard estimation in the observables LLD.

## ADR-10 — Interior claim-layer semantics: knowledge-join
settling, sectored disagreement observable, truth-order operations
deferred. **Accepted.**

Evidence: S4 found the substrate's truth order present, unused, and
not lawfully lifted; S7 supplied the ruling's content — the
truth–knowledge long exact sequence refines the disagreement
observable into truth and inconsistency sectors, adoptable without
activating truth-order operations. Join-only settling without
retraction is confirmed for stage 1, OPEN beyond it with
differential-dataflow multiplicity encoding as the named mechanism.
Obligations: the sectored observable in the interior LLD; the
evidence growth-budget test with `joinList_congr`'s dedup license
as its pruning argument; the truth-order lifting filed upstream
against the mathematics section.

## ADR-11 — V6, the thermodynamic-uncertainty conformance law,
scoped to constant-gradient windows. **Accepted as corrected.**

Evidence: S5 refuted the per-frame universal form (Koyuk–Seifert
2020: the steady-state TUR fails under time-dependent driving) and
the correction is cut into S0 §6. Obligations: V6 runs only inside
constant-Δp windows; its σ input uses the bias-corrected estimator
of ADR-3's policy; the Koyuk–Seifert generalized bound is the named
upgrade if driven-window checking is ever needed.

## Standing consequences

The HLD is authorized against ADR-1 through ADR-11 as recorded,
oriented (per S8 §7) toward what the beat demonstrations need: the
sectored observable, the obstruction computation, and the
Schnakenberg ledger. ADR-4's condition is the only implementation
brake: frame-dependent results are not publishable until V7 lands.
Reopening is automatic on any failed obligation check, and the
reopening is recorded here, dated, with the failing evidence.
