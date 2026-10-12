---
title: "Study of Stochastic Simulation Methods"
description: "A literature survey of stochastic simulation methods for chemical kinetics — the Gillespie direct/first-reaction/Gibson-Bruck next-reaction family, tau-leaping and its negativity fixes, Haseltine-Rawlings and slow-scale hybrid partitioning, stiffness detection, and the exact treatments for time-dependent propensities (Anderson's integrated-propensity method, Lewis-Shedler thinning, and frame-frozen piecewise-constant sampling) — that confirms the draft's direct-method stepper and ODE conformance backend as literature-appropriate at Stage-1 scale, confirms the report-frame boundary as an exact discrete/continuous coupling point but only under an explicit leap-condition-style bound the draft does not yet state, and revises both the frame-frozen propensity treatment and the deterministic-replay invariant to add that bound and an explicit SSA-algorithm identity/draw-order pin in the trace header."
date-created: 2026-08-21
type: notes
name: 2026-08-21-note-on-the-study-of-stochastic-simulation-methods
authors:
  - claude-sonnet-5
status: draft-for-owner-review
keywords: ["natural-computer-simulation-engine", "ssa", "gillespie", "tau-leaping", "hybrid-simulation", "stiffness", "time-dependent-propensities", "next-reaction-method", "deterministic-replay", "prng"]
tags: ["draft", "study"]
---


This is S1 of the software planning program's six studies of the
science. Scope: the stochastic-simulation-algorithm (SSA) family,
tau-leaping, hybrid discrete/continuous methods, stiffness, and —
the question this study exists to settle — the correct handling of
time-dependent propensities under the engine's report-frame
structure. Method: the simulation core draft and the software shell
draft were read in full (state space, dynamics, frame loop, tick
pipeline, PRNG discipline); roughly twenty targeted web searches were
then run against the primary and review literature, with direct
fetches of abstracts, review text, or full text where publisher
access allowed. Two AIP-hosted primary sources (Anderson 2007's full
text, the Gillespie-Hellander-Petzold 2013 perspective) returned
HTTP 403 from their publisher and were read instead through their
arXiv preprint, PubMed abstract, or secondary review coverage, which
is noted inline wherever it affects citation precision (a missing
volume/page rather than a missing claim). No claim below rests on a
source that could not be independently confirmed by at least a
title/author/year/venue match.

## 1. The SSA family: which variant, and when the choice matters

Gillespie's two founding papers — "A General Method for Numerically
Simulating the Stochastic Time Evolution of Coupled Chemical
Reactions" (Gillespie, 1976, *J. Comput. Phys.* 22(4):403-434) and
"Exact Stochastic Simulation of Coupled Chemical Reactions"
(Gillespie, 1977, *J. Phys. Chem.* 81(25):2340-2361) — give two
statistically equivalent exact procedures for sampling trajectories
of the chemical master equation: the **direct method** (draw a
waiting time from Exp(Σaⱼ), then choose the firing reaction
proportional to aⱼ — two random draws per event) and the **first-
reaction method** (draw a full set of M putative firing times, one
per reaction channel, and take the minimum — M random draws per
event, the same information recovered at greater cost). The first-
reaction method is strictly dominated computationally by the direct
method for identical statistics; it survives in the literature as
the historical companion method, not as a live implementation
choice.

Gibson and Bruck's **next-reaction method** (NRM) ("Efficient Exact
Stochastic Simulation of Chemical Systems with Many Species and Many
Channels," 2000, *J. Phys. Chem. A* 104(9):1876-1889) improves on
first-reaction by keeping one putative firing time per channel in an
indexed priority queue and a dependency graph that identifies which
channels' propensities a given firing actually changes, so only
those are redrawn — an O(log M) update instead of an O(M) rescan.
This is a real asymptotic win, but subsequent careful timing studies
found it usually does not materialize: Cao, Li and Petzold's
"Efficient formulation of the stochastic simulation algorithm for
chemically reacting systems" (2004, *J. Chem. Phys.*, exact
volume/page not independently confirmed — publisher access blocked,
citation drawn from its PubMed record, PMID 15332951) and the review
by Cao ("Discrete Stochastic Simulation Methods for Chemically
Reacting Systems," 2009, *Methods Enzymol.* 454:115-140, read via
PMC3492891) both report that an *optimized* direct method — reaction
channels reordered by descending propensity so the common case is
found early, as in the sorting direct method of McCollum, Peterson,
Cox, Simpson and Samatova ("The sorting direct method for stochastic
simulation of biochemical systems with varying reaction execution
behavior," 2006, *Comput. Biol. Chem.* 30(1):39-49) — matches or beats
NRM except, in Cao (2009)'s own phrasing, "for simple systems where
the reactions are almost totally independent." NRM's bookkeeping
overhead (maintaining the priority queue and dependency graph) is
paid on every step; its asymptotic saving is only realized once the
reaction network is both large (hundreds of channels or more) and
sparsely coupled, which is precisely the regime Stage-1 scenarios are
not in.

**Answer:** for a system of tens of species and tens of reactions,
the (optionally sorted) direct method is the literature-appropriate
choice; the first-reaction method is never preferred; NRM's
advantage starts to matter only once the network is an order of
magnitude or more larger than Stage 1's and weakly coupled. The
draft's choice of "the Gillespie direct method (SSA)" without naming
a more elaborate variant is exactly right at this scale.

## 2. Tau-leaping: when it is needed, and the negativity problem

Tau-leaping (Gillespie, "Approximate accelerated stochastic
simulation of chemically reacting systems," 2001, *J. Chem. Phys.*
115:1716-1733) is needed once per-event SSA cost dominates wall time
relative to the timescale of interest — i.e., once the number of
individual reaction firings that must be resolved to reach a
scientifically interesting horizon becomes large enough that leaping
over many firings per step (each channel fires a Poisson-distributed
number of times over a fixed τ, propensities held fixed within that
τ under the **leap condition** — no propensity may change
"significantly" during the step) pays for itself against the
resulting loss of exactness.

The **negativity problem**: because a Poisson draw is unbounded
above, a leap can fire a reaction channel more times than its
reactant population can support, driving a species count negative —
a pathology with no analogue in exact SSA, where a zero-reactant
propensity is exactly zero by construction. Cao, Gillespie and
Petzold's review of the mechanism ("Avoiding Negative Populations in
Explicit Poisson Tau-Leaping," 2005, *J. Chem. Phys.* 123:054104,
read via its own text and via the Cao 2009 review, PMC3492891)
identify two distinct causes: the unbounded Poisson draw itself, and
multiple reaction channels independently consuming the same
reactant, whose combined effect can exhaust it even when neither
channel alone would. Their fix, and the field's standard mitigation,
is **binomial tau-leaping**: replace the unbounded Poisson firing-
count draw with a binomial draw whose support is bounded by the
available reactant count, so a channel simply cannot fire more times
than it has reactant for. The same paper introduces the closely
related **hybrid SSA/tau-leaping method**: any channel currently
within nc firings of exhausting a reactant (nc typically 2-20) is
classified "critical" and simulated exactly via SSA for that step,
while non-critical channels leap — the method degenerates to plain
SSA as nc grows and to plain tau-leaping as nc → 0, so it strictly
subsumes both. Cao, Gillespie and Petzold's companion paper
("Efficient step size selection for the tau-leaping simulation
method," 2006, *J. Chem. Phys.* 124:044109) formalizes the leap
condition itself as a concrete ε-bounded per-species step-size
selection rule; this formalization recurs below in §4 as the correct
frame for the frame-frozen propensity question.

Stage 1's scale (tens of species and reactions, propensity sums of
order 10³/s) does not need tau-leaping; the draft's own reasoning —
event-count-proportional wall time is "nothing" at this scale, with
tau-leaping named as the first upgrade step — matches the literature
exactly, including naming the correct successor method by name.

## 3. Hybrid discrete/continuous partitioning

Two distinct partitioning axes exist in the literature, both
addressing the same underlying problem (some reactions or species are
too fast/abundant to simulate exactly without wasting most of the
compute budget on events that barely matter to the dynamics of
interest) from different directions:

- **Species-abundance partitioning** (Haseltine and Rawlings,
  "Approximate simulation of coupled fast and slow reactions for
  stochastic chemical kinetics," 2002, *J. Chem. Phys.* 117:6959-
  6969): species above a declared abundance threshold are advanced by
  a continuous (Langevin or ODE) approximation; species below it stay
  on exact SSA; the partition is re-evaluated as counts change during
  the run. This is the classic "best of both worlds" hybrid and the
  ancestor of most subsequent hybrid solvers.
- **Reaction-timescale partitioning**, i.e. slow-scale SSA (Cao,
  Gillespie and Petzold, "The slow-scale stochastic simulation
  algorithm," 2005, *J. Chem. Phys.*, exact volume/page not
  independently confirmed beyond its PubMed record, PMID 15638651):
  fast reactions are assumed to reach a quasi-stationary distribution
  quickly; only the slow reactions' waiting times are explicitly
  simulated, with their propensities corrected by averaging over the
  fast subsystem's quasi-equilibrium. This partitions by reaction
  *timescale* rather than species *count*, and is the direct ancestor
  of the stiffness-detection method discussed in §5.

**Trigger:** both methods respond to the same underlying condition —
a genuine separation of scales (in abundance or in reaction rate)
such that exact tracking of the fast/abundant part costs far more
than its contribution to the dynamics that matter is worth. Neither
is triggered by scale alone (tens of species is not, by itself, a
reason to hybridize); both are triggered by *disparity* within the
network. The draft reports no such disparity in the Stage-1 baseline
network and correctly defers hybrid partitioning as a second-stage
upgrade, after tau-leaping — which is also the order the literature
recommends, since tau-leaping alone resolves pure event-count
pressure while hybrid/slow-scale methods are the tool for genuine
timescale separation (see §5's stiffness discussion for why these are
not interchangeable fixes).

## 4. Time-dependent propensities — the critical question

The draft's gradient schedule makes at least one propensity a
function of simulated time (through Δp and any claim-bound rate
constant), and the study brief is explicit that the naive
Exp(Σaⱼ)-waiting-time draw used by plain SSA is exact only when every
aⱼ is constant between the two events it separates. Three treatments
exist in the literature:

**(a) Integrated-propensity / inversion.** Anderson's modified next
reaction method ("A modified Next Reaction Method for simulating
chemical systems with time dependent propensities and delays," 2007,
*J. Chem. Phys.* 127:214107; full text read via its arXiv preprint,
arXiv:0708.0370, after the AIP-hosted version returned 403)
represents each reaction's firing times as the jump times of an
independent unit-rate Poisson process whose *internal* clock is the
integrated propensity Λⱼ(t) = ∫₀ᵗ aⱼ(s) ds. A reaction fires when its
internal clock crosses the next threshold of its unit-rate Poisson
process; finding the real time t at which that happens means
inverting Λⱼ. This is **exact** for any time-dependent aⱼ, provided
Λⱼ can be computed (closed-form or cheap numerical integration) and
inverted at each step. It is the natural fit when the time-dependence
is a scenario-declared, analytically known function of time — exactly
the shape of a `gradientSchedule`.

**(b) Thinning / rejection.** Lewis and Shedler's general method for
simulating nonhomogeneous Poisson processes ("Simulation of
Nonhomogeneous Poisson Processes by Thinning," 1979, *Naval Res.
Logist. Q.* 26(3):403-413) bounds the rate from above by a constant
(or locally constant) λu over a lookahead window, samples candidate
events from the resulting homogeneous process, and accepts each
candidate with probability aⱼ(t)/λu — rejecting and resampling
otherwise. Applied to chemical kinetics with an exogenous dynamic
driver by Voliotis, Thomas, Grima and Bowsher ("Stochastic Simulation
of Biomolecular Networks in Dynamic Environments," 2016, *PLOS
Comput. Biol.* 12(6):e1004923 — the "Extrande" method), this is also
exact, and the paper reports it as substantially cheaper than
Anderson's integral method in their tested scenarios (140x to
25,000x speedups) specifically because it avoids numerical
integration of the propensity — which matters when the driving
process is *not* analytically integrable (e.g., itself an emergent
simulated trajectory rather than a declared closed-form schedule).

**(c) Frame-frozen / piecewise-constant.** Hold every propensity
fixed at its value from the start of the current report frame and
run ordinary constant-propensity SSA across the whole frame,
updating only at frame boundaries — which is precisely what the
simulation core draft's §4 already specifies ("parameter changes
take effect at frame boundaries only — declared, coarse, auditable").

**Ruling.** Given the engine's frame structure, option (c) is the
right default, but the reasoning matters and the draft states only
half of it. The engine does not need to treat piecewise-constant
propensity as an *approximation* to some other, "truer" continuously
varying process, because the model itself already declares that
claim-bound parameters (including any gradient-derived rate) change
only at frame boundaries. Under that declared rule, propensities
*are* exactly piecewise-constant, with jumps exactly at frame
boundaries — so ordinary constant-propensity SSA within one frame is
not an approximation at all; it is the exact sampler for the model as
specified. Neither Anderson's integrated-propensity machinery nor
Lewis-Shedler thinning is needed for the currently-declared gradient
and bindings mechanism, and adding either would be solving a problem
the frame-boundary rule already dissolved.

**The error commitment, stated precisely.** The frame-frozen
treatment's error is *not* an SSA sampling error — it is zero for the
declared model. The entire error budget lives one level up, in
whether "constant within Δt_report, jumping at frame boundaries" is
itself a good stand-in for whatever continuous physical process
(e.g. a decaying Δp) the scenario author intends. That fidelity gap
is exactly the kind of thing tau-leaping's own leap condition is
built to bound (Gillespie 2001; formalized quantitatively by Cao,
Gillespie and Petzold 2006): choose Δt_report small enough that no
reaction's propensity, evaluated at the continuous schedule's true
value, would change by more than a declared fraction ε across one
frame. This is not optional bookkeeping. Voliotis et al. (2016)
demonstrate, on the structurally identical move (freezing an
external driver between update points, which they call the "slow
input approximation"), errors of 60-90% in trajectory statistics and
qualitative failures — sustained oscillations reported as damped —
when the driving input's true timescale was faster than the
practitioner's assumed update interval. The draft's current text
states the frame-boundary rule as a design choice ("declared, coarse,
auditable") without stating or checking the condition that makes it
accurate. See Verdict 4 below for the exact revision.

**Upgrade path, if ever needed.** If a future scenario needs sub-
frame gradient resolution, prefer Anderson's (2007) integrated-
propensity method over thinning: the engine's gradient and bindings
are scenario-declared closed-form schedules, not emergent stochastic
trajectories, so the propensity integral is knowable in advance and
Anderson's method is both exact and cheap in that regime. Thinning
(Lewis-Shedler 1979; Voliotis et al. 2016) becomes the better choice
only if bindings become emergent from chemistry itself at sub-frame
resolution (e.g., Δp fed back dynamically rather than read from a
declared schedule) — out of scope for Stage 1, but worth naming now
so a future session does not reach for the wrong tool.

## 5. Stiffness: does it arise in SSA, and how is it detected

Yes — stiffness is not an ODE-only phenomenon translated loosely into
stochastic language; it arises in SSA proper. Rathinam, Petzold, Cao
and Gillespie ("Stiffness in Stochastic Chemically Reacting Systems:
The Implicit Tau-Leaping Method," 2003, *J. Chem. Phys.*
119(24):12784-12794) show that a reaction network with a genuine
fast/slow rate separation is stiff at both the continuous-
deterministic and the discrete-stochastic level, and that plain SSA
*and* explicit tau-leaping are both "exceedingly slow" on such
systems — tau-leaping alone does not fix stiffness, because the leap
condition forces τ down to the fast timescale regardless. The
mechanism, made concrete by Pu, Watson and Cao ("Stiffness detection
and reduction in discrete stochastic simulation of biochemical
systems," 2011, *J. Chem. Phys.*, read via PMC3045418): a fast
reversible reaction pair can fire enormously often while contributing
almost nothing net to the slow dynamics — "SSA spends most of the CPU
time on the simulation of the pair of fast reversible reactions
although this pair often cancel the effects of each other and does
not change the system dynamics at all." Effect on wall time: since
SSA cost is proportional to event count (the draft's own stated cost
model, §2), stiffness is exactly the condition under which event
count explodes relative to the slow-timescale dynamics that are
actually of interest — the same total simulated time can cost orders
of magnitude more wall time once a stiff fast/slow pair enters the
network, with no change to the physically interesting output.

Detection, per practitioner practice: look for large disparities
between reaction propensities/timescales, near-cancelling fast-
reversible pairs, and species sitting at quasi-steady-state (influx ≈
outflux, in Pu, Watson and Cao's phrasing). Pu, Watson and Cao (2011)
give a concrete, automatable test: compute the τ that ordinary
tau-leaping's own accuracy requirement would select for each species,
and flag species whose implied τ is much smaller than the rest while
also satisfying a quasi-steady-state balance condition — those
species are the stiffness source. Standard mitigations, once
detected, are the same toolkit named in §2/§3 but applied for a
distinct reason: implicit tau-leaping (Rathinam et al. 2003), the
hybrid SSA/tau-leaping split, or slow-scale SSA (both Cao, Gillespie
and Petzold 2005) — plain (explicit) tau-leaping does not suffice.

Stage 1's declared network shows no reported fast/slow separation, so
stiffness is not yet active, matching the draft's assessment.
However, the draft names only one trigger for its upgrade path ("when
a scenario outgrows it" — read as raw event-count pressure); the
literature is clear that *stiffness* is a second, independent
trigger with a different symptom (wall time exploding without a
proportional increase in scenario size or simulated duration) and a
different fix (implicit tau-leaping / hybrid / slow-scale SSA, not
plain tau-leaping). This distinction should be named explicitly
wherever the upgrade path is documented going forward (HLD or the
chemistry module's LLD), so a future session diagnosing a slow run
does not reach for plain tau-leaping when the actual problem is
stiffness.

## 6. Determinism and replay: PRNG stream discipline

Standard practice for reproducible stochastic simulation (L'Ecuyer,
"Random number generation with multiple streams for sequential and
parallel computing," Proceedings of the 2015 Winter Simulation
Conference) is: one declared, deterministically-seeded source per
logical stream of randomness, stream/substream assignment fixed at
the logical level independent of hardware or thread scheduling, and
exactly the same numbers consumed for exactly the same purpose across
runs and configurations — "reproducibility" in this literature means
draw-for-draw identity, not merely statistical equivalence. The
engine's design — a single seeded PRNG (`prng.mjs`, described as "the
only randomness source," with `Math.random` banned and lint-checked)
— matches this discipline's basic shape: one stream, one declared
source, no hidden entropy.

Two gotchas the LLD must pin, both surfaced directly by §1 and §4
above:

**Algorithm identity is part of the replay contract.** Different
exact SSA variants consume different numbers and orderings of random
draws for statistically identical physical trajectories: the direct
method draws two numbers per event; first-reaction draws M; the
next-reaction method draws one per *newly affected* channel,
identified through its dependency graph, and reuses cached times for
the rest. Two implementations can both be exact samplers of the same
chemical master equation and still produce completely different
random-number-consumption sequences, and therefore completely
different trajectories, from the same seed. This means the stepper
algorithm itself — not just seed, scenario hash, and engine version —
must be part of what a trace declares and what replay checks. The
shell draft's trace header (`{version, scenarioHash, seed,
engineVersion}`) has no field for this; a future engine update that
swaps the direct method for NRM at larger scale (§1's stated
crossover) would silently break golden-trace replay of *existing*
traces if the header does not name which stepper produced them.

**Draw order across PRNG consumers within one frame is a replay
invariant, not an implementation freedom.** The single-PRNG-stream
design means every consumer within a frame — chemistry's SSA event
draws, binomial division partitioning (§5 of the core draft, V5's
target), and any tie-breaking inside membrane admission — shares one
sequence, and the *order* in which they draw from it is exactly the
order in which the physical trajectory is defined. The core and shell
drafts already commit to a fixed step order (the numbered frame/tick
pipeline), which is the structurally correct answer; what is missing
is an explicit statement that this ordering is itself part of the
determinism invariant, testable via golden traces, and never subject
to reordering "for performance" without a trace-format version bump.

## Verdicts

**1. SSA-native stepper (Gillespie direct method).** CONFIRMED. At
Stage-1 scale (tens of species and reactions) the literature's own
careful timing studies (Cao, Li & Petzold 2004; McCollum et al. 2006;
Cao 2009) show the (optionally sorted) direct method matches or beats
Gibson-Bruck's next-reaction method, whose asymptotic advantage
requires networks an order of magnitude or more larger and sparsely
coupled. The first-reaction method is correctly not used.

**2. ODE conformance backend.** CONFIRMED. Running SSA and ODE
backends on the same scenario and checking convergence as copy
numbers scale is the standard large-N cross-validation the field
itself uses to catch propensity-combinatoric errors (Gillespie 2001;
Gillespie, Hellander & Petzold 2013); no literature objection to this
practice was found, and it is the same argument that grounds the
chemical Langevin equation and tau-leaping's own justification.

**3. Report frames as the discrete/continuous boundary.** CONFIRMED,
conditionally. Restricting all discrete/continuous coupling to frame
boundaries is architecturally sound and matches how every hybrid or
leaping method in this literature already structures time (advance,
then synchronize). Its soundness is conditional on adopting Verdict
4's leap-condition-style bound on Δt_report — the boundary rule
itself is correct; its calibration is not yet specified anywhere in
the drafts.

**4. The frame-frozen propensity treatment.** REVISE. Confirmed exact
for the piecewise-constant model as currently declared — no
integrated-propensity (Anderson 2007) or thinning (Lewis-Shedler
1979) machinery is needed given the engine's frame structure and its
scenario-declared, closed-form gradient/bindings schedules. The exact
revision: add to the simulation core draft's §3/§4, and to the
scenario validator, an explicit and checked leap-condition-style
requirement — no reaction's propensity may change, under the
scenario's own continuous-intent gradient/bindings schedule, by more
than a declared fraction ε (candidate default 0.1, matching common
tau-leaping practice) across one Δt_report window — checked at
scenario load for closed-form schedules and flagged at runtime
otherwise. Cite Voliotis et al. (2016) in that section as the
concrete cautionary precedent: the structurally identical move
(freezing a driver between updates without such a check) produced
60-90% trajectory error and qualitative failures (sustained
oscillations reported as damped) in their tested models. Also record,
as the named upgrade path, Anderson's (2007) integrated-propensity
method in preference to thinning, for the stated reason that the
engine's gradient/bindings are closed-form and scenario-declared
rather than emergent.

**5. Deterministic seeded replay.** REVISE. The single-PRNG-stream
design is sound and matches the field's stream-discipline practice
(L'Ecuyer 2015), but two pins are missing from the drafts and must be
added to the trace/replay LLD: (a) the trace header must name the
SSA algorithm/variant that produced it (not just seed, scenario hash,
and engine version), because different exact SSA variants consume
different numbers and orderings of random draws for statistically
identical trajectories, so an algorithm swap silently breaks bitwise
replay of prior traces unless it is a declared, versioned fact about
the trace; (b) the fixed per-frame draw order across all PRNG
consumers (chemistry, division partitioning, membrane tie-breaking)
must be stated explicitly as a versioned replay invariant enforced by
golden traces, not an implementation detail free to change without a
trace-format version bump.
