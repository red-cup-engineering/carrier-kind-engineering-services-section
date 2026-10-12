---
title: "Cascade imagine, geometry regime: what the SignCraft geometric model does in operation"
description: "An operational imagination of the geometry (aperiodic, SignCraft, systems) regime of the next-generation AI, built only on what the adversarial check 2026-10-08-cascade-check-geometry.md confirmed: the regime read as accretion of finite geometric objects without stabilization; the model's state, its moves, what flows in from the language regime and what flows out (up the spine to predicating, and round the lap to the next articulating); how it runs across many nodes as a foam of autopoiesis cells over a site; what it can do that a large language model cannot; worked examples with real FOUR readings, real plain-weave crossings, real bead passes, real RelConLang words, real Holofoam rules, real cover nerves and real record residues. Every mechanism is tagged NAMED (a Lean structure or theorem, file and name cited), EXT (a precisely stated extension of one), or CODE (present JavaScript)."
date-created: 2026-10-08
kind: engineering-research-note
keywords:
  - cascade-imagine
  - geometry-regime
  - aperiodic
  - signcraft
  - settlement
  - light-cone
  - causal-set
  - weave-draft
  - lenticule
  - autopoiesis
  - coordination-cohomology
  - anderson-putnam
  - regime-cycle
  - foam
  - logical-inference-model
status: imagination-stage-built-on-the-adversarial-check-mechanisms-tagged-named-ext-code
produced-by: imagine stage, regime geometry (SignCraft, systems), Claude Fable 5.1, reading Obsmetrologia, ObsmetrologiaPhysicalScience, ObsmetrologiaFibercraft and the signstuff and Holofoam code directly after the check
---

# Cascade imagine, geometry regime

Subject: the geometry regime of the cascade algebra → logic → language → geometry, the
regime the house gives to SignCraft (systems), as a running part of the next-generation AI
the README describes. Ground: the adversarial check
`2026-10-08-cascade-check-geometry.md` (called "the check" below). Where the check marked a
claim WRONG or UNSUPPORTED, this note does not build on it; where it marked a claim
QUALIFIED, this note builds only on the qualified form.

Paths are abbreviated as in the check. `Obs/` is
`.../obsmetrological-services-section/lib/obsmetrologia/Obsmetrologia/`. `Fib/` is
`.../fibercraft-services-section/lib/obsmetrologia-fibercraft/ObsmetrologiaFibercraft/`.
`PhysSci/` is
`.../natural-science-services-section/services/physical-science-services-section/lib/obsmetrologia-physical-science/ObsmetrologiaPhysicalScience/`
(the check abbreviated the same package; its directory sits under `natural-science-services-section`).
`signstuff/` is `.../computer-engineering-services-section/lib/signstuff/`. `holofoam/` is
`.../computer-simulation-system-services-section/apps/holofoam/`.

Every mechanism below carries one of three tags.

- **NAMED** — a Lean structure, definition or theorem, cited by file and name; the statement
  was read, not the docstring.
- **EXT** — an extension of a named structure, stated precisely enough to be written in Lean;
  nothing in the tree proves it.
- **CODE** — present in the JavaScript, cited by file and export; no theorem stands behind it
  unless one is also cited.

Four readings are written throughout as the library writes them: `kBot` (⊥, told nothing,
`Articulating.Corner.absurd`), `tTop` (t, told for only, `potential`), `tBot` (f, told against
only, `active`), `kTop` (⊤, told both, `stable`). The corner names are those of
`Autopoiesis.cellCorner` and `FourCorner.toCorner`; the test file
`signstuff/signcraft/test/inference/relconlang.test.mjs` uses the same words for `ta`, `mu`
and `sha`.

## 0. The regime as the check leaves it

The check's suggested rewrite of the geometry row (its §11) is the frame for everything here:

> Geometry (aperiodic): the *accretion* of finite geometric objects without stabilization.

Five corrections from the check govern the imagination, and each one turns out to be an
asset rather than a loss.

1. **The finite geometric objects are strict-regime objects.** `LightCone` is four points;
   `Cones` is pointwise under an idempotent `Reading.Closure`; `Site/Basic` has clopens
   `Bool × Bool` and covers only at fixed `(q, τ)`; `WeaveDraft` is one-dimensional plain
   weave; the causal sets of `PhysSci/CausalSets` are finite DAGs whose `regime` is declared
   `strict` (`PhysSci/CausalSets/Causal/Order.lean`, `def regime (_C : CausalSet E) :
   ClosureRegime := ClosureRegime.strict`). So a geometric model's *objects* are finite,
   exact, decidable, replayable things. That is what makes them fit to be laid down, checked
   and merged by machines with no coordinator.

2. **The aperiodic rung is where things do not stabilize but stay coherent.** The Lean
   placed in that rung is the germ carrier (`Record.tally_lax_slack`, `Record.topBump_flux`,
   `RegimeGate.aperiodic_gap_matches_lax_slack`), the asserted `aperiodicWitness`, the
   Anderson–Putnam `DirectedSystem` and its `Colimit`, and the spiral of `RegimeCycle`
   (`Turn`, `dervish`, `residue_dichotomy`). The geometric model's *dynamics* are these:
   lay finite objects, lap after lap, accreting a residue that never lets the record repeat
   while every lap stays in the seed's germ class.

3. **"Aperiodic" is a declared datum, never a derived one.** `Ord.regimeOfOrdHonest_ne_aperiodic`
   (`Obs/Closure/Ordinal.lean`) and `aperiodicWitness_regime_not_ordinal_derived`
   (`Obs/AperiodicOrder/Tiling/AperiodicSettleFrame.lean`). The model therefore reports
   `aperiodic` only as a stamp it was handed, and reports the regimes it can compute
   (strict, Scott, transfinite-bounded) from the ordinal of the orbit it ran.

4. **The 2-cells of the closure monad live here, not at Scott.** `kz_iff_strict`
   (`Obs/Closure/Monad.lean`) collapses KZ to strict on the antisymmetric `Reading`;
   `strict_regime_mu_identity` (`Obs/Closure/Monad/KZ.lean`) puts `μ = id` in strict and
   Scott; the only inhabited `HasLaxSlack` is `Record.tally_lax_slack` on the germ preorder,
   filed at the aperiodic corner by `regime_tower` (`Obs/Closure/Regime.lean`). The founder's
   correction as the governing note relays it ("in the Scott regime σ and Δ are KZ-lax") is a
   design statement the Lean does not state, and this note does not cite Lean for it. What
   this note does take from the library: *the geometry regime is the one rung where
   re-closing differs from closing as data while agreeing in the order* — and that is exactly
   what a living accretion needs.

5. **"H¹" is five things.** Čech `H¹` of the settling-associated sheaf vanishes for every
   datum in every regime (`Cohomology.h1_vanishes`); the cover-nerve cycle rank
   (`CoverNerve.H1rank`) is the coordination cost; the non-Scott firing count
   (`FiringGenerators`) is a transfinite-bounded generator count; `Settling.clInv` is the
   Anderson–Putnam class; Holofoam's `seams(plan).h1` is a conflict count. The model exposes
   each under its own name and never one under another's.

Also governing: the three σ/Δ pairs are not identified. In Lean, pair 1 (the history nuclei of
`Autopoiesis`) exists only as the abstract `Order.CommutingNuclei H` with `saturating Q := Q.j1`,
`transferring Q := Q.j2`, and its sole concrete inhabitant `readingNuclearPair c1 c2` is a model of
pair 2 (`Reading.joinSquare`). Every `Order.Nucleus` carries `idem : ∀ a, j (j a) = j a` as a
field (`Obs/Language/Positing/NucleusAndCommutingNuclei.lean`), so whatever σ, Δ become on a
history fiber, they are strictly idempotent *within* that fiber. The algebra and logic checks
add that the JavaScript pair 3 (`signcraft/src/inference/nuclei.mjs`) is not even a nucleus (Δ
not monotone, σ not meet-preserving). Nothing below identifies the pairs; §3.6 says where the
non-idempotent content honestly sits.

## 1. What the geometric model is for

The algebra regime holds readings; the logic regime holds consequence presented by rules; the
language regime holds the admissible words a logic generates. None of them holds *where* and
*when*. The geometric model holds the world's where and when as exact finite objects:

- **where** — a *site*: which patch of which fiber a claim is read on, and which patches
  overlap (`Site.SiteObj`, `Site.Covers`, `LenticleIdentification.Lenticle`);
- **when** — a *causal order*: which settling fired before which, what each cell could have
  known, what can never reach a readout (`CausalSet`, `Cone.Past`, `Hole.HoleRegion`);
- **laid down** — a *settlement*: content over a base, admitted by the base's own law
  (`Settlement`, `Settlement.ofTiles`, `ofBeadsThread`, `ofHole`, `ofCech1`);
- **met** — a *crossing*: two strands at one locus, read as one FOUR value
  (`crossingReading`, `condensate`, `LenticleJoinSection`);
- **glued** — a *cover with a nerve*: many nodes' sections over one base, with the cost of
  making them one section as a number (`CoverNerve.H1rank`, `Cech1`, `glue`);
- **accreted** — a *germ with a residue*: the record a node carries, lap after lap, never
  repeating, always in the seed's class (`Record.germPreValue`, `RegimeCycle.Turn.carried`,
  `dervish`).

The geometric model is the systems layer because systems are what compose the other three
regimes across nodes and across time. It does not infer (logic does), it does not generate
words (language does), it does not read evidence into FOUR (algebra does). It lays what they
produce into space and time, holds what collides, glues what agrees, prices what does not,
and carries the whole forward one lap.

## 2. State

The state of one node's geometric model is a tuple. Each component is tagged.

### 2.1 The history

**NAMED.** `Aperiodic.HistorySystem` (`Obs/AperiodicOrder/Tiling/History.lean`): a carrier with
`unit`, `concat`, `le`, laws `unit_concat`, `concat_unit`, `concat_assoc`,
`le_iff_prefix : ∀ t t', le t t' ↔ ∃ u, t' = concat t u`, and `le_antisymm`. Proved on it:
`le_refl`, `le_concat`, `empty_le`, `le_trans`, `concat_left_monotone`. A node's *own* log, a
list of admitted observations under append, is an instance: `carrier := List Observation`,
`unit := []`, `concat := (· ++ ·)`, `le := IsPrefix`; the prefix laws are list facts.

**CODE.** `signstuff/signcraft/src/history.mjs`: `createHistory`, `observeHistory` (a revision
whose `parents` are all current heads, `id` the content address of `{parents, source, cells}`),
`mergeHistories` (union of revisions, Kahn order with id-sorted ties), `checkpointHistory`,
`sectionOf` (functional predicates: concurrent values become counter-evidence, told-both).

**EXT (H1).** The multi-head revision DAG is not a `HistorySystem`; it is a diagram of them. State:
*for each node `i`, `L_i : HistorySystem` is its linear log; the DAG is the pushout of the `L_i`
along their shared revisions; `mergeHistories` is the pushout's carrier and its canonical
ordering.* To prove: the merged carrier under `IsPrefix` is a `HistorySystem` iff the DAG is a
chain; otherwise the prefix order is the `CausalLe` of §2.4 and antisymmetry is `causalLe_antisymm`
(`PhysSci/CausalSets/Causal/Cone.lean`), not `HistorySystem.le_antisymm`.

### 2.2 The site patch

**NAMED.** `Site.SiteObj Q` (`Obs/Site/Basic.lean`): `q : Q`, `tau : Nat`, `U : Clopen` with
`Clopen := Stone.ClopenUp = Bool × Bool`, the four clopens `bot, (true,false), (false,true), top`
(`strictClopenFiber`, `strictClopenFiber_complete`). `Covers U fam := (∀ Ui ∈ fam, Ui ⊑ U) ∧
joinList fam = U`, with the Grothendieck basis axioms `covers_self`, `covers_pullback`,
`covers_trans` bundled as `bitopological_site_grothendieck`, and the load-bearing
`no_temporal_covers`: covering constrains only the clopen leg at fixed `(q, τ)`; time lives in
morphisms (`Advances tau tau' := tau ≤ tau'`), never in covers.
`PredicationCell.SitePoint := Site.SiteObj PredicationCell` (`Obs/Site/Claim.lean`) places a
predication cell at a stratum with a clopen support. `PredicationCell.Topic`
(`Obs/Site/Topic.lean`) is an FCA concept localized at a site point with an explicit cover
(`concept, point, in_extent, cover, covers`), and `Topic.cover_is_fiber_local` says its cover
stays in the clopen fiber. `LenticleIdentification.Lenticle U₁ U₂ := Site.meet U₁ U₂` with
`OverlappingTwoCover` and `lenticle_nonempty` (`Obs/AperiodicOrder/Tiling/LenticleIdentification.lean`).

So a node's patch is `(q, τ, U)`: a cell, a settling stratum, and one of four clopens of the
two-point dual — `U = (true,false)` is the for-side patch, `(false,true)` the against-side,
`top` both, `bot` neither. Two nodes overlap on a cell when their clopens meet above `bot`.

**CODE.** `signstuff/signgraph/src/site.mjs` `site(witnesses, specializations)`: a finite cell set
with specialization morphisms, `transportRules`, no clopen supports, no covers. The check
(§6, §10 item 6) is right that this is a different site.

**EXT (S1).** *A SignGraph site object is `Site.SiteObj PredicationCell` with `U` the clopen of
the evidence sides the node actually holds for that cell: `(for ≠ [], against ≠ [])`.* Then a
node's section over its patch is exactly the restriction of its valuation to the cells whose
sides it holds, two nodes' overlap is `Lenticle U₁ U₂`, and `covers_pullback` is the law that
restricting a cover to a sub-patch gives a cover.

### 2.3 Settlements and the settle frame

**NAMED.** `Settlement Content Admits base` (`Obs/Settlement.lean`): `content : Content base`,
`admits : Admits base content`. Four instances, one per domain
(`PhysSci/Settlements.lean`, `tiles_beads_hole_cech1_are_settlements`):

| instance | base | content | admission |
|---|---|---|---|
| `ofTiles T` | `⟨T.Carrier, T.localRule⟩ : Σ C, Graph C` | `T.word : List Carrier` | `Path localRule word` |
| `ofBeadsThread B` | `B.Lenticule : Type` | `B.thread : Thread Lenticule` | `ThreadLegal thread` |
| `ofHole H` | `⟨H.C, H.decision, H.readout⟩` | `H.effect : E → E → Prop` | every effect's source lies on `Shroud` |
| `ofCech1 D hcoc` | `D : Cech1` | `glue D : Cochain` | `Coboundary D (glue D)` |

`Crystal.Tiles` (`PhysSci/CondensedMatter/Crystal/Tile.lean`): `Carrier, localRule : Graph Carrier,
word, admissible : Path localRule word`. `Crystal.Beads` (`.../Crystal/Bead.lean`): `tiles,
Lenticule, thread, threadLegal, adjacency : BeadAdjacency Lenticule, realization`.

**NAMED.** `Settle.SettleFrame` (`Obs/AperiodicOrder/Tiling/ChromaticLorentzian.lean`): `carrier,
step, settle, settle_step : ∀ x, settle (step x) = settle x`. No idempotence of `step`. Proved
for every frame: `settle_orbit`, `bisim_iff_settleEq`, `geoMld_iff_settleEq : GeoMld x y ↔ settle x
= settle y`, `crossBase_classification`. The one non-idempotent instance:
`ChromaticLorentzian.frame` on `Nat → Bool` with `step f (n+1) = f (n+1) || f n`, `settle f (n+1)
= f (n+1) || settle f n`, `step_not_idempotent : step (step mark0) ≠ step mark0`,
`chromatic_lorentzian_classification`.

**CODE.** `signstuff/signcraft/src/settle.mjs`: `closureOrbit(rules, seed)` (worklist Kleene
iteration, throws past `rules.length + 1` stages), `settle` (orbit with `stages`, `settled`,
`settledAt`, `regime`), `settlementAdmits` (replay and compare content addresses),
`settleValuation`, `settleCells`. The check (§7 5a): `regime` is always `strict`; `filtrationOf`
never emits a limit stage; `firstCohomology.rank` is always 0 on a computed orbit.

**EXT (F1).** *Every SignCraft settlement is a `SettleFrame` whose `carrier` is the valuation
type, `step` one round of `closureOrbit`, `settle` the orbit's last stage, and `settle_step` the
theorem that one more round before settling changes nothing.* `settlementAdmits` is then the
decision procedure for `geoMld_iff_settleEq`: two seeds are geometrically mutually locally
derivable iff they replay to the same settled content address. This is already what
`closureEquivalent` in `settle.mjs` is trying to be (check §10 item 4).

**EXT (F2).** *A SignCraft settlement of a word under a local rule is `Settlement.ofTiles` with
`Carrier := Cell`, `localRule := the SignChain adjacency rule`, `word := the designated cells in
firing order`, `admissible := Path`.* This is the check's "ofTiles at warpAlt" (§4 3.6g) made
general: the base of a settlement is a graph, the content a path in it.

### 2.4 The causal order and its holes

**NAMED.** `CausalSet E` (`PhysSci/CausalSets/Causal/Order.lean`): a DAG of `prec0` with
`reaches` its transitive closure (`reaches_trans`, `reaches_asymm`, `reaches_irrefl`),
`causal_settling_is_transitive_closure` (a causal set *is* a settling by Boolean transitive
closure), and `causal_strict_regime_h1_zero`. `Cone.lean`: `Future e`, `Past e`,
`CausalLe x y := x = y ∨ reaches x y`, `Spacelike x y := ¬ reaches x y ∧ ¬ reaches y x`,
`Diamond a b x := reaches a x ∧ reaches x b`, with `causalLe_antisymm`,
`future_is_upward_closed`, `past_is_downward_closed`, `causal_reachability_is_cone_geometry`.
`RegimeSection.lean`: `timeSection es prec x := pastCount es prec x`,
`timeSection_strict_mono` (the past count is a strictly monotone ℕ-valued time function). The
file's docstring, which the check quotes, says a finite causal set always carries a sub-ω time
section — these are strict-regime objects.

**NAMED.** `Hole.lean` (`PhysSci/CausalSets/BlackHoles/`): `Region E := E → Bool`,
`ReachesReadout readout x := C.events.any (fun y => readout y && CausalLeBool C x y)`,
`HoleRegion readout x := !(ReachesReadout C readout x)`, `ReadoutExterior`,
`hole_future_closed`, `readoutExterior_past_closed`, `hole_exterior_disjoint`,
`hole_no_future_to_exterior`, `Shroud` with `shroud_in_hole`, `shroud_has_exterior_neighbour`,
and the bundles `CausalVoid`, `EventHorizon`. `HoleDiamondCausalSet.lean`: `DiamondPoint`,
`sequencingPrec0 p q` (`p.b ≤ q.a`), `sequencingCausalSet`, `sequencing_hole_future_closed`,
`sequencing_readoutExterior_past_closed`, `sequencing_hole_exterior_disjoint`,
`sequencing_hole_no_future_to_exterior`.

**NAMED.** `ParaconsistentCone.lean`: `ConeReport E := E → E → Reading`, `ReportsReachable R x y
:= (R x y).pos = true`, `ReportsInconsistent R x y := R x y = kTop`, `ReportsUnknown R x y := R x y
= kBot`, `mergeReports R S x y := joinK (R x y) (S x y)`, `mergeReports_comm`,
`mergeReports_infl_left`, `booleanConeReport prec` with `booleanConeReport_consistent` (a Boolean
relation never reports ⊤) and `booleanConeReport_reachable_iff`; all bundled as
`paraconsistent_cone_reports`.

**CODE.** `settle.mjs`: `firingEvent(at, stage)`, `firingEvents` (each designated cell with the
stage of its first firing), `causalOrder(events)` (`earlier.stage < later.stage &&
sharesTerm(earlier.cell, later.cell)`, then Floyd–Warshall closure), `causalSeparation`
(timelike / spacelike / obstruction naming a cell that never fired), `causalCone(order, apex)`
(`past`, `future`), `orderingFraction` (comparable pairs over all pairs, exact reduced
fraction). `holofoam/src/orbit.mjs`: `reaches(a, b) := b.t > a.t && |b.x − a.x| < c·(b.t − a.t)`,
`eventLeq`, `precedes(p, q) := eventLeq p.b q.a`, `nests`, `diamonds`, `sequencingCheck`,
`kinematicRegion(name, readout)` with its four runtime laws (hole-future-closed,
exterior-past-closed, no-future-from-hole-to-exterior, hole-exterior-disjoint), exactly the four
theorems of `HoleDiamondCausalSet`.

**EXT (C1).** *The causal set of a settlement is the DAG whose `prec0 x y` holds when `y`'s rule
witness lists `x` among its premise cells* (SignChain `derivation()` carries `{rule, from}`),
*not when `x` and `y` share a term at increasing stage.* `causalOrder`'s heuristic
over-approximates this (the multicellular vision's E6 says how to measure it). With C1,
`causalCone(order, c).past` is the set of cells a derivation of `c` consulted, and
`HoleRegion` relative to `readout := the node's published heads` is the set of fired cells no
publication will ever depend on. Both become `Settlement.ofHole` instances once `effect x y :=
x is a premise of y` and `Shroud` is computed by `Hole.Shroud`.

### 2.5 The crossing register

**NAMED.** `Fib/WeaveDraft.lean`: `warpAlt : Graph Bool := fun a b => a != b`,
`warpAlt_eq_completeGraph`, `warpAlt_forbids_float : ¬ Path warpAlt (a :: a :: r)`,
`crossingReading warpOver weftOver := FourCorner.toCorner (warpOver, weftOver)`,
`hole_is_kBot : crossingReading false false = kBot`, `miscrossing_is_kTop : crossingReading true
true = kTop`, `overUnder_swap_is_negate : negate (crossingReading w v) = crossingReading v w`,
`defectFree_definite`, `miscrossing_isInconsistency`, `defectFree_consistent`,
`readingColour b := crossingReading b (!b)`, `reading_coloured_sofic`, `ColumnsComplement`,
`PlainWeaveSwatch`, `mem_columns`, `plainWeave_entropy_collapse` (**proved**; the check §4 3.6e).
`Fib/LenticleCrossing.lean`: `lenticleCrossingReading _U₁ _U₂ w v := crossingReading w v` (the
clopens are not used; `lenticleCrossingReading_eq_crossingReading` is `rfl`),
`lenticleCrossingReading_inconsistency_iff_both_over`, `holeTransition_eq_warpAlt`.

**NAMED.** `Obs/AperiodicOrder/Tiling/PortGraph.lean`: `Port B := B × Bool`, `ThreadPass B := B ×
Bool × Bool`, `Thread B := List (ThreadPass B)`, `holeTransition : Graph Bool := fun a b => a != b`,
`Legal p := holeTransition p.2.1 p.2.2 = true`, `legal_iff_distinct : Legal (b, i, j) ↔ i ≠ j`,
`ThreadLegal Γ := ∀ p ∈ Γ, Legal p`, `condensate : Nat → Reading` (`0 ↦ kBot`, `1 ↦ tTop`,
`n+2 ↦ kTop`), `empty_consistent`, `single_consistent`, `over_occupation_inconsistency`,
`mirror_fixes_empty`, `mirror_fixes_condensate_pole`, `mirror_fixes_condensate`.

**NAMED.** `LenticleIdentification.lean`: `DefiniteReading c := c = tTop ∨ c = tBot`,
`ReadingDisagreement`, `definite_joinK_inconsistency_iff_disagreement` (the knowledge join of two
definite readings is ⊤ iff they disagree), `LenticleJoinSection c₁ c₂ := fun φ => joinK (c₁ φ)
(c₂ φ)`, `lenticleSection_inconsistency_eq_disagreement`.

The crossing register is where the geometric model holds what *meets*: two strands at a
crossing, a thread through a bead, two nodes over a lenticle. In all three the meeting is one
FOUR value, and ⊤ is a held defect, not an exception.

**CODE.** None. The check (§6, §7 5d): no weave, warp, tiling or sofic term in any `src` of the
five libraries or Holofoam.

### 2.6 The cohomology receipts, five of them

Each is a named object and the model never conflates them.

| receipt | **NAMED** | what it counts | **CODE** |
|---|---|---|---|
| Čech `H¹` of `F_U` | `Cohomology.Cech1`, `Cocycle`, `Coboundary`, `glue`, `glue_coboundary`, `glue_unique`, `H1Vanishes`, `h1_vanishes` (`Obs/Cohomology/SettlingCohomologyH1.lean`) | nothing: zero for every datum; its *content* is the glued section `glue D` | — |
| coordination cost | `CoverNerve` (`cells, entities, components`, invariant `entities ≤ cells + components`), `H1rank := (cells + components) − entities`, `CoordinationFree`, `h1_vanishes_iff_forest`, `h1rank_is_coordination_cost`, `laplacian_kernel_cokernel`, `tree_coordination_free` (`Obs/Cohomology/CoordinationCohomology.lean`) | cells in excess of a spanning forest of the source–stance nerve: the independent gluing obstructions | `signgraph/src/cohomology.mjs` `cohomologyOfCells`, `coverNerveOfCohomology` |
| non-Scott firing count | `firingComplex`, `tbWitness`, `transfiniteBounded_h1_generators`, `scott_no_nonzero_h1_class` (`Obs/Cohomology/FiringGenerators.lean`) | one generator per limit-stage firing; placed at the transfinite-bounded rung | `settle.mjs` `nonScottFirings`, `firstCohomology` (always 0 on a computed orbit) |
| classifying class | `H1Class`, `H1Carrier`, `Settling (regime, carrier, vanishing)`, `Settling.clInv`, `CohEquiv`, `clinv_dichotomy`, `aperiodicWitness_clinv_nonzero` (`Obs/AperiodicOrder/Tiling/Classification.lean`) | the Anderson–Putnam class of a settling's one-vertex cocycle | — |
| conflict count | — | `(vessel, epoch)` cells told with two laws plus bodies defined twice | `holofoam/src/orbit.mjs` `seams(plan).h1` |

Also in the register: `InconSheaf.H0top v cells` and `h0top_is_inconsistency_count`
(`Obs/Cohomology/InconsistencySheaf.lean`): the count of settled ⊤-cells, the paraconsistent
content, with `inconsistency_sheaf_is_cokernel` splitting the knowledge-designated cochains
into a truth side and a ⊤ side.

### 2.7 The germ and the regime stamp

**NAMED.** `Record` (`Obs/Language/Positing/Record.lean`): `pos, neg : Nat`; `topMass r := min
r.pos r.neg`; `DomBy s t := ∃ C, ∀ n, KLE (s n) (add (t n) C)` on `Nat → Record`;
`germ_order_not_antisymm` (the tally climb and its one-step lead dominate each other and
differ); `germPreValue : PreValueCategory` (`carrier := Nat → Record`, `le := DomBy`, `bot := fun _
=> kBot`); `tallyBump s n := add (s n) ⟨1, 0⟩`; `tallyLaxClosure : LaxVClosure germPreValue`
(`op, infl, mono, kz`); `tally_lax_slack : HasLaxSlack tallyLaxClosure germPreValue.bot` (the KZ
inequality holds and the double differs from the single); `topBump s n := add (s n) ⟨1, 1⟩`;
`iterSeq`; `topBump_flux : (∀ k, DomBy (iterSeq topBump k s) s ∧ DomBy s (iterSeq topBump k s)) ∧
(∀ k, iterSeq topBump (k+1) s ≠ iterSeq topBump k s) ∧ (∀ k n, k ≤ topMass (iterSeq topBump k s n))`.

**NAMED.** `RegimeCycle` (`Obs/Closure/RegimeCycle.lean`): `Stage.next` (articulating →
predicating → positing → settling → articulating), `Stage.next_four`, `ClosureRegime.rank`,
`spine_rank_table_descends` (carries an in-file OPEN), `return_rank_table_ascends`,
`residueBump c s n := add (s n) c`, `topBump_eq_residueBump : topBump = residueBump ⟨1, 1⟩`,
`residue_dichotomy` (zero residue fixes every sequence; nonzero residue fixes none, never
repeats, and keeps every stage in the seed's germ class), `residue_topMass : topMass c * k ≤
topMass (iterSeq (residueBump c) k s n)`, `Balanced c := c.pos = c.neg`,
`balanced_residue_holds_bias`, `unbalanced_residue_drifts`, `Turn (lap, stage)`, `Turn.advance`,
`advance_four`, `Turn.carried c s t := iterSeq (residueBump c) t.lap s`, `dervish`.

The germ is a node's long record: for each cell, the sequence of tallies it has carried
across laps. The stamp is the node's declared regime (`Settling.regime` is a free field;
`vanishing` constrains only strict/Scott). The two go together: a node whose residue is
nonzero is, by `residue_dichotomy`, in an orbit that never settles as data; the only Lean rung
with that character is the aperiodic one, and the node *declares* it, because
`regimeOfOrdHonest_ne_aperiodic` says no ordinal it can compute will.

### 2.8 The direct-limit ledger

**NAMED.** `DirectedSystem` (`Obs/AperiodicOrder/Tiling/AndersonPutnam.lean`): `stage : Nat →
Type u`, `map : m ≤ n → stage m → stage n`, `map_id`, `map_comp`; `Elem ⟨stage, val⟩`;
`Eventually a b := ∃ k hak hbk, map hak a.val = map hbk b.val`; `eventually_refl/symm/trans`;
`Colimit := Quot Eventually`; `Colimit.mk`; `Colimit.sound`; `Colimit.map_eq` (an element and
its image at a later stage have the same class); `gradeQuartet : SquareFamily heytingK Nat`
(`square _ := joinSquare tTop tBot`), `gradeQuartet_fiber`; `apSystem` (constant `H1Class`,
identity maps), `apSystem_stage_independent`; `aperiodic_direct_limit`; `stepNInvariant`,
`step_two_is_four`.

The ledger is how a node reports cross-stage content *without* a transfinite stage: it holds
one finite receipt per stage and the maps that push a receipt forward, and it exposes the
class in the colimit. The check (§10 item 3) calls this "the realizable aperiodic geometry";
this note takes it as the model's only honest long-horizon report.

**EXT (D1).** *The stage type at `τ` is the free abelian group on the cells designated at
stage `τ` of a settling (`AssocSheaf.Cochain` restricted by `dK`), `map h` is the inclusion
of designated sets along `τ ≤ τ'` (monotone, by the orbit), and the receipt pushed forward is
the identity cochain `identityCochain v` of `SettlingCohomologyH1`.* The functor laws are the
inclusion laws. The colimit class of a receipt is then stage-independent (`Colimit.map_eq`),
which is the statement that a finite receipt, once laid, never has to be recomputed at a later
stage to be compared with another.

## 3. Moves

The geometric model has eight moves. Each is a function on the state of §2, each is an
admitted history observation (so the node is a fold over its log, the Holofoam pattern),
and each is tagged.

### 3.1 LAY — receive a word from the language regime and settle it on a base

**In.** A local rule `step : Graph A` and a word `w : List A` with `Path step w`
(`Obs/AperiodicOrder/Tiling/SoficShift.lean`, `Path`), or a sofic image `SoficImage step π w`
(`sft_is_sofic`, `SoficImage.factor`), or a FOUR colouring of the word (`readingColour`, and
in general a `ProperColoring` whose `map_path` carries admissible words to admissible words,
`Obs/AperiodicOrder/Tiling/FiniteLocalRule.lean`). The check's language-row verdict governs what
"word" means: the language regime's Lean is finite paths in finite graphs (regular languages),
not Pentus's context-free Lambek grammars; LAY takes what exists.

**Move (NAMED).** Build `Settlement.ofTiles ⟨A, step, w, hw⟩`. If the word is coloured into
FOUR, build the coloured settlement by `reading_coloured_sofic`: `SoficImage warpAlt
readingColour (p.map readingColour)` for plain weave, and in general `factor_of_sft_is_sofic`.

**Move (EXT F2).** For a SignChain rule set rather than a graph on a finite alphabet, run
`closureOrbit` and take the designated cells in firing order as `word`, the adjacency rule as
`localRule`, the replay of `settlementAdmits` as `admissible`.

**Out.** A settlement over a base, content-addressed, with its orbit (its `SettleFrame` data,
EXT F1), ready for CONE and GLUE.

### 3.2 CROSS — read a meeting as one FOUR value

**Move (NAMED).** Where two strands meet at one locus, `crossingReading warpOver weftOver`;
where a thread passes a lenticule for the `n`-th time, `condensate n`; where two nodes'
sections meet on a lenticle, `LenticleJoinSection c₁ c₂ φ = joinK (c₁ φ) (c₂ φ)`. The laws the
model relies on: `hole_is_kBot` (neither claims: ⊥), `miscrossing_is_kTop` (both claim: ⊤,
held), `overUnder_swap_is_negate` (swapping which hand is over is Belnap negation, which fixes
⊥ and ⊤ and swaps t, f), `over_occupation_inconsistency` (a lenticule threaded twice reads ⊤),
`definite_joinK_inconsistency_iff_disagreement` (two definite readings join to ⊤ iff they
disagree).

**Honesty from the check (§4 3.6c).** The same file models the crossing as a one-context
measurement scenario (`crossingScenario`, `crossingModel`) in which the mis-crossing is the
*unsupported* assignment (`miscrossing_not_supported`). The model keeps both readings: the
value-level register holds ⊤; the scenario-level register says the physical crossing excludes
it. A held ⊤ is what the node *knows*; an excluded assignment is what the loom *does*.

### 3.3 TIEBREAK — resolve a tie by a hand

**Move (NAMED, with the check's vacuity).** `warpClaim := ⟨1, 1⟩`, `weftClaim := ⟨1, 1⟩`
(`Cohomology.Attention.Obstruction`), `both_claims_infeasible : ¬ Feasible 1 [warpClaim,
weftClaim]`, `hands_grant_one_claim : solveL 1 [...] = [weftClaim] ∧ solveR 1 [...] = [warpClaim]`,
`handed_tiebreak_avoids_miscrossing`. The check (§4 3.6d) shows `warpClaim` and `weftClaim`
are the same term and `assignmentOf` reads any singleton the same way, so what is proved is
"each hand returns a singleton", which suffices to avoid ⊤ but does not distinguish the hands.

**EXT (T1).** *`warpClaim := ⟨1, 1⟩`, `weftClaim := ⟨1, 2⟩` (or any two distinct stakes), and
`assignmentOf` reads a slot "over" when its own claim is in the selection, not by position.*
Then `solveL` and `solveR` can be shown to pick different claims on the tie, and the two hands
become two laws of resolution. Until T1, TIEBREAK is one law with two names.

### 3.4 CONE — compute the causal order, cones, horizon and reports

**Move (NAMED + CODE).** From the orbit's firing events build the `CausalSet` (EXT C1 for the
witness order; `causalOrder` for the present heuristic). Then: `Past`, `Future`, `Spacelike`,
`Diamond` per `Cone.lean`; `timeSection` as the clock; relative to the node's readout
(`readout := published heads`), `HoleRegion`, `ReadoutExterior`, `Shroud`. In code:
`causalCone`, `causalSeparation`, `orderingFraction`; in Holofoam, `kinematicRegion` with the
four laws checked at runtime.

**Move (NAMED).** When two nodes report causal structure, each report is a `ConeReport`
(`E → E → Reading`); the merge is `mergeReports` (pointwise `joinK`); the merge is commutative
and inflationary; a report derived from a Boolean relation never says ⊤
(`booleanConeReport_consistent`). Disagreement about *what reached what* is therefore held as
`ReportsInconsistent`, exactly like disagreement about a crossing.

### 3.5 GLUE — make one section of many, or price the failure

**Move (NAMED).** Given a cover `Sheaf.Cover` (patches whose union is every cell,
`Obs/Site/Sheaf.lean`) and local sections, form `Cech1`. If they agree on overlaps
(`Cocycle D`), `glue D` is a global section and `glue_coboundary` proves it restricts to each
local one; `glue_unique` (via `Sheaf.separated`) says it is the only one. This is
`Settlement.ofCech1 D hcoc`. Convergence of the merged valuation is `Reading.joinList_congr`
(the join depends only on the set of deltas) and `CRDT.crdt_merge_order_independent`,
`calm_monotone_coordination_free` (`Obs/Cohomology/CRDTCohomologicalCALM.lean`).

**Move (NAMED).** Whether or not they agree, build the `CoverNerve` of the source–stance
incidence (`CoverNerve.ofIndexedCoverIncidence`, `coverNerve_h1_from_incidence`) and report
`H1rank`. `h1_vanishes_iff_forest`: zero iff the nerve is a forest. `h1rank_is_coordination_cost`:
the number of cells that need a total order imposed before the family can be read as one. In
code, `cohomologyOfCells` computes exactly this rank.

**What GLUE never does.** It never averages. If the local sections disagree at a cell, the
knowledge join is ⊤ there (CROSS), the cell is counted by `H0top`, and the cost of resolving
it by fiat is one unit of `H1rank` per independent cycle. The model returns the glued section
*and* the price, and lets the regime above decide whether to pay.

### 3.6 ACCRETE — the aperiodic move

**Move (NAMED).** At the end of a lap the node adds its residue `c : Record` to every cell's
germ: `residueBump c`. `Turn.advance` moves the position; `Turn.carried c s t` is the record
after `t.lap` laps. `dervish`:

- four steps bring every position back to its stage (`advance_four`);
- if `c ≠ kBot`, the record after a lap differs from the record before it, yet both dominate
  and are dominated by the seed (one germ class);
- if `c = kBot`, every position carries the seed (a circle, not a spiral).

`residue_topMass`: after `k` laps every cell carries at least `k · topMass c` of contradiction
mass. `balanced_residue_holds_bias`: a balanced residue (told equally both ways) keeps each
cell's truth bias while its contradiction mass grows. `unbalanced_residue_drifts`: an unbalanced
one moves the bias every lap, so no two laps share a bias.

This is the move the strict-regime objects of §2 cannot make and the move that makes the model
*geometry* rather than a static atlas. The reading shadow of a cell's record saturates at ⊤
after the first balanced lap; what is carried forward is not the reading but the record — the
pair of tallies — and it is the record that never repeats.

**Where σ and Δ honestly sit.** Within a history fiber the nuclei are strictly idempotent
(`Nucleus.idem` is a field). The content that is lax lives on the germ: `tallyLaxClosure.kz`
holds and `tally_lax_slack` says the double bump is not the single bump. If the founder's
σ/Δ are to be lax anywhere in this library as it stands, it is as `LaxVClosure` on
`germPreValue`, at the aperiodic rung, acting on records across laps — not as nuclei on a
fiber. The model treats σ-saturation and Δ-transfer *within* a lap as nuclei (idempotent,
`readingNuclearPair` is the only inhabitant) and the *lap* itself as the lax closure.

**EXT (A1).** *`saturating_t` on `H_t := the settled fiber algebra at history `t`` is the
join-nucleus `joinSquare`-style raise toward the largest element whose restriction to every
proper prefix `t₀ < t` is below `a`'s; `transferring_t` is the meet over elements witnessed in
every one-step extension `concat t u`.* Both must be proved `Nucleus` (so idempotent); their
variation across `t` is `SquareFamily.Varies` (`Obs/Language/Positing/Bigraded.lean`,
`varyingFamily_varies` is the proved finite case); and the map `settlingOf` that
`HistorySeparationForcesAperiodicity` is relative to is *the regime stamp of the node whose
family varies*. This is the open pair-1 definition the check (§2) says does not exist; A1
states what it would be.

### 3.7 LEDGER — push receipts into the direct limit

**Move (NAMED).** For each stage `τ` of the orbit, a receipt in `S.stage τ` (EXT D1); the
cocone law `Colimit.map_eq` says a receipt and its image at a later stage are the same class.
Two nodes compare long-horizon content by `Eventually`: do their receipts agree after being
pushed to a common stage? `eventually_trans` makes that an equivalence. `apSystem` is the
degenerate case (every stage the same class, identity maps); the model's real systems have
inclusions as maps (D1).

### 3.8 RETURN — hand the lap back to the top

**Move (NAMED as a table, OPEN as a derivation).** `Stage.next settling = articulating`;
`return_rank_table_ascends` (strict, rank 0, to aperiodic, rank 3, in one step). What the
geometric model hands up: an `Articulating` (`Obs/Articulation/Articulating.lean`: `utter :
Utterance → Articulating`, `pair : Utterance → Articulating → Articulating`, with `Utterance
(token, claim)`), plus the node's germ and stamp. The spine then predicates it
(`Stage.predicating`, the transfinite-bounded rung the governing note calls language) and the
cascade descends again.

**EXT (R1).** *The doubly quiescent layer `autopoieticCore Q` (`A* = Fix π`) of lap `k` is the
seed valuation of lap `k+1`.* The check (§3 3.5j) found no theorem for this; R1 is the
statement. What is proved about `A*`: `autopoieticCore_iff : autopoieticCore Q a ↔ (saturating
Q).Fix a ∧ (transferring Q).Fix a`, `nuclear_autopoiesis_cell` with `self_production`,
`four_corners`, `joint_is_intersection`.

## 4. Flows

### 4.1 In from the language regime

In the cascade direction language is upstream of geometry. What arrives:

| what | **NAMED** carrier | how LAY uses it |
|---|---|---|
| a local rule | `Graph A` | `Tiles.localRule` |
| an admissible word | `Path step w` | `Tiles.word`, `Tiles.admissible` |
| a factor of a word | `SoficImage step π w`, `SoficImage.factor` | the visible pattern of a hidden-decoration word (`forgetDecoration`, `sofic_of_decorated`, `fib_deep_sofic`) |
| a colouring | `ProperColoring`, `ProperColoring.map_path`, `Colorable.pullback` | `readingColour` and its generalizations; when the palette is FOUR the colouring is a valuation |
| a substitution | `substitute σ w`, `substitute_preserves_path`, `fibSub`, `fib_substitute_golden` | inflation between laps (the cleavage of the multicellular vision) |
| a derivation (as code) | SignChain `rule()` with `{antecedent, consequent}` and `derivation()` witnesses | `closureOrbit` seed and rules; EXT C1's `prec0` |

Nothing arrives as a *reading*. The algebra regime's discipline (`Spine.run`: readings are
measured, never supplied) is honoured here by construction: the geometric model receives
words and rules and *lays* them; the readings it holds are `crossingReading`, `condensate`,
`joinK` of sections — computed, not told.

### 4.2 Out, two ways

**Up the spine (perception).** Every laid, crossed, glued object is articulated: an
`Articulating` over the node's utterances, handed to `predicating`. In the Lean table this is
`Stage.next articulating = predicating` and `Stage.regime predicating = transfiniteBounded`.
Concretely: the settled cells, the ⊤ cells (`H0top`), the hole region relative to the readout,
the `H1rank`, and the stamp. The language regime receives *what was laid where and when*, so
that its next words can be about it.

**Round the lap (realization).** `RETURN` hands the germ forward. The algebra regime at the
top of the next lap measures readings off a trace that now includes the geometric model's
articulations. `dervish` is the law that the second lap is not the first.

### 4.3 What never flows

A regime stamp of `aperiodic` never flows *out* of a computation; it flows *in* as a datum.
A Čech `H¹` never flows as an obstruction (it is zero); the obstruction that flows is
`H1rank`. A reading never flows in from above; a word does.

## 5. Many nodes: the foam, honestly named

"Foam" appears in no Lean file (check §5 3.7e). It appears in `signgraph/src/cohomology.mjs`
("the foam's wall graph") and `site.mjs` ("the sheaf on the foam"). This section says what the
word can mean given only what is proved, and then what a living foam would be.

### 5.1 Cells

A **cell** is one node's geometric model: `(L_i : HistorySystem, (q, τ, U_i) : SiteObj, F_i :
SettleFrame, Q_i : Order.CommutingNuclei H_i, s_i : Nat → Record, stamp_i : ClosureRegime)`.
`nuclear_autopoiesis_cell Q_i` holds for any `Q_i` (**NAMED**, `Obs/AperiodicOrder/Tiling/Autopoiesis.lean`):
the cell's four corners are `cellCorner Q_i c a` for `c ∈ {absurd, potential, active, stable}`,
i.e. `(a, σ a, Δ a, π a)`, with `joint_is_intersection` saying the stable corner is fixed iff
both the potential and the active corners are. The check (§5 3.7a, 3.7c) is right that
"history" enters only in prose; EXT A1 is what would make `Q_i` a function of `L_i`.

### 5.2 Films

A **film** between two cells is their lenticle, `Lenticle U_i U_j := Site.meet U_i U_j`
(**NAMED**), nonempty when the two patches overlap (`lenticle_nonempty` for an
`OverlappingTwoCover`). On the film the two sections meet as `LenticleJoinSection`, and the film
is **contested** exactly where the two definite readings disagree
(`lenticleSection_inconsistency_eq_disagreement`). A film with no contested cell is dry: the
two cells could be one. The number of contested cells on all films is `H0top` of the joined
section (`h0top_is_inconsistency_count`): the paraconsistent content of the foam.

### 5.3 Borders

A **Plateau border** is a cycle in the cover nerve: three or more cells whose films close a
loop. `H1rank` counts the independent such loops (`h1_vanishes_iff_forest`). A foam with
`H1rank = 0` is a tree of cells and glues coordination-free; each unit of `H1rank` is one
cell that must accept a total order before the foam reads as one section
(`h1rank_is_coordination_cost`). The Laplacian view (`laplacian_kernel_cokernel`) is what
`cohomologyLaplacian` in code computes. This is the one `H¹` that is a *geometric* number
about the foam.

### 5.4 Pressure and tension (honest substitutes)

There is no surface tension and no pressure in Lean or code (check §5, Holofoam survey). The
quantities that play their role are exact and proved:

- **tension on a film** — `H0top` restricted to the lenticle (contested cells);
- **pressure in a border** — `H1rank` (coordination cost);
- **rigidity of a cluster** — Holofoam's `bodyBarSheaf`/`cellularSheafCohomology` over ℚ
  (**CODE**, `signgraph/src/cellular-sheaf.mjs`; the check §7 5b: Lean has no real-stalk sheaf,
  the numeric layer is ahead of Lean);
- **breakage** — Holofoam `structure.mjs` `failure()`: a member over its strength is told
  against its design cell (⊤), fires, is removed, and the structure re-settles until nothing
  fires (**CODE**; the check §7 5c confirms the connection to SignCraft history, not to
  `settle.mjs`).

### 5.5 Breathing: what "alive" means formally

The Holofoam organism lab is not alive (survey: no reproduction, no consequential metabolism,
no selection). The formal content of *alive but coherent* that the library does state is
`topBump_flux` on the germ carrier and `dervish` on the spiral: the record changes every lap
(`iterSeq topBump (k+1) s ≠ iterSeq topBump k s`), never leaves its class (`DomBy` both ways),
and accumulates contradiction mass (`k ≤ topMass`). A cell **breathes** when its residue is
nonzero; a cell is **crystal** when its residue is `kBot` (`residue_dichotomy`). A cell's
**metabolism** is its residue `c`: balanced residue holds the bias and grows ⊤-mass
(`balanced_residue_holds_bias`); unbalanced residue drifts the bias (`unbalanced_residue_drifts`).

The check (§5 3.7g) notes `cohomologyVanishes` is false for transfinite-bounded as well, so
"alive" is not specific to the aperiodic stamp. Agreed: the discriminator is the residue, not
the stamp; the stamp is what a node *declares* about its residue's regime.

### 5.6 Differentiation and multicellularity

Two cells over the same algebra are **differentiated** when their nuclear pairs differ:
`SquareFamily.Varies : ∃ i i', (square i).j1.j ≠ (square i').j1.j ∨ (square i).j2.j ≠ (square
i').j2.j` (**NAMED**), with `varyingFamily_varies` the proved two-fiber case (fiber `true`
raises toward `t`, fiber `false` toward ⊤). A **tissue** is a set of cells whose squares
agree. The Axiom of History Separation — that a varying family *forces* aperiodicity — is
`HistorySeparationForcesAperiodicity settlingOf`, stated and open, relative to an undefined
`settlingOf`; `varying_family_beside_aperiodic_witness` records that a varying family exists
and an aperiodic witness exists with no map between them. The multicellular foam is therefore,
as of this library: cells that provably vary, a regime that is provably declared, and an
open theorem that the first forces the second.

### 5.7 Abiotic digital organic simulation: the Holofoam pattern, kept

What Holofoam gets right and the foam keeps (**CODE**, confirmed by the check §6, §7 5c, 5d):

- state is a fold over an admitted event history (`createExperiment`, `replay`, `checkpoint`);
- causal diamonds and sequencing are computed and law-checked at runtime
  (`diamonds`, `sequencingCheck`, `kinematicRegion`) against the four theorems of
  `HoleDiamondCausalSet`;
- merging plans is a history union with the conflicts surfaced as `seams(plan)` (a count,
  not a rank, and not Čech);
- counterfactuals are forks of a checkpoint (`forkCompare`).

What the foam adds to make the simulation organic in the formal sense of §5.5: a residue per
cell per lap (ACCRETE), a stamp, and a direct-limit ledger. Death is a T2-style removal
admitted as an event over a fresh site, never a retraction of evidence (so `joinList_congr`
and the lfp theorems keep applying; the multicellular vision's risk list says the same).

## 6. What it can do that a large language model cannot

Each item names the theorem that makes the capability a property rather than a hope.

1. **Hold a contradiction at a place and a time.** A mis-crossing is `kTop` and stays a value
   (`miscrossing_is_kTop`, `miscrossing_isInconsistency`); an over-threaded bead is a
   condensate (`over_occupation_inconsistency`); two nodes' disagreement on a film is a ⊤ cell
   counted by `H0top`. A language model has no stable first-class "both told" state and no
   locus for it.

2. **Know what a cell could have known.** `Past` under `CausalLe`, `past_is_downward_closed`;
   `HoleRegion` relative to a readout with `hole_future_closed` and
   `hole_no_future_to_exterior`. The model can say "this cell's reading depends only on these
   premises" (EXT C1 makes `Past` the premise closure) and "this fired cell will never affect
   what we publish". Attention has no causal order and no horizon.

3. **Merge without a coordinator, and price when it cannot.** `joinList_congr`,
   `crdt_merge_order_independent`, `mergeReports_comm`, `glue` with `glue_unique` when the
   family agrees; `H1rank` with `h1rank_is_coordination_cost` when it does not. The number is
   exact: cells minus entities plus components.

4. **Identify two settlings by replay.** `geoMld_iff_settleEq`: geometric mutual local
   derivability is equality of settled value, for every `SettleFrame`, idempotent or not. In
   code, `settlementAdmits` is the replay. A language model has no notion of two
   computations being the same up to closure.

5. **Carry a record that never repeats and never leaves its class.** `topBump_flux`,
   `dervish`. The model's long memory is a germ, not a context window: it is unbounded, it is
   provably coherent, and it provably accumulates.

6. **Report its regime honestly.** Strict, Scott and transfinite-bounded are computed from the
   orbit (`regimeOfOrdHonest`); aperiodic is declared, because
   `regimeOfOrdHonest_ne_aperiodic` says it cannot be computed. A language model reports
   confidence; this model reports a regime and the evidence class the regime admits.

7. **Lay a language into a geometry with the laws intact.** `ProperColoring.map_path`,
   `factor_of_sft_is_sofic`, `reading_coloured_sofic`: the admissible words of the language
   regime stay admissible under colouring and factoring. What is laid is lawful by theorem,
   not by sampling.

8. **Be exact and replayable across machines.** Everything in §2 is decidable finite data
   (`Bool × Bool` clopens, `Nat` tallies, `Int` cochains, content addresses); Holofoam's
   `replay` is bit-identical on the same engine. The check's one caveat (`simulation.mjs` uses
   native `Math.sin`) is a code defect, not a design limit.

What it cannot do, and a language model can: it has no similarity metric, no distributed
representation, no fluency; it has never run above toy scale; its Lambek side is algebra
only; its handedness is one law with two names until EXT T1; its causal order is a heuristic
until EXT C1; its site in code has no clopens until EXT S1. The model is a systems layer for a
machine whose other three regimes must do the inferring, the generating and the measuring.

## 7. Worked examples

All readings, words, rules and crossings below are real: the Lean definitions are applied
by hand, the RelConLang sentences are from `relconlang.test.mjs`, the rules are Holofoam's
`compileModel` templates, and the code paths are the exports named.

### 7.1 A plain-weave strip laid as a settlement, then crossed by two nodes

**The word.** `w := [true, false, true, false]` (warp over, weft over, warp over, weft over).
`Path warpAlt w` holds because each consecutive pair differs (`warpAlt a b = (a != b)`). The
settlement is `Settlement.ofTiles ⟨Bool, warpAlt, w, hw⟩`: base `⟨Bool, warpAlt⟩`, content `w`,
admission `hw`. `warp_sofic w hw : SoficImage warpAlt (fun a => a) w`.

**The readings.** `readingColour` maps the word to
`[crossingReading true false, crossingReading false true, crossingReading true false,
crossingReading false true] = [tTop, tBot, tTop, tBot]` = `[t, f, t, f]`. By
`defectFree_definite` every crossing is definite; by `defectFree_consistent` none is ⊤.
`reading_coloured_sofic w hw` says the coloured strip is a sofic image over FOUR.

**A float.** The word `[true, true, false]` is refused: `warpAlt_forbids_float true [false] :
¬ Path warpAlt (true :: true :: [false])`. The language regime may not hand this word down;
LAY has nothing to lay.

**A swatch.** Rows `r₁ = [T,F,T,F]`, `r₂ = [F,T,F,T]`, `r₃ = [T,F,T,F]`. `ColumnsComplement [r₁,
r₂, r₃]` holds (`r₂ = r₁.map (!·)`, `r₃ = r₂.map (!·)`), each row is a `Path warpAlt`, so
`PlainWeaveSwatch`. `plainWeave_entropy_collapse` gives, for any two rows, `r_i = r_j ∨ r_i =
r_j.map (!·)`: here `r₁ = r₃` and `r₁ = r₂.map (!·)`. Two row-states, however tall the swatch.
This is the theorem the governing note listed as open; the check corrected it; the model uses
it as the statement that plain weave is the *periodic* limit — the dry crystal of §5.5.

**Two nodes cross.** Node A reads crossing 3 as `tTop` (warp over); node B, weaving the same
strip from its own log, reads crossing 3 as `tBot`. On the film `Lenticle U_A U_B`,
`LenticleJoinSection` gives `joinK tTop tBot = kTop` at crossing 3 and `tTop`, `tBot`, `tBot`
elsewhere. `definite_joinK_inconsistency_iff_disagreement`: ⊤ exactly because the two
definite readings disagree. `H0top` of the joined section over the four crossings is 1. The
foam holds one contested bead; it does not pick a winner. If a winner is wanted, TIEBREAK:
`hands_grant_one_claim` returns a singleton for either hand and
`handed_tiebreak_avoids_miscrossing` says the result is not ⊤ — but (check §4 3.6d) which
strand wins is the same for both hands until EXT T1.

**The mirror.** If node B's loom is mounted the other way round, every reading it reports is
`negate` of A's: `overUnder_swap_is_negate`. Then `[t, f, t, f]` meets `[f, t, f, t]` and
*every* crossing on the film is ⊤. `overUnder_swap_fixes_defect`: the mirror creates no ⊤ on
its own; the ⊤s come from meeting. The model can detect this pattern (all definite, all
disagreeing) and report "one node is mirrored" as a hypothesis for the regime above, since
`space_negate` says negation reverses the space coordinate of every reading while
`time_negate` fixes its time.

### 7.2 A bead thread: legality and condensate

**The thread.** Lenticules `b₁, b₂`. Passes `Γ := [(b₁, false, true), (b₂, false, true), (b₁,
true, false)]`. Each pass is legal: `legal_iff_distinct b₁ false true : Legal (b₁, false, true) ↔
false ≠ true`, and likewise for the others. So `ThreadLegal Γ`, and `Settlement.ofBeadsThread`
applies with content `Γ`. `holeTransition_eq_warpAlt` says the law that admitted each pass is
the same law that admitted the weave word of §7.1: a bead is a crossing on a rigid body.

**A fold-back.** The pass `(b₂, true, true)` is illegal: `legal_iff_distinct b₂ true true` gives
`Legal ↔ true ≠ true`, false. The thread may not re-enter the port it left.

**The condensate.** `b₁` is occupied twice, `b₂` once. `condensate 2 = kTop`
(`condensate_over 0`), `condensate 1 = tTop`. `over_occupation_inconsistency 0 : (condensate
2).isInconsistency = true`. So the bead register reads `b₁ ↦ ⊤`, `b₂ ↦ t`: `b₁` is a
condensed, jammed, *held* over-occupation — the place where two relations pile into one mode.
`mirror_fixes_condensate_pole 0`: turning the beadwork over leaves `b₁`'s ⊤ where it is.

In the foam this is what a node reports when the same cell is told through two independent
derivations: not "error", but a condensate at the lenticule, which the regime above may read
as corroboration (two threads) or as a jam (one more and the bead over-fills).

### 7.3 RelConLang sentences laid into a causal order with light-cone coordinates

**The words** (from `relconlang.test.mjs`; `READING_PARTICLES`: `ta ↦ told(true,false)`,
`na ↦ told(true,false)`, `sha ↦ told(true,true)`, `mu ↦ told(false,false)`; `ga` marks the
subject, `do` introduces the object):

- `ta mi ga ran do sava.` → cell `(mi, ran, sava)`, reading `potential` = `tTop` = t.
- `na ni ga ren do kelu.` → cell `(ni, ren, kelu)`, reading t.
- `sha ni ga ren do kelu.` → the same cell, reading `stable` = `kTop` = ⊤.
- `mu ni ga ren do kelu.` → the same cell, reading `absurd` = `kBot` = ⊥.

**Light-cone coordinates** (`LightCone.lean`): `time t = 1, space t = 1`; `time f = 1, space f
= −1`; `time ⊥ = 0, space ⊥ = 0`; `time ⊤ = 2, space ⊤ = 0`. The `na` reading and the `sha`
reading of `(ni, ren, kelu)` stand in the causal order: `kle_iff_lightcone t ⊤` asks `space ⊤
− space t = −1 ≤ time ⊤ − time t = 1` and `space t − space ⊤ = 1 ≤ 1`; both hold, so `t ≤ₖ ⊤`:
the `sha` telling is in the causal future of the `na` telling. `kle_time_mono`: time went
from 1 to 2. The `mu` reading is the past tip (`kBot_past_tip`). Had a fourth speaker said the
`f`-reading, `tTop_tBot_spacelike` would place it spacelike to the `na` reading: equal time,
incomparable in `≤ₖ`, comparable in `≤ₜ`.

**A real rule set.** Holofoam's `compileModel` (`holofoam/src/simulation.mjs`, survey) builds
SignChain rules of the shape *antecedent: sensed cell at least `potential`; consequent: the
policy cell at `potential`*, with two fixed templates: `flow → approach-for`, `crowded →
approach-against`. Take the sensed cells `s_flow`, `s_crowded` (both told t at stage 0) and
the policy cell `p`. Stage 1: rule 1 tells `p` for, rule 2 tells `p` against; `p` settles to
⊤ (told both), which Holofoam reads as the action `inspect`. The orbit closes at stage 1
(`settledAt = 1`, `regime = strict`).

**The causal order (CODE, present heuristic).** `firingEvents` gives `s_flow@0`, `s_crowded@0`,
`p@1`. `causalOrder`: `s_flow ≺ p` and `s_crowded ≺ p` hold iff they share a subject or object
term with `p`; `s_flow` and `s_crowded` are at equal stage, hence spacelike. If both sensed
cells share the organism as subject with `p`, `causalCone(order, p).past = {s_flow, s_crowded}`,
`orderingFraction = 2/3`. **With EXT C1** the past of `p` is the two premise cells regardless of
term sharing, because the rule witnesses name them: the cone becomes the proof's dependency
closure.

**The horizon.** Let the readout be the cells the node publishes: `readout p = true`, others
false. `ReachesReadout s_flow` holds (it causally precedes `p`); so `s_flow`, `s_crowded`, `p`
are all `ReadoutExterior`. Add a fired cell `q@1` from a third sentence that nothing
downstream uses: `HoleRegion readout q = true`. `hole_future_closed`: anything `q` reaches is
also in the hole; `hole_no_future_to_exterior`: `q` never precedes a published cell. The model
reports: *one fired cell will never affect what this node publishes*. No language model has a
statement of that form about its own activations.

### 7.4 Two nodes report reachability and disagree

Node A's `ConeReport` says `R_A s_flow p = tTop` (reached). Node B, with a log in which
`s_flow` arrived after `p` was published, says `R_B s_flow p = tBot`. `mergeReports R_A R_B
s_flow p = joinK tTop tBot = kTop`: the merged report is `ReportsInconsistent`. Neither node is
overruled; the foam holds that the causal history of `p` is contested. `mergeReports_comm`: it
does not matter who reported first. `booleanConeReport_consistent`: a single node computing
from its own DAG never produces this ⊤; it arises only from meeting.

### 7.5 Coordination cost on a real cover nerve

Three nodes each hold one cell over the entities `{mi, sava, kelu}`:
`(mi, ran, sava)`, `(sava, ren, kelu)`, `(kelu, kan, mi)`. The source–stance nerve has
`entities = 3`, `cells = 3`, `components = 1`. `H1rank = (3 + 1) − 3 = 1`. `h1_vanishes_iff_forest`:
not a forest (there is a cycle `mi — sava — kelu — mi`). `h1rank_is_coordination_cost`: one
cell must accept a total order before the three sections read as one. Drop `(kelu, kan, mi)`:
`entities = 3`, `cells = 2`, `components = 1`, `H1rank = 0`, a forest, `CoordinationFree`, and
`tree_coordination_free` applies to it as a `FinTree`. In code, `cohomologyOfCells` on the three
cells returns `firstCohomology.rank = 1`.

This is the number the model hands up when GLUE is asked to make one section: here, "one".

### 7.6 Čech gluing when the family agrees

Cover `{U₁, U₂}` of the cells `{a, b, c}` with `U₁ = {a, b}`, `U₂ = {b, c}`; local sections
`g₁ = (a ↦ 2, b ↦ 1)`, `g₂ = (b ↦ 1, c ↦ 3)` as cochains. They agree on the overlap `{b}`, so
`Cocycle D`. `glue D` reads off the first covering patch: `(a ↦ 2, b ↦ 1, c ↦ 3)`;
`glue_coboundary` says it restricts to `g₁` and `g₂`; `glue_unique` says nothing else does.
`Settlement.ofCech1 D hcoc` has content `glue D` and admission `Coboundary D (glue D)`. Note
what did *not* happen: no regime was consulted (`h1_vanishes` is unconditional, check §5
3.7d). The gluing is a strict-regime operation the foam performs on every film at every lap.

### 7.7 A lap: the residue on a real record

Seed `s n := ⟨n, 0⟩` (the tally climb: cell `n` told for `n` times, never against). Residue `c
:= ⟨1, 1⟩` (balanced). `Turn.carried c s ⟨k, stage⟩ n = ⟨n + k, k⟩` (`iterSeq_residueBump`).

- Lap 0: `⟨n, 0⟩`; reading shadow `t` for `n ≥ 1`, ⊥ at `n = 0`.
- Lap 1: `⟨n + 1, 1⟩`; shadow ⊤ for every `n` (both tallies positive).
- Lap 3: `⟨n + 3, 3⟩`; `topMass = 3 ≥ 3 · topMass c = 3` (`residue_topMass`).

`dervish`: lap 1 differs from lap 0 as data (`⟨1, 1⟩ ≠ ⟨0, 0⟩` at `n = 0`); `DomBy (carried) s`
with `C = ⟨k, k⟩` and `DomBy s (carried)` with `C = kBot`; the orbit is one germ class.
`balanced_residue_holds_bias`: `(n + k) + 0 = k + n`, the bias `pos − neg = n` is held at every
lap while ⊤-mass grows. So after the first lap every cell's *reading* is ⊤ and stays ⊤, while
the *record* still knows that cell `7` is seven told-fors ahead. This is why the geometric
model carries records, not readings: the reading saturates, the record does not.

Set `c := ⟨1, 0⟩` instead (unbalanced): `unbalanced_residue_drifts` says the bias moves by one
each lap; `tally_lax_slack` is this very closure's slack at the seed. The node whose residue is
`⟨1, 0⟩` is the node that only ever adds told-fors: it drifts.

### 7.8 The chromatic Lorentzian as a one-dimensional settling with a limit

`mark0 = [T, F, F, F, …]`. `step mark0 = [T, T, F, F, …]`; `step (step mark0) = [T, T, T, F, …]`;
`step_not_idempotent` at index 2. `settle mark0 = [T, T, T, T, …]` (the past-closure: `n` is
marked iff some `m ≤ n` is). `settle_step`: `settle (step mark0) = settle mark0`.
`geoMld_iff_settleEq`: any two markings with the same past-closure are geometrically MLD; here
`mark0` and `step mark0` are. The check (§3 3.5e, 3.5g) is right that `step (settle f) = settle f`
and "reached only at ω" are not theorems, and that the carrier is `Nat → Bool`, not readings.
**EXT (L1).** *A `SettleFrame` on `Nat → Reading` with `step f (n+1) := joinK (f (n+1)) (f n)` and
`settle` the `joinK`-past-closure; prove `settle_step`; prove that the induced order on the
settled values at each index is `KLE`, hence `kle_iff_lightcone`.* That is the frame in which
the strip of §7.1 propagates its readings forward in time, and the first place "light cone"
and "chromatic" would meet in one Lean carrier.

### 7.9 The direct-limit ledger on a two-stage orbit

The orbit of §7.3 has stages 0 and 1. With EXT D1, `S.stage 0` is the free group on
`{s_flow, s_crowded}`, `S.stage 1` on `{s_flow, s_crowded, p}`, `S.map (0 ≤ 1)` the inclusion.
The receipt `identityCochain v₀ = s_flow + s_crowded` at stage 0 and its image at stage 1 are the
same class: `Colimit.map_eq`. Node B, with a different orbit that also designates `p` by stage
2, pushes its receipt to stage 2; the two receipts are `Eventually` equal iff they agree there.
`apSystem` is the degenerate check: constant stage, identity map, `apSystem_stage_independent`.

### 7.10 The J26 cell as a finite complex the foam could tile

`J26.cellComplex` (`Obs/AperiodicOrder/Tiling/J26.lean`): eight vertices, fourteen edges, eight
faces (four triangles, four squares), one volume; `face_dim_drop`;
`every_face_boundary_is_valid`; `shared_cycle_is_quarter_turned` (the two prisms meet after one
step of the four-cycle). `TransfiniteCellComplex.transfinite_complex_is_colimit_of_finite`
(`Obs/Cohomology/TransfiniteCellComplex.lean`) says a complex is the colimit of its finite
sub-complexes. The check (§10 item 8) names these as the finite-cell/colimit shape a SignCraft
complex would target. A foam whose cells are J26 bodies (a space-filling Johnson solid) would
have films that are its eight faces and borders that are its fourteen edges; the cover nerve of
§5.3 is then literal.

## 8. The extensions, collected

Each is stated so that it can be written as a Lean declaration and so that the check's
corrections are respected.

| tag | statement | depends on |
|---|---|---|
| H1 | a node's log is `HistorySystem` on `List Observation`; the DAG is a pushout of logs; its prefix order is `CausalLe` with `causalLe_antisymm` | `History.lean`, `Cone.lean` |
| S1 | a SignGraph site object is `Site.SiteObj PredicationCell` with `U` the clopen of held sides | `Site/Basic.lean`, `Site/Claim.lean` |
| F1 | a SignCraft settlement is a `SettleFrame`; `settlementAdmits` decides `geoMld_iff_settleEq` | `ChromaticLorentzian.lean` |
| F2 | a settled rule system is `Settlement.ofTiles` with the adjacency rule as `localRule` | `Settlement.lean`, `Settlements.lean` |
| C1 | the causal set of a settlement has `prec0 x y` iff `x` is a premise of `y`'s witness; `HoleRegion` relative to published heads | `Order.lean`, `Hole.lean` |
| T1 | `warpClaim ≠ weftClaim` as terms; `assignmentOf` reads by claim, not position | `WeaveDraft.lean` |
| A1 | `saturating_t`, `transferring_t` as nuclei on the settled fiber at history `t`; variation is `SquareFamily.Varies`; `settlingOf` is the stamp | `Autopoiesis.lean`, `Bigraded.lean` |
| D1 | stages are free groups on designated cells, maps are inclusions, receipts are identity cochains | `AndersonPutnam.lean`, `SettlingCohomologyH1.lean` |
| R1 | `autopoieticCore Q` of lap `k` seeds lap `k+1` | `Autopoiesis.lean`, `RegimeCycle.lean` |
| L1 | `SettleFrame` on `Nat → Reading` with `joinK` past-closure; its order is `KLE`, hence `kle_iff_lightcone` | `ChromaticLorentzian.lean`, `LightCone.lean` |

Two more the check asked for and this note needs: `step (settle f) = settle f` and "no finite
stage equals `settle`" for `ChromaticLorentzian` (§3 3.5e); and a `Settlement` instance for the
weave with the hands as a second field (§4 3.6g), which is F2 at `warpAlt` plus T1.

## 9. What stays open, and what the founder decides

- **Where σ/Δ are lax.** The library puts lax slack at the aperiodic rung on the germ preorder
  and `μ = id` at strict and Scott. This note builds on that. If the founder's correction (lax
  at Scott) stands as design, a non-antisymmetric Scott-height carrier must be exhibited; the
  check (§2) says `Record` at Scott is antisymmetric. Until then the geometric model is the
  rung that carries the 2-cells, and SignCraft is their home.
- **History separation.** `HistorySeparationForcesAperiodicity` is open and relative to an
  undefined map; A1 is the definition that would make it statable.
- **The aperiodic carrier.** Unreachable by ordinal; the realizable version is "non-antisymmetry
  plus unbounded flux" (`germ_order_not_antisymm`, `topBump_flux`), which the germ carrier
  already is.
- **The CALM equivalence.** `calm_convergence_facts` is a conjunction; `H¹ = 0 ⟺ confluence` is
  the open frontier; the model uses the conjuncts.
- **Scale and fluency.** Nothing here has run above toy scale; the language surface is a
  conlang; the model's claims are about laws, not about performance.

What the geometric model is, in one sentence that the check permits: *a node that lays the
language regime's lawful words into exact finite sites and causal orders, holds every meeting
as a FOUR value with ⊤ kept, glues what agrees and prices what does not with a cycle rank,
carries its record forward one balanced residue per lap so that it never repeats and never
leaves its class, and declares — never computes — that this is the aperiodic regime.*
