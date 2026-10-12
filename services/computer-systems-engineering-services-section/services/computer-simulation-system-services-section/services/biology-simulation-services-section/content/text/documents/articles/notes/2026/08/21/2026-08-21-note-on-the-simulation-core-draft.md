---
title: "Simulation Core Draft for the Natural Computer Simulation Engine"
description: "A first draft of the engine's simulation core — integer copy-number state with volume, the Gillespie direct method as native stepper with a deterministic-ODE conformance backend, thermodynamically honest gradient coupling through equilibrium constants with Wegscheider consistency checked at scenario load, entropy production rate as an observable, report frames as the discrete/continuous boundary, binomial partitioning at division, moiety-conservation assertions, and a physics validation suite with closed-form targets — written before the formal planning program and therefore a draft input to the HLD and LLD and to the studies of the science, several of which exist to check this draft's method choices against the literature."
date-created: 2026-08-21
type: notes
name: 2026-08-21-note-on-the-simulation-core-draft
authors:
  - claude-fable-5
status: draft-for-owner-review
keywords: ["natural-computer-simulation-engine", "gillespie", "ssa", "chemical-master-equation", "wegscheider", "entropy-production", "binomial-partitioning", "validation"]
tags: ["draft"]
---


This is the domain engineering the software shell wraps: the state
space, the dynamics, the thermodynamics of the gradient coupling,
growth and division mechanics, event handling, and the numerical
validation suite. It predates the formal planning program and is a
draft input to it — the studies of the science exist in part to check
this draft's method choices against the literature before the HLD
freezes any of them.

## 1. State space

A Stage-1 cell is a well-mixed reactor:

- `n : integer copy numbers`, one per species. Integers, not
  concentrations. Single cells run many species at copy numbers of
  1–10³, where continuous concentration is a fiction and fluctuations
  are first-order phenomena (persister-type bimodality, stochastic
  fate switching — the biology this program exists to reach — cannot
  occur in a deterministic concentration model at all).
- `V : cell volume` (float, liters or an abstract unit, declared in
  the scenario). Concentrations are derived (`n_i / (N_A · V)`), never
  stored.
- `Δp : proton-motive force`, exogenous, from the scenario schedule.
  Stage 1 keeps it scalar; the data shape reserves
  `{chemical, electrical}` components for when membrane potential and
  ΔpH need to diverge (they have different transporter couplings).
- `t : continuous simulation time` (float). Time is not the tick
  counter — see §4.

## 2. Dynamics: stochastic kinetics as the native stepper

The ground truth for a well-mixed small-volume reactor is the chemical
master equation; the engine's native stepper is the **Gillespie direct
method (SSA)**, which samples exact trajectories of it:

- propensity `a_j(n, V)` per reaction: mass action over integer
  counts, with the combinatorial factors done right
  (`a = k · n_A · n_B / V` for A+B→…, `a = k · n_A(n_A−1) / 2V` for
  A+A→…) — bimolecular propensities scale `1/V`, which is what makes
  growth dilute the cell without any explicit dilution term (§5).
- next event: time advance `Δt ~ Exp(Σa_j)`, reaction choice
  proportional to `a_j`, both drawn from the seeded PRNG. Determinism
  and replay come for free; there is no step-size control, no
  stiffness problem, no negative-count pathology — integer state
  cannot go below zero because a propensity with a missing reactant
  is zero by construction.

Why SSA and not an ODE integrator as the core: exactness at low copy
number (the regime a single cell actually occupies), integer state
(kills the entire negative-concentration/NaN bug class that dominates
ODE reactor codes), natural event granularity (every reaction firing
is a discrete event, so coupling to the discrete claim layer has no
impedance mismatch), and trivial bitwise replay. The cost is wall time
proportional to event count, which at Stage-1 scale (tens of species,
propensity sums of order 10³/s of simulated time) is nothing. When a
scenario outgrows it, the upgrade path is tau-leaping, then hybrid
SSA/ODE partitioning by species abundance — both standard, neither
needed now, and the integrator sits behind one interface
(`advance(state, tEnd, rng) -> state`) precisely so that swap stays
mechanical.

**The ODE backend still exists**, for two reasons that are about
correctness rather than performance: (a) the Lean-proved statements
(`MassActionRate`, `DetailedBalance`) are about the deterministic
rate field, so the conformance property tests run against the ODE
backend, which is their honest target; (b) the large-N law: SSA
ensemble means must converge on the ODE trajectory as copy numbers
scale up (√N fluctuation shrinkage). Running the same scenario
through both backends and checking convergence is a cross-validation
no amount of unit testing substitutes for — it catches propensity
combinatorics errors, which are the classic silent bug of reactor
simulators (§7, V4).

## 3. Thermodynamic honesty: how the gradient actually couples

This is the most important design decision in the core, and the
naive version is wrong. The naive version — multiply some rates by a
gradient factor — silently breaks detailed balance at Δp = 0 and
makes "the gradient drives the cycle" true by arbitrary fiat,
which would hollow out the design's own gradient falsifier.

The honest version: every reversible reaction pair carries a standard
free-energy difference, and rate constants must satisfy
`k+/k− = exp(−ΔG°/RT)`. A gradient-coupled reaction (R3, the synthase
analogue) has `ΔG = ΔG° − m·F·Δp` for `m` protons translocated: the
gradient enters through the *equilibrium constant*, shifting the
forward/backward ratio, not through an ad-hoc multiplier on one rate.
Consequences, all load-bearing:

- At `Δp = 0` the full network satisfies detailed balance and every
  cycle's net flux relaxes to zero — the "dead cell reaches
  equilibrium" behavior is now physics, not programming.
- At `Δp > 0` the R2/R3 cycle is genuinely driven, and the amount of
  driving is a declared, dimensioned quantity, not a tuning knob.
- **Wegscheider consistency is checked at scenario load**: around
  every independent cycle of the reaction graph, the product of
  `k+/k−` must equal `exp(−ΣΔG°/RT)` for the declared ΔG°s (with the
  Δp term excluded — that is exactly what makes the driven cycle
  driven). A scenario that declares thermodynamically impossible
  rate constants is rejected before tick 0 with the offending cycle
  named. This one validation is the difference between a serious
  reactor engine and a toy, and it costs a null-space computation at
  load time.
- **Entropy production rate becomes an observable**:
  `σ = Σ_j (J+_j − J−_j) · ln(J+_j / J−_j) ≥ 0`, computed per report
  frame from cumulative firing counts, zero exactly at detailed
  balance. This is the number that makes "the cell is a dissipative
  structure" a measured quantity on a plot instead of a doctrine: a
  live cell holds σ > 0 at steady state; a dying one's σ decays; a
  dead one's σ is zero. The theory registers can keep their reading;
  the engine ships the measurement.

## 4. Time, frames, and events

SSA time is continuous and event-driven; the trace and the discrete
machinery run on **report frames** of fixed `Δt_report`:

```
frame(k):
  1. process scheduled marks + membrane admissions (claim layer)
  2. apply claim→chemistry bindings (parameter changes take effect
     at frame boundaries only — declared, coarse, auditable)
  3. integrator.advance(state, t + Δt_report, rng)   // many firings
  4. compute observables: species counts, V, per-reaction cumulative
     firing counts (→ fluxes), σ, W_pool
  5. publish chemistry→claim machine-authored claims
  6. lifecycle checks: division (adder on accumulated growth),
     death (see below); events recorded, never thrown
  7. journal the frame record + state hash
```

Frame boundaries are where the discrete world (claims, membrane,
lifecycle) meets the continuous world (kinetics). Nothing discrete
happens mid-frame; anything that must react faster than `Δt_report`
belongs in the reaction network itself, as chemistry. This rule keeps
the coupling auditable and the replay exact, and it is the concrete
answer to "how do a settling claim layer and a kinetics layer share
one timeline."

Death detection per mode, as trace-computable predicates: bioenergetic
= σ below threshold for W consecutive frames while Δp is cut;
boundary = membrane fault flag (fault-injection scenarios only, until
membrane integrity becomes dynamical); programmed = PCD stage machine
advancing on frame count after an admitted death signal; ossification
= the claim layer's cover-nerve rank crossing its threshold. Each
writes its own record shape; there is no shared `dead` boolean.

## 5. Growth, division, and partitioning

Growth: designated synthesis reactions produce biomass species;
`V = V₀ · (1 + biomass/β)` — volume is a function of accumulated
biomass, so growth is paid for in gradient-driven chemistry, and
because bimolecular propensities carry `1/V`, growth dilutes every
concentration automatically. There is no separate dilution mechanism
to keep consistent.

Division: adder rule on added biomass since birth (the empirically
supported bacterial size-control model). At division:

- every species count is partitioned **binomially** (each molecule
  independently assigned to a daughter with p = volume fraction,
  drawn from the run PRNG) — this is how real cells partition
  their contents, and it means daughter asymmetry is an emergent,
  measurable output (the divergence statistics the division-fidelity
  gate reads) rather than a modeling choice;
- V splits by the same fraction (0.5 default, scenario-settable for
  asymmetric division later);
- the claim layer splits per the site-splitting rule: settled
  valuation copied to both daughters, in-flight (unsettled) marks
  dropped — the commit-vs-working-buffer read discipline.

Stage 1 continues simulating **one** daughter (chosen by PRNG) and
records the other's initial state in the trace; population simulation
is a Stage-3+ concern and keeping one lineage keeps Stage 1's memory
and trace flat.

## 6. Conservation checking

At scenario load, compute the left null space of the stoichiometry
matrix: each null vector is a conserved moiety (e.g. `I1 + I2`,
`L + H` in the baseline network). Under SSA these totals are
conserved *exactly* (integer arithmetic), so the engine asserts them
every frame at zero tolerance — any violation is an
`EngineInvariantError`, and in practice this assertion catches
stoichiometry typos in scenarios and propensity bugs in the engine,
the two most common reactor-simulator defects. Under the ODE backend
the same check runs at float tolerance. Membrane transport reactions
deliberately break specific moieties (they move matter across the
boundary); the load-time check computes moieties from the *closed*
subnetwork and tracks boundary fluxes separately, so "what crossed
the membrane" is exactly the discrepancy — one number, audited.

## 7. Validation suite (physics, not vibes)

Committed scenarios with analytically known answers; CI asserts
against closed forms, not against previous runs:

- **V1, reversible isomerization** `A ⇌ B`, closed: stationary
  distribution is binomial with `p = K/(1+K)`; assert mean and
  variance within sampling tolerance. Validates propensities,
  sampling, and the Δp = 0 detailed-balance limit in one scenario.
- **V2, birth–death** `∅ → X → ∅`: stationary distribution Poisson
  with mean `k/γ`; the sharpest test of the event loop and PRNG
  stream discipline.
- **V3, driven cycle** (the baseline network, Δp > 0): nonzero
  steady-state cycle flux; σ > 0 and stationary; then Δp → 0 and
  flux and σ decay to zero — the gradient falsifier as a physics
  regression test with a known target, not an A/B vibe check.
- **V4, large-N convergence**: baseline scenario at 10×, 100×, 1000×
  copy numbers; SSA ensemble mean vs ODE trajectory error shrinking
  as `1/√N`. Catches combinatoric factor errors that V1–V3 can miss.
- **V5, partition statistics**: many divisions of a fixed parent;
  daughter counts binomial per species; divergence statistics match
  the closed form. Validates the division machinery before any
  fidelity gate consumes its output.

## 8. What this supersedes

The [software shell draft](2026-08-21-note-on-the-software-shell-draft.md)'s §4 fixed-`dt` Euler tick is superseded by §4's
frame loop here; its `chemistry.mjs` interface becomes
`createNetwork` + `integrators: {ssa, ode}` behind one `advance`
signature; its M1 acceptance criteria are replaced by V1–V4 above
(and M3 gains V5). The Lean conformance property tests bind to the
ODE backend explicitly. Everything else there stands.
