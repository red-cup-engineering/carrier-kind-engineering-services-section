---
title: "Stage-1 Expert Panel Review"
description: "Synthesis of four expert reviews of the natural-computer-simulation-engine design document — a membrane-computing formalist, a cell biophysicist, a mathematics auditor, and a repo-doctrine auditor — plus one live probe: the substrate does not guard admission (a site knowing only metabolizes accepted teleports), the unreachable-packages premise was stale, the Eigen threshold was demoted twice over, and the death taxonomy grew from two modes to four; carries the concretized stage-1 cell, the membrane contract, falsifiers as runnable experiments, guardrails, and build order."
date-created: 2026-08-21
type: notes
name: 2026-08-21-note-on-the-stage-1-expert-panel-review
authors:
  - claude-fable-5
status: draft-for-owner-review
keywords: ["natural-computer-simulation-engine", "virtual-cell", "design-review", "membrane", "admission", "paraconsistent", "gillespie", "detailed-balance"]
tags: ["draft"]
---


Four expert reviews of the 2026-08-21 design document, run as one
panel — a membrane-computing formalist (P systems, brane calculi, the
virtual-cell field), a cell biophysicist, an obsmetrologist auditing
every mathematical citation against the Lean corpus and the executable
carriers, and a house theorist auditing conformance to the estate's own
doctrine — plus one live probe run against `relating@0.1.4` as
installed from the registry. This document is the synthesis: the
corrections already applied to the design doc, the concretized Stage-1
target, the build order, and the decisions parked for the Leader. It
supersedes nothing in the design doc except the specific sentences the
panel proved false, which have been corrected in place.

## 1. Corrections established and applied

**The substrate does not guard admission.** The design doc's §0.1
originally claimed `fiberCarrier()` enforces site-checked admission at
runtime. The obsmetrologist's code audit found no guard anywhere in
`fiber.mts`, and the live probe confirmed it: a `predicationSite`
knowing only the predicate `metabolizes` accepted a meme predicated on
`teleports`, with `composeFibers` minting a fresh fiber for the
foreign predicate. The finding is preserved executably in
`test/substrate-admission.test.mjs`, which asserts the substrate's
current permissiveness so that the membrane service's own suite can
assert the opposite verdict at the membrane — and so that any future
guard grown inside `relating` fails this test loudly instead of
silently doubling the membrane's job. Consequence: admission control
is wholly the membrane service's to build. There is no partial
foundation to lean on.

**The "unreachable packages" premise is dead.** The corpus repair
landed the same day the scaffold was written: all nine verb packages
are published green to the local registry (674/686 tests corpus-wide,
round-2 verification in
`agent-computer-system-engineering-services-section/data/records/2026-08-21-corpus-repair/`),
and `relating@0.1.4` installs clean — this app now pins it as a real
dependency, with the house per-package `.npmrc` scoping
`@red-cup-engineering` to the local registry. The README and design
doc have been corrected.

**The Eigen threshold is demoted, twice over.** Its own source
disclaims it (`L` and `σ` have no operational definition for a
predication-cell state space), and it is a population-level
stationary-distribution result — lethal mutagenesis over many
generations — misused as a single-event pass/fail gate. Replacement,
converged on independently by the obsmetrologist and the biophysicist:
gate each division on (a) the daughter's settled charge state being a
genuine closure fixed point rather than a mid-cycle transient, which
`VerificationTournament.lean`'s `no_periodic_orbits` /
`settled_verdict_of_closure_certificate` makes a proved, directly
checkable condition, and (b) bounded daughter-pair charge divergence
read through the same `h1rank` machinery Stage 2 already uses. Eigen
survives only as a long-run lineage invariant, checked once mutation
has an operational definition. Weismann's barrier is similarly
deferred: it firewalls germline from soma, and Stage 1 has no soma —
at this stage the rule is honestly a commit-versus-working-buffer read
discipline (division reads only settled state, never transients), and
the Weismann citation waits for the stage that earns it.

**The death taxonomy grows from two modes to four, with renames.**
What the design doc called "structural death" is bioenergetic death:
the uncoupler scenario, proton-motive force collapsed without any
mechanical damage, metabolism relaxing to detailed balance — the
site's charge dynamics crystallizing exactly as §0.3–0.4 describe.
Real structural death is a different thing the design was missing
entirely: the boundary itself failing (lysis, rupture, pore
formation), after which the interior/exterior distinction that defines
the site is gone — not a graceful settle but a category failure, an
explicit site-dissolved terminal state. The obsmetrologist added a
fourth from the proved side: ossification, the site's cover nerve
crossing the rigidity-percolation load-bearing threshold
(`Percolation.lean`'s `loadBearing_iff_critical`), read from the same
`h1rank` already computed — crystallized-but-not-void, the
informational-amyloid death the estate-cell-math survey names. And
one discipline from the biology: the programmed-versus-boundary axes
are orthogonal, not exclusive — regulated necrosis (necroptosis,
pyroptosis) is a program that produces boundary failure — so the
simulator's post-mortem record must say which mode occurred from
independently inspectable evidence (permanently-⊥ census for
bioenergetic; PCD stage enum for programmed; site-dissolved flag for
boundary; percolation threshold for ossification), never one boolean.

## 2. The Stage-1 cell, concretized

**The gradient is an abstract transmembrane proton-motive force,
Δp(t).** It is the one free-energy currency universal across the
domains of life, and it is definitionally a property of the object
Stage 1 already has — a boundary with an inside and an outside — where
a redox couple is a same-compartment ratio that never references the
membrane. Δp is a standing external parameter set and maintained by
the harness, read by the cell, never computed from interior reactions
and never a scalar the cell spends down: the moment the gradient
becomes an ordinary depleting energy variable, the design's own
gradient falsifier is pre-empted by construction (guardrail 4, §7).

**Seven reactions, cycle-shaped.** The network topology is
load-bearing: a linear chain relaxes to the same equilibrium whether
or not a gradient exists, making driven and dead states
indistinguishable — which is precisely the falsification condition the
design doc names for itself. Only a genuine cycle holds "driven
non-equilibrium steady state" and "dead equilibrium" as two
distinguishable fixed points.

- R1 uptake, facilitated and gated: `S_out → S_in`
- R2 cycle entry: `S_in + I2 → I1`
- R3 the gradient-coupled step (the synthase analogue):
  `I1 + L + [Δp] → I2 + H + W`, forward-favored only while Δp holds;
  as Δp falls the net rate falls toward reverse
- R4 work discharge: `H → L`, with H-consumption the literal price of
  resolving a paraconsistent-charge disagreement elsewhere in the site
- R5 export, facilitated and gated: `P_in → P_out`
- R6 accumulation toward division: `2W → W_pool`
- R7 constitutive leak: a small, always-on, ungated back-leak of Δp

R7 is not decoration: real mitochondria spend roughly a fifth of
resting metabolism on basal proton leak, and a standing, unavoidable
maintenance cost is the honest form of "no free settling" — the
estate's own Landauer doctrine applied to the cell rather than
asserted about it. Any active-transport gate added later draws down
the same Δp pool R3 uses, because in a real cell the same gradient
runs the synthase and secondary active transport — one budget, not
two.

**"The cell doing work," observably:** two plottable numbers. Net
clockwise flux around the I1⇌I2 cycle — sustained while Δp holds,
decaying to zero as it is cut. And the H-funded charge-resolution
rate: disagreements resolved per tick attributable to an R4 spend,
distinguished from disagreements that resolve unaided. If the second
number is ever indistinguishable from an unconditional resolution
rate, the gradient falsifier has fired for real.

**Division is an adder, not a threshold:** divide when `W_pool` has
grown by a fixed increment since the last division, regardless of size
at birth — the empirically supported model of bacterial size control
(Amir 2014; Taheri-Araghi 2015). At the split, apply the two-part
fidelity gate from §1.

**All four deaths as runnable scenarios:** harness drives Δp→0 for
bioenergetic (flux decays, H flatlines, valuation settles permanently
and never changes absent new marks); a fault injection forces the
membrane to always-admit or destroys it for boundary death (explicit
site-dissolved terminal state); an admitted death-signal mark drives
the PCD state machine — vacuolization, collapse, digestion, shrinkage,
corpse — with the decisive test that it can kill while flux is nonzero
and Δp is high; and the percolation threshold read from `h1rank` flags
ossification. The suite must include one run where PCD fires with the
gradient intact and one where bioenergetic death occurs with PCD never
invoked, proving the paths are not aliases.

## 3. The membrane service

**It gets promoted.** Per the app doctrine, an app is an element of H⁰
over its section's cover, and `biology-simulation-services-section`
currently has no `services/` directory at all — the cover is empty,
and "global section" is aspiration until
`biology-simulation-services-section/services/membrane` exists as a
sibling package with a real `scripts/` surface and a dependency edge
from this app. `src/membrane.mjs` staying app-internal is the
doctrine's own named migration seam, not a stable end state; it works
either way, which is exactly why the drift would be invisible without
the directory-structure check.

**The contract, from the formalist's proposal, amended by the audit.**
`createMembrane({site, predicates, dataRoot, membraneId})` returning
`{admit, reject, transform, nested, valuation}`: admission evaluates
an ordered array of named predicates — a mosaic, never a monolith,
because a real membrane is hundreds of independently gated proteins
with no central decision-maker, and a single predicate trains the
wrong intuition for every later stage. Each verdict is
content-addressed and atomically recorded (the `local-a2a-membrane`
discipline), rejection recorded as evidence with the failing predicate
named, never as silence. `transform` returns a reshaped mark for
re-attempted admission and never mutates the site. `nested(subSite,
subPredicates)` is the same constructor one level deeper — the literal
P-systems kinship, held for Stage 2's organelles. The amendment the
probe forces: the membrane itself implements the site-presence check
(does this cell's predicate exist in the site?) as its floor predicate,
because the substrate underneath will accept anything.

**The distinctiveness requirement, from the formalist's verdict.** The
nearest prior art is Păun's active membranes, whose polarization
labels {+,−,0} already condition rules on a membrane charge — so an
admission predicate that merely switches on the mark's FOUR value is a
four-symbol pattern match, active membranes re-derived under new
names. The claim that prior art cannot absorb is expressive economy:
admission conditioned on the site's joined evidence trajectory
(witness provenance, independent-source counts) or on
settling-closure behavior — properties of the whole trace no local
rule table holds, which `composeFibers`' knowledge-join supplies as
one generic algebraic operation where a P-system encoding pays a
combinatorial rule-table tax per predicate. Therefore Stage 1 ships at
least one provenance-sensitive predicate (reject a claim whose
witnesses are digest-identical to witnesses the site already holds —
the resubmission-attack gate) as a requirement, not an extension.
Stage 3 planning should also note now: receptor-style transduction —
where the admission event itself is the payload and nothing crosses —
is a structurally different predicate shape from translocation, and
the bamboo Lsi transport template (excellent for gated translocation,
already a multicellular relay and correctly seated at Stage 3) does
not cover it.

## 4. The settling engine

**One tick:** gather the memes admitted this tick plus the standing
valuation; fold by `composeFibers`' knowledge join (the only merge —
admit/reject happened at the membrane, before any meme reaches the
fold); advance the metabolic layer one Euler step with the gradient
gating which reactions carry nonzero forward rate (a depleted Δp zeroes
those constants, propensity follows by `propensity_zero_of_zero_rate`,
and the field freezes at whatever it reached — the trivial fixed point
that is bioenergetic death's mechanism); check quiescence. Two
fixed-point notions stay separate, per the design's own discipline:
charge-layer (the fold produces no change, witnessed by the
`knowledgeLeastValuation` receipt machinery) and chemistry-layer
(`IsEquilibrium`, gradient-sensitive and stronger).

**The regime is forced, not detected.** A Stage-1 site is finite by
construction, which forces strict settling with closure ordinal κ ≤ 3
(`fin_scott`, `classify_strict`, `Charge.strict_finite`). Build no
regime classifier: any single cell taking more than three join-ticks
to settle is a bug, not a regime, until Stage 2's nesting
reintroduces genuine unboundedness. This is also the house theorist's
second prediction, instrumented for free.

**The metabolism module is a transcription with conformance tests,
never an extraction.** The Lean development proves single-step
invariance over constructive reals (`RReal`, a Cauchy-sequence
quotient with no computable Float instance — extraction is a dead
end) and proves no convergence theorem: once at equilibrium the Euler
flow stays there; nothing proves an integrator arrives. The `.mjs`
transcription carries three property tests mirroring the proved
statements — propensity nonnegativity; `eulerStep` identity at `dt=0`
and at a zero field; detailed balance implying fixed point within
stated float tolerance, with `proceeds_forward` as a strict
inequality — and a module header stating plainly that it is a
conformance-tested transcription of `MassActionRate.lean` /
`DetailedBalance.lean`, not the proved statement itself. The
`RReal`-to-float binding lives in its own separately tested module,
never folded silently into membrane or metabolism.

**Replay from seed requires, and gets, three things nothing supplies
for free:** deterministic fold order (with a test that `joinKnowledge`
is order-insensitive in implementation, not just on paper); a gradient
schedule that is a pure function of tick number or an explicitly
logged input, never wall-clock or RNG; and the ordered meme list
consumed each tick logged so a replay reconstructs identical
`composeFibers` calls. The run-trace journal is not incidental
engineering: a settling run that is not logged and replayable is a
private assertion, which the house's own witness doctrine treats as
structurally incomplete — the trace is the discharge's public witness.

**One proved instrument the design gains for later:** K₄ holonomy
around reaction loops distinguishes repairable disagreement from a
topological obstruction to ever agreeing — a frustrated cycle
(A⇌B⇌C⇌A that cannot jointly detailed-balance) reads as nonzero
holonomy where a case-by-case flux check sees nothing structural.
Noted for the stage that first builds a multi-loop network; not
Stage-1 scope.

## 5. Composition plan, in the doctrine's own terms

Local cover: exactly one element once promoted —
`services/membrane`. Cross-section, CapCell-bound references:
`@red-cup-engineering/relating@0.1.4`, pinned now, exercised by the
characterization test. `animating` is deferred out of Stage 1
entirely: the design doc's §0 specifies no perceive/act loop, so its
listing as a Stage-1 need was premature — it enters at the stage whose
text actually uses it. `socializing` is Stage 4 only. The
gradient/reaction module is not a cover element until the transcription
exists as a package with a `scripts/` surface; until then it is a
hand-rolled stand-in and labeled as such. The trace journal wants the
witness-journal pattern as its eventual cover element.

Where nonzero H¹ would first show up, checkably: the membrane's
epistemic verdicts and the site-presence floor check must agree on
what "site" and "already present" mean — feed the same mark through
both and diff the verdicts the moment both exist. At Stage-1
completion, run the cover-nerve `h1rank` computation over the actual
interface graph (entities = data shapes crossing module boundaries,
cells = call sites, components = shape clusters) by hand once, the
way the six-engineering-programs note actually ran its J26 check —
`h1rank ≠ 0` is the composability falsifier, computed rather than
argued.

## 6. The falsifiers as experiments

Each of the design doc's four falsifiers becomes a minimal pair over
identical mark sequences. Paraconsistency: knowledge-join site versus
last-write-wins collapse, fed adversarial multi-source traces
(synthesized deliberately — a single-membrane Stage 1 may never
organically produce the contradiction the substrate exists to hold),
observing whether any downstream decision diverges. Membrane: typeGate
versus provenanceGate under the resubmission attack — the case a
type-keyed rule is structurally unable to express, built as the first
integration test. Gradient: identical runs with the gradient gate
present and deleted, cut Δp mid-run, diff post-cutoff behavior — plus
mutation testing: delete the gate branch and if no test fails, the
gate was never load-bearing regardless of intent. Composability: the
§5 cover-nerve computation. Alongside these, the house theorist's
third prediction earns its own A/B: under an identical injected burst
of contradictory marks, the paraconsistent-hold cell should show a
measurably smaller blast radius (cells whose valuation changes,
iterations to next fixed point) than a collapse-at-admission cell —
the jade felted-toughness doctrine, finally run as an experiment
instead of told as a story.

## 7. Guardrails

The five ways an implementing agent will predictably drift, each with
its catch. A bespoke charge store that behaves like `relating` but is
not it — caught by requiring the real dependency exercised before any
interior-state code is accepted (now standing, via the
characterization test). The membrane staying app-internal forever —
caught by checking the directory structure against the doctrine's
base/cover table at Stage-1 completion, not by checking that
admission logic runs. The deaths collapsing into one flag — caught by
the two mandatory runs in §2 and the independently inspectable
post-mortem evidence per mode. The gradient decaying into an ordinary
energy scalar — caught by the automated with/without comparison run
as CI, not as a one-time design review. Real dependency pins declared
without re-deriving the composition plan — caught by requiring the
Stage-1 completion note to state which packages were composed as
which kind of reference, local H⁰ versus CapCell-bound, and by the
hand-run cover-nerve check.

And the standing rhetorical discipline, which the biophysicist ranked
above every technical risk: the citations in this program are real and
well-chosen, which is exactly what makes it easy to slide from "the
model behaves cell-like" into "this is evidence about real cells."
Simulator output is described in biological vocabulary only with the
"in this formal system" qualifier attached, until an actual comparison
against real single-cell data is attempted and reported.

## 8. Build order

1. Promote `src/membrane.mjs` to
   `biology-simulation-services-section/services/membrane` and
   implement the §3 contract, site-presence floor plus provenanceGate,
   with the crossing journal. First test: the substrate
   characterization test's scenario, now rejected at the membrane.
2. The metabolism transcription module with its three conformance
   properties and the separately tested float binding.
3. The settling engine tick (§4) over the real `relating` fiber, with
   the replay journal and the κ ≤ 3 instrumentation.
4. The Stage-1 scenario: the seven-reaction cell under maintained Δp —
   work observables, adder division with the two-part gate, all four
   death scenarios.
5. The falsifier suite (§6), including the blast-radius A/B.
6. Stage-1 completion note: composition kinds stated, cover-nerve
   h1rank run by hand, falsifier outcomes reported plainly.

## 9. Decisions

The app's name is settled by the Leader: **natural-computer-simulation-
engine**, plain and descriptive — apps carry working names; the house
backronym idiom lives in the group glossary, not in package names. The
app, its directory, its package name, and this design pair have all
been renamed accordingly. (One glossary note flagged in passing, for
the glossary's own backlog, not this app's: the silica series' second
regime, vitrimer/zeolite, has no house term.)

Adoptions this synthesis made that the Leader may still veto:
`animating` deferred out of Stage 1; the death renames (bioenergetic
for what was "structural", structural reserved for boundary failure)
and the fourth ossification mode; the Eigen demotion and its
replacement division gate.
