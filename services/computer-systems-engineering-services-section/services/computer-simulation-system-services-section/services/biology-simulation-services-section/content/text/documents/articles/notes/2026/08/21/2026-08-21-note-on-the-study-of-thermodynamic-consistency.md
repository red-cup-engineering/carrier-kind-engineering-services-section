---
title: "Study of Thermodynamic Consistency in Reaction Networks"
description: "S5 of the software planning program: a literature check of every thermodynamics claim the simulation core draft's §3 and S0's settling-mathematics study make about reaction networks — Schnakenberg's cycle decomposition of entropy production, Kolmogorov's criterion and its relation to Wegscheider's condition, Hill's diagram method, the cohomological reading of detailed balance against Polettini/Esposito/Rao's actual published vocabulary, kinetic proofreading from Hopfield and Ninio through Murugan-Huse-Leibler, the thermodynamic uncertainty relation and — the load-bearing finding — its failure under time-dependent driving exactly where the engine's gradient schedule lives, quasi-stationary distributions and extinction hazard, the finite-sampling bias of entropy-production estimators, the membrane-localization claim against real bioenergetics, and Wegscheider-consistency checking as actually practiced in metabolic modeling tools — each claim confirmed, revised, or left open against sources read and cited by author, year, and venue, closing with verdicts on S0's routed checklist and on the simulation core draft's four thermodynamic-coupling decisions."
date-created: 2026-08-21
type: notes
name: 2026-08-21-note-on-the-study-of-thermodynamic-consistency
authors:
  - claude-sonnet-5
status: draft-for-owner-review
keywords: ["natural-computer-simulation-engine", "schnakenberg", "wegscheider", "kolmogorov-criterion", "hill-diagram-method", "kinetic-proofreading", "thermodynamic-uncertainty-relation", "quasi-stationary-distribution", "entropy-production-estimation", "detailed-balance", "copasi", "cycle-affinity"]
tags: ["draft", "study"]
---


This is S5 of the planning program's document set. Its job is
narrow and specific: take the ten-item verification checklist S0
routed here (§9 of the settling-mathematics note), and the
simulation core draft's §3 in full, and check every physics claim
against sources actually read this session — not against training
memory, which is exactly the discipline S0 itself asked for. Method:
web search plus direct retrieval of primary sources (arXiv PDFs,
journal abstracts, one Reviews of Modern Physics scan too degraded
to OCR, substituted with its content as quoted and cited by Seifert's
2012 review, itself read in full text). Where a claim could not be
pinned to a passage actually read, that is stated, not papered over.
Each section below ends with what it means for the engine; the
"Verdicts" section at the end collects the rulings the planning
program actually needs.

One finding matters more than the rest and is flagged where it
appears: **the thermodynamic uncertainty relation, as S0 proposed to
use it (V6, a per-frame conformance law), does not hold under the
engine's own gradient schedule.** The literature is unambiguous and
recent. This is not a minor footnote; it is a correction to a
validation law S0 wanted to ship.

## 1. Schnakenberg's network theory and the cycle decomposition

**Schnakenberg, J. (1976). "Network theory of microscopic and
macroscopic behavior of master equation systems." Reviews of Modern
Physics 48(4), 571–585.** The scanned copy retrieved could not be
OCR'd (no `tesseract` in this environment), so the paper's content is
verified instead through Seifert, U. (2012), "Stochastic
thermodynamics, fluctuation theorems, and molecular machines,"
Reports on Progress in Physics 75, 126001 (arXiv:1205.4176), read in
full text, which cites Schnakenberg directly as reference [189] for
the network-cycle decomposition and reproduces its content with
notation.

The confirmed content, in Seifert's notation (his eq. 138–139,
256–257): decompose a trajectory's total entropy production over
completed cycles, `Δs_tot = Σ_a n_a ΔS_a + Δs_r`, where `n_a` counts
signed completions of cycle `a` and

```
ΔS_a = Σ_{(mn)∈a} ln(w_mn / w_nm)
```

is *called the affinity of this cycle* — Seifert's own words, and
exactly S0's `A_c`. At steady state this becomes the ensemble
identity

```
σ = Σ_a (j_a+ − j_a−) ΔS_a = Σ_a j_a ΔS_a
```

(eq. 256) — precisely `σ = Σ_c J_c · A_c`. Conditions needed: a
finite, irreducible Markov network (so a fundamental cycle basis
exists via a spanning tree plus chords — this is graph theory, not
physics, and needs no further assumption); a steady state for the
clean current-times-affinity ensemble form (the trajectory-level
identity holds off steady state too, cycle by cycle, but "the cycle
current" is only a well-defined single number at steady state or in
long-time averaging); and, separately, *local detailed balance* on
each edge (rates tied to reservoir entropy changes) is what gives
`σ` its physical interpretation as entropy production rather than a
purely formal graph quantity — the decomposition itself is algebraic
and does not require it.

**For the engine:** S0's formula is confirmed exactly, with its
condition made explicit — the clean `σ = Σ_c J_c A_c` form is a
steady-state statement. A scenario mid-transient (division, a
gradient step-change) needs either the trajectory-level cycle-count
form or an explicit note that the identity is an instantaneous-rate
approximation there.

## 2. Kolmogorov's criterion and its relation to Wegscheider's condition

Confirmed via Wikipedia's "Kolmogorov's criterion" article (citing
Kelly, F. P. (1979), *Reversibility and Stochastic Networks*) and
independently via Polettini (2012, below): a continuous-time Markov
chain is reversible (satisfies detailed balance) iff, for every
cycle of states, the product of transition rates traversed clockwise
equals the product traversed counterclockwise. This is stated for
both discrete- and continuous-time chains; the engine's SSA lives at
the continuous-time master-equation level, so the continuous-time
form is the relevant one.

The relationship to Wegscheider is structural and immediate once
both are written out, and it is stated as such — Kolmogorov's
criterion equal to "all Wilson loops equal unity" — by Polettini,
M. (2012), "Nonequilibrium thermodynamics as a gauge theory,"
Europhysics Letters 97, 30003 (arXiv:1110.0608, read in full text):
"As a remarkable consequence, Kolmogorov's criterion [...] is
equivalent to all Wilson loops being equal to unity. Hence detailed
balanced systems can be seen as the special class of models with a
flat connection, with zero curvature." Wegscheider's condition (rate
constants of a mass-action network) and Kolmogorov's criterion
(transition rates of the induced state-space Markov chain) are the
same cycle statement applied at two different levels of the same
system — the reaction graph versus the copy-number state-transition
graph the reaction graph generates. One caveat, honestly flagged: I
did not locate a single paper stating the *equivalence proof* between
"CME satisfies Kolmogorov's criterion" and "mass-action rate
constants satisfy Wegscheider" end to end, chapter and verse; the
standard references for this equivalence in the chemical-kinetics
literature are Whittle, P. (1986), *Systems in Stochastic
Equilibrium*, and Anderson, D. F., Craciun, G., and Kurtz, T. G.
(2010), "Product-form stationary distributions for deficiency zero
chemical reaction networks," Bulletin of Mathematical Biology 72,
1947–1970 — both named from training memory as the standard
citations for this class of result, neither read this session. This
sub-point is OPEN pending direct verification, though the
mathematical content (that the two cycle conditions coincide when
the state-transition rates are themselves built from the same rate
constants) is not in serious doubt.

**For the engine:** the stochastic-level check S0 wanted (Kolmogorov
on the CME) is confirmed to exist and to be the right thing to check
in principle; whether it is *equivalent* to, versus merely
*implied-by*, the deterministic Wegscheider check on rate constants
needs the Whittle/Anderson-Craciun-Kurtz citation actually pulled and
read before the ADR leans on that equivalence by name.

## 3. Hill's diagram method against Schnakenberg

**Hill, T. L. (1977). *Free Energy Transduction in Biology*; later
condensed as (1989) *Free Energy Transduction and Biochemical Cycle
Kinetics*, Springer.** Confirmed content: the diagram method (built
on the earlier King-Altman spanning-tree algorithm for enzyme
kinetics, King, E. L. and Altman, C. (1956), J. Phys. Chem. 60,
1375) computes steady-state state probabilities and cycle fluxes
directly from a kinetic diagram — enumerate spanning trees rooted at
each state, weight by the product of rate constants on the tree's
directed edges, sum. It is the biophysics-tradition twin of
Schnakenberg's master-equation-tradition network theory; the
literature treats them as one compound object. Dal Cengio, S.,
Lecomte, V., and Polettini, M. (2023), "Geometry of Nonequilibrium
Reaction Networks," Physical Review X 13, 021040
(arXiv:2208.01290, read in full text), opens by stating their aim as
extending "the Hill–Schnakenberg analysis" to interacting (hypergraph)
networks, and explicitly notes their newly-defined cycles and
cocycles "reduce to the Hill–Schnakenberg ones" for non-interacting
(elementary, one-to-one-or-two) reaction networks — confirming Hill
and Schnakenberg are recognized in the current literature as the
same theory, not two competing ones.

Does it add anything beyond Schnakenberg for the engine? Two things,
concretely. First, King-Altman-Hill spanning-tree enumeration is a
genuine *algorithm* (not just a decomposition identity) for computing
closed-form steady-state cycle fluxes and occupation probabilities
directly from declared rate constants, without solving the full
master equation — useful for generating V1–V3's closed-form targets
by hand or in a small validator, and for sanity-checking small
subnetworks at scenario-load time. Second, and this is a genuine
limit worth flagging for later stages: the same 2023 paper states
that the graph/spanning-tree approach "bypasses a conceptual
bottleneck" that appears once reactions are not simple one-to-one or
one-to-two edges but general many-to-many hypergraph reactions —
Hill/Schnakenberg's spanning-tree machinery does not generalize
cleanly there, and the newer cycle/cocycle algebraic framework
(kernel/cokernel of the stoichiometric matrix) is what replaces it.
Stage 1's baseline network (the reactions in the simulation core
draft) is elementary in this sense, so the limit does not bite yet —
but it is exactly the kind of thing that will bite when metabolism
gains multi-substrate enzymes.

## 4. "Detailed balance is exactness of the affinity one-cochain"

This is S0's sharpest and most quotable sentence, and it is the one
requiring the most care distinguishing *mathematical content* from
*vocabulary*. Confirmed content, not confirmed vocabulary.

Polettini (2012), cited above, states — in the paper's own words,
not a paraphrase — "The connection is said to be exact when it is
equivalent to A′_ij = 0. It is well known [...] that equilibrium
systems are characterized by an exact potential [...] Detailed
balance follows [...] Kolmogorov's criterion [...] is equivalent to
all Wilson loops being equal to unity [...] detailed balanced
systems can be seen as the special class of models with a flat
connection, with zero curvature; they all belong to the same
equivalence class." This is S0's identification, stated in gauge
theory language — connection, curvature, exactness, flatness —
rather than in the language of "one-cochain" or "H¹." But "exact"
here is being used in precisely the cohomological sense: a
connection with zero curvature is a flat connection, and a flat
connection on a graph is exactly a coboundary (a potential's
gradient) — the affinity assignment is trivial in cohomology. The
gauge-theory vocabulary and the cohomology vocabulary are describing
the same object; Polettini's paper is the closest published statement
of S0's sentence I located, and it is close enough to count as the
same claim, not an analogy to it.

Separately, Polettini, M. and Esposito, M. (2014), "Irreversible
thermodynamics of open chemical networks I: Emergent cycles and
broken conservation laws," Journal of Chemical Physics 141, 024117
(arXiv:1404.1181) and Rao, R. and Esposito, M. (2016), "Nonequilibrium
Thermodynamics of Chemical Reaction Networks: Wisdom from Stochastic
Thermodynamics," Physical Review X 6, 041064 (arXiv:1602.07257),
build the graph-algebraic cycle/cocycle machinery (kernel and
cokernel of the incidence/stoichiometric matrix as dual subspaces)
that underlies all of this; I could not confirm from the abstract
and search results alone whether these two papers use "cocycle"
in the cohomological sense (dual to cycles, algebraically) versus
merely as a name — the 2023 Dal Cengio/Lecomte/Polettini paper
(read in full text) does use "cocycle" formally and explicitly, as
the object dual to a cycle under the incidence-matrix pairing, and
explicitly ties it back to Hill-Schnakenberg. None of the three
papers actually reviewed this session contain the literal strings
"cohomology," "one-cochain," or "H¹." That specific vocabulary is
the house's own translation, not a direct quote from any source
checked here.

**Verdict content:** the mathematics S0 claims is real, published,
and precisely what S0 says it is. **Verdict attribution:** the
"cohomology" framing is the house's own — faithful, but a
translation, and the ADR should cite Polettini (2012) for the
gauge-theory statement rather than imply "cohomology" is these
authors' own term.

## 5. Kinetic proofreading: Hopfield, Ninio, and after

**Hopfield, J. J. (1974). "Kinetic proofreading: a new mechanism for
reducing errors in biosynthetic processes requiring high
specificity." PNAS 71(10), 4135–4139.** Confirmed: specificity
beyond what free-energy differences between right/wrong substrates
alone permit at equilibrium requires a driven, dissipative
intermediate step; "the correction of errors in biosynthesis must be
paid for by an increased dissipation [...] or a time delay" (per the
paper's own framing, confirmed via PNAS listing and secondary
sources). **Ninio, J. (1975). "Kinetic amplification of enzyme
discrimination." Biochimie 57(5), 587–595** — an independently
derived, related mechanism (a delay step acting as a kinetic
amplifier of discrimination), confirmed as the companion citation
the field treats alongside Hopfield's.

The equilibrium error-floor argument is confirmed with its exact
quantitative form, sourced to Murugan, A., Huse, D. A., and Leibler,
S. (2012), "Speed, dissipation, and error in kinetic proofreading,"
PNAS 109(30), 12034–12039: at equilibrium (zero net driving `W = 0`)
the error fraction is bounded below by `ε₀ = e^{−Δ}`, `Δ` the binding
free-energy difference between right and wrong substrates — the
literal Boltzmann-factor floor S0 describes — and beating it requires
`W > 0`, dissipation spent per admission decision. The
"discrimination beyond equilibrium requires dissipation" claim is
therefore not merely Hopfield's qualitative 1974 argument but has a
modern quantitative proof with an explicit speed/dissipation/error
trade-off surface, further extended by Murugan, Huse, and Leibler
(2014), "Discriminatory proofreading regimes in nonequilibrium
systems," Physical Review X 4, 021016, which characterizes different
proofreading regimes (discriminating on rate versus on binding
affinity) and what dissipation buys in each.

**For the engine:** S0's admission-predicate prediction — fidelity
beyond the equilibrium floor requires `σ_membrane > 0`, scaling with
the discrimination bought — is confirmed as physically real and
quantitatively characterized, not merely qualitatively true. The
Murugan-Huse-Leibler papers give the actual trade-off surface that a
falsifier ("high-fidelity admission with `σ_membrane ≈ 0` is
unphysical") should be checked against rather than asserted from
Hopfield's 1974 argument alone.

## 6. The thermodynamic uncertainty relation — the load-bearing finding

**Barato, A. C. and Seifert, U. (2015). "Thermodynamic Uncertainty
Relation for Biomolecular Processes." Physical Review Letters 114,
158101 (arXiv:1502.05944, read in full text).** Exact statement, in
the paper's own notation, `k_B = T = 1`: for an observable current
`X_α` counting signed transitions in a steady-state Markov network
with mean rate `J_α = ⟨X_α⟩/t` and diffusion coefficient
`D_α = [⟨X_α²⟩ − ⟨X_α⟩²]/(2t)`,

```
Q_α ≡ σ t ε_α² = 2σD_α/J_α² ≥ 2 k_B T
```

— i.e. `Var(X_α)/⟨X_α⟩² ≥ 2 k_B/(σ t)`, exactly S0's form. Proved by
Barato-Seifert within linear response generally, analytically for
unicyclic networks, and numerically for multicyclic networks beyond
linear response; the fully general proof for arbitrary steady-state
continuous-time Markov networks, via large-deviation theory, is
**Gingrich, T. R., Horowitz, J. M., Perunov, N., and England, J. L.
(2016). "Dissipation Bounds All Steady-State Current Fluctuations."
Physical Review Letters 116, 120601.** Scope, stated by both papers
and confirmed: **a nonequilibrium steady state** of a time-continuous
Markov jump process (or the overdamped-Langevin continuum analogue).
This is not a footnote condition; it is load-bearing, per the next
paragraph.

**The critical question, answered directly.** Does the TUR hold
under the engine's time-dependent gradient schedule? **No, not in
its steady-state form, and this is demonstrated with explicit
counterexamples, not merely asserted.** Koyuk, T. and Seifert, U.
(2020). "Thermodynamic Uncertainty Relation for Time-Dependent
Driving." Physical Review Letters 125, 260604 (arXiv:2005.02312,
read in full text) states plainly: "the TUR for steady-state systems
[...] is always violated except in the long-time limit" for their
moving-trap example, and shows a second example (mean power as the
current) where "the TUR for steady-state systems is always violated
except in the long-time limit." These are not edge cases; they are
the paper's own worked illustrations of a general point: **plain
steady-state TUR is not merely "unproven" under time-dependent
driving, it is generically false.**

A generalized relation does hold for arbitrary time-dependent
driving from an arbitrary initial state — Koyuk-Seifert's main
result, their eq. (1):

```
[J(T,v) + ΔJ(T,v)]² / D_J(T,v) ≤ σ(T,v),    Δ ≡ T∂_T − v∂_v
```

where `ΔJ(T,v)` is a *response term*: how the mean current changes
under a small change of the driving speed `v` and observation time
`T`. This is not the same observable as `σ` alone — it requires
measuring the current's sensitivity to the protocol's own speed,
which is a strictly larger data requirement than firing counts and
`σ` per frame. A second, weaker family — "generalized TURs" derived
from the fluctuation theorem (Hasegawa, Y. and Van Vu, T. (2019),
Physical Review Letters 123, 110602; Timpanaro, A. M., Guarnieri, G.,
Goold, J., and Landi, G. T. (2019), Physical Review Letters 123,
090604) — holds under fully arbitrary driving without the response
term, but Koyuk-Seifert's own framing states these "typically yield
weaker bounds [...] and become trivial in the long-time limit,"
which for a scenario running many report frames is exactly the
regime where the bound stops meaning anything.

**For the engine, concretely:** V6 as S0 proposed it — a per-frame
law every correctly-implemented scenario must satisfy, checked
against `σ` alone — is only valid on time windows where the gradient
schedule is effectively constant (`Δp(t)` frozen across the window
being checked). Since the engine's own design explicitly allows a
time-varying gradient schedule, V6 cannot be shipped as stated. Three
honest paths, none of them "do nothing": (a) scope V6 to
constant-`Δp` scenario segments only, and document that scoping in
the validation plan; (b) implement the Koyuk-Seifert form, which
needs the engine to additionally track and report the current's
response to protocol speed per frame — a real LLD cost, not a free
conformance check; (c) ship the weaker fluctuation-theorem-derived
GTUR as the *only* claim made under time-dependent driving, with the
explicit caveat that it is a much looser bound and not a
"no-further-diagnosis-needed" test the way S0 wanted. Whichever is
chosen, S0's description of V6 as "a law every correctly-implemented
scenario must satisfy" needs the word "steady-state" or
"constant-driving" inserted before "scenario," or it is not true of
the engine it is meant to validate.

## 7. Quasi-stationary distributions and extinction

**Collet, P., Martínez, S., and San Martín, J. (2013). *Quasi-
Stationary Distributions: Markov Chains, Diffusions and Dynamical
Systems*. Springer, Probability and Its Applications series.**
Confirmed: exact title, authors, publisher, year, as S0 cites it.
Confirmed content, from the publisher's own description read this
session: QSDs describe "the long-term behavior conditioned to not
being killed," for Markov chains with an absorbing state, killed
diffusions, and dynamical systems with a trap alike; the book covers
existence, uniqueness/non-uniqueness (a single QSD versus a
continuum of them, e.g. for birth-death chains), convergence to the
extremal QSD, and the exponential-distribution property of the
killing time when started from a QSD.

The classical originating result, worth naming alongside the modern
monograph and not found named in S0: **Darroch, J. N. and Seneta, E.
(1965). "On quasi-stationary distributions in absorbing discrete-time
finite Markov chains." Journal of Applied Probability 2(1), 88–100**
— the foundational theorem (predating Collet-Martínez-San Martín by
half a century) that the distribution of a finite absorbing Markov
chain conditioned on survival converges, as time grows, to a unique
quasi-stationary distribution, with absorption from that QSD
exponentially distributed at a rate equal to the QSD's associated
eigenvalue. This last fact is the standard route to estimating a
hazard from trajectory data. Named from training memory as the
standard citation for this classical result; not itself pulled and
read this session, so treated as CONFIRMED-with-moderate-confidence
rather than fully verified — the modern monograph's content, read
directly, does confirm the same mathematical facts, so the specific
attribution to Darroch-Seneta is the only open thread here.

Standard practice for estimating a QSD and hazard from simulated
trajectory data, as generally practiced in the CME/population-process
literature: run many independent replicate SSA trajectories from a
declared initial state; either (a) take the empirical distribution of
surviving replicates at a late-but-pre-absorption time, conditioned
on non-absorption — the direct Darroch-Seneta estimator, simple but
wasteful of replicates that have already absorbed by that time — or
(b) use a Fleming-Viot particle system, where a fixed population of
replicas evolves under the true dynamics and any replica that hits
absorption is instantly redistributed to the current state of a
uniformly-chosen surviving replica; the stationary empirical
distribution of this particle system converges to the QSD without
discarding trajectories, and is the standard numerical method for
QSD estimation in the applied-probability literature this monograph
belongs to. The hazard itself is estimated from the empirical
survival curve — either the reciprocal of the mean absorption time
once the population has relaxed onto the QSD regime, or a fitted
exponential tail (the standard survival-analysis move, e.g. Kaplan-
Meier estimation of the survival function followed by exponential-tail
fitting once the curve is visibly log-linear).

**For the engine:** confirmed as the right framework; the Fleming-
Viot method is the concrete algorithm the lifecycle LLD should adopt
if Stage-1 or later wants a QSD estimate cheaper than "run until
almost everything has died," and the hazard-from-survival-curve
approach is the natural instrumented statistic for the "headline is
survival analysis, not fixed-point-reached" reframing S0 proposes.

## 8. Entropy-production estimation from finite trajectory data

Confirmed: this is a real, active literature, not a hypothetical
worry. **Roldán, É. and Parrondo, J. M. R. (2010). "Estimating
Dissipation from Single Stationary Trajectories." Physical Review
Letters 105, 150607**, and its follow-up **Roldán, É. and Parrondo,
J. M. R. (2012). "Entropy production and Kullback-Leibler divergence
between stationary trajectories of discrete systems." Physical
Review E 85, 031129** establish that the Kullback-Leibler divergence
between a trajectory's forward and time-reversed path probabilities
is estimable from data and gives a *lower bound* on true entropy
production when only part of the system is observed — the
partial-observability bias, a distinct (and separately real) issue
from finite-sample bias.

The finite-sample bias itself — bias present even with full
observability, purely from finite counting statistics — is confirmed
directly and repeatedly across multiple sources located this session:
"given finite-length data, the estimate of the entropy production
rate will be biased," and specifically that "systematic overestimation
of entropy production estimators occurs from having only a finite
time series" — with "estimates remain[ing] weakly positively biased
for short trajectories." The direction (positive/upward bias) is
mathematically what should be expected on general grounds: entropy
production and Kullback-Leibler divergence are convex functionals of
the underlying rate distributions, so by Jensen's inequality a
consistent plug-in estimator built from noisy empirical counts is
biased upward in expectation — the mirror image of the well-known
downward (Miller-Madow-type) bias of plug-in Shannon-entropy
estimators, which are concave. Recent, directly relevant work
naming the phenomenon at the resolution the engine would care about:
Fritz, F., Ertel, B., and Seifert, U. (2025). "Entropy estimation for
partially accessible Markov networks based on imperfect observations:
role of finite resolution and finite statistics." Physical Review E
111, 044106 (arXiv:2412.04102) — its own framing states "the observed
overestimation of entropy production for finite observation
statistics calls for quantification." A separate line of work
(Skinner, D. J. and Dunkel, J. (2021), "Estimating Entropy Production
Rates with First-Passage Processes," arXiv:2207.06745, and its
published form) constructs first-passage-time-based estimators
specifically claimed to be *unbiased*, as an alternative to the
naive plug-in.

**What the engine's σ observable should actually compute per frame,
concretely:** the simulation core draft's formula,
`σ = Σ_j (J+_j − J−_j)·ln(J+_j/J−_j)` from cumulative per-reaction
firing counts, is structurally the correct edge-summed steady-state
entropy production formula (matching Schnakenberg's own edge form,
distinct from but consistent with the cycle-decomposed form in §1) —
CONFIRMED as the right structure. But as a point estimate from a
single report frame's firing counts it inherits exactly the
positive-bias problem documented above, worst for reactions that fire
rarely within a frame (low-copy-number species, short `Δt_report`) —
precisely the regime the engine chose integer copy numbers to
inhabit. This compounds with §6's finding: **an upward-biased `σ` fed
into a TUR check (V6) makes the inequality easier, not harder, to
satisfy** — `Var(J)/⟨J⟩² ≥ 2k_B/(σt)` gets looser as `σ` is inflated,
so a biased-high `σ` could let a genuinely broken simulator pass a
conformance test meant to catch exactly that class of bug. The
observable's LLD needs one of: aggregating firing counts over enough
report frames (or a longer window) that the bias becomes negligible
before it feeds any conformance check; reporting `σ` with an explicit
bias/confidence estimate rather than a bare point value; or adopting
a documented bias-corrected or first-passage-based estimator instead
of the naive plug-in. This is not optional polish — it is a
correctness requirement of the validation plan V6 depends on.

## 9. The membrane-localization claim against real bioenergetics

S0's claim: a healthy cell's affinity class concentrates on membrane
edges; the interior-only subgraph should be nearly exact
(near-detailed-balance). Assessed against standard bioenergetics, the
claim is **directionally strong but not exact**, and the counterexample
is textbook-standard, not exotic.

Quantitatively, the bulk of a cell's free-energy transduction is
membrane-localized: of the ~30–32 ATP per glucose, only ~4 come from
substrate-level phosphorylation (2 from glycolysis, 2 as GTP from the
citric acid cycle — both cytosolic/matrix, non-membrane), while
~26–28 come from oxidative phosphorylation at the inner mitochondrial
membrane — roughly 85–90% of captured free energy is membrane-routed
(confirmed via the standard textbook accounting, checked against
Wikipedia's "Cellular respiration" summary this session, itself
citing standard biochemistry texts). This substantially supports the
engine's invariant as a *quantitative* claim about where most
transduced free energy is captured, not merely a qualitative one.

But "most captured free energy is membrane-routed" is not the same
claim as "the interior subgraph is nearly exact," and the difference
matters. Individual cytosolic reactions in glycolysis are themselves
highly exergonic and effectively irreversible independent of any
membrane coupling — the standard example, confirmed this session via
De Martino, A., De Martino, D., and Marinari, E. (2019), "The
Essential Role of Thermodynamics in Metabolic Network Modeling"
(arXiv:1902.07129, read in full text), which gives hexokinase's
`ΔG₁ ≈ −29 kJ/mol` as a worked example of a reaction far enough from
equilibrium that net-flux estimates of turnover time differ from
flux-corrected estimates by roughly 45%. Hexokinase, phosphofructo-
kinase, and pyruvate kinase are the three classically "irreversible"
steps of glycolysis in every standard biochemistry text (Lehninger;
Voet and Voet) — cytosolic, non-membrane, and genuinely far from
equilibrium, not near-exact. These are affinity sitting off the
membrane, real and substantial, even though the *ATP yield* they
purchase is small relative to oxidative phosphorylation's.

**Verdict, precisely stated per S0's own credibility discipline (§8,
§9 of the settling-mathematics note, which explicitly asks this
question be answered honestly): the strong form of the claim — the
interior subgraph is nearly exact — does not survive; the weaker,
still useful form — most *captured, transduced* free energy is
membrane-routed, while cytosolic metabolism still carries real,
non-negligible affinity of its own — does survive.** S0's own §8
anticipated exactly this outcome and named the correct demotion: the
invariant should enter the engine as a *design choice for a
"healthy cell" scenario class* (declare which cycles are expected to
carry affinity, check that declaration), not as a universal physical
law the engine can assert about any well-formed scenario.

## 10. Wegscheider-consistency checking in practice

Confirmed that this is a real, actively worked engineering problem
in metabolic modeling, not solved-and-forgotten. De Martino, De
Martino, and Marinari (2019, above) frame it directly: "given a
thermodynamically infeasible mass-balanced flux configuration,"
existing algorithms work either by (a) computing the null space of
the stoichiometric matrix to obtain a cycle basis and checking the
Wegscheider identity per independent cycle directly — exactly the
draft's proposed algorithm — or (b) a duality/optimization approach
(via Gordan's theorem of the alternative) that identifies and removes
infeasible loops from a candidate flux configuration by minimizing an
infeasibility measure. The review frames this as still nontrivial at
genome scale: "it has proven difficult to implement in reconstruction
algorithms," with multiple competing methods cited (thermodynamics-
based flux analysis, energy balance analysis, and others) rather than
one settled standard tool.

On the specific question of whether COPASI does this automatically at
model load: **not confirmed.** COPASI's own research/chemistry page,
fetched directly this session, documents extensive kinetic-network
use but no automatic Wegscheider/detailed-balance check surfaced in
that content, and no independent confirmation of a load-time check
was found. This should be read as "not found," not as "confirmed
absent" — COPASI is a large, long-lived tool and the check may exist
in a part of its documentation not surfaced by the searches run this
session. What is confirmed is that thermodynamic feasibility checking
in metabolic modeling is generally implemented as a *specialized
add-on analysis* (thermodynamics-based flux analysis / TFA-style
tools, energy balance analysis, cycle-detection-and-removal
algorithms layered onto constraint-based reconstruction pipelines)
rather than a universal, automatic, built-in feature of general-
purpose simulators — which is a materially different claim from "this
is standard practice everywhere," and worth stating precisely rather
than rounding up.

**For the engine:** the draft's proposed algorithm — null space of
the stoichiometry matrix at scenario load, cycle basis, check the
Wegscheider identity per cycle, reject with the offending cycle named
— is confirmed as the textbook-correct approach and matches the
literature's stated first method. At Stage-1 scale (tens of species,
elementary reactions) this is straightforwardly tractable and does
not need any of the heavier genome-scale machinery the review
discusses. The engine would, in fact, be doing something a fair
amount of published metabolic-modeling tooling does *not* do
automatically — which is worth stating in the ADR as a genuine
strength, not undercut by the absence of a "COPASI does this too"
citation.

## 11. The simulation core draft's §3 decisions, checked directly

The draft's four thermodynamic-coupling decisions, assessed against
everything above:

**Coupling through equilibrium constants** (`k+/k− = exp(−ΔG°/RT)`,
gradient entering via `ΔG = ΔG° − mFΔp` rather than as a multiplier
on one rate): this is exactly the local-detailed-balance form used
throughout the literature reviewed — it is structurally identical to
Barato-Seifert's own foundational relation (their eq. 2,
`k+/k− = exp(A/k_BT)`) and to the chemostat formalism in Rao-Esposito
(2016). Confirmed as the physically honest approach the draft claims
it to be.

**Wegscheider consistency checked at scenario load**: confirmed as
the textbook-correct algorithm (§10 above), with the caveat that
"standard practice in COPASI" cannot be asserted as confirmed — the
engine should claim this as sound first-principles engineering, not
as conformance with an established tooling norm nobody here has
directly verified.

**Entropy production rate as an observable**: the formula is
structurally correct (§8 above; matches Schnakenberg's edge-summed
form) but incomplete as specified — it needs a stated policy for
finite-sampling bias before any downstream conformance check (V6) can
trust it as a point value.

**V6 (TUR) as a conformance law**: this is the one that cannot ship
as S0 described it. §6 above is not a caveat on this decision; it is
a correction to it. The plain steady-state TUR is generically false
under time-dependent driving, which the engine's own gradient
schedule is designed to permit. V6 needs explicit scoping (constant-
`Δp` windows only) or a genuinely different, more expensive
observable (the Koyuk-Seifert response term) before it can be
trusted as "a law every correctly-implemented scenario must satisfy."

## Verdicts

Per S0's checklist, in order:

1. **Schnakenberg 1976, cycle decomposition of entropy production —
   CONFIRMED.** Exact form `σ = Σ_c J_c A_c` verified via Seifert
   (2012)'s direct citation and reproduction of Schnakenberg's
   content; condition made explicit (steady state for the clean
   ensemble form; local detailed balance for the physical
   interpretation of `σ`, not for the decomposition's validity).

2. **Kolmogorov's criterion as the stochastic-level analogue of
   Wegscheider — CONFIRMED in content, OPEN on the specific
   equivalence-proof citation.** The cycle statement is confirmed
   identical in structure at both levels (Polettini 2012's explicit
   statement); the precise theorem connecting CME-level Kolmogorov to
   deterministic Wegscheider (named as Whittle 1986 /
   Anderson-Craciun-Kurtz 2010 from training memory) was not read
   this session and should be pulled before an ADR cites it by name.

3. **Hill's diagram method — CONFIRMED**, recognized in the current
   literature (Dal Cengio, Lecomte, Polettini 2023) as the same
   theory as Schnakenberg's ("Hill-Schnakenberg"), adding a concrete
   computational algorithm (King-Altman spanning trees) useful for
   generating closed-form validation targets, with a known limit
   (does not generalize cleanly to many-to-many hypergraph reactions)
   that does not bite at Stage-1 scale but will later.

4. **"Detailed balance is exactness of the affinity one-cochain" —
   CONFIRMED in mathematical content, REVISE the attribution.**
   Polettini (2012) states the equivalent claim explicitly in
   gauge-theory language (exact connection, flat, zero curvature,
   tied directly to Kolmogorov's criterion). No source read this
   session uses "cohomology," "one-cochain," or "H¹" literally; that
   vocabulary is the house's own faithful translation, not a quote.
   Cite Polettini (2012) for the claim; do not imply the cohomology
   vocabulary itself is these authors' term.

5. **Kinetic proofreading — CONFIRMED, with the modern quantitative
   form sharper than S0's citation implied.** Hopfield 1974 and
   Ninio 1975 give the qualitative equilibrium-floor argument;
   Murugan, Huse, and Leibler (2012, 2014) give the actual
   quantitative trade-off surface (error floor `e^{-Δ}`, dissipation
   `W` required to beat it, speed/dissipation/error regimes) that
   any admission-fidelity falsifier should be checked against
   directly rather than via the 1974 argument alone.

6. **The thermodynamic uncertainty relation — CONFIRMED in its
   original steady-state form; REVISE as proposed for V6.** Exact
   form and general proof (Barato-Seifert 2015; Gingrich, Horowitz,
   Perunov, England 2016) confirmed and quoted. Under time-dependent
   driving — the engine's actual gradient-schedule design — the
   plain steady-state form is demonstrated to fail generically
   (Koyuk-Seifert 2020, explicit worked counterexamples), and the
   valid generalization requires an additional response-to-protocol-
   speed observable the engine does not currently plan to compute.
   **This is the single most consequential correction in this
   study.**

7. **Quasi-stationary distributions — CONFIRMED**, exact citation
   (Collet, Martínez, San Martín 2013) verified; classical originating
   result (Darroch-Seneta 1965) named with moderate rather than full
   confidence; standard estimation method for the engine identified
   concretely (Fleming-Viot particle system for the QSD, survival-
   curve fitting for the hazard).

8. **Entropy-production estimation from finite trajectory data —
   CONFIRMED as a real, active, and directionally-understood bias
   problem** (positive/upward bias, worst at low firing counts,
   documented across multiple recent papers), with a concrete
   consequence for the engine: the draft's σ formula is structurally
   right but needs an explicit bias policy before feeding V6,
   because an inflated σ makes the TUR check easier to pass, not
   harder — the two open items (6 and 8) compound against each other
   in exactly the direction that would let a broken simulator pass.

9. **The membrane-localization claim — REVISE, exactly as S0's own §8
   anticipated it might need to.** Strong quantitative support for
   "most transduced free energy is membrane-routed" (~85–90% of ATP
   yield); the stronger "interior subgraph is nearly exact" claim
   does not survive — glycolysis's irreversible steps (hexokinase,
   confirmed `ΔG ≈ −29 kJ/mol`) are real, substantial, cytosolic
   affinity. Demote per S0's own proposed fallback: a declared
   property of "healthy cell" scenarios, not a universal physical
   invariant the engine can assert of any well-formed scenario.

10. **Wegscheider-consistency checking at model load — CONFIRMED as
    textbook-correct algorithm; OPEN on "this is done in COPASI."**
    The null-space/cycle-basis method is confirmed as the field's
    first-choice approach in principle; whether mainstream general-
    purpose simulators automate it is not confirmed either way. The
    engine's plan should be defended on first-principles grounds, not
    on an unverified "COPASI does this too."

Per the simulation core draft's §3 decisions directly:

- **Thermodynamic coupling through equilibrium constants —
  CONFIRMED.**
- **Wegscheider load-checking — CONFIRMED as sound algorithm; the
  "standard practice" framing should be softened to "correct
  first-principles engineering."**
- **σ as an observable — CONFIRMED in structure, REVISE to add an
  explicit finite-sampling bias policy before it is trusted as a
  point value anywhere downstream, especially V6.**
- **V6 / TUR as a conformance law — REVISE, materially.** As stated
  it is not true of a system with a time-dependent gradient schedule.
  It needs scoping to constant-driving windows, or the more expensive
  Koyuk-Seifert generalized form, before it enters the validation
  plan as a law "every correctly-implemented scenario must satisfy."
