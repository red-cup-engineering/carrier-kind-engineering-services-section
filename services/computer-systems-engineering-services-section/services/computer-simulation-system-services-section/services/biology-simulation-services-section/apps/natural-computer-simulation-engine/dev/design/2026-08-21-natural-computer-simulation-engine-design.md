# natural-computer-simulation-engine design

This document is the actual deliverable behind the `natural-computer-simulation-engine`
scaffold: what the simulator simulates first, the staged roadmap from
there, what each stage needs from the estate's own packages, how the
design differs from the public virtual-cell field's mechanistic and
learned lineages and what it should honestly borrow from both, and what
would show the approach wrong. It draws on two prior surveys
(`estate-cell-math.md` and `virtual-cell-field.md`, both dated
2026-08-21) and on the synthesis note
`natural-computing-science-services-section/content/text/documents/articles/notes/2026/08/21/2026-08-21-the-cell-as-natural-computer.md`,
which states the paradigm-case argument this design assumes rather than
re-argues.

## 0. What the simulator simulates first

The first target is deliberately small: **one membrane-bounded cell**,
simulated as a settling system, with no organelles, no signaling, and no
population. Five claims define this target precisely.

### 0.1 The membrane is the only entry for opaque data

Nothing enters the cell's interior state except by crossing the
membrane, and the membrane is not a passive filter that lets data through
by connectivity — it is a **predicate**, evaluated against what the
incoming mark *is*, not merely against a rule that happens to name it.
This is the mark doctrine's admission discipline
(`obsmetrologia/docs/verso/mark/mark.md`): a mark carries exactly one of
two dual roles, token (identity-carrying) or claim (content-carrying).
One thing the substrate does NOT supply, established by direct probe of
`relating@0.1.4` (2026-08-21 panel review): neither `fiberCarrier()` nor
`composeFibers` guards admission. `fiberCarrier()` only projects a
site's own cells into fibers, and `composeFibers`, fed a meme whose
predicate the site has never seen, mints a fresh fiber for the foreign
predicate without complaint — a site knowing only `metabolizes`
accepted `teleports`. Admission checking therefore exists nowhere in
the estate today and is wholly this app's membrane service to build;
an earlier draft of this paragraph claimed the opposite and was wrong. The nearest executable analogue of a literal boundary enforcing
this is the repeated `local-a2a-membrane.mjs` pattern: a content-addressed
(sha256), atomically-written, per-provider-scoped store that admits and
digests everything crossing it. Neither of these is a membrane *service*
yet — that gap is named explicitly in §2 and §3 below — but together they
fix the contract a membrane service must satisfy: **admit, reject, or
transform**, decided by evaluating the mark against the site's own
predicates, with every admission content-addressed so a later audit can
recover exactly what crossed and when.

### 0.2 The interior is a predication site

Once admitted, a mark becomes state inside a **predication site**: a
collection of predication cells φ = (s, p, o), each holding a FOUR-valued
charge (`[truth-side, falsity-side]` plus witnessing marks) rather than a
plain numeric value. This is the direct payoff of building on
`@red-cup-engineering/agent-organization-engine` rather than on a bespoke state
representation: the cell's "concentration of metabolite X" is not a
float, it is a charged claim that some evidence supports and some
evidence may simultaneously contradict, and the simulator does not have
to invent a conflict-resolution mechanism because `composeFibers`
(folding many memes into one valuation by knowledge-order join) already
is one. This matters concretely the first time two admitted marks
disagree about the same site — a real possibility once the membrane
admits from more than one source — and is the reason a paraconsistent
substrate was chosen over the alternative of simply rejecting the second
mark: rejection would throw away evidence a real cell's own regulatory
apparatus might legitimately need to hold onto, unresolved, for a time.

### 0.3 Metabolism is charge dynamics driven by a maintained gradient

A cell's interior settling is not free-running toward some intrinsic
attractor; it is driven. Per the estate's own VENT / dissipative-structure
doctrine (`2026-08-21-note-on-attention-thermodynamics.md`, citing the
alkaline-vent theory of the origin of life and Prigogine's dissipative
structures directly): an organism is order that persists because it
dissipates a gradient faster than dead matter can. Concretely, this
design requires the simulator to hold an explicit, externally-maintained
gradient parameter — not an ambient "energy" scalar spent down to zero,
but a standing difference the cell's own settling process draws on to do
work resolving disagreement in its charge state. `detailedBalance_euler_fixed`
(`ObsmetrologiaPhysicalScience/ReactionNetworks/DetailedBalance.lean`) is the proved
statement that, in the underlying chemistry, detailed balance — zero net
flux — is a fixed point of the Euler-integrated rate flow; read against
the gradient requirement, a cell's settling toward that fixed point is
exactly what "consuming the gradient" looks like at the charge layer, and
a cell whose gradient is cut off should settle to the *trivial* fixed
point (no further charge resolution occurring) rather than to some
biologically meaningful steady state — the difference between those two
outcomes is what §0.4 turns into a definition of death.

### 0.4 Death is the gradient's loss

Two independent failure semantics are available and this design keeps
both, deliberately not collapsing them into one:

- **Structural death**: the site reaches a state where its remaining
  cells are permanently `⊥` — no further evidence can ever reach them,
  the Lorentzian void cone's apex read as a "dimension-detecting
  invariant" (`lorentzian-apex-void-as-timelike-spacelike.md`). This is
  the direct consequence of §0.3's gradient-loss condition: cut the
  gradient, and the settling process that would otherwise keep resolving
  disagreement into fresh, live cells instead runs out of anything to
  resolve, and the site crystallizes.
- **Programmed death**: an explicit, stageable state-machine sequence —
  vacuolization, vacuole collapse, organelle digestion, cell shrinkage,
  corpse — matching the literal biological PCD sequence documented, with
  primary citation, in the bamboo intercalary-pith note (Guo et al. 2019,
  *Plant Biotechnology Journal*). This is not derived from the gradient
  condition; it is a separate, actively-executed program the cell can run
  even while a gradient remains available, and the simulator should model
  it as its own state machine rather than as a special case of gradient
  loss.

Keeping these apart matters for the same reason the physarum-
zeosemiocenum note keeps settling-sheaf H¹ (always zero, by construction
of the merge as a least-upper-bound) apart from cover-nerve cycle rank
(the real, non-vanishing obstruction count, computed today by
`cover-nerve.mjs`, `computeCoverNerve` returning `h0rank`/`h1rank`): two
different quantities that happen to look like the same kind of "the cell
has stopped" signal are not interchangeable, and conflating them would
hide which of the two actually happened in any given simulated run.

### 0.5 Division is site-splitting

A predication site divides by splitting, not by copying-then-diverging: a
new site boundary is drawn through the existing site's cells, and the two
resulting sites each inherit their share of the parent's settled state —
never its transient working state, per Weismann's barrier stated as a
write-direction rule rather than a writer-identity rule (physarum-
zeosemiocenum note §9.1). The Eigen error threshold (`u < ln σ / L`,
§9.3 of the same note) is retained only as a long-run lineage
invariant, not a per-division gate: its own source disclaims it (§9.3
states neither `L` nor `σ` has an operational definition here), and it
is a population-level stationary-distribution result, not a
single-event validity test. The per-division gate is instead the pair
the 2026-08-21 panel converged on: the daughter's settled charge state
must be a genuine closure fixed point rather than a mid-cycle
transient (`VerificationTournament.lean`'s `no_periodic_orbits` /
`settled_verdict_of_closure_certificate`, proved), and daughter-pair
charge divergence must stay bounded, read through the same `h1rank`
machinery Stage 2 already uses. Virchow's own stated
axiom — *omnis cellula e cellula*, cell.md,
`biological-science-services-section/lib/legacy/2026-06-21-biology/_archive/atom/scripts/bonding/content/molecule/scripts/assembling/content/cell/cell.md`
— is the plain-biology grounding this design keeps as its literal
starting point: a cell divides into cells, never into anything else, and
a simulator whose division routine could ever produce a non-cell result
would have broken the model, not discovered something.

## 1. Staged roadmap

Four stages, each strictly building on the last, none skipped.

### Stage 1 — single membrane

Exactly §0 above: one cell, one membrane, one predication site, a
maintained gradient, division and death both implemented. No organelles,
no second cell, no signaling. This stage is the one the current
scaffold's `src/membrane.mjs` placeholder names a contract for, and it is
the only stage this document commits to a concrete implementation shape
for — the remaining three stages are roadmap, not yet design.

### Stage 2 — organelles as nested sub-sites (P-systems kinship)

An organelle is a bounded sub-region of the cell's predication site, with
its own local rule set and its own boundary cells where evidence is
admitted — a subsheaf over a region of the base site, per the SHRIMP
brief's GLASS-SPONGE-row reading. This is the stage where the design's
kinship with P systems (Păun 1998; nested, tree-structured membrane
hierarchies, computation by maximally parallel rewriting until no
membrane has an applicable rule left) becomes load-bearing rather than
merely comparative: an organelle's boundary should be implemented as
*another instance of the same membrane contract* Stage 1 built, nested
one level deeper, exactly the way a P system's inner membranes are the
same kind of object as its outer one. The departure from P systems proper
stays exactly what §1c of the synthesis note names: this organelle
boundary evaluates admission epistemically (against the mark's FOUR
charge and the sub-site's own predicates), where a P-system membrane's
rule fires on symbolic pattern match alone. `computeCoverNerve`'s
`h1rank` (cycle rank = cells + components − entities) is the concrete,
already-executable readout this stage should reuse as a per-organelle
"internal disagreement" signal, kept separate from the always-zero
settling-sheaf H¹ per §0.4's discipline.

### Stage 3 — signaling between cells

Two or more Stage-1 cells, each with its own membrane and site, exchange
marks across their respective boundaries — not yet a shared consensus
substrate (that is Stage 4), just point-to-point admission between two
independently-settling cells. The bamboo transport model (Lsi1 facilitated
diffusion, Lsi2 active antiport, Lsi6 facilitated efflux — three
molecularly distinct, transporter-gated stages for one pathway,
`2026-08-21-bamboo-silica-biology.md` §1–2) is the concrete template this
stage should implement against: every stage a signal passes through
going from one cell's interior to another's is gated by a specific,
named membrane predicate, with no bulk unregulated diffusion anywhere in
the path — mixed passive (facilitated) and active (antiport) transport,
both representable as distinct admission-predicate variants on the same
Stage-1 membrane contract, not as a new mechanism. No signaling-cascade-
specific estate math exists yet (receptor/ligand binding, kinase
cascades); the general reaction-network Lean substrate is general enough
to encode one given species and rate data, and this stage is where that
substrate would first need to be exercised for something beyond bare
metabolism.

### Stage 4 — multicellular sheet

Many cells, related through `@red-cup-engineering/agentic-socialization-engine`'s Social
Field: members are cells (`animating` agents carrying their own
`relating` memes), the base is an observer category whose morphisms are
directed translation settling-morphisms between cells, and the section is
the glued consensus limit with its own H¹ obstruction, written by
`converge`. This is the stage where "a cell simulator" becomes "a tissue
simulator" without inventing new multicellular-specific math: the same
multi-observer machinery `socializing` already implements for
non-biological agents (`content/_archive/spatiotemporal-knowledge-
presheaf`) is reused unchanged, with cells standing in the member slot
`socializing` already generalizes over. Whether a sheet's consensus limit
should ever be expected to reach H¹ = 0 (full agreement) or is expected,
biologically, to sit at nonzero H¹ as its normal operating state — tissue
heterogeneity as a standing obstruction rather than a defect to be
resolved — is an open design question this stage inherits and does not
yet answer.

## 2. What each stage needs from the estate's packages

| Stage | Needs | Source |
|---|---|---|
| 1 | Predication-cell state, FOUR charge, `composeFibers`, the four generators | `@red-cup-engineering/agent-organization-engine` (executable carrier: `fiber.mts`) |
| 1 | Admission contract (mark, token/claim duality, site-checked admit) | mark doctrine (`mark.md`) + `local-a2a-membrane.mjs` pattern — **no service yet; this app's gap** |
| 1 | Mass-action rate field, Euler integration, detailed-balance fixed point | `Obsmetrologia/ReactionNetworks/{MassActionRate,DetailedBalance}.lean` — **proved, not yet bound to a runtime float** |
| 1 | Regime classification (strict/Scott/transfinite/aperiodic) for difficulty grading | `predication-state-of-the-theory.md` |
| 1 | Eigen threshold, Weismann barrier for division fidelity | physarum-zeosemiocenum note §9 |
| 1 | PCD state-machine template; structural (Lorentzian apex) death | bamboo note §6; SHRIMP brief Lorentzian reading |
| 2 | Subsheaf/organelle boundary, reusing the Stage-1 membrane contract one level deeper | SHRIMP brief GLASS-SPONGE row |
| 2 | Per-organelle disagreement readout (`h1rank`, kept apart from settling H¹) | `cover-nerve.mjs`, `computeCoverNerve` |
| 3 | Gated, molecularly-distinct transport predicates (passive + active) | bamboo Lsi1/Lsi2/Lsi6 model |
| 3 | Reaction-network substrate, exercised for a signaling cascade | `ReactionNetworks/*.lean` (general, not cascade-specific) |
| 4 | Agent carrier for the cell-as-agent (perceive/act loop) | `@red-cup-engineering/agentic-animation-engine` |
| 4 | Multi-observer Social Field, translation morphisms, consensus `converge` | `@red-cup-engineering/agentic-socialization-engine` |

The membrane/admission machinery is the one cell in this table with no
package at all behind it yet, at any stage. It is the single piece of new
infrastructure this whole roadmap actually requires; everything else is
composition of substrate that already exists (proved math not yet bound
to a runtime, in the reaction-network case) or already runs
(`relating`/`animating`/`socializing` are published green to the local
registry as of the 2026-08-21 round-2 verification — 674/686 tests
corpus-wide — and `relating@0.1.4` installs clean; the README's earlier
"unreachable mid-repair" rationale is superseded).

## 3. Against VCell, whole-cell mechanism, and the AI-virtual-cell program

This design is not a competitor to any of the three active public
lineages, and saying so plainly matters more than it might first appear,
because the temptation to oversell a new formalism as a replacement for
mature engineering is exactly the failure mode a design document should
guard against.

**Against Karr-style whole-cell mechanism** (28 reconciled submodels,
722 metabolites, 1,857 reactions, fit against ~900 papers): this design
does not attempt to fit a real organism's biochemistry at all, at any
stage. It has no genome, no annotated gene set, and no claim to predict a
real cell's measured phenotype. Where Karr's model earns its result by
literature curation at enormous cost, this design's Stage-1 cell is
correct or incorrect only relative to its own stated contract (does
admission actually gate on the predicate, does settling actually reach
the classified fixed point) — a much weaker, much cheaper claim, and one
that should never be described as a validated biological prediction.

**Against VCell**: VCell is a mature, general-purpose reaction-diffusion
platform with six solver treatments, segmented real microscopy geometry,
and 26+ years of continuous use across a wide community. This design
borrows none of its solvers and builds no spatial geometry at all in
Stage 1 — there is no diffusion PDE, no compartment shape, nothing VCell
would recognize as a model it could load. What this design should
honestly borrow, rather than reinvent badly, is **SBML awareness**:
Stage 1's reaction-network layer (species, stoichiometry, rate constants)
maps directly onto SBML's own vocabulary for exactly the same objects,
and building the simulator's metabolism module to at least *read* SBML
reaction/species/compartment definitions — even without implementing
VCell's solvers — would let a Stage-1 cell's metabolic network be
authored in, or checked against, a tool the field has already spent 26
years validating, rather than inventing a second, incompatible reaction-
description format for no reason this design needs. **Validation
discipline** is the second honest borrow: VCell's practice of storing
every model and result in a searchable, rerunnable public database, so a
claim can be checked rather than merely described, is a discipline this
design should adopt for its own settling runs (every simulated cell's
trace should be replayable from its seed, exactly, the way the strict/
Scott-continuous regimes already guarantee it can be) even
though this design will never need VCell's own six-solver machinery.

**Against the AI-virtual-cell program** (Bunne et al.'s manifesto;
scGPT, Geneformer, and kin trained on single-cell measurement data): this
design uses no learned representation anywhere, at any stage, and makes
no claim about matching or exceeding foundation-model perturbation-
prediction benchmarks. It shares exactly one thing with that program's
own self-criticism, and it is worth stating rather than leaving implicit:
neither "Virtual Cells as Causal World Models" nor this design's own
Stage-1 cell currently has a first-principles ground truth to validate
against — Arc Institute's Turing-test framing (behavioral adequacy in
place of ground truth) is a genuinely honest position for a field with no
settled validation standard, and this design does not have a stronger
answer to offer. Where it differs is in what it is trying to be adequate
*to*: the AI program asks whether a model's response to a real
intervention matches a real cell's; this design's Stage 1 asks only
whether its own membrane predicate, settling closure, and gradient-loss
condition behave the way §0 specifies, against no external biological
data at all. That is a much smaller claim, and this design should never
be described, to itself or to anyone else, as more than that until an
actual comparison to real single-cell data is attempted and reported.

## 4. What would show this design wrong

Four separable claims, each with its own way to fail, stated concretely
rather than left as a general disclaimer:

**The paraconsistent-state claim.** If, once Stage 1 is actually built,
every case where two admitted marks disagree about the same site turns
out to be resolvable immediately and unambiguously by a simple last-
write-wins or majority rule — no run ever benefits from holding the
disagreement open as a FOUR-valued charge rather than collapsing it at
admission time — then the paraconsistent substrate is not doing
separating work for this simulator's actual behavior, whatever its
independent merit as a logic, and a plain boolean or numeric state
representation should be preferred on simplicity grounds alone.

**The membrane-as-predicate claim.** If a membrane implemented as a bare
allow/deny rule keyed only on the mark's declared type (the P-system
reading this design explicitly set aside) turns out to produce
indistinguishable admission behavior from a membrane that evaluates the
mark's actual FOUR charge and site context, across every Stage-1 and
Stage-2 scenario this design anticipates, then the epistemic-evaluator
membrane is ornamented P-system rewriting, not a genuine advance on it,
and the simpler rule-keyed membrane should be built instead.

**The gradient-driven-metabolism claim.** If a Stage-1 cell's settling
behavior under a maintained gradient turns out, once actually
implemented and run, to be indistinguishable from its behavior under no
gradient concept at all (i.e., an unconditional settling process that
always proceeds to some fixed point regardless of whether an explicit
gradient parameter is present or depleted), then the VENT/dissipative-
structure framing is decorative narrative over ordinary fixed-point
convergence, and death (§0.4) should be redefined without reference to a
gradient at all.

**The composability claim.** If, when this app actually attempts to
compose `relating`, `animating`, and `socializing` per §2's table (all
three reachable and green as of 2026-08-21), any two of them
turn out to have incompatible contracts that cannot be reconciled without
substantial rework of one or the other — the app-doctrine note's own
named failure mode, a nonzero H¹ class on the app's cover nerve — then
the roadmap's assumption that these three existing packages compose
cleanly with a yet-to-be-built membrane service is wrong, and Stage 1
should be re-scoped around whichever subset actually glues.
