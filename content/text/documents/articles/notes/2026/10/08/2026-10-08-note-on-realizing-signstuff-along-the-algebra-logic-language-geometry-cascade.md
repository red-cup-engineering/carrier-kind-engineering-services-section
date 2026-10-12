---
title: "Realizing SignStuff along the cascade: algebra, logic, language, geometry"
description: "A second, careful reading of the founder's 2026-10-08 request to realize SignCell, SignChain, SignGraph and SignCraft into the next-generation AI the README describes: the four closure regimes of Obsmetrologia read as the cascade algebra → logic → language → geometry, the four libraries and the five theories (FCA, Curry–Howard–Lambek, tile coloring, light cones, weaving beads) placed in it with their Lean modules, the σ/Δ regime correction, what the present JavaScript gets wrong per regime, the theory to improve, and the engineering program that follows."
date-created: 2026-10-08
kind: engineering-research-note
keywords:
  - logical-inference-model
  - predication-algebra-model
  - closure-regime
  - kz-lax-idempotence
  - nuclear-quartet
  - curry-howard-lambek
  - formal-concept-analysis
  - sofic-shift
  - light-cone
  - weave-draft
  - autopoiesis
  - signstuff
status: working-note-reading-of-the-lean-library-not-yet-adversarially-checked
produced-by: info-0d (Claude Opus 5.5), reading Obsmetrologia at 773ea6d6df4 directly
---

# Realizing SignStuff along the cascade: algebra, logic, language, geometry

## 0. The request, read as words that mean something

The founder asked, on 2026-10-08:

> realizing SignCell, SignChain, SignGraph, and SignCraft into the next-generation
> language model, artificial intelligence that we allude to in the readme, and keep
> approaching, such that we end up logical inference models, predication algebra
> models, all this stuff, a whole new class of AI that doesn't exist yet. We need to
> use-and-improve our best theory on FCA, Curry-Howard-Lambek, tile coloring,
> lightcones, and weaving beads.

Every term in that request names existing mathematics in this tree, most of it
kernel-checked in Obsmetrologia (`lib/.../obsmetrological-services-section/lib/obsmetrologia`,
dependency-free Lean 4, about 271 files, no `sorry`, no axioms past `Mark` and
`Articulating`), or an existing house architecture:

- **predication algebra model** — PAM, *Predicate Algebra Modeling*, already named in
  the 2026-05-21 SPOTCOMP note (`engineering-services-section/.../notes/2026/05/21/2026-05-21-note-on-spotcomp.md`)
  as "the CPU": FOUR as the data type, `≤ₖ`/`≤ₜ` comparators, the lattice and
  linear-logic operations, the four cell-level generator classes as the instruction
  set. SPOTCOMP's next view, TDP (*Theory Derivation Program*), is "category is
  program": a program is a closure-rule set and execution is iterating `Cl` to its
  least fixed point. SHP (*Semantic Hypertext Packet*) is the language.
- **logical inference model** — the logic regime realized: a consequence operator
  (closure-rule system, Datalog/van Emden–Kowalski `T_S`, `Closure/RuleSystem.lean`)
  whose derivations are proofs (`Language/Predicating/CurryHowardLambek.lean`).
- **the README's service loops** — paraconsistent transfinitely-valued data-monitoring,
  content-addressed evidence-substrate analyzing, coordination-free deductive-truth
  planning, database-proof executing, recursively-self-improving knowledge, an
  autonomic language-systems multiplexer — each names a regime or a passage between
  regimes (§2).
- **FCA, CHL, tile coloring, light cones, weaving beads** — each has Lean
  (`Calculus/Order/FormalConceptAnalysis`, `Calculus/Logic/FCALambekCircle`,
  `Language/Predicating/CurryHowardLambek`, `Calculus/Order/TileAdjacencyChromatic`,
  `AperiodicOrder/Tiling/{FiniteLocalRule,SoficShift,ChromaticLorentzian}`,
  `Language/Positing/LightCone`, `ObsmetrologiaFibercraft/{WeaveDraft,LenticleCrossing}`),
  and each sits at a definite place in the cascade (§3).

The founder's frame for reading all of it: **algebra → logic → language → geometry is a
cascade of regimes, and language is downstream of logic.** The first attempts in this
session (recorded in the survey notes beside this one) did not use that frame: they
treated "language model" as the target and built from keywords. This note reads the
library first.

## 1. The cascade as the library states it

### 1.1 The four closure regimes

`Closure/Regime.lean` proves the **four-regime dichotomy** of the closure ordinal `κ`:
four mutually exclusive, jointly exhaustive regimes at the boundaries `ω` and `ω₁`,
each determined by three Boolean flags (Scott-continuous? finite base? countable
cofinality?) with `finiteBase → scottContinuous` and `finiteBase → countableCofinality`:

| regime | `κ` | closure character | spine stage (`Stage.regime`) |
|---|---|---|---|
| strict | `κ < ω` (on the spine `κ ≤ 3`, `ClosureOrdinal`) | finite base; idempotent closure | settling |
| Scott | `κ = ω` | Scott-continuous; infinite base | positing |
| transfinite-bounded | `ω < κ < ω₁` | not Scott-continuous; countable cofinality | predicating |
| aperiodic | `κ ≥ ω₁` | not Scott-continuous; uncountable cofinality | articulating |

The distal-bypass note orders the same four as thermodynamic < causal < quantum <
kinetic. `Sheaf.lean` proves `H¹ = 0` in the finite regime and identifies it with
CRDT/CALM convergence; `Regime.lean`'s `cohomologyVanishes` declares `H¹ = 0` for strict
and Scott.

### 1.2 Reading the regimes as the cascade

The founder's cascade and the regimes line up one to one, and the 2026-04-06 Rosetta
table (`.../gaming-services-section/.../notes/2026/04/06/2026-04-06-note-on-pws-core-systems-design.md`:
"Computation (Algebra) | Logic (Language) | Topology (Geometry) | Physics (Dynamics)",
with settlement = term normalization = cut elimination = sheafification = equilibration)
supports the same order:

| cascade | regime | what lives there | Lean anchors | library | SPOTCOMP |
|---|---|---|---|---|---|
| **algebra** | strict | FOUR, its two orders, nuclei, closures that are idempotent: proof-irrelevant, thin | `Positing/Four`, `NucleusAndCommutingNuclei`, `Settling`, `ClosureOrdinal`, `Closure/Monad` `kz_iff_strict` | SignCell (data) | PAM |
| **logic** | Scott | consequence operators presented by rules; proofs and their rewrites: proof-relevant | `Closure/RuleSystem`, `Hyperdoctrine`, `Equality`, `CurryHowardLambek`, `LinearLogicChu`, `LambekCalculus`, `FCALambekCircle` | SignChain (code) | TDP |
| **language** | transfinite-bounded | admissible words of local rules; sentences as derivations; many languages as factor maps of one logic | `SoficShift`, `FiniteLocalRule`, `LambekCalculus`, `FCALambekCircle` (closing edge), `Language/Predicating/Syntax` | SignGraph (networking) | SHP |
| **geometry** | aperiodic | tilings, weaves, causal sets and light cones, sites, sheaves and gluing, the hull | `AperiodicOrder/Tiling/*`, `LightCone`, `ChromaticLorentzian`, `Settling/Cones`, `Site/*`, `Settlement`, `Autopoiesis`, Fibercraft `WeaveDraft` | SignCraft (systems) | MAS + TRC |

That the four libraries are the four regimes is the house's own layering rule
(`AGENTS.md`: data → code → networking → systems; SignChain's README: "assembling
orderings is composition of typed claims, which the Curry-Howard-Lambek reading says is
what code is"; SignGraph's: "a contract of data carried between parties with demand
transported back is what networking is"). The libraries were named for the cascade;
the code has not yet been made to obey it (§5).

### 1.3 Two directions through the cascade

The language spine (`Language/Spine.lean`) runs **articulate → predicate → measure →
settle**, and `Stage.regime` assigns those stages the regimes aperiodic → transfinite →
Scott → strict. So the spine climbs the cascade *from geometry to algebra*: an
articulation in the world (aperiodic, generative) is predicated (its oriented cell),
its reading is measured from the trace (no caller supplies a reading:
`measure_nil_knowledgeLeast`, `run_pos` "what is articulated is told for"), and it
settles to a finite fixed point.

Realization runs the other way, *from algebra to geometry*: settled readings present a
logic (rules, bases, proofs); the logic generates a language (its admissible words, its
sentences-as-derivations); the language tiles a geometry (histories, weaves, sites,
cones). **Language is downstream of logic** in this direction.

Reading (not yet a theorem): perception is the spine, action is the cascade, and the
README's MAPE-K loop is the two together (§2).

### 1.4 The σ/Δ correction, and why it is the algebra/logic boundary

The founder's correction: σ and Δ are idempotent **only in the finite regime**; in the
Scott regime they are **KZ-lax idempotent**, and that is why there is a finite regime at
all.

What the library states:

- `Closure/Monad.lean`: the closure 2-monad `Cl` is KZ (Kock–Zöberlein), lax-idempotent:
  `μ ⊣ η_Cl` with identity counit, so being an algebra is a property, not data.
  `kz_iff_strict`: **on the antisymmetric knowledge order**, the KZ inequality
  `f (f a) ≤ₖ f a` is equivalent to strict idempotence. "In a thin 2-category (a poset)
  antisymmetry forces strict; the 2-cell `μ` only survives where antisymmetry fails."
- `NucleusAndCommutingNuclei.lean`: a nucleus is extensive, idempotent, meet-preserving;
  two commuting nuclei make `π = j₁ ∘ j₂` a nucleus with `Fix π = Fix j₁ ∩ Fix j₂`, the
  four corners `(A, Fix j₁, Fix j₂, A*)`.
- `AperiodicOrder/Tiling/Autopoiesis.lean`: the aperiodic regime carries two commuting
  nuclei filtered **by history**: `σ_t` saturating (past-facing: the largest element
  whose restriction profile across proper sub-histories is below that of `a`) and `Δ_t`
  transferring (future-facing: the least element already witnessed in every independent
  one-step extension).

Reading that reconciles the two statements and locates the boundary: on **bare
readings** the knowledge order is a finite poset, antisymmetric, so KZ collapses to
strict; that is the algebra, proof-irrelevant. On **witnessed** carriers (a cell with its
for/against witness sets, a derivation term, a `CValuation`) two objects with the same
reading are different data, antisymmetry fails as data, and re-closing is related to
closing by a 2-cell, not an equation. That is the logic, proof-relevant. The Rosetta
note's reduction system makes the 2-cells concrete: R1 `σ(σ(M)) → σ(M)` and
R2 `Δ(Δ(M)) → Δ(M)` are written as **oriented rewrites**, and R7 `σ(Δ(M)) → Δ(σ(M))` is
called CHL normalization. In the finite regime those rewrites are equalities; in the
Scott regime they are the multiplication 2-cells, and the strongly normalizing,
confluent R1–R23 system is what makes the lax structure coherent. Lean target: exhibit
a Scott-regime carrier (witnessed valuations over an infinite base) on which σ is
KZ-lax and not strict, and prove R1/R2 are its `μ` (§6).

Three different pairs are called σ, Δ in this tree, and they must not be identified
without proof:

1. the history nuclei of `Autopoiesis` (saturating over sub-histories, transferring over
   one-step extensions), the aperiodic regime's pair;
2. the reading-level join square of `Positing.Bigraded` (`Reading.joinSquare`), a proven
   nuclear square on FOUR's knowledge Heyting algebra;
3. the JavaScript `signcraft/src/inference/nuclei.mjs` pair: σ = closure of a signed
   object row under the Duquenne–Guigues basis, Δ = Galois transfer along an object's
   profile — knowledge-order closures whose own comment says they are not the truth-order
   quartet of `FiberAlgebra.lean`, whose idempotence is asserted by construction and whose
   commutation is asserted numerically in tests.

`FiberAlgebra.cross_order_not_knowledge_nucleus` already shows a truth-closure is not a
knowledge nucleus, and `BigradedTower.tower_bigrading_is_two_orders` shows the second
order must enter as a grading axis, not a co-nucleus. Whether pair 3 is an instance of
pair 1 (is the DG closure a saturation over sub-histories of the incidence stream? is
Galois transfer a transfer over one-step extensions?) is an open identification, and
until it is proved, pair 3 is only valid where its idempotence is: the strict regime.

## 2. The README's loop as the cascade

The README describes nodes as service loops, MAPE-K, providing four things through a
fifth, making a whole. Read against the regimes:

| README phrase | regime / passage | house machinery | Lean |
|---|---|---|---|
| paraconsistent transfinitely-valued data-monitoring | the spine, geometry → algebra; the value is FOUR (paraconsistent: ⊤ is inhabited) and carries its closure ordinal / regime (transfinitely valued) | articulate, predicate, measure, settle; regime classification of each settling | `Spine`, `Measure`, `Regime`, `ClosureOrdinal`, `Closure/Ordinal*` |
| content-addressed evidence-substrate analyzing | algebra | cells with witness sets, addressed by `ni` (canonical CBOR, SHA-256, RFC 6920); FCA over the evidence | `FregeanFourChu`, `FormalConceptAnalysis`, `Evidence`, `Record` |
| coordination-free deductive-truth planning | logic, in the strict and Scott regimes where `H¹ = 0` (CALM: monotone deduction needs no coordination) | closure-rule systems; the plan is a derivation | `RuleSystem` (`generated_closure_is_least`, `immediate_consequence_lfp`), `Sheaf`, `CRDTCohomologicalCALM` |
| database-proof executing | logic → language → geometry: execute derivations over the history database; every effect carries its proof | `T_S` lfp over the history; SignCraft history and settlement | `RuleSystem`, `Settlement`, `Site/*` |
| recursively-self-improving knowledge | geometry → algebra at the next level: the aperiodic regime extends the base irreversibly; the doubly quiescent layer `A* = Fix π` seeds the next level's free carrier | tower fiber seeding ("H*_t at level n = H_t at level n+1", Rosetta note); the settlement spiral | `BigradedTower`, `Autopoiesis`, `SettlementSpiral` (honest slice), `HistorySeparationForcesAperiodicity` (open) |
| autonomic language-systems multiplexer | language, plural: many languages as factor maps of one logic, translated by Chu morphisms | the language fibers (Toki Pona, English, Lakota, Latin, Mandarin, RelConLang, PTGAE) over `@lenticule-science/communicating` | `FiniteLocalRule.factor_of_sft_is_sofic`, `SoficImage.factor`, `LinearLogicChu`, `FregeanFourChu` |

## 3. The five theories, placed

### 3.1 FCA — the algebra → logic passage

`Calculus/Order/FormalConceptAnalysis.lean` proves the derivation operators form a
Galois connection, `closeA = primeB ∘ primeA` is a closure, and concepts form a complete
lattice (Boolean case). `FCALambekCircle` edge (1): **FCA closure is settling closure**
("computing formal concepts is running the settling closure on a finite formal
context"). An attribute implication `B₁ ⟹ B₂` holds iff `B₂ ⊆ closeM B₁`: the
Duquenne–Guigues basis is the canonical finite presentation of the consequence operator
an incidence induces. FCA is how evidence (algebra) becomes a theory (logic): **learning
a logic is computing the implication basis of the evidence**, which is what
`signcraft/src/inference/learn.mjs` does with metrologic's `formal-context`. Not proved:
Belohlavek's many-valued FCA over a residuated lattice (prose in the module); for this
library the case that matters is incidence valued in FOUR, i.e. the predication Chu space
of `FregeanFourChu` read as a two-lane context.

### 3.2 Curry–Howard–Lambek — the logic regime

`Language/Predicating/CurryHowardLambek.lean`: an STLC with products and unit, Church–Rosser
proved by Takahashi complete development (`par_triangle`, `church_rosser`), types read as
propositions whose base case is `Reading.pos (v φ) = true` — a told-for reading of a
valuation at a predication cell, not a free `Prop` (`curry_howard`) — the cartesian closed
laws and the currying adjunction (`ccc_exponential_adjunction`), bundled as
`curry_howard_lambek`, and `chl_quartet_is_nuclear`: the four type formers {terminal,
product, exponential, dual} biject with the nuclear FOUR. The hyperdoctrine
(`∃_f ⊣ f* ⊣ ∀_f`, `Hyperdoctrine`, `Quantifying`, `Equality`) is the dependent level.
`LinearLogicChu` gives Chu spaces over FOUR with the tensor/hom residuation. This is the
logic a logical inference model *is*: inference produces terms, terms are proofs, proofs
normalize confluently, and in the Scott regime the normalization steps are the KZ 2-cells
(§1.4).

### 3.3 Lambek — the logic → language passage

`FCALambekCircle` edge (3): every integral commutative residuated lattice is a commutative
Lambek algebra. The **closing edge is not formalized**: Wurm (2012), syntactic concept
lattices are complete semantics for the Lambek calculus; Pentus (1993), Lambek grammars
generate exactly the context-free languages. Read in the cascade direction, Lambek is how
a logic generates a language: sentences are derivations in a residuated logic. Read in the
spine direction, the syntactic concept lattice (FCA over strings × contexts) lifts an
observed language back to the logic that generates it. The prototype
`signcraft/scripts/inference/syntactic-concept-weave.mjs` (lead note §6) is a finite
instance of that lift, and its finding — context radius trades memorization for
generalization — is a statement about how much geometry (the cone of a context) the lift
from language to logic is allowed to see.

### 3.4 Tile coloring — the language → geometry passage

`AperiodicOrder/Tiling/SoficShift.lean`: an SFT is a transition graph, its admissible words
are walks; a sofic shift is a 1-block factor image; `sft_is_sofic`, `SoficImage.factor`.
`FiniteLocalRule.lean` welds coloring and SFTs: a proper coloring is a graph hom into the
colour shift, graph homs carry admissible words to admissible words (`GraphHom.map_path`),
colourings pull back along factors, and `factor_of_sft_is_sofic`. "Colouring = factor
map = SFT morphism" is structural. `TileAdjacencyChromatic.lean`: orthogonal adjacency is
exactly 2-chromatic, triangular 3, king adjacency exactly 4 — the realized tile patches
are FOUR-colourable (`corpus_planar_tile_patches_four_colorable`), with FOUR the
`Reading` type itself. A language (admissible words of local rules) tiles a geometry; a
colouring is a factor map from that geometry's local rule to a palette; when the palette
is FOUR, the colouring is a valuation. Each human or constructed language fiber in the
house language engine is, on this reading, a factor map (a sofic cover) from the logic's
types to that language's tokens; the multiplexer is the family of such factors.

### 3.5 Light cones — the geometry regime, and its return to algebra

`Language/Positing/LightCone.lean`: FOUR's two evidence bits are the null coordinates of a
1+1 Minkowski diamond; `≤ₖ` is the causal-future relation (`kle_iff_lightcone`), `≤ₜ`
spacelike motion, ⊥ the past tip, ⊤ the future tip, t and f spacelike-separated, negation
is parity, conflation is time reversal, K₄ is `{1, P, T, PT}`, Chu duality is transpose ∘
parity. `ChromaticLorentzian.lean`: mark propagation along the causal chain `ℕ` is a
non-idempotent step whose fixed point, the causal past-closure, is reached only at
`κ = ω`, and the cross-base MLD classification holds on it without idempotence
(`chromatic_lorentzian_classification`) — tile colouring and light cones in one carrier,
and the first non-idempotent (Scott-height) settling carrier. `Settling/Cones.lean`:
`settle` (unit cone, the least the givens force) ≤ `brim` (counit cone, the most they
allow); **the void is space** (where the cones disagree), **the apex is time**. The
geometry regime returns to the algebra: the algebra's FOUR is already a light cone, which
is what lets the cascade close into a tower rather than end.

### 3.6 Weaving beads — geometry as settlement

`ObsmetrologiaFibercraft/WeaveDraft.lean`: a weave draft is a bilattice-coloured sofic
shift. Plain weave is the complete graph on two colours (`warpAlt_eq_completeGraph`); its
one local rule forbids floats; the crossing datum `(warp over?, weft over?)` is a reading:
a hole is ⊥ (`hole_is_kBot`), a mis-crossing is ⊤, a held contradiction
(`miscrossing_is_kTop`), and swapping which strand is over is Belnap negation
(`overUnder_swap_is_negate`). The two hands are formal: warp and weft each claim "over",
both claims are infeasible under a one-unit attention budget (`both_claims_infeasible`),
the hands grant one claim (`hands_grant_one_claim`), and a handed tiebreak avoids the
mis-crossing (`handed_tiebreak_avoids_miscrossing`). Open, stated at full strength:
`plainWeave_entropy_collapse`. `LenticleCrossing.lean`: a bead is a crossing on a rigid
body (`holeTransition_eq_warpAlt`). `Settlement.lean` abstracts the shape these share with
tiles, causal holes and Čech gluing: a site paired with content admitted by the site's own
law. In the cascade, weaving is what geometry looks like when two languages (two hands,
two speakers, warp and weft) meet at every crossing: each crossing a reading, defects held
rather than crashed, the handed tiebreak a law of how contested claims resolve.

### 3.7 Foam and multicellularity — many autopoiesis cells over a site

`Autopoiesis.lean` assembles the history nuclei into a self-producing **autopoiesis cell**
(`nuclear_autopoiesis_cell`) and states the Axiom of History Separation (a fiberwise-varying
family of nuclear squares over histories forces aperiodicity) as an open `Prop`. A node is
such a cell over its own history; many nodes over a shared site are a settlement whose
gluing obstruction is `H¹` (`Sheaf`, `CoordinationCohomology`, `SettlingCohomologyH1`):
the films of the foam are exactly where `H¹ ≠ 0`, the finite regime is the dry foam
(`H¹ = 0`, CALM), and the aperiodic regime is where the foam is alive — orbits that do not
stabilize but stay coherent.

## 4. What the second swing is: the cascade machine

The next-generation AI the README describes is not one model. It is the cascade realized
as four model kinds, one per regime, one per library, each the downstream projection of the
one before, closed into a tower:

1. **Predication algebra model (SignCell, strict).** State: a valuation of predication
   cells by FOUR readings, *measured* from a trace of articulatings (never supplied:
   `Spine.run`), each cell carrying its witnesses and its content address; nuclear squares
   per fiber; the K₄ gauge; FCA contexts as predication Chu spaces (`FregeanFourChu`).
   Proof-irrelevant: settles to a fixed point in at most three steps on the spine.
2. **Logical inference model (SignChain, Scott).** State: a consequence operator presented
   finitely — closure-rule systems (`T_S`), implication bases induced from the PAM by FCA,
   hyperdoctrine quantifiers, equality derived — whose inferences are CHL terms that
   normalize confluently; closures carry their 2-cells (the R1–R23 rewrites) instead of
   asserting idempotence. Inference is the Scott-continuous closure; learning is inducing
   the basis and residuating exactly; no gradients anywhere.
3. **Language model (SignGraph, transfinite).** The language of a logic: its admissible
   words under local rules (SFT/sofic), its sentences as Lambek derivations; each natural or
   constructed language a factor map from the logic's types (the house language fibers);
   translation as Chu morphisms whose adjointness is fidelity; generation as choosing a
   derivation and projecting it; parsing as lifting words to derivations through the
   syntactic concept lattice.
4. **Geometric model (SignCraft, aperiodic).** The language laid out in space and time:
   histories as causal sets with light cones; dialogue as weave (two hands, crossings as
   readings); sites, settlements and sheaves gluing many nodes' languages, `H¹` as the
   borders the distal bypass classifies; tilings and their hulls; autopoiesis cells over
   histories.
5. **The tower.** The aperiodic regime extends the base; the doubly quiescent layer of one
   level is the free carrier of the next. Each lap through the cascade lifts one level.
   That is "recursively-self-improving knowledge", and it is why the machine never repeats
   a lap.

Why this is a new class and not a relabelled LLM: a large language model lives entirely in
the language regime and tries to recover logic statistically from the most downstream data
there is. The cascade machine holds each regime explicitly, moves upward by the spine
(perception) and downward by the cascade (realization), keeps contradiction as a value,
carries a proof for every inference, settles coordination-free where `H¹ = 0`, and has its
laws checked by a kernel. Language is what it says; logic is what it is.

## 5. What the present JavaScript gets wrong, by regime

From the survey notes beside this one:

- **Algebra.** SignCell's cell is real (triple + FOUR + witness sets, content-addressed,
  join-semilattice merge), but `Spine.run`'s discipline (measure, never accept a supplied
  reading) is not enforced; a reading's regime is not carried; the nuclear square is not a
  first-class object.
- **Logic.** `signchain/src/typed-theory.mjs` is "a small, correct reachability engine over
  a category-shaped graph, and it is not a CHL realization": no types-as-propositions, no
  terms, no normalization; its proof carrier asks `derive` about edges `derive` already
  found, so obstructions are always empty. `rules.mjs` is a sound Fitting-style bilattice
  rule engine but not connected to `typed-theory`, and its derivation witnesses are not
  terms. `nuclei.mjs` asserts σ/Δ idempotence by construction (valid only in the strict
  regime, §1.4) and checks commutation numerically.
- **Language.** No admissible-word generation from local rules, no Lambek derivations, no
  syntactic concept lattice outside the scratch prototype; the language fibers live in a
  separate engine (`@lenticule-science/communicating`) that does not import SignStuff's
  logic.
- **Geometry.** `signcraft/src/settle.mjs` computes non-Scott firings only at limit stages,
  so on its finite orbits the first cohomology is always zero; SignGraph's
  `cellular-sheaf.mjs` is a real numeric sheaf Laplacian but nothing connects it to
  settlement; weaves, tilings and light cones exist in metrologic and Lean but not as
  SignCraft settlements.

## 6. The theory to improve (Lean targets)

1. A Scott-regime carrier (witnessed valuations, infinite base) where σ is KZ-lax and not
   strict; R1/R2 as its multiplication 2-cells; R1–R23 coherence as the lax structure.
2. The FCA–Lambek closing edge for finite contexts: the syntactic concept lattice of a finite
   sample is residuated and Lambek-sound; then over FOUR (two-lane incidence).
3. Many-valued FCA over FOUR (Belohlavek, presently prose).
4. Identify or separate the JS σ/Δ (DG closure, Galois transfer) and the `Autopoiesis` history
   nuclei.
5. Cascade passages as theorems: a closure-rule system's derivations form an SFT/sofic
   language under a declared projection; a sofic language's admissible patches form a
   settlement (`Settlement`) on a site.
6. `plainWeave_entropy_collapse`; `HistorySeparationForcesAperiodicity`; an aperiodic
   `κ ≥ ω₁` carrier (the "sole remaining height" named in `ChromaticLorentzian`).
7. Regime-tagged readings: the "transfinitely-valued" value as a reading paired with its
   regime classification, with the passage laws between regimes.

## 7. The engineering program that follows

In cascade order, each library conformance-checked against Lean golden vectors (the method
`signstuff-evm` already uses for FOUR, `Valued` and `Record`):

1. **SignCell to the algebra:** the spine (articulate, predicate, measure, settle) as the only
   way a reading enters; nuclear squares and the quartet; the K₄ gauge and light-cone
   coordinates; FCA contexts as predication Chu spaces; readings that carry their regime.
2. **SignChain to the logic:** replace `typed-theory`'s reachability graph with the CHL term
   calculus of `CurryHowardLambek` whose base propositions are told-for readings; make
   `rules.mjs` derivation witnesses those terms; the `T_S` lfp of `RuleSystem` with proofs;
   the R1–R23 nuclear rewriting with normal forms; closures that carry their 2-cells; Lambek
   residuation.
3. **SignGraph to the language:** SFT/sofic generation from local rules; Lambek parsing and
   generation as derivation search; the syntactic-concept-lattice lift (the prototype,
   rebuilt here); Chu morphisms for translation; the house language fibers re-founded as
   factor maps over SignChain's logic.
4. **SignCraft to the geometry:** settlements (tiles, beads, causal holes, Čech) on sites;
   weave drafts as two-hand settlements; histories as causal sets with light cones
   (`ChromaticLorentzian`, `Cones`); `H¹` actually computed and handed to the distal bypass;
   autopoiesis cells; the MAPE-K loop of §2 and the tower of §4.
5. **Body:** the five libraries as generic `red-cup-engineering` repositories, composed back as
   submodules, published leaf-first to `registry.561.group`; records held as cells or EAVT facts
   with readers, not handwritten JSON. The disposition from session info-e9 (2026-10-08, taken
   from blobless clones of the forest and the b006be7 snapshot) fixes how:
   - All five already exist as **directories in red-cup forest repos**, committed to on
     2026-10-08 and diverged from this monorepo's copies in both directions: `metrologic` at
     `computer-data-services-section:lib/metrologic`, `signcell` at
     `computer-data-services-section:apps/signcell`, `signchain` at
     `computer-services-section:services/computer-code-engineering-services-section/apps/signchain`,
     `signgraph` at `computer-services-section:services/computer-networking-engineering-services-section/apps/signgraph`,
     `signcraft` at `computer-services-section:services/signcraft`. Each new repository is
     extracted from its forest path with path-filtered history, and the snapshot's diffs are
     reconciled into it; the monorepo copies are not forked.
   - `signcell` neither declares nor imports `metrologic`; `signchain`, `signgraph` and
     `signcraft` do. Declared dependencies close into a 204-package strongly connected
     component (with the survey note `registry-body`'s three real import cycles inside it), and
     none of the libraries' direct workspace dependencies has a repository of its own, so the
     repositories install only when mounted back into the pnpm workspace, and cycle-breaking
     precedes leaf-first publication.
   - Undeclared imports to fix in the same change: `signgraph` imports `relating` and
     `a2a-services-section`; `signstuff-evm` imports `signgraph`.
   - Brand residue (de-branded fixtures in `signcraft`'s inference tests); `org.emsenn.*` wire
     identifiers in `signgraph` are a versioned protocol change left to the founder.
   - **The AI layer builds on what exists:** `metrologic` is the predication engine (the
     bilattice floor, hyperdoctrine, closure engine, Chu spaces, formal context), and
     `signcraft`'s `src/inference` is the existing inference layer; the realization extends
     these and does not add a parallel engine. The LLM-side `computer-inference-engine` already
     defines a content-addressed context packet and a judge
     (red-cup-engineering/computer-services-section#119), to be read before any module that
     touches model calls.

Imagination (Fable) goes into what each regime's model *does* and how the foam of autopoiesis
cells lives; engineering (Sonnet) into the module-by-module realization above; every claim
about the mathematics is checked against the Lean before it is built on.
