# Estate mathematics a biological cell simulator could build on

Survey of what already exists in `/home/emsenn/info/lib/emsenn/services/561-group`
that bears on a biological cell simulator, organized by what a simulator needs:
an atomic value-carrying unit, a membrane/admission boundary, metabolism (charge
dynamics and reaction kinetics), organelle/colony sub-structure, division and
replication fidelity, signaling, and death. Every claim below is anchored to a
path. Read-only survey; nothing in `agent-computer-system-engineering-services-section`
was touched.

## 1. The atomic unit: the predication cell and its FOUR-valued charge

The estate's most-developed formal object is the **predication cell**, an
oriented triple φ = (s, p, o) — subject, predicate, object — where (s,p,o) and
(o,p,s) are *distinct* cells with independently tracked values, related only by
an explicit converse generator, not by symmetry. This orientation is stated as
load-bearing content, not decoration, across every layer of the doctrine.

Documentation (Verso literate-math tree, one node per concept, each with its
own `.md`):
```
services/science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/lib/obsmetrologia/docs/verso/mark/
  mark.md                                    — the arbitrary atomic primitive (token/claim genus)
  content/utterance/articulating/content/articulation-cell/content/potential-articulation-cell/
    predicating/content/predication-cell/predication-cell.md      — φ = (s,p,o), the assertion-position
    .../potential-predication-cell/potential-predication-cell.md
    .../absurd-predication-cell/absurd-predication-cell.md
    .../stable-predication-cell/stable-predication-cell.md
    .../active-predication-cell/active-predication-cell.md
    .../potential-predication-cell/positing/positing.md           — where value first enters a cell
    .../positing/content/valuation/valuation.md                   — assignment of a bilattice charge per cell
    .../valuation/content/knowledge-least-valuation/knowledge-least-valuation.md
    .../knowledge-least-valuation/settling/settling.md
    .../settling/content/lorentzian-causal-settling/references/lorentzian-apex-void-as-timelike-spacelike.md
```

Values live in a **Belnap FOUR bilattice** `{⊥ₖ, t, f, ⊤ₖ}` (paraconsistent —
a cell can hold contradictory evidence without collapsing) with two orders: a
knowledge order (bottom = absurd/no evidence, top = stable) and a truth order
(bottom = active, top = potential). A **charge** is a `[truth-side,
falsity-side]` pair plus its witnessing marks — evidence *for and against* a
predication, not a single boolean.

The **executable carrier** (not just docs — running TypeScript, tested):
```
services/science-services-section/services/information-science-services-section/services/semiotics-science-services-section/services/articulation-services-section/lib/articulating/predicating/positing/fiber.mts
```
This module already implements, as plain functions and types, the pieces a
cell simulator's state layer would need: `Meme` (one cell bound to one
charge — "the minimal transmissible unit of meaning-with-evidence"),
`FiberAlgebra` (all charged cells over one predicate), `Valuation` (one fiber
per predicate over a base — i.e., a full state snapshot), `knowledgeLeastValuation`
(the all-bottom seed state), `composeFibers` (folds many memes into one
valuation, joining coincident cells by knowledge order — this is literally
"merge concurrent updates to the same site"), and four **generators** —
`converse`, `subjectProjection`, `objectProjection`, `specialization` — each
supplying `pullback` / `exists` (∃) / `forall` (∀) along that generator. These
four generator classes are declared (state-of-the-theory doc) to generate
*all* reindexing in the category, which is exactly the operation set a
simulator needs to move state along relations (e.g., "project all reactions a
molecule participates in," "restrict to one organelle's cells").

## 2. Settling, holonomy, and cohomology — what a "cell reaching equilibrium" is

- **Settling** is the modal-closure fixed point a knowledge-monotone sequence
  of valuations (a "trace") converges to. `valuation.md` above; the
  four-regime classification is in
  `.../services/lenticule-science-corpus/from-predicate-category/predication-state-of-the-theory.md`
  (legacy corpus copy) §"The four-regime stratification": every settling has
  a closure ordinal κ and falls into exactly one of **strict** (κ<ω, H¹=0,
  proved), **Scott-continuous** (κ=ω, H¹=0, proved), **transfinite-bounded**
  (ω<κ<ω₁, H¹≠0, H¹-generators = firing events, proved), or **aperiodic**
  (κ≥ω₁, classified by H¹-class in a direct-limit cohomology, proved via
  direct-limit definition). For a simulator this is a difficulty/complexity
  ladder for free: most cellular processes would run in the strict/Scott
  regime (every local disagreement is repairable in finite/countable steps);
  a process with permanent structural scarring (e.g. a differentiated,
  non-reversible cell fate) is a transfinite or aperiodic regime object.
- **Holonomy is literal, not metaphorical**: K₄ = Aut(FOUR) acts as a gauge
  group; a gauge connection is a functor 𝒞 → BK₄; flat connections mod gauge
  are classified by H¹(N𝒞, K₄) ≅ Hom(π₁(𝒞), K₄) (cited in the SHRIMP brief
  below as proved). Non-trivial holonomy lives in *loops* of the predicate
  category (converse/projection round-trips) — a concrete candidate for
  modeling frustrated/irreversible molecular cycles.
- **No inner product exists on bilattice values** — the corpus's own
  structural finding (Hansen–Ghrist's spectral apparatus provably does not
  extend to FOUR). The proved substitutes are the **Tarski Laplacian**
  (Ghrist–Riess 2022) and **Lawvere Laplacian** (Ghrist et al. 2025)
  fixed-point machinery: H⁰ = ker Lꜰ = the consensus/harmonic space, reached
  by iterating the fixed-point operator rather than by eigendecomposition.
  This is the estate's proved substitute for "energy minimization" in a
  system that cannot use a quadratic energy functional — directly relevant
  to any metabolic/regulatory network whose state space is not a vector
  space.
- Primary synthesis document (owner-commissioned second-pass reading of the
  above, explicitly correcting a first misreading):
  `services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/semiotic-computer-system-services-section/content/text/documents/articles/notes/2026/08/19/shrimp-ecology-brief-v2.md`
  — states the acronym stack (SEA/MUD/FOAM/GLASS-SPONGE/SHRIMP) re-grounded
  at the math layer; §1 is the clearest one-page index into the proved
  results above, with per-claim citations.
- House glossary restatement of the same object (short, readable):
  `services/engineering-services-section/content/text/glossary/terms/semantics-energy-arena.md`
  (SEA = the predication hyperdoctrine as a whole, energy = three named
  obstruction quantities, not a scalar) and its sibling terms
  `field-of-articulating-models.md`, `sponge-holonomy-repair-inference-model-player.md`
  in the same directory.

## 3. Membrane / admission boundary

Two independent, compatible readings exist, one purely formal and one
executable:

**Formal (Mark doctrine).** `mark.md` (path above) establishes that nothing
enters the system except as a **mark** — the arbitrary atomic primitive with
no internal structure — carried by exactly one of two dual roles, **token**
(identity-carrying) or **claim** (content-carrying). Everything downstream
(cells, charges, settlings) is built only from marks admitted this way; there
is no path for opaque data to enter except through this one admission point.
`fiber.mts`'s `fiberCarrier()` function enforces this at runtime: it throws if
a valuation contains a cell or predicate not already present in the
predication site it's being admitted into — i.e., admission is
type-/site-checked, not a bare merge.

**Executable (A2A membrane).** A small, repeated pattern file implements a
literal per-enterprise membrane, appearing identically across many services:
```
services/operations-services-section/services/union-services-section/services/union-market-services-section/services/curiosity-research-market-enterprise/src/local-a2a-membrane.mjs
```
(and ~9 other copies at the same relative path under different enterprise/
service roots, e.g. `.../gemini-notebook-services-section/persistent-notebook-enterprise/src/local-a2a-membrane.mjs`,
`.../source-evidence-attestation-service/src/local-a2a-membrane.mjs`). Each
exports `localA2aMembrane(dataRoot, providerId)`, which scopes a
content-addressed (`sha256`) task/coordination store under one provider's
namespace, with atomic write-then-rename and a serialized write lane per
resource — a concrete, minimal implementation of "one gated boundary per
cell, admitting and content-addressing everything that crosses it." This is
the closest thing in the estate to executable membrane-transport code, and
its content-addressing (digest-keyed storage) is a direct model for
membrane-protein-gated, identity-checked exchange (compare to the Lsi1/Lsi2
transporter-gated silicon uptake pathway in §7 below — both are "nothing
crosses without a named gate").

**Named at the biology-metaphor layer**: the "Rendanheyi border" —
`services/operations-services-section/services/enterprise-services-section/services/enterprise-systems-services-section/services/rendanheyi-enterprise-services-section`
— is the complexity-ladder's Rung-6 membrane concept (§5 below), described as
an ActivityPub/A2A-gated interface managing "metabolic exchange of
information" between a cell (machine) and everything outside it.

## 4. Metabolism: two independent, concrete formal registers

### 4a. Chemical reaction-network math (Lean, proved)
```
services/science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/lib/obsmetrologia/Obsmetrologia/ReactionNetworks/
  Network.lean
  MassActionRate.lean       — propensity = k · Π(cₓ)^stoich, mass-action rate field, Euler step, IsEquilibrium
  DetailedBalance.lean      — reversible reactions, net flux, detailedBalance_iff_netFlux_zero,
                               detailedBalance_euler_fixed (chemical equilibrium IS a settling fixed point)
  Reachability.lean
  SupportProjection.lean
  Entropy.lean
  FreeEnergyDescent.lean
services/.../Obsmetrologia/Thermodynamics/
  BoltzmannEntropy.lean
  Temperature.lean
```
This is literal, proved chemical-reaction-network theory over a real-number
type (`RReal`) local to the Lean library: stoichiometric propensities, a
vector rate field over species concentrations, discrete-time Euler
integration, and a proved theorem that **detailed balance ⟺ zero net flux ⟺
the reversible pair is a fixed point of the Euler flow** —
`detailedBalance_euler_fixed` directly identifies chemical equilibrium with
the same "settling fixed point" concept used for the predication-cell
dynamics in §2. A metabolism module for a cell simulator could import this
almost unchanged: species, stoichiometry, rate constants, and an integrator
already exist and typecheck; what is missing is any binding of `RReal` to a
runtime float and any enzyme/regulation layer (Michaelis–Menten, allostery)
above raw mass action.

### 4b. Rigidity/percolation + kinetic-proofreading register (design note, dated 2026-07-25)
```
services/science-services-section/services/engineering-science-services-section/services/materials-services-section/services/smart-materials-service-section/services/abiotic-smart-material-services-section/services/semiotic-smart-material-services-section/content/text/documents/articles/notes/2026/07/25/2026-07-25-note-on-physarum-zeosemiocenum-system-specification.md
```
titled *Physarum zeosemiocenum* — an organism-as-computer specification built
directly on cell/molecular biology math, citing primary literature
throughout rather than analogizing loosely:
- **Phillips–Thorpe constraint counting** (rigidity percolation, ⟨r⟩꜀ = 2.4)
  as the state variable of a two-phase substrate — one floppy/flowing phase,
  one rigid/recording phase — read as the ossification axis a membrane or
  cytoskeleton could sit on.
- **Tero, Kobayashi & Nakagaki 2007** (*Physarum* tube-adaptation dynamics)
  identified explicitly as a mirror-descent method over the graphic matroid
  of a cover nerve — i.e., the actual slime-mold foraging algorithm is cited
  as the metabolism's search dynamics, separate from body scale (the note is
  careful that the borrowed genus name is the dynamics, not the organism).
- **Hopfield 1974 / Ninio 1975 kinetic proofreading** (§9.2): the squared
  error-rate reduction from an irreversible activated delay step — cited and
  then explicitly *not* claimed to transfer to the verification system,
  which is a useful discipline for a simulator: distinguishes what
  transfers from biology (the general shape of a proofreading step) from
  what does not (this system's own steps are not thermally-equilibrated
  substrates).
- **Eigen 1971 error threshold** (§9.3): `u < ln σ / L`, the quasispecies
  mutation-rate ceiling above which heritable information delocalizes — a
  direct, reusable formula for a division/replication-fidelity module.
- **Weismann's barrier** (§9.1): germline/soma one-way information flow,
  stated as a rule about write *direction*, not writer identity — reusable
  directly as a division-fidelity invariant (a daughter cell's committed
  state descends only from settled parent state, never from transient
  working state).
- A companion Lean-cited cohomology apparatus separates **settling-sheaf H¹
  (always zero, by construction of the merge as a least upper bound)** from
  **cover-nerve cycle rank H1rank (the real, non-vanishing obstruction
  count)** — §4 of the note is an extended, careful argument for keeping
  these apart, directly useful because a simulator's "the cell has an
  internal contradiction it must resolve" signal should be the graph-cycle
  quantity, not the always-vanishing sheaf one.
- A tiny executable projection of the cover-nerve math is local to the
  relational-graph readout:
```
services/science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/services/mathematical-readout-exchange/src/cover-nerve.mjs
```
  `computeCoverNerve({entities, cells, components})` returns `h0rank`
  (components), `h1rank` (cycle rank = cells + components − entities),
  `coordinationFree` (h1rank === 0), and `landauerBits`/`coordinationCost`
  (both = h1rank) — 30 lines, admissibility-checked, ready to reuse as a
  per-organelle or per-cell "internal disagreement" readout.

### 4c. Origin-of-life / dissipative-structure framing (today's note)
```
services/science-services-section/services/information-science-services-section/services/semiotics-science-services-section/services/biomimetic-semiotics-science-services-section/content/text/documents/articles/notes/2026/08/21/2026-08-21-note-on-attention-thermodynamics.md
```
Names the alkaline-vent theory of the origin of life directly: "the first
metabolism [is] in porous mineral at the heat-water interface: proton
gradients across thin membranes of stone foam, chemistry organizing itself
before cells existed," and invokes Prigogine's dissipative structures
(convection cells, whirlpools, organisms are order that persists because it
dissipates a gradient faster than dead matter can) as the general physics a
metabolizing cell instantiates. Also grounds Landauer's principle (erasing
one bit costs ≥ kT ln 2) as the estate's bridge between information-erasure
accounting and real heat — relevant to any simulator wanting a genuine
energy budget rather than an arbitrary ATP counter.

## 5. Organelle / colony structure — sub-site as sub-sheaf

The SHRIMP brief (§1, GLASS-SPONGE row) states the proved reading directly: a
**colony is a subsheaf over a region of the base site**, carrying its own
per-observer rule system (a proved extension of the corpus's multi-observer
theorem — see `network-sheaf-consensus-on-agent-graphs` and
`crdt-convergence-with-per-observer-rules`, cited in
`predication-state-of-the-theory.md` §"What the recent work has added"); its
"pores" are the boundary cells where evidence is admitted. Because a sheaf
section is a *compatible family*, not stored state, colony health "must be
recomputed," never cached — directly transferable as the organelle model: an
organelle is a bounded sub-region of the cell's predication site with its own
local rule set, and its state is always a live recomputation over its
boundary conditions, never a persisted blob.

An independent, executable near-analogue exists at the "knowledge cell"
layer (same word, economic rather than biological referent, worth noting so
it is not confused with the biological cell math above):
```
services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/semiotic-computer-system-services-section/services/semiotic-computer-cell-services-section/knowledge-cell-services-section/
  topical-knowledge-cell-brokerage-service/   — 8/8 tests passing
  topical-knowledge-cell-discovery-service/   — 9/9 tests passing
  topical-knowledge-cell-report-service/      — 14/14 tests passing
  topical-knowledge-cell-corpus-service/      — fails on missing workspace deps, not logic
  topical-knowledge-cell-enterprise/          — fails on missing workspace deps, not logic
```
Its README states plainly: "This section is a pure grouping umbrella…
`knowledge-cell-services-section`" — an economic-actor "cell" (owner-admitted,
hires storage/discovery/report/market/identity/witness services
independently), useful only as a structural analogy for "a cell hires its
organelles as separately-testable services," not as biological cell math.

## 6. Division and replication fidelity

Estate-native math for division is scattered but concrete:
- **Eigen error threshold** and **Weismann barrier** (§4b above,
  physarum-zeosemiocenum note §9) give a mutation-rate ceiling and a
  one-way-write invariant, both directly reusable.
- **Settling firings as division-like events**: the SHRIMP brief reads each
  H¹-generator-clearing "firing" as a discrete, scored event (its build order
  §3: "each firing is an H¹-generator event and is scored as such") — a
  candidate formalization of "a cell cycle checkpoint clears" as a
  cohomology-obstruction-clearing event rather than a clock tick.
- **Literal biology, legacy glossary chain** (atom → molecule → cell →
  organism, one concept per file, textbook-register prose, not proved math):
```
services/science-services-section/services/natural-science-services-section/services/biological-science-services-section/lib/legacy/2026-06-21-biology/_archive/atom/scripts/bonding/content/molecule/scripts/assembling/content/cell/
  cell.md                                    — cell theory, omnis cellula e cellula, prokaryote/eukaryote, endosymbiosis
  scripts/integrating/integrating.md
  scripts/integrating/content/organism/organism.md
  scripts/integrating/content/organism/scripts/maintaining/content/physiology/scripts/metabolizing/content/metabolism/metabolism.md
  scripts/integrating/content/organism/scripts/speciating/content/plant/scripts/dividing/content/meristem/scripts/differentiating/content/cell-wall
```
  This gives Virchow's *omnis cellula e cellula* as the estate's own stated
  starting axiom for division, plus a plant-specific dividing→meristem→
  differentiating→cell-wall chain (useful for a plant-cell branch of a
  simulator) and a fungal decomposing→recycling→cellulose chain nearby in
  the same tree.
- **Bamboo intercalary meristem** (today's note, §6):
```
services/science-services-section/services/natural-science-services-section/services/biological-science-services-section/services/botany-services-section/content/text/documents/articles/notes/2026/08/21/2026-08-21-bamboo-silica-biology.md
```
  documents a real three-phase cell-division/elongation cycle (initial
  division → rapid division → rapid elongation, turgor- and sugar-driven,
  hormonally gated by auxin/gibberellin) with primary citations (Chen et al.
  2022 *Plant Cell*; 2025 *PNAS* single-nucleus study) — usable directly as
  a plant-cell division-rate model.

## 7. Signaling and transport

The bamboo note (§1–2) gives a complete, citation-grounded membrane-transport
model directly usable for a signaling/transport module: **Lsi1** (NIP-III
aquaporin, facilitated diffusion, influx at the root distal membrane),
**Lsi2** (H⁺-coupled antiporter, genuinely active transport, efflux to the
stele), **Lsi6** (facilitated diffusion, shoot unloading) — three
molecularly distinct gates for one transport pathway, with the note
explicit that "every stage the silicic acid molecule passes through going
from soil to leaf apoplast is gated by a specific membrane protein," i.e.
no bulk unregulated diffusion anywhere in the path. This three-gate,
mixed-passive/active transport pattern is a ready template for any membrane
transport module (ion channels, nutrient uptake) a simulator needs, and its
"transporter-gated at both ends" discipline is the direct biological
counterpart of the A2A-membrane admission discipline in §3.

Signaling proper (second-messenger cascades, receptor kinetics) was not
found as estate-native math beyond the reaction-network Lean files in §4a,
which are general enough to encode a signaling cascade as a reaction network
if given appropriate species/rate data — no cascade-specific model exists
yet.

## 8. Death

Two independent registers, one literal-biological and one
information-theoretic:
- **Programmed cell death, literal and cited** (bamboo note §6): the
  internodal pith cavity is not passive absence of tissue but an actively
  executed vacuolar-type PCD program — "vacuolization, vacuole collapse,
  organelle digestion, cell shrinkage, and finally an empty cell corpse,"
  confirmed by TUNEL-positive nuclei and measurable DNA cleavage, implicating
  ethylene/calcium signaling, a ROS burst, cell-wall modification, and
  nutrient-recycling gene activity (Guo et al. 2019, *Plant Biotechnology
  Journal*). This is a complete, stageable death sequence a simulator could
  encode as a state machine.
- **Structural/informational death** (estate-native reading, not biology):
  the SHRIMP brief's Lorentzian-settling reading names the **void cone's
  apex** — permanently-⊥ cells, cells that can never receive evidence — as a
  "dimension-detecting invariant"
  (`lorentzian-apex-void-as-timelike-spacelike.md`, cited proved); the
  physarum-zeosemiocenum note and the Union Gemini Notebook report both name
  **"informational amyloid death"** — total crystallization into the J₂₆
  lattice, the failure mode the D₅ "whirling dervish" disclination defect is
  specifically protected against (§8 of the physarum note; also in the
  Sovereign Actor report, §4 below). Read together: a cell simulator could
  model "cell is dead" as either (a) the biological PCD state-machine
  terminus, or (b) the structural terminus of permanently-⊥ cells with no
  protected whirling defect left to keep any part of the state space molten
  — two different, independently available failure semantics for the same
  word.

## 9. The complexity ladder's Cell rung (verbatim Gemini Notebook imports, provenance-flagged)

Two AI-generated, source-grounded reports imported 2026-07-28 under a
project called "bare-cedar-fog," carrying an explicit provenance disclaimer
("no execution, governance, publication, or truth authority"):
```
services/science-services-section/content/text/documents/articles/notes/2026/07/28/2026-07-28-gemini-notebook-studio-report-the-sovereign-actor-an-architectural-blueprint-of-the-union-of-harmonious-colonies--da308612-5b1b-40d1-82e9-c10874543870.md
services/science-services-section/content/text/documents/articles/notes/2026/07/28/2026-07-28-gemini-notebook-studio-report-system-architecture-specification-project-bare-cedar-fog-and-the-unionification-tower--1bb167c4-ddd7-4d52-8dd8-89aeebb4ad3d.md
```
Both state the same 8-rung **Informational Complexity Ladder** (0 Void → 1
Forces/Charge [Belnap FOUR] → 2 Atom [WIT] → 3 Bond/Molecule [Spencer-Brown
Mark] → 4 Acid/Reaction [Network.lean's `Catalyst_is_fixed`] → 5a Zeolite /
5b Protein [metastable structural/functional split] → **6 Cell — "a machine
hosting live services behind a membrane," anchor: the Rendanheyi border** →
7 Organism/Union — Macrocolony). Rung 6's membrane is explicitly the
ActivityPub/A2A interface of §3. The **Unionification Tower** (both reports,
§4/§3 respectively) maps DNA→mRNA→Protein→Fold onto
Transcription/Translation/Folding/Ossification, each stage requiring a
named artifact (Work Order, Typed File-Set, Settled Capability/Test Pass,
Merkle-root record) — directly reusable as a stage-gate model for a
simulated cell's own gene-expression pipeline, if one wanted the estate's
own metaphor rather than a biochemical model. Kinetic control is named as a
**Deborah number** (`De = τ_relax/τ_observe`, De≈1 target, "viscoelastic")
— the same Deborah-number register the physarum note's §10 develops with
actual physical grounding (relaxation time of a dynamic-covalent network) —
so this ladder-report material and the physarum-zeosemiocenum note are
citing the same underlying kinetic-control concept at two different levels
of rigor; a simulator should prefer the physarum note's grounding and treat
the ladder reports as an organizing narrative, not a source of new math.

## 10. What is not here — gaps against a cell simulator's needs

- No enzyme kinetics beyond raw mass action (no Michaelis–Menten,
  cooperativity, or allosteric regulation term found anywhere in
  `ReactionNetworks/`).
- No signaling-cascade-specific model (receptor/ligand binding, kinase
  cascades) — only the general reaction-network substrate that could
  encode one.
- No animal-cell-specific division cycle (checkpoints, cyclins) — the
  division material found is plant-specific (meristem) or
  abstract/informational (Eigen threshold, Weismann barrier, settling
  firings).
- The rigidity-percolation math in the physarum note is explicitly flagged
  by its own author as running on the *wrong* matroid for 3D mechanical
  rigidity (graphic/connectivity ₍₁₎, when the physical claim needs
  ₍₃₎ generic rigidity, for which "no combinatorial characterization is
  available" — physarum note §12) — a stated open frontier, not a finished
  result, and worth knowing before reusing it as the mechanical layer of a
  membrane/cytoskeleton model.
- `RReal` (the real-number type the reaction-network Lean theorems are
  proved over) is a Lean-internal constructive-reals type, not yet bound to
  any runtime float type — the math is proved but not yet wired to an
  executable numeric simulator.

## Path index (quick reference)

| Concept | Path |
|---|---|
| Predication cell docs (Verso) | `.../obsmetrological-services-section/lib/obsmetrologia/docs/verso/mark/` |
| Executable fiber/charge/generators | `.../semiotics-science-services-section/services/articulation-services-section/lib/articulating/predicating/positing/fiber.mts` |
| SHRIMP brief v2 (proved-math index) | `.../semiotic-computer-system-services-section/content/text/documents/articles/notes/2026/08/19/shrimp-ecology-brief-v2.md` |
| State-of-the-theory survey | `services/science-services-section/lib/legacy/2026-07-31-lenticule-science-corpus/from-predicate-category/predication-state-of-the-theory.md` |
| A2A membrane (executable) | e.g. `.../curiosity-research-market-enterprise/src/local-a2a-membrane.mjs` |
| Reaction-network Lean (metabolism) | `.../obsmetrologia/Obsmetrologia/ReactionNetworks/*.lean` |
| Physarum zeosemiocenum (metabolism/division/death) | `.../semiotic-smart-material-services-section/content/text/documents/articles/notes/2026/07/25/2026-07-25-note-on-physarum-zeosemiocenum-system-specification.md` |
| Attention thermodynamics (origin-of-life/VENT) | `.../biomimetic-semiotics-science-services-section/content/text/documents/articles/notes/2026/08/21/2026-08-21-note-on-attention-thermodynamics.md` |
| Cover-nerve rank readout (executable) | `.../mathematical-readout-exchange/src/cover-nerve.mjs` |
| Biology legacy chain (atom→...→organism) | `.../biological-science-services-section/lib/legacy/2026-06-21-biology/_archive/atom/scripts/bonding/content/molecule/scripts/assembling/content/cell/` |
| Bamboo silica biology (transport/division/death) | `.../botany-services-section/content/text/documents/articles/notes/2026/08/21/2026-08-21-bamboo-silica-biology.md` |
| Holobiont (multi-organism cell/organism boundary) | `.../biological-science-services-section/content/text/glossary/terms/holobiont.md` |
| Complexity-ladder Cell rung (Gemini Notebook imports) | `services/science-services-section/content/text/documents/articles/notes/2026/07/28/2026-07-28-gemini-notebook-studio-report-the-sovereign-actor-...md` and the Unionification-tower report beside it |
| House glossary SEA/MUD/FOAM terms | `services/engineering-services-section/content/text/glossary/terms/semantics-energy-arena.md` (and siblings in the same directory) |
