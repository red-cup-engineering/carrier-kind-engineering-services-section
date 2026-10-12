---
title: "Cascade check, geometry regime: adversarial reading of the SignCraft rows"
description: "Claim-by-claim adversarial check of the geometry (aperiodic, SignCraft) material in the 2026-10-08 cascade note (sections 1.2 geometry row, 1.3, 3.5 light cones, 3.6 weaving, 3.7 foam, 4 item 4, 5 geometry, 6 target 6) against the Obsmetrologia Lean statements, the Fibercraft Lean, the SignCraft and SignGraph JavaScript and the Holofoam app, with a verdict (CONFIRMED, WRONG, QUALIFIED, UNSUPPORTED) per claim, the regime-assignment and sigma/Delta findings, and what the note missed."
date-created: 2026-10-08
kind: engineering-research-note
keywords:
  - cascade-check
  - geometry-regime
  - aperiodic
  - closure-regime
  - kz-lax-idempotence
  - light-cone
  - weave-draft
  - autopoiesis
  - holofoam
  - signcraft
  - adversarial-check
status: adversarial-check-of-the-cascade-note-geometry-stage-read-from-lean-statements-and-code
produced-by: adversarial check stage, regime geometry (SignCraft, systems), Claude Sonnet 5.5, reading Obsmetrologia and the signstuff code directly
---

# Cascade check, geometry regime

Subject: `2026-10-08-note-on-realizing-signstuff-along-the-algebra-logic-language-geometry-cascade.md`
(called "the note" below). Scope: its geometry (aperiodic, SignCraft) claims. Verdict
vocabulary: CONFIRMED (a Lean statement or code line says it), WRONG (the library or code says
something else), QUALIFIED (true of something narrower or different than what the note
implies), UNSUPPORTED (no statement found; what would be needed is given).

Paths are abbreviated. `Obs/` is
`.../obsmetrological-services-section/lib/obsmetrologia/Obsmetrologia/`. `Fib/` is
`.../fibercraft-services-section/lib/obsmetrologia-fibercraft/ObsmetrologiaFibercraft/`.
`PhysSci/` is
`.../physical-science-services-section/lib/obsmetrologia-physical-science/ObsmetrologiaPhysicalScience/`.
`signstuff/` is `.../computer-engineering-services-section/lib/signstuff/`. `holofoam/` is
`.../computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-simulation-system-services-section/apps/holofoam/`.

## 0. Summary of the verdicts

Five findings matter more than the rest.

1. **The geometry row is mostly not in the aperiodic regime.** Of the Lean modules the note
   lists as geometry anchors, `LightCone`, `Settling/Cones`, `Site/*`, `WeaveDraft`,
   `LenticleCrossing` and the concrete inhabitants of `Autopoiesis` are finite, strict-regime
   statements; `ChromaticLorentzian` is at `kappa = omega`, which the note's own table assigns
   to the logic row. The things Lean actually places in the aperiodic rung are few: the asserted
   `aperiodicWitness`, the germ carrier with `tally_lax_slack` and `topBump_flux`, the
   Anderson-Putnam direct limit, and the constant-stub hull.
2. **The aperiodic regime is, by theorem, unreachable from any ordinal this library can build.**
   `Ord.regimeOfOrdHonest_ne_aperiodic` (`Closure/Ordinal.lean`) and
   `aperiodicWitness_regime_not_ordinal_derived` (`AperiodicOrder/Tiling/AperiodicSettleFrame.lean`).
   The note's target "an aperiodic `kappa >= omega_1` carrier" (section 6 item 6) cannot be met in
   this encoding. It needs cardinals or another notion of regime evidence.
3. **The note's one open weaving item is already proved.** `plainWeave_entropy_collapse` has a
   proof in `Fib/WeaveDraft.lean`; only a stale module docstring says "left unproven".
4. **The library places KZ lax slack at the aperiodic rung, not at Scott.** This contradicts the
   founder's correction as the note relays it (section 1.4) and the note's Lean target 1
   (section 6 item 1). Detail in section 2 below. Whatever the founder decides, the note cannot
   cite Lean for "in the Scott regime sigma and Delta are KZ-lax".
5. **"H¹" names at least five different things** across Lean and code, and the note treats them
   as one (sections 3.7, 4 item 4, 5). The Cech H¹ of `SettlingCohomologyH1` vanishes for every
   datum, in every regime.

Also: the note says light cones and cellular sheaves are not connected to SignCraft settlements.
Both are connected (`settle.mjs` has `causalCone`; Holofoam uses `cellular-sheaf.mjs`).

## 1. Regime assignment and direction (section 1.2 geometry row, section 1.3)

### 1.1 The regime table

**Claim.** "`Stage.regime`: ... settling strict, positing Scott, predicating transfinite-bounded,
articulating aperiodic" (section 1.1 table, third column; used in 1.3).

**CONFIRMED.** `Obs/Closure/Regime.lean`:

```
def Stage.regime : Stage → ClosureRegime
  | Stage.articulating => ClosureRegime.aperiodic
  | Stage.predicating => ClosureRegime.transfiniteBounded
  | Stage.positing => ClosureRegime.scott
  | Stage.settling => ClosureRegime.strict
```

with `regimeStageBij` a bijection `ClosureRegime ≃ Stage`. Two cautions the note drops.
(a) The docstring of that section says "A regime is the character of one stage's closure; a
corner (`Articulating.Corner`) is a value inside a stage. The two fours are different objects and
are not identified here." (b) Only the settling row carries a theorem
(`spine_settles_in_settling_regime : classify spineData = Stage.regime Stage.settling`, proved by
`rfl`, "a table lookup"). The other three rows are definitions. `regime_tower` derives one carrier
per rung (FOUR; `Record`; `ORecord`; the germ preorder), but those carriers are not the closures
of the spine's own stages. So "articulating is aperiodic" is a declared pairing, not a derived one.

### 1.2 The cascade-to-regime identification

**Claim.** "The founder's cascade and the regimes line up one to one" (section 1.2), with SignCraft
as geometry.

**UNSUPPORTED in Lean (and honestly a founder frame).** Nothing in the library mentions
algebra, logic, language or geometry as a sequence. What Lean gives is the four regimes, the four
stages, and the bijection between them. The identification of the four libraries with the four
regimes is the house layering rule in `AGENTS.md`, not a theorem. This is acceptable as a design
frame, but the note's table presents the Lean anchors as though they confirm it. They do not:
see 1.5.

### 1.3 Spine direction

**Claim.** "The language spine (`Language/Spine.lean`) runs articulate → predicate → measure →
settle, and `Stage.regime` assigns those stages the regimes aperiodic → transfinite → Scott →
strict. So the spine climbs the cascade from geometry to algebra."

**CONFIRMED** as to order. `Obs/Language/Spine.lean` header: "`articulate` makes an `Articulating`
...; `predicate` reads its oriented cell ...; measuring reads the value at that locus off a
trace; and `settle` applies an explicit `Reading.Closure`." `Spine.run` is "the measured
composite ... no reading enters from the caller". `measure_nil_knowledgeLeast`: `measure k [] φ =
Valuation.knowledgeLeast φ`. `run_pos`: `(run closure k trace a).reading.pos = true`.
Two notes. (a) The measure stage is `Stage.positing`; the note's "measure" is the Lean `Measure`
function inside positing. (b) The library's own wording is that "Read along the spine the regime
descends" (kappa descends), where the note says the spine "climbs the cascade". The two agree if
the cascade is read with geometry on top; keep the wording straight when stating the direction.

### 1.4 Realization runs the other way

**Claim.** "Realization runs the other way, from algebra to geometry ... Language is downstream
of logic in this direction."

**UNSUPPORTED.** No Lean statement defines a map from a settled strict reading to a Scott logic,
to a transfinite language, to an aperiodic geometry. The note itself marks "perception is the
spine, action is the cascade" as "not yet a theorem". Needed: a family of maps indexed by
`ClosureRegime`, with a theorem relating it to `Spine.run` (for instance a section of the spine),
and a statement of which structure each step adds. There is no such family. The only
"upward" passages in Lean are inclusions of regime data (`fin_scott`, `fin_cof`), directed colimits
(`DirectedSystem.Colimit`, `Closure/InverseLimit`) and `BigradedTower`-style seeding, none of which is stated
as algebra→logic→language→geometry.

### 1.5 Geometry row: what each cited anchor actually is

The geometry row cites "`AperiodicOrder/Tiling/*`, `LightCone`, `ChromaticLorentzian`,
`Settling/Cones`, `Site/*`, `Settlement`, `Autopoiesis`, Fibercraft `WeaveDraft`".

| anchor | regime of what it proves | evidence |
|---|---|---|
| `Language/Positing/LightCone.lean` | strict: finite statements about the four readings, "every declaration is axiom-free" | all theorems by `cases`/`decide` on `Reading` |
| `Language/Settling/Cones.lean` | strict: takes `Reading.Closure` (fields `op, infl, mono, idem`), pointwise per cell | docstring: "there is no valuation-level closure operator here" |
| `AperiodicOrder/Tiling/ChromaticLorentzian.lean` | `kappa = omega` (Scott height); the file has no `import` at all | docstring: "the `N`-chain realizes the countable-cofinality limit `omega`" |
| `Site/Basic.lean` | strict/finite: clopens are `Stone.ClopenUp = Bool × Bool`, stratum `tau : Nat`, covers only at fixed `(q, tau)` | docstring: "There are no temporal covers" |
| `Settlement.lean` | generic wrapper; only the Cech instance `ofCech1` is here | other instances in `PhysSci/Settlements.lean` |
| `Autopoiesis.lean` | abstract over any `Order.CommutingNuclei H`; only concrete inhabitant is `readingNuclearPair` (join nuclei on `Reading`) | `nuclear_autopoiesis_cell` |
| `Fib/WeaveDraft.lean` | strict: one-dimensional plain weave, `warpAlt` on `Bool` | `warpAlt_eq_completeGraph` |
| the hull (`InverseHull.lean`) | constant `H1Class` inverse system; the Cantor hull is "red frontier" | docstring, "Scope and frontier" |
| `AperiodicOrder/Tiling/*` as a whole | mixed; the aperiodic-labelled items are `aperiodicWitness` (asserted regime), `AndersonPutnam` (abstract directed system), `Witness.jrComplex` (a one-vertex cocycle) | `Classification.lean` |

**Verdict on the row: QUALIFIED.** What is in the aperiodic rung in Lean is the following.
`Obs/Closure/RegimeGate.lean`: `aperiodic_has_gap`, `aperiodic_gap_matches_lax_slack`
(`HasGap aperiodic ∧ HasLaxSlack Record.tallyLaxClosure Record.germPreValue.bot`).
`Obs/Language/Positing/Record.lean`: `tally_lax_slack`, `topBump_flux`. `Obs/Closure/Regime.lean`:
`regime_tower`'s fourth conjunct and `unattained_settling_gate`'s aperiodic row.
`AperiodicOrder/Tiling/Classification.lean`: `aperiodicWitness`, `aperiodicWitness_clinv_nonzero`,
`clinv_dichotomy`. `AndersonPutnam.lean`: `aperiodic_direct_limit`. Everything the note files
under "light cones", "weaves", "sites" is finite. A geometry row that wants to be honest about
the library should say: the aperiodic regime is where the finite geometric objects below are
*accreted without stabilizing* (the germ/flux and direct-limit statements), and the objects
themselves live in the strict regime.

### 1.6 The aperiodic label is asserted data

Not stated in the note; critical. `AperiodicSettleFrame.lean` header:

> `aperiodicWitness.regime = aperiodic` is asserted data, not derived from an ordinal:
> `Ord.regimeOfOrdHonest_ne_aperiodic` (`Closure.Ordinal`) shows no `Ord`-derived classifier
> outputs `aperiodic`, since every `Ord` this library can build carries a countable cofinal
> witness (`Ord.exists_countable_cofinal_witness`), making `kappa >= omega_1` unreachable here.

Statements: `Obs/Closure/Ordinal.lean`:
`theorem exists_countable_cofinal_witness : ∀ κ : Ord, ∃ g : Nat → Ord, IsCofinalWitness g κ`;
`theorem regimeOfOrdHonest_ne_aperiodic (κ : Ord) (scottContinuous : Bool) :
regimeOfOrdHonest κ scottContinuous ≠ ClosureRegime.aperiodic`. `Obs/Closure/RegimeCofinality.lean`
lifts this to firing sets (`regimeDataOfCountableFiring_ne_aperiodic`). Also
`Settling.regime` in `Classification.lean` is a free field; `vanishing` constrains only the
strict/Scott cases. Consequence for realization: any code that reports a regime from an
observed ordinal (as `settle.mjs` does) can only ever report strict, Scott or transfinite-bounded.
Reporting aperiodic requires a declared datum, never a derived one.

## 2. The sigma/Delta correction and the geometry rung

The note section 1.4 reports the founder's correction and builds a "reconciling reading". The
geometry stage must check what the library says about where sigma and Delta live.

**What the library says.**

- `Obs/Closure/Monad.lean` header, item 1: "`kz_iff_strict` ... the order-theoretic reduction of
  *lax-idempotence + Scott-continuity ⟹ strict idempotence*: in a thin 2-category (a poset)
  antisymmetry forces strict; the 2-cell `mu` only survives where antisymmetry fails (the
  aperiodic regime, kappa >= omega_1, where the orbit never stabilizes and carries all KZ-diamond
  2-cell data)." And: "The two nuclei the aperiodic regime carries — saturation sigma (past-facing)
  and transfer Delta (future-facing) ..."
- `kz_iff_strict (f : Reading → Reading) (hf : ∀ a, KLE a (f a)) : (∀ a, KLE (f (f a)) (f a)) ↔
  (∀ a, f (f a) = f a)`. Its carrier is the finite poset `Reading`, a strict-regime carrier. It
  says nothing about the Scott regime as such.
- `Obs/Closure/Monad/KZ.lean`: `strict_regime_mu_identity`: for `classify d = strict ∨ classify d =
  scott`, `closureOp M (closureOp M v) = closureOp M v`. Header: "in the strict (kappa<omega) and
  Scott (kappa=omega) regimes, mu is the identity ... the corpus point is that the *lax* mu carries
  content only in the higher regimes". (The proof ignores the regime hypothesis; idempotence holds
  of `closureOp` unconditionally. The statement is a declaration of placement, not a derivation.)
- `Obs/Closure/RegimeGate.lean` header: `tally_lax_slack` is "the first inhabited `HasLaxSlack` in
  the tree ... sitting at the tower's aperiodic corner (`regime_tower`)", and
  `mu_content_exactly_at_valued_gate`: the antisymmetric `ModalFrame` carrier "has identity mu at
  the vanishing-cohomology spine regime and can never realize lax slack at any regime", while the
  non-antisymmetric germ carrier "has genuinely non-identity mu ... sitting exactly at the
  cohomology-non-vanishing aperiodic gate".
- `Obs/Language/Positing/Value/PreCategory.lean`: `HasLaxSlack`, `laxClosure_idem_of_antisymm`
  (antisymmetric carrier ⟹ idempotent), `genuine_lax_cone_needs_non_thin_carrier`.

**Verdict on the note's section 1.4 and section 6 item 1.** The note says: "In the finite regime
those rewrites are equalities; in the Scott regime they are the multiplication 2-cells". **WRONG
as a reading of the library**: the library puts mu = identity in strict *and* Scott
(`strict_regime_mu_identity`), and puts the only inhabited non-identity mu at the aperiodic rung
(`aperiodic_gap_matches_lax_slack`). The founder's correction ("in the Scott regime they are
KZ-lax idempotent, which is why a finite regime exists") is therefore a design statement the Lean
does not currently state; at best the Lean statement to cite is the converse-shaped
`laxClosure_idem_of_antisymm` plus `no_laxSlack_of_antisymm`: slack needs a non-antisymmetric
carrier. Whether a non-antisymmetric carrier can sit at Scott height is open in Lean:
`Record` at Scott (`iter_succPos_ne`) is antisymmetric, so `regime_tower`'s Scott rung has no
slack. Lean target 1 as the note states it ("a Scott-regime carrier ... where sigma is KZ-lax and
not strict") would therefore *add* a rung that the library's own tower places elsewhere, and the
note should say so rather than present it as filling a known gap. This matters for the geometry
stage because the one place Lean has the 2-cells is the aperiodic rung, i.e. SignCraft's row, not
SignChain's.

**The three sigma/Delta pairs.** CONFIRMED that they must not be identified, with a sharper
statement than the note's.

- Pair 1 (the note: "history nuclei of `Autopoiesis`, saturating over sub-histories, transferring
  over one-step extensions"). **QUALIFIED/WRONG as to where the definition lives.**
  `Autopoiesis.lean` defines `saturating Q := Q.j1` and `transferring Q := Q.j2` for an arbitrary
  `Order.CommutingNuclei H`. The formulas `sigma_t(a) = ⋁{b | rho_t0(b) ≤ rho_t0(a) ∀ t0<t}` and
  `Delta_t(a) = ⋀{b ∈ Fix(Delta_t) | b ≥ a}` occur only in the module docstring (citing
  `saturating.md`, `transferring.md`). No Lean definition has a history, a restriction profile or
  an extension as input. `History.lean` (`HistorySystem`: unit, concat, prefix order) defines no
  nuclei. The only concrete inhabitant is `readingNuclearPair c1 c2` (join-nuclei on
  `readingHeyting`), which the docstring calls "a faithful finite model" and says is "the same one
  `Positing.Bigraded.Reading.joinSquare` instantiates". `AndersonPutnam.gradeQuartet` also uses
  `Reading.joinSquare tTop tBot` as "the aperiodic nuclear quartet" at every grade. So in Lean,
  pair 1 as a history construction does not exist, and pair 1's only inhabitant is (a model of)
  pair 2. `history_filtration_distinct_from_value_order` does not prove distinctness: it states
  that both quartets satisfy `Fix(pi) = Fix(j1) ∩ Fix(j2)`.
- Pair 2 (`Reading.joinSquare`): CONFIRMED real, proved nuclear square on `readingHeyting` (the
  `Order.CommutingNuclei` of `readingNuclearPair` has `idem`, `meet`, `comm` proved by `cases`).
  It is strict-regime, with idempotence by `cases`.
- Pair 3 (JS `signcraft/src/inference/nuclei.mjs`): not re-read in this stage. Nothing here changes
  the note's statement.

## 3. Section 3.5, light cones

Statements read in `Obs/Language/Positing/LightCone.lean`, `Obs/Language/Settling/Cones.lean`,
`Obs/AperiodicOrder/Tiling/ChromaticLorentzian.lean`.

**3.5a.** "FOUR's two evidence bits are the null coordinates of a 1+1 Minkowski diamond; `≤ₖ` is
the causal-future relation (`kle_iff_lightcone`)". **CONFIRMED.**
`kle_iff_null : KLE a b ↔ ((a.pos = true → b.pos = true) ∧ (a.neg = true → b.neg = true))`;
`kle_iff_lightcone : KLE a b ↔ (space b - space a ≤ time b - time a ∧ space a - space b ≤ time b - time a)`
with `time a = a.pos.toNat + a.neg.toNat`, `space a = a.pos.toNat - a.neg.toNat`. Caveat: "Minkowski"
is vocabulary; the file says the identification with `O(1,1)`/`O(3,1)` is "stated here and not
formalized". The content is a finite order isomorphism on four points.

**3.5b.** "`≤ₜ` spacelike motion". **QUALIFIED.** Statement: `tle_iff_null : TLE a b ↔ ((a.pos = true
→ b.pos = true) ∧ (b.neg = true → a.neg = true))`. This is the product order on `(u, -v)`; it does
not fix time (`kBot ≤ₜ tTop` while `time kBot = 0`, `time tTop = 1`). Only the pair `t, f` is proved
spacelike (`tTop_tBot_spacelike : time tTop = time tBot ∧ ¬ KLE tTop tBot ∧ ¬ KLE tBot tTop ∧ TLE
tBot tTop`). "Motion along the spacelike direction" is docstring.

**3.5c.** "⊥ the past tip, ⊤ the future tip, t and f spacelike-separated, negation is parity,
conflation is time reversal, K₄ is {1, P, T, PT}, Chu duality is transpose ∘ parity".
**CONFIRMED.** `kBot_past_tip`, `kTop_future_tip`, `tTop_tBot_spacelike`; `space_negate : space
(negate a) = - space a` with `time_negate`; `time_conflate : time (conflate a) = 2 - time a` with
`space_conflate`; `act_centered`, `act_space`, `signs_injective`, `timeSign_mul`, `spaceSign_mul`;
`chu_dual_time`, `chu_dual_space` (entrywise: `space ((ChuSpace.dual C).r x a) = - space (C.r a x)`).
All strict-regime, finite.

**3.5d.** "`ChromaticLorentzian.lean`: mark propagation along the causal chain ℕ is a
non-idempotent step". **CONFIRMED.** `step_not_idempotent : step (step mark0) ≠ step mark0`
(index 2). `chromatic_lorentzian_classification` is stated as the note says.

**3.5e.** "whose fixed point, the causal past-closure, is reached only at κ = ω".
**UNSUPPORTED as a theorem.** `settle` is *defined* by its own recursion
(`settle f (n+1) = f (n+1) || settle f n`); the only relation to `step` in Lean is
`settle_step : settle (step f) = settle f`. There is no theorem `step (settle f) = settle f`
(fixed point) and none that no finite stage `step^n f` equals `settle f` (reached only at ω). Both
are in the docstring. Needed: those two statements for `ChromaticLorentzian`.

**3.5f.** "the cross-base MLD classification holds on it without idempotence". **CONFIRMED but
thin.** `SettleFrame.geoMld_iff_settleEq` uses only `settle_step`; it holds for every `SettleFrame`.
So the chromatic Lorentzian demonstrates that a non-idempotent frame is *possible*, not that
anything geometric about it is classified.

**3.5g.** "tile colouring and light cones in one carrier". **WRONG.** `ChromaticLorentzian.lean`
has no `import` lines, so it cannot mention `Reading`, `LightCone`, `TileAdjacencyChromatic` or any
colouring. Its carrier is `Nat → Bool` markings of the chain `n ≺ n+1`; a total order has no
spacelike pairs, so it has no "cone" beyond the past-closure. "Chromatic" is part of the name. No
Lean theorem relates it to `LightCone`'s four readings. Needed: a map from `Reading`-valued
markings on a poset to `SettleFrame` and a proof that `kle_iff_lightcone` is its order, or drop
the sentence.

**3.5h.** "the first non-idempotent (Scott-height) settling carrier". **QUALIFIED.** It is the first
`SettleFrame` instance. The Scott rung of `regime_tower` (`Record`, `Record.iter_succPos_ne`) is
also a non-settling orbit at ω, and the transfinite-bounded rung (`ORecord`) is non-idempotent too.
More importantly the note's own table assigns κ = ω to the *logic* row; filing ChromaticLorentzian
under geometry is internally inconsistent.

**3.5i.** "`Settling/Cones.lean`: `settle` (unit cone ...) ≤ `brim` (counit cone ...); the void is
space (where the cones disagree), the apex is time". **QUALIFIED.** CONFIRMED statements:
`settle_le_brim (c : Reading.Closure) (v : CValuation) (φ) : KLE (settle c v φ) (brim c v φ)`;
`Void c v φ := settle c v φ ≠ brim c v φ`; `void_iff`; `not_void_of_full`; `oneSided_void`;
`cancelled_not_void`. NOT in Lean: "unit"/"counit" (no adjunction; the docstring says both cones are
pointwise because "there is no valuation-level closure operator here"); "apex" (no such definition;
"the settling chain climbing a cell from its unit toward its counit" is docstring). The cones are on
a single cell under an idempotent `Reading.Closure`; they are not the causal cones of a causal set.

**3.5j.** "The geometry regime returns to the algebra: the algebra's FOUR is already a light cone,
which is what lets the cascade close into a tower rather than end." **UNSUPPORTED.** The first half
restates `kle_iff_lightcone`. The second half has no Lean counterpart. The only tower statements are
`regime_tower` (one carrier per rung, not a closing map) and the `BigradedTower` seeding the note
cites elsewhere. Needed: a statement that a doubly quiescent layer of one level is the free
carrier of the next, with the light-cone coordinates as the connecting data.

**3.5k. What the note misses on light cones.** The library's actual light-cone and causal-set
formalization is not in `Obs/`; it is in the physical-science package:
`PhysSci/CausalSets/Causal/{Order,Cone,Diamond,RegimeSection,ParaconsistentCone,Interval,
ArrowOfTime,Net,...}.lean` and `PhysSci/CausalSets/BlackHoles/{Hole,HoleDiamondCausalSet,...}.lean`.
Statements to cite:

- `Order.lean`: `CausalSet` (DAG of `prec0`), `causalStep`, `reaches`, `causal_settling_is_transitive_closure`,
  `reaches_trans`, `reaches_asymm`: a causal set is a settling by Boolean transitive closure.
- `Cone.lean`: `Future`, `Past`, `CausalLe`, `Spacelike`, `Diamond`; `causalLe_antisymm`,
  `future_is_upward_closed`, `causal_reachability_is_cone_geometry`.
- `RegimeSection.lean`: `timeSection_strict_mono` (past count is a strictly monotone ℕ-valued time
  function); its docstring: "a *finite* causal set (the strict regime, κ ≤ 3) always carries a
  sub-ω ordinal time section" and "the aperiodic regime (κ ≥ ω₁) is exactly where the section must
  climb past every countable ordinal". So causal sets of finite histories are strict-regime objects.
- `ParaconsistentCone.lean`: `ConeReport`, `mergeReports`, `mergeReports_comm`,
  `paraconsistent_cone_reports`: causal *reports* valued in FOUR, merged by knowledge join. This is
  the right statement for "conflicting causal reconstructions".
- `BlackHoles/HoleDiamondCausalSet.lean`: `sequencing_hole_future_closed`,
  `sequencing_readoutExterior_past_closed`, `sequencing_hole_exterior_disjoint`; `HoleDiamondHusainov.lean`:
  `exterior_past_closed`.

Holofoam's `orbit.mjs` implements exactly the last group (diamonds ordered by sequencing, exterior
and hole of a readout predicate, with the three laws checked at lines 593-597). The note never
mentions it.

## 4. Section 3.6, weaving

**3.6a.** "a weave draft is a bilattice-coloured sofic shift". **CONFIRMED in one dimension.**
`warpAlt_eq_completeGraph : warpAlt = Combinatorics.completeGraph Bool`; `warp_sofic`;
`reading_coloured_sofic (p) (hp : Path warpAlt p) : SoficImage warpAlt readingColour (p.map readingColour)`.
Qualifications. (i) `readingColour b := crossingReading b (!b)` takes only the values `tTop`/`tBot`;
holes and mis-crossings are not admissible words of the SFT. The "bilattice colouring" uses two of
four readings. (ii) The module itself says the two-dimensional object is the frontier, and it
models only `PlainWeaveSwatch` (rows alternate, columns complement), not a two-dimensional SFT.
(iii) Only plain weave exists; there is no twill, satin or threading/treadling/tie-up structure,
so "weave draft" is a name for one draft family.

**3.6b.** "its one local rule forbids floats" . **CONFIRMED.** `warpAlt_forbids_float (a : Bool)
(r : List Bool) : ¬ Path warpAlt (a :: a :: r)`.

**3.6c.** "a hole is ⊥ (`hole_is_kBot`), a mis-crossing is ⊤, a held contradiction
(`miscrossing_is_kTop`), and swapping which strand is over is Belnap negation
(`overUnder_swap_is_negate`)". **CONFIRMED.** `hole_is_kBot : crossingReading false false =
Reading.kBot := rfl`; `miscrossing_is_kTop`; `overUnder_swap_is_negate (w v) : Reading.negate
(crossingReading w v) = crossingReading v w`; `miscrossing_isInconsistency`; `defectFree_consistent`.
Tension the note skips: the same file models the crossing as a measurement scenario in which the
mis-crossing is the *unsupported* assignment (`crossingModel`, `miscrossing_not_supported`,
`non_miscrossing_supported`). "Defects held rather than crashed" is the value-level reading;
the scenario-level reading excludes them.

**3.6d.** "The two hands are formal: ... `both_claims_infeasible`, `hands_grant_one_claim`,
`handed_tiebreak_avoids_miscrossing`". **QUALIFIED, with one likely vacuity.**
Statements: `both_claims_infeasible : ¬ Cohomology.Attention.Feasible 1 [warpClaim, weftClaim]`;
`hands_grant_one_claim : solveL 1 [warpClaim, weftClaim] = [weftClaim] ∧ solveR 1 [warpClaim,
weftClaim] = [warpClaim]`; `handed_tiebreak_avoids_miscrossing`. The hands are `solveL`/`solveR` of
`ObsmetrologiaEconomics.AllocationSolver` (an import the module header shows, along with
`ObsmetrologiaPhysicalScience.QuantumContextuality`), a budget solver, not weaving. And
`warpClaim := ⟨1, 1⟩` and `weftClaim := ⟨1, 1⟩` are the same term, so `[weftClaim]` and
`[warpClaim]` are equal lists, and `assignmentOf` reads a singleton the same way for both hands
(slot `false` over, slot `true` not). The theorem proves "each hand returns a singleton", which is
all that avoiding the mis-crossing needs; it does not distinguish a left hand from a right hand.
"Handed tiebreak a law of how contested claims resolve" is therefore only as strong as
`Attention.solveL/solveR` themselves (not read in this stage); the claim that the two hands are
two languages is a reading (UNSUPPORTED).

**3.6e.** "Open, stated at full strength: `plainWeave_entropy_collapse`". **WRONG.** It is proved,
in `Fib/WeaveDraft.lean`, by `mem_columns` and a four-case split:
`theorem plainWeave_entropy_collapse (s : List (List Bool)) (h : PlainWeaveSwatch s) : ∀ r1 ∈ s, ∀
r2 ∈ s, r1 = r2 ∨ r1 = r2.map (!·)`; its own docstring says "now proved". Only the module header
still says "stated here at full strength and left unproven". What is proved is the two-row-state
statement; there is no definition of configurational entropy in the file, so "one bit, not
extensive" is not formalized. So section 6 item 6's first entry should be dropped, and an honest
replacement is "define a two-dimensional weave SFT and its entropy, then recover this as a
corollary".

**3.6f.** "`LenticleCrossing.lean`: a bead is a crossing on a rigid body
(`holeTransition_eq_warpAlt`)". **CONFIRMED** (`holeTransition = warpAlt := rfl`, with
`PortGraph.lean`'s `holeTransition : Graph Bool := fun a b => a != b` and `legal_iff_distinct`).
Missed: `lenticleCrossingReading (_U₁ _U₂ : Site.Clopen) ... := crossingReading warpOver weftOver`
ignores both clopens (the underscore names), `lenticleCrossingReading_eq_crossingReading` is `rfl`.
So the claimed site-locality ("a lenticle of two clopen patches carries the weave's crossing
reading at the overlap") is nominal; no overlap is used. Also missed: `condensate` and
`over_occupation_inconsistency` in `PortGraph.lean` (a bead occupied twice reads ⊤).

**3.6g.** "`Settlement.lean` abstracts the shape these share with tiles, causal holes and Čech
gluing". **QUALIFIED.** `Obs/Settlement.lean` defines `Settlement Content Admits base` (content
plus a proof of admission) and only the Cech instance `ofCech1`. The tile, bead and hole instances
(`ofTiles`, `ofBeadsThread`, `ofHole`) and `tiles_beads_hole_cech1_are_settlements` are in
`PhysSci/Settlements.lean`. There is no weave instance. A plain-weave warp word is an `ofTiles`
instance in shape (`Crystal.Tiles` = carrier, `localRule : Graph Carrier`, `word`, `admissible :
Path localRule word`) with `localRule := warpAlt`, but no file states it. Section 4 item 4's
"weave drafts as two-hand settlements" is UNSUPPORTED; needed: `ofTiles` at `warpAlt`, then the
hands as a second field.

**3.6h.** "In the cascade, weaving is what geometry looks like when two languages meet at every
crossing". **UNSUPPORTED** (interpretation), and the formal weave is the *periodic* case:
`plainWeave_entropy_collapse` says plain weave has two row-states, maximal coherence. A weave in
the aperiodic regime would need an aperiodic draft; nothing in Lean provides one.

## 5. Section 3.7, foam and autopoiesis

**3.7a.** "`Autopoiesis.lean` assembles the history nuclei into a self-producing autopoiesis cell
(`nuclear_autopoiesis_cell`)". **QUALIFIED.** `theorem nuclear_autopoiesis_cell {H} (Q :
Order.CommutingNuclei H) : AutopoiesisCell Q` with fields `self_production`, `four_corners`
(`Articulating.Corner.all.length = 4`), `joint_is_intersection`. It holds for any commuting
nuclei, by `Q.fix_pi_iff` and `stable_iff_potential_and_active`; "history" enters only in the
docstring (see section 2, pair 1).

**3.7b.** "states the Axiom of History Separation ... as an open `Prop`". **CONFIRMED.**
`def HistorySeparationForcesAperiodicity (settlingOf : ...) : Prop` with the `-- OPEN` comment,
taken relative to a parameter `settlingOf` that is not defined. `varying_family_beside_aperiodic_witness`
records three unlinked facts.

**3.7c.** "A node is such a cell over its own history". **UNSUPPORTED.** No node, no cell over a
`HistorySystem`. Needed: nuclei built on `HistorySystem` (`History.lean`: `le_iff_prefix`,
`concat_left_monotone`) from an actual restriction profile.

**3.7d.** "many nodes over a shared site are a settlement whose gluing obstruction is `H¹`
(`Sheaf`, `CoordinationCohomology`, `SettlingCohomologyH1`)". **WRONG on `SettlingCohomologyH1`,
QUALIFIED on the rest.**
`theorem h1_vanishes (D : Cech1) : H1Vanishes D` (`Obs/Cohomology/SettlingCohomologyH1.lean`) is
proved for every datum, with no regime hypothesis; the file says "Holds for *any* cover and *any*
agreeing family"; `settling_cohomology_h1_vanishes`'s hypothesis `hr` "does not gate the gluing".
So in the Cech model there is no gluing obstruction in any regime. The non-vanishing quantities
in Lean are different objects:
(i) `CoverNerve.H1rank := (cells + components) - entities`, a graph cycle rank
(`h1_vanishes_iff_forest`, `h1rank_is_coordination_cost`), whose connection to value-level gluing
is open ("the remaining open piece is the value-level converse");
(ii) one-vertex Anderson-Putnam classes (`Settling.clInv`; `aperiodicWitness_clinv_nonzero`;
`FiringGenerators.transfiniteBounded_h1_generators`).
`Site/Sheaf.lean` (CALM) and `CRDTCohomologicalCALM.calm_convergence_facts` are conjunctions, not
equivalences: "The CALM equivalence `H¹ = 0 ⟺ confluence` ... is the open frontier — this model
makes confluence and `H¹`-vanishing both unconditional."

**3.7e.** "the films of the foam are exactly where `H¹ ≠ 0`". **UNSUPPORTED.** The word "foam"
occurs in no Lean file in the science tree. It occurs in code: `signgraph/src/cohomology.mjs`
("the foam's wall graph", cycle rank) and `site.mjs` ("the sheaf on the foam"). The matching Lean
statement for the code is (i) above, not a Cech obstruction.

**3.7f.** "the finite regime is the dry foam (`H¹ = 0`, CALM)". **QUALIFIED.** `H¹ = 0` is
CONFIRMED but vacuous (it is true of all data, not a property of the finite regime); CALM is a
conjunction (`calm_monotone_coordination_free`), not an equivalence.

**3.7g.** "the aperiodic regime is where the foam is alive — orbits that do not stabilize but stay
coherent". **QUALIFIED.** The Lean statement is `topBump_flux (s : Nat → Record)`: for all `k`,
`DomBy (iterSeq topBump k s) s ∧ DomBy s (iterSeq topBump k s)` (mutually dominated, so equal
in the germ preorder) and `iterSeq topBump (k+1) s ≠ iterSeq topBump k s` (distinct as data), plus
`k ≤ topMass`. That is the formal content of "do not stabilize but stay coherent", on the germ
carrier `Nat → Record`, not on `Autopoiesis` or any history nucleus. And `cohomologyVanishes` is
`false` for transfinite-bounded as well as aperiodic (`gap_matches_nonvanishing`:
`transfiniteBounded_has_gap`), so "alive" is not specific to the aperiodic rung.

## 6. Section 4 item 4, the geometric model

Quoted claim, in parts.

- "histories as causal sets with light cones (`ChromaticLorentzian`, `Cones`)". **WRONG citations.**
  Neither file has a causal set; `History.lean` is a prefix monoid with no reachability. The right
  Lean is the `PhysSci/CausalSets` list in 3.5k, which sits in another package and is strict-regime
  for finite causal sets (`RegimeSection`). In code: `signcraft/src/settle.mjs` builds a causal
  order from a *settlement's firing events* (`firingEvents`, `causalOrder` = transitive closure of
  stage-increasing term adjacency, `causalSeparation` timelike/spacelike, `causalCone`,
  `orderingFraction`), tested in `signcraft/test/settle.test.mjs`. The revision DAG in `history.mjs`
  (parents, heads, `mergeHistories`) has no cone API. So "histories as causal sets" is
  UNSUPPORTED for revisions and CONFIRMED-in-code for settlements.
- "dialogue as weave (two hands, crossings as readings)". **UNSUPPORTED.** No weave, warp, tiling
  or sofic term appears in `signcraft/src`, `signgraph/src`, `signchain/src`, `signcell/src` or
  `holofoam/src` except "time warp" in `orbit.mjs`. No Lean statement mentions dialogue.
- "sites, settlements and sheaves gluing many nodes' languages". **UNSUPPORTED/QUALIFIED.** The
  Lean site (`Site/Basic.lean`) has objects `(q, tau, U)`, clopens in `Bool × Bool`, covers at fixed
  `(q, tau)` only. The JS site (`signgraph/src/site.mjs`) is a finite set of cells with
  specialization morphisms and converse/projection maps, with no covers and no topology. The two
  are not the same site. The JS settlement (`settle.mjs`) is a closure orbit; `settlementAdmits`
  replays the least fixed point and cites both `Settlement.lean` and `RuleSystem.lean`, but its
  content is `RuleSystem`'s `clS`, stronger than the `Settlement` wrapper (`content` plus
  `admits`).
- "`H¹` as the borders the distal bypass classifies". **UNSUPPORTED.** `Obs/Cohomology/DifferentialBypass.lean`
  is the only bypass in Lean: a certificate that a closure-algebra fixed point collapses the
  zero-increment mu/nu gap, routes kappa to its regime (`differential_bypass_regime`), and reads
  where `H¹` is "valued rather than vanished" off the table (`obstruction_valued_iff`). It
  classifies no borders. (The "distal bypass" of the note's section 1.1 is a different note; no
  Lean file uses "distal".)
- "tilings and their hulls". **QUALIFIED.** The hull is `apHullSystem`, a constant `H1Class`
  inverse system with `hull_pairs_clinv` and `seamMap_surjective`; the odometer/Cantor hull is
  explicitly red. Tilings: `FiniteLocalRule`, `SoficShift` are strict/finite; `Witness.HatMetatile`,
  `jrComplex` are witnesses for `cl-inv`.
- "autopoiesis cells over histories". **UNSUPPORTED** (3.7a, 3.7c).
- "`H¹` actually computed and handed to the distal bypass" (section 7 item 4, same stage).
  QUALIFIED: `signgraph/src/cohomology.mjs` already computes the cycle rank exactly
  (`cohomologyOfCells`, `coverNerveOfCohomology`, and it imports `metrologic`'s `coverNerve`/`h1Rank`);
  `signcraft` imports only `rankIdentity`/`rankVanishing` from it and never calls it on a settled
  site. See section 7 on which `H¹`.

## 7. Section 5, geometry: the code claims

**5a.** "`signcraft/src/settle.mjs` computes non-Scott firings only at limit stages, so on its
finite orbits the first cohomology is always zero". **CONFIRMED by code.**
- `settle.mjs:90`: `regime: closureRegimeName(regimeOfOrdinal(ofNat(settledAt), true, true))`, a finite
  ordinal with Scott flag true, so the regime is always `strict`.
- `settle.mjs:238`: `filtrationOf = settlement => filtration(stages.map(stage => ({ ordinal: stage.stage,
  shape: stage.stage === 0 ? "initial" : "successor", ...})))`: no stage is ever a limit.
- `settle.mjs:252`: `nonScottFirings` keeps increments whose `source.shape === "limit"`: always empty here.
- `settle.mjs:254-258`: `firstCohomology` has `rank` = number of generators, one per non-Scott firing: always 0 here.
Moreover `closureOrbit` throws if the orbit does not close within `rules.length + 1` stages, so a
non-finite settling cannot arise in this module. Transfinite settlings enter only through
`filtration(stages, cofinality)` called with caller-supplied limit stages ("a transfinite settling
is presented by giving its limit stages and cofinality explicitly").

**5b.** "SignGraph's `cellular-sheaf.mjs` is a real numeric sheaf Laplacian". **CONFIRMED.**
`cellularSheaf`, `coboundary`, `sheafLaplacian`, `cellularSheafCohomology` exact over ℚ
(`ratRank`), `diffuse`/`harmonicProjection`, `hodgeCheck`, `bodyBarSheaf`, `solveNormal`.
Lean counterparts cited in its header exist (`Dynamics/Flow/Laplacianizability`,
`LawvereLaplacianSpectralGap`, `Cohomology/LawvereHarmonicCohomology`, `ClosureFlowDynamics`);
Lean has no real-stalk cellular sheaf or rigidity matroid, so the numeric layer is ahead of Lean.

**5c.** "...but nothing connects it to settlement". **WRONG.** Holofoam uses it:
`holofoam/src/structure.mjs:23` imports `bodyBarReceipt, bodyBarSheaf, solveNormal` from
`@red-cup-engineering/signgraph/cellular-sheaf`; the README states "Rigidity is cohomology ... a
body-bar rigidity sheaf ... exactly over the rationals" and "Breakage is a settlement event: a
member over its strength is told against its design cell (FOUR ⊤), fires, and vanishes ... `failure`
re-settles until nothing fires". Qualification: `structure.mjs`'s `failure()` (lines 333-351) is its
own loop ("the driven settling flow") that does not call `settle.mjs`; it connects to SignCraft's
*history* (`createHistory`, `observeHistory`, `queryHistory`) and to its vocabulary, not to
`settle`. The tests `signgraph/test/cellular-sheaf.test.mjs` also tie it to
`cohomologyReceiptOfCells`.

**5d.** "weaves, tilings and light cones exist in metrologic and Lean but not as SignCraft
settlements". **WRONG for light cones, CONFIRMED for weaves and tilings.** Light cones: section 6 above
(`settle.mjs` `causalOrderOf`, `causalCone`, `causalSeparation`, `orderingFraction`) and
`holofoam/src/orbit.mjs` (`diamonds`, `sequencingCheck`, `kinematicRegion`, `visibilityRegion`,
`commRegion`; `mergePlans`/`seams` for conflicts). Weaves and tilings: no occurrences in the
SignCraft, SignGraph, SignChain, SignCell or Holofoam sources.

## 8. Section 6 target 6

"`plainWeave_entropy_collapse`; `HistorySeparationForcesAperiodicity`; an aperiodic `κ ≥ ω₁`
carrier (the 'sole remaining height' named in `ChromaticLorentzian`)."

- `plainWeave_entropy_collapse`: **WRONG** (proved, 3.6e).
- `HistorySeparationForcesAperiodicity`: **CONFIRMED open**; additionally the statement is
  relative to an undefined `settlingOf`, and the definition of the history nuclei it depends on
  (section 2, pair 1) does not exist in Lean, so the target is under-specified. Needed first: nuclei
  on a `HistorySystem` and a map `family ↦ Settling`.
- aperiodic `κ ≥ ω₁` carrier: **QUALIFIED/likely unachievable as stated.** `ChromaticLorentzian`
  does name it "the sole remaining height", but `AperiodicSettleFrame` and `RegimeCofinality`
  (later modules) prove that with this `Ord` the aperiodic branch is "structurally unreachable".
  A carrier cannot be derived; only declared (`aperiodicWitness`) or built on a different notion of
  regime evidence (cardinals, or the germ-preorder style of `regime_tower` rung 4). The realizable
  version is "derive the aperiodic rung from non-antisymmetry plus unbounded flux", which the germ
  carrier already does at the level of `topBump_flux`.

## 9. Four things the code and Lean both call H¹

The note uses "H¹" in sections 3.7, 4 item 4, 5 and 7 as one object. Distinct objects found:

1. Cech H¹ of `F_U` over a cover (`SettlingCohomologyH1.h1_vanishes`): always zero in the model.
2. Coordination/cycle-rank H¹ of the cover nerve (`CoordinationCohomology.CoverNerve.H1rank`;
   JS `signgraph/src/cohomology.mjs` `cohomologyOfCells`; rank `cells - entities + components`).
   Cell-graph cycle rank. This is what `signstuff-evm` golden vectors test.
3. Non-Scott firing count (`FiringGenerators.transfiniteBounded_h1_generators`; JS `settle.mjs`
   `firstCohomology`). One generator per limit-stage firing; Lean places it in the
   *transfinite-bounded* rung (a language-row regime in the note's table), not aperiodic.
4. The Anderson-Putnam class `cl-inv` (`Classification.Settling.clInv`, `aperiodicWitness`, and the
   direct limit in `AndersonPutnam.lean`).
5. Holofoam's `seams(plan).h1` (`holofoam/src/orbit.mjs:252-267`): the number of (vessel, epoch)
   cells told with two laws plus bodies defined two ways. A conflict count, not a computed rank.
   Its README claim "H¹ = 0 exactly when every merge order reads the same" is not true as stated:
   `mergeHistories` is a union and `joinList_congr` makes merge order irrelevant always, seams or not;
   the Lean equivalence "H¹ = 0 ⟺ confluence" is the open frontier of `CRDTCohomologicalCALM`.

Realization needs a decision about which of these a cascade stage reports, with the Lean statement
for each, before a single "first cohomology" receipt is exposed.

## 10. What the note missed in this regime

1. **Where the 2-cells actually live in Lean** (section 2): aperiodic rung, `tally_lax_slack`,
   `topBump_flux`, `aperiodic_gap_matches_lax_slack`; `strict_regime_mu_identity` for Scott.
2. **The aperiodic label is asserted** (1.6). Any `regime` field in a SignCraft receipt must be a
   declared datum when it says aperiodic.
3. **Anderson-Putnam as the engineering route.** `AndersonPutnam.lean` states `H¹(aperiodic) =
   lim→` of finite-stage cohomologies of bounded sub-sites along a settling-iterate self-map
   (`DirectedSystem`, `Colimit`, `aperiodic_direct_limit`; `apSystem` is constant). `Site/Basic.lean`
   says "cross-ordinal cohomological content is extracted at the level of cohomology via direct
   limits", with no temporal covers. So the realizable aperiodic geometry is a directed system of
   finite-stage sites with computed finite H¹ at each stage and a colimit, not an object at a
   transfinite stage. `cohomologyOfCells` per stage plus a direct-limit receipt is that program.
4. **Identity of settlings.** `SettleFrame.geoMld_iff_settleEq` and `aperiodic_geoMld_iff_cohEquiv
   : aperiodicFrame.GeoMld p q ↔ p.1.clInv = q.1.clInv` give a theorem-backed identity criterion
   for settlings (equal settled value; equal `cl-inv`). JS `closureEquivalent`/`closureInvariant`
   in `settle.mjs` are the natural implementation. The converse (cohomological equivalence
   implies MLD) is open (`Classification.lean`, `thm:aperiodic-mld-classification`).
5. **The real causal-set Lean and Holofoam's use of it** (3.5k). Holofoam realizes sequencing,
   hole, exterior, and `ParaconsistentCone`-style conflicting reports (two laws told both) with
   the Lean laws as runtime checks. It is the most advanced SignCraft geometry in the repository
   and the note's sections 3.7, 4 and 5 do not mention it.
6. **Site has no temporal covers** (`Site/Basic.lean`), so a SignGraph site that wants Lean
   backing needs clopen supports and fixed-stage covers; the present JS site has neither.
7. **JS cones diverge from Lean cones.** `settle.mjs` `cones()` returns four cones per cell
   (`settle`, `brim`, `adjudicate`, `presume`); Lean `Cones.lean` has only the two knowledge cones,
   and "adjudicate" occurs in no Lean file. JS `brim` is fixed at `readingOfSides("knowledge", true,
   true)` (always ⊤) and applies no closure, where Lean's `brim` is `settle c (presumeFree value)`.
   On witnessed cells the readings agree; the truth-order cones are ahead of the Lean.
8. **`J26.lean`** (the gyrobifastigium cell complex with `face_dim_drop`) and `TransfiniteCellComplex.lean`
   (`transfinite_complex_is_colimit_of_finite`, `settling_continuity_at_limits`) give the finite-
   cell/colimit shape that a SignCraft complex would target; not cited.
9. **`Fib` depends on `ObsmetrologiaPhysicalScience` and `ObsmetrologiaEconomics`** (WeaveDraft
   imports), so porting the weave means carrying the contextuality and allocation-solver
   vocabulary.
10. **Plain weave is the periodic limit.** `plainWeave_entropy_collapse` is a rigidity theorem; the
    note's "geometry as settlement" for weaves needs an aperiodic draft family to land in the
    aperiodic rung, and none exists.
11. **Statement-versus-docstring drift** to watch when quoting Lean: `WeaveDraft` header says
    entropy collapse is unproven (proved); `ChromaticLorentzian` docstring says "reached only at ω"
    (not a theorem); `Cones` says "unit/counit" (no adjunction); `Autopoiesis` defines σ, Δ only in
    prose; `Regime.lean` says the table "computes no cohomology". Cite theorems, not headers.

## 11. Suggested rewrite of the geometry row (for whoever edits the note)

Geometry (aperiodic): the *accretion* of finite geometric objects without stabilization. Lean in
the rung: germ carrier (`tally_lax_slack`, `topBump_flux`, `aperiodic_has_gap`), `aperiodicWitness`
(asserted), Anderson-Putnam direct limit. Finite geometric objects it accretes, each strict-regime
in Lean: FOUR as a diamond (`LightCone`), causal sets and diamonds (`PhysSci/CausalSets`), sites
(`Site/*`), settlements (`Settlement`, `PhysSci/Settlements`), tiles/beads/weaves
(`SoficShift`, `PortGraph`, `WeaveDraft`). JS: `settle.mjs` causal order and cones,
`cohomology.mjs` cycle rank, `cellular-sheaf.mjs`, Holofoam diamonds/sequencing/seams/rigidity.
Open in Lean: history nuclei, history separation, the Cantor hull, the CALM equivalence, an
aperiodic carrier derived from evidence rather than declared.
