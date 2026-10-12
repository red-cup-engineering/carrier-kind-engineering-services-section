---
title: "Cascade imagine, algebra regime: what the predication algebra model does"
description: "The IMAGINE stage for the algebra regime (SignCell, data) of the ALGEBRA → LOGIC → LANGUAGE → GEOMETRY cascade, built only on what the 2026-10-08 adversarial check of this regime confirmed. What the strict-regime model is in operation: its state as named Lean structures (Reading, Valued, Record, PredicationCell, Valuation, CValuation, Meme, Reading.Closure, the K4 gauge, the nuclear square), its moves (articulate, predicate, measure, settle, posit, presume, join, meet, negate, conflate, merge, reindex, gauge), what flows in from the spine and out to the logic regime, how many such cells behave over a shared site as a dry foam whose settled census is the organism's skeleton, what the model can do that a large language model cannot, and eight worked examples with real FOUR readings, a real closure rule, a real formal context, real words and a real weave crossing. Every mechanism is a named Lean declaration or an extension marked EXT."
date-created: 2026-10-08
kind: engineering-research-note
keywords:
  - cascade
  - algebra-regime
  - strict-regime
  - predication-algebra-model
  - signcell
  - four
  - belnap-bilattice
  - measured-valuation
  - nuclear-quartet
  - klein-four-gauge
  - light-cone
  - formal-concept-analysis
  - autopoiesis
  - foam
  - obsmetrologia
status: working-note-imagine-stage-built-on-the-adversarial-check-not-itself-adversarially-checked
produced-by: info-0d cascade IMAGINE subagent (Claude Fable 5.1), reading the working tree at HEAD ce9505039a1; Lean under lib/.../obsmetrological-services-section/lib/obsmetrologia/Obsmetrologia and lib/.../fibercraft-services-section/lib/obsmetrologia-fibercraft/ObsmetrologiaFibercraft; JavaScript under lib/.../computer-engineering-services-section/lib/signstuff and services/computer-data-engineering-services-section/src
---

# Cascade imagine, algebra regime: what the predication algebra model does

## 0. What this note stands on, and what it refuses

The governing reading is `2026-10-08-note-on-realizing-signstuff-along-the-algebra-logic-language-geometry-cascade.md` ("the note"). Its algebra-regime claims were checked claim by claim in `2026-10-08-cascade-check-algebra.md` ("the check"). This note imagines the algebra regime's model in operation and builds **only** on what the check confirmed, respecting its corrections. The corrections that bind what follows:

1. **Regime is declared, not derived, almost everywhere.** `classify : ClosureRegimeData → ClosureRegime` is an `if`-chain on three Boolean flags (`Closure/Regime.lean`, `classify_exhaustive`, `four_regime_flag_cases`, with the file's own `OPEN` marker that "the flags are inputs"). `Stage.regime` is a lookup table (`articulating ↦ aperiodic`, `predicating ↦ transfiniteBounded`, `positing ↦ scott`, `settling ↦ strict`). The only regime facts derived from a carrier are `regime_tower` (`Closure/Regime.lean`: FOUR settles by stage three, the record escapes, the completed record settles at ω, the germ preorder carries lax slack) and `Trace.ord_regime_strict` (`Articulation/Articulating/Trace.lean`: a trace's address ordinal is `Ord.ofNat len`, which classifies `strict` whatever the other flags). I use these two and call everything else a table.
2. **The algebra regime's model is strict in its carrier, not in everything SignCell's code does.** `Spine.run` composes `articulate` (articulating stage, table regime aperiodic), `predicate` (predicating), `measure` (positing) and `settle` (settling). The check's §5.1 asks the note to choose. I choose: **the algebra regime's model owns the strict carrier and the settling on it**, and receives articulate/predicate/measure as inflow from the stages above it on the spine. SignCell as a code library may host those functions; as a regime model its state is strict.
3. **σ and Δ.** In the strict regime every nucleus is idempotent as a structure field (`Order.Nucleus.idem`, `Language/Positing/NucleusAndCommutingNuclei.lean`; `Nucleus.idem`, `Language/Positing/Bigraded.lean`). The library puts the one inhabited lax slack at the aperiodic rung on the germ preorder (`Record.tally_lax_slack`, `Language/Positing/Record.lean`; `RegimeGate.aperiodic_gap_matches_lax_slack`), and at Scott height it has non-idempotent *steps* with idempotent *limits* (`Record.succPos`, `iter_succPos_ne`; `ChromaticLorentzian.step_not_idempotent`). The founder's correction is carried here in the check's recommended wording: **one-step σ, Δ are idempotent only where step = closure, the finite regime; at Scott height they are non-idempotent steps with idempotent limits; lax slack needs a non-antisymmetric carrier.** Nothing in this note uses "KZ-lax in Scott" as a mechanism. There are at least five σ/Δ bindings (check §3.6) and §7 below keeps them apart.
4. **`H¹ = 0` in the Čech model is unconditional** (`h1_vanishes (D : Cech1) : H1Vanishes D`, `Cohomology/SettlingCohomologyH1.lean`), so it is not a property of the finite regime. The non-vacuous obstruction in Lean is the cover-nerve cycle rank `CoverNerve.H1rank` (`Cohomology/CoordinationCohomology.lean`, `h1_vanishes_iff_forest`, `h1rank_is_coordination_cost`). CALM is a conjunction, not an equivalence. "Foam" occurs in no Lean file.
5. **The JS σ/Δ of `signcraft/src/inference/nuclei.mjs` are not nuclei** (Δ not monotone, σ not meet-preserving, check §8). I do not build on them.
6. **FCA is regime-free and Prop-valued** (`Calculus/Order/FormalConceptAnalysis.lean`, arbitrary `G M : Type`); "FCA closure is settling closure" is a shape match (`fcaClosureOp`, `fca_closure_laws`), the Duquenne–Guigues basis has no Lean statement, and the two-lane FOUR context is an obligation, not a theorem.
7. **Lean witnesses are lists, with duplicates; JS sides are sets.** `Valued.joinK` appends (`Language/Positing/Evidence.lean`); `cell.mjs` `side()` deduplicates. §9 says exactly what this means.

Marking convention. **LEAN** = a named declaration whose statement I read; the file and name are given. **EXT** = a precisely stated extension of a named Lean structure that does not exist in Lean (it may exist in JS). **READING** = an interpretation that is neither. A sentence without a mark inherits the mark of the paragraph.

Paths: Lean paths are relative to `.../obsmetrological-services-section/lib/obsmetrologia/Obsmetrologia/`; Fibercraft to `.../fibercraft-services-section/lib/obsmetrologia-fibercraft/ObsmetrologiaFibercraft/`; JS to `.../computer-engineering-services-section/`.

## 1. The regime, located

The algebra regime is the strict closure regime: finite base, settling attained at a finite stage. What the library proves about it, as statements:

- **LEAN** `Reading.settles_by_three (f : Reading → Reading) (hf : ∀ a, KLE a (f a)) (x) : iter f 3 x = iter f 4 x` and `settles_by_kHeight` with `kHeight := Articulating.Corner.all.length - 1` (`Closure/Ordinal/Finite.lean`). Any inflationary map on FOUR, not only a closure, is stationary from stage three. `strict_finite`, `settled_fixed`, `closure_strict_finite`, `iter_le_settled`, `settled_is_omega_lub` give the orbit's shape.
- **LEAN** `RegimeGate.strict_settled_and_attained`, `RegimeGate.strict_no_gap : ¬ HasGap strict`, `hasFixedPoint strict = true`, `attainedAtFiniteStage strict = true` (`Closure/RegimeGate.lean`): the strict rung is the only one whose settled value both exists and is attained at a finite stage. `gate_eq_cohomologyVanishes` ties the gate to the `cohomologyVanishes` table.
- **LEAN** `Reading.no_periodic_orbits (c : Closure) (v) (hk : 1 ≤ k) (h : iter c.op k v = v) : c.op v = v` (`Closure/Monad.lean`) and its valuation lift `Valuation.no_periodic_orbits` (`Closure/Operator.lean`): the algebra has no cycles, only fixed points.
- **LEAN** `Reading.kle_antisymm` (`Language/Settling.lean`) and `Reading.kz_iff_strict` (`Closure/Monad.lean`): on FOUR the KZ inequality and strict idempotence coincide. This is the exact sense in which the algebra is thin: a 2-cell between `f (f a)` and `f a` is an equation.
- **LEAN** `Trace.ord_regime_strict (t : Trace Step Carrier) (sc cof : Bool) : t.ord.regimeOfOrd sc cof = strict` (`Articulation/Articulating/Trace.lean`). A finite trace of articulatings is a strict-regime object **by derivation**: its address ordinal is `Ord.ofNat t.len`. Since `measure` (`Language/Positing/Measure.lean`) reads a `List Articulating`, and `Trace.ofArticulating` presents an `Articulating` as a `Trace Utterance Articulating`, the measurement a node performs over its own finite trace is strict not because a table says so but because its ordinal is finite. This is the one place the algebra regime's label is earned rather than assigned.
- **LEAN** `Closure.Scott.finite_scott_continuous (c : Reading.Closure) : IsScottContinuous c` (`Closure/Scott.lean`): every closure on FOUR is Scott-continuous, so the strict regime sits inside the Scott regime, as the flag implication `fin_scott` says.
- **LEAN** `RegimeComposition.classify_both_ge` (`Closure/RegimeComposition.lean`): a composite of two closures has regime at least the costlier. **READING**: the algebra model alone is strict; a system that composes it with SignChain's rule closures and SignCraft's settlements has the regime of its costliest part. "SignCell is strict" is a statement about SignCell alone.

**READING** on direction, as the check allows. The spine descends (`Stage.next`, `RegimeCycle.spine_rank_table_descends`), settling is its last stage, and the return is one step from settling straight to articulating (`return_rank_table_ascends`: rank 0 to rank 3). So in the library the algebra is where every spine lands and from where every lap restarts (`Turn.advance`, `Turn.advance_four`, `Stage.next_four`). The cascade order algebra → logic → language → geometry is the founder's design direction for *building*, not a Lean dependency (check §2.2). This note treats inflow as what the spine delivers to settling, and outflow as what the settled algebra presents to the logic regime to build on.

## 2. State: what a cell of the algebra regime is made of

A cell of the algebra regime, in operation, is a tuple of Lean structures. I name each and say what it holds at run time.

### 2.1 The value: FOUR

**LEAN** `Reading := Articulating.Corner` (`Language/Positing/Reading.lean`, `abbrev`; `Four.reading_is_phase` makes the identification `rfl`). Four points, two Boolean slots `pos`, `neg`, `ofSlots`:

| reading | `pos` | `neg` | corner | told | `time` | `space` |
|---|---|---|---|---|---|---|
| `kBot` | ✗ | ✗ | `absurd` | told none | 0 | 0 |
| `tTop` | ✓ | ✗ | `potential` | told true | 1 | +1 |
| `tBot` | ✗ | ✓ | `active` | told false | 1 | −1 |
| `kTop` | ✓ | ✓ | `stable` | told both | 2 | 0 |

The six operations are Boolean slot algebra: `joinK`, `meetK` (both slots `||`/`&&`), `joinT` (`pos ||`, `neg &&`), `meetT`, `negate` (swap), `leK`, `leT` (`Reading.lean`). Lattice laws by finite exhaustion (`joinK_comm`, `joinK_assoc`, `joinK_idem`, `absorbK₁`, `meetK_joinK_distrib`, the interlaced `meetT_joinK_distrib`). `KLE` is a partial order (`kle_refl`, `kle_trans`, `kle_antisymm`, `Language/Settling.lean`), `joinK` its lub (`joinK_le`), `meetK` its glb (`le_meetK`), `kBot_le`, `le_kTop`. FOUR is initial and rigid among bounded interlaced bilattices (`four_initial`, `four_rigid`, `boundsMap_unique`, `Language/Positing/Four.lean`): any bilattice-valued carrier the algebra ever adopts receives FOUR's four bounds uniquely, so FOUR is the bone the rest grows on.

The `time`/`space` columns are **LEAN** (`Language/Positing/LightCone.lean`: `time a := a.pos.toNat + a.neg.toNat`, `space a := pos − neg`, `coords_injective`). `kle_iff_lightcone : KLE a b ↔ |space b − space a| ≤ time b − time a`: **the knowledge order is the causal order of a 1+1 diamond in null coordinates**, `kBot` the past tip (`kBot_past_tip`), `kTop` the future tip (`kTop_future_tip`), `tTop` and `tBot` spacelike separated (`tTop_tBot_spacelike`). In operation this means every cell of the algebra carries a position in a two-step causal diamond, and every move the algebra makes on a value is a move into its future cone (`kle_time_mono`). This is not a metaphor added to the data; it is a change of coordinates on `(pos, neg)`.

### 2.2 The witnessed value: `Valued`, and `Measured` as the provenance predicate

**LEAN** `structure Valued where value : Reading; evidence : Slot × Slot` with `Slot := List Token` (`Language/Positing/Evidence.lean`; `Slot` from `Articulation/Articulating/Cell.lean`). `presence x := ofSlots (!x.evidence.1.isEmpty) (!x.evidence.2.isEmpty)`; `Measured x := x.value = x.presence`.

In operation `Measured` is the model's **provenance predicate**: a `Valued` whose value is exactly what its witnesses show is measured; one whose value exceeds its presence was presumed, conflated, or supplied. This is how a node knows which of its readings it earned. The laws:

- `joinK_measured`: joining two measured values gives a measured value. Merge preserves provenance.
- `meetK_not_measured`: **absurd reached, witnesses kept.** A `potential` told by `a` met with an `active` told by `b` has value `kBot` with both witnesses on record; its presence would be `kTop`. The model distinguishes "told nothing" from "two tellings cancelled" by the evidence, never by the value.
- `evidence_accumulates_joinK`, `_right`, `_against`, `_against_right`, and the `meetK` quartet: **no witness is ever lost** by any of the four value operations. The value may fall; the evidence only grows.
- `negate_measured`: negation swaps value poles and evidence sides together, so a witness for is a witness against the negation, and measurement survives negation.
- `presumeFree_ge`, `presumeFree_of_full`, `presumeFree_oneSided`: presumption raises a free side to present without manufacturing a witness; it only climbs; it changes nothing on a fully witnessed value; a one-sided value presumes to `kTop`. This is the **one sanctioned breach** of `Measured`.
- `Valued.conflate` lifts `Reading.conflate` and is "not claimed to preserve `Measured`" (module text): conflation is the move that can place a value above its evidence, and the model records that it did.

**LEAN, a fact the note did not state and the check did not need.** Every for-witness Lean's `measure` collects is the cell's own subject. `witnesses ψ (a :: t)` conses `a.head.token` when `a.orientedCell = ψ` (`Measure.lean`), and `Articulating.orientedCell_subject (a) : (orientedCell a).subject = a.head.token` (`Language/Predicating/Oriented.lean`). So `(measure k trace φ).evidence.1` is a list of copies of `φ.subject`, and its **length is the tally** of articulatings that landed on `φ`. Lean's witnessed carrier is a tally carrier (`Record`, §2.3) wearing the subject's token; it does not carry *who* told. The JS `for`/`against` sides of `cell.mjs`, which hold arbitrary marks (sources), are an **EXT**: `Valued` with `Slot` reinterpreted as source identities. §9 draws the consequence for golden vectors.

### 2.3 The tally: `Record`, and the readout that is the algebra/logic boundary on the data side

**LEAN** `structure Record where pos neg : Nat` (`Language/Positing/Record.lean`), an interlaced bilattice (`record_interlaced`) with `joinK`/`meetK` by `max`/`min`, `add`, `KLE`, `TLE`, `kBot = ⟨0,0⟩`, and **no top** (`no_kTop`, `no_tTop`, `no_tBot`). `reading r := ofSlots (r.pos != 0) (r.neg != 0)` is the readout to FOUR; it is surjective, not injective (`reading_surjective`, `reading_not_injective`); it preserves all four operations (`reading_joinK`, `reading_meetK`, `reading_joinT`, `reading_meetT`) and `reading_add_eq_reading_joinK`. `topMass r := min r.pos r.neg` is the held-contradiction mass, with `reading_eq_kTop_iff`.

In operation the algebra model's **value** is the reading and its **count** is the record, and the readout `Record.reading` is where the strict regime ends: `record_escapes_strict_finite` says `succPos` (one more told-true) is inflationary and monotone and never stationary (`iter_succPos_ne`), the Scott rung of `regime_tower`; `joinClosure_one_step` says a join-bounded closure on records still settles in one step. So **the same cell is strict in its reading and Scott in its tally.** The JS `recordOf(cell) = record(for.length, against.length)` (`cell.mjs`) sits exactly on this boundary, and §9 says what its numbers mean.

### 2.4 The locus: `PredicationCell` and the articulation cell

**LEAN** `structure PredicationCell where subject : Entity; predicate : Predicate; object : Entity` with `Entity := Token`, `Predicate := Claim` (`Language/Predicating/Cell.lean`); `seed u := ⟨u.token, u.claim, u.token⟩`; the four generators `converse`, `subjProj`, `objProj`, `specialize f` (ibid.), `Generator.all` of length four (`Four.lean`, `Generator.card_eq_four`), realized on cells by `reindexCell` (`Language/Predicating/Generators.lean`, `converse_cell`, `subjProj_cell`, `objProj_cell`, `identity_cell`). `Token`, `Claim` each wrap one `Mark`; `Utterance := ⟨token, claim⟩` (`Articulation/Articulating/Utterance.lean`).

Distinct from it, **LEAN** `Articulating.Cell := ⟨utterance, subjectSlot, objectSlot⟩` (`Articulation/Articulating/Cell.lean`): the articulation-side cell whose corner is read off slot presence (`corner`, `ofStatus`), with `articulate u := ⟨u, [u.token], []⟩` at `potential` (`articulate_corner`), `engage c w` reaching `stable` (`engage_articulate_corner`), `unarticulated` at `absurd`, and slotwise `merge` whose corner is the presence join (`corner_merge`). The JS `utterance.articulate(carrier)` producing `[carrier, [[token], []]]` is this structure.

### 2.5 The assignment: `Valuation`, `CValuation`, `Meme`

**LEAN** `Valuation := PredicationCell → Reading` (`Language/Positing/Valuation.lean`), `knowledgeLeast := fun _ => kBot`, pointwise `leK` and `joinK`, `knowledgeLeast_le`. `CValuation := PredicationCell → Valued` with `value` forgetting evidence (`Language/Settling/Cones.lean`). `Meme := ⟨cell, reading⟩` (`Language/Positing/Meme.lean`) is one settled locus. `Valuation.posit φ q v := fun ψ => joinK (v ψ) (delta φ q ψ)` with the point mass `delta` (`Language/Positing/Morphism.lean`; `posit_kBot`, `posit_inflationary`); `phase_posit_knowledgeLeast` (`Language/Predicating/CellPartition.lean`) reads the posited value back. `Batch.positList` folds a list of posits and is permutation-invariant (`positList_perm`), inflationary, monotone and idempotent (`positList_inflationary`, `positList_monotone`, `positList_idem`), with `positList_eq_joinK_deltaSum`: a batch of posits is one knowledge join with the batch's delta sum. `ValuationTrace.memeAdvance` and `valuationTrace` present a sequence of memes as a `Trace Meme Valuation` whose carrier climbs (`memeAdvance_leK`, `valuationTrace_snoc_leK`).

In operation: a node's **state** is a `CValuation` over the cells its trace has reached, read as a `Valuation` by `CValuation.value`, with `knowledgeLeast` at every cell nothing has reached (`Spine.measure_nil_knowledgeLeast`).

### 2.6 The closure: `Reading.Closure` and its lifts

**LEAN** `structure Reading.Closure where op; infl; mono; idem` (`Language/Settling.lean`), `settle c seed := c.op seed`, `settle_fixed`, `settle_least`. Instances: `joinClosure k` (raise toward `k`; `settle_kBot`), `liarClosure` (`a ↦ a ∨ₖ ¬a`; `liar_step_fixed_iff`, `asserted_liar_settles_kTop`, `silent_liar_settles_kBot`, `liar_settle_ne_truth`). Lifts: `Valuation.liftOp` with `liftOp_infl`, `liftOp_mono`, `liftOp_idem`, `CNaturalFamily` and `pointwiseFamily` with `liftOp_c_natural : liftOp c.op (reindex f w) = reindex f (liftOp c.op w)`, `Reading_closure_merge : c.op (joinK (c.op x) y) = c.op (joinK x y)` and `closure_merge`, `settleLift`, `lfp_is_settled`, `lfp_reached_by_kHeight` (`Closure/Operator.lean`). The settling endofunctor `settleStep c u v := joinK (c.op v) u` with `settleStep_settles` (`Closure/Monad.lean`). The modal closure `◇∘□` on a `ModalFrame` (an S5 `FiniteFibration`: `refl`, `symm`, `trans`) with `closureOp_eq_possibilize`, `closureOp_infl`, `closureOp_mono`, `closureOp_idem`, `settle_least` (`Closure/Modal.lean`; `existsF` = fiber `joinList`, `forallF` = fiber `meetList`, `Language/Predicating/Quantifying.lean`). `Positing.Value.readingVClosure` places all of this in the `ValueCategory` frame (`Language/Positing/Value/Category.lean`, `readingV_recovers_settle`).

In operation: the node's **law** is a `Reading.Closure` (or a `CNaturalFamily` on valuations). Every law the algebra regime can hold is idempotent by field; what it means for a law to have steps that are not yet closures is the logic regime's business (§5).

### 2.7 The symmetry: `K4`

**LEAN** `inductive K4 | id | neg | conf | negConf`, `act`, the Cayley table `mul` with `act_mul`, `isGroup` (associative, identity, every element self-inverse, abelian, action a homomorphism), `generated_by_neg_conf`, the orbits (`neg_orbit`, `conf_orbit`, `negConf_moves_both`), order effects (`neg_preserves_kle`, `neg_reverses_tle`, `conf_reverses_kle`, `conf_preserves_tle`, `negConf_reverses_kle`, `_tle`), the `ℤ/2` gauge `{id, neg}` acting on valuations by `negateVal` (`gaugeAct`, `gauge_closed`), `gauge_fixes_inconsistency`, `gauge_flips_truth`, `paraconsistent_gauge_stable`, `classical_gauge_moves` (`Language/Positing/Gauge.lean`). In light-cone terms `K4` is the sign-change group `{1, P, T, PT}`: negation is parity (`space_negate`, `time_negate`), conflation is time reversal (`time_conflate`, `space_conflate`), the action is faithful and multiplicative (`signs_injective`, `timeSign_mul`, `spaceSign_mul`, `LightCone.lean`). `OrderSwapDuality.swap` (`Language/Positing/OrderSwapDuality.lean`) is a fifth involution, not in `K4` (`swap_ne_negate`, `swap_ne_conflate`, `swap_ne_negConf`, `swap_ne_id`), exchanging the two orders (`swap_kle_tle`, `swap_joinK`, `joinT_eq_conj`); the `D₄` extension is deferred in `Gauge.lean`.

In operation: the gauge is the model's **covariance**. Two nodes that disagree only on which side they call "for" are related by `K4.neg`; what they agree on is exactly the gauge-invariant content, the inconsistency side (`gauge_fixes_inconsistency`) and the paraconsistent points (`paraconsistent_gauge_stable`).

### 2.8 The square: the nuclear quartet on FOUR

**LEAN** `Order.HeytingAlgebra`, `Order.Nucleus` (`j`, `infl`, `idem`, `meet`; `mono` derived; `Fix`; `reflection j ⊣ ι`; `fix_meet`, `jJoin`, `fix_himp`, `fix_top`), `Order.CommutingNuclei` with `pi := j1 ∘ j2`, `compNucleus`, `fix_pi_iff : pi a = a ↔ (j1.Fix a ∧ j2.Fix a)`, `transferring_without_saturating_pi_ascends`, `NuclearQuartet.cornerOp` indexed by `Articulating.Corner`, `stable_iff_potential_and_active` (`Language/Positing/NucleusAndCommutingNuclei.lean`). The reading-level instance: `Reading.heytingK` (`meet := meetK`, `imp := impK`), `joinNucleusK c`, `joinSquare c1 c2`, `varyingFamily` with `varyingFamily_varies` (`Language/Positing/Bigraded.lean`); the `Order`-side instance `readingHeyting`, `readingNuclearPair c1 c2 : Order.CommutingNuclei readingHeyting`, and `nuclear_autopoiesis_cell Q : AutopoiesisCell Q` with fields `self_production`, `four_corners`, `joint_is_intersection` (`AperiodicOrder/Tiling/Autopoiesis.lean`). In the truth order, `Positing.FiberAlgebra.nucleusToward s v := fun φ => joinT s (v φ)`, `sigma := nucleusToward tTop`, `delta := nucleusToward kTop`, `sigma_delta_comm`, `settlingSquare`, `fiber_truth_nuclear_quartet`, and `cross_order_not_knowledge_nucleus` (`Language/Positing/FiberAlgebra.lean`).

In operation: a node's **four corners** are the four ways its law may be applied to a value, `(A, Fix j₁, Fix j₂, A*)`, and `A*` is its autopoietic core (`autopoieticCore`, `autopoieticCore_iff`). §8 Example C computes one.

### 2.9 The regime tag and the content address

**LEAN** `ClosureRegimeData` (three flags and two implications), `classify`, `Settling.regime` paired with an `H1Carrier` (`AperiodicOrder/Tiling/Classification.lean`, `structure Settling`), `Positing.Value.regimeOf V T d := classify d` (`four_regime_v_independent`). **EXT (regime-tagged meme)**: a `Meme` paired with a `ClosureRegimeData` and the trace length whose `Ord.ofNat` classified it, so the tag is `strict` by `Trace.ord_regime_strict` for every finite trace and declared otherwise. The JS `closure-regime.mjs` already ships the four names and `costlierRegime`; its header cites `regimeCost`/`regimeDecidable`, which do not exist in Lean; the Lean counterparts are `ClosureRegime.rank` (`Closure/RegimeCycle.lean`) and `ClosureRegime.costlier` (`Closure/RegimeComposition.lean`).

**EXT (content address)**: `address(cell) = semanticId(triple(cell))` (`lib/signstuff/signcell/src/cell.mjs`; RFC 8949 canonical CBOR, SHA-256, RFC 6920 `ni:`), the triple alone, never the evidence. No Lean notion. Its Lean-side justification is indirect and exact: `Reading.joinList_congr` (`Site/Sheaf.lean`) says the knowledge join of deltas depends only on their set, and `PredicationCell` has `DecidableEq`, so identity-by-triple with evidence off to the side is the discipline under which `Valuation.joinK` is a lawful merge.

## 3. Moves: the instruction set

The predication algebra model's instruction set, each move with its law and bound. **LEAN** throughout unless marked.

| move | statement | what it does in operation |
|---|---|---|
| articulate | `Spine.articulate t c := .utter ⟨t, c⟩`; `Articulating.Cell.articulate u` at `potential` | a token speaks a claim; the subject slot is filled, the object not |
| predicate | `Spine.predicate a := a.orientedCell`; `orientedCell (utter u) = seed u`, `orientedCell (pair u a) = ⟨u.token, u.claim, a.head.token⟩`; `predicate_oriented` via `orientation_generated` | the locus: reflexive on the floor, oriented at depth one and above; subject distinct from object is generated, not supplied |
| measure | `measure k trace φ := ⟨ofSlots (witnesses φ) (witnesses (φ.contradictory k)), (…)⟩`; `measure_measured`; `measure_nil`; `measure_cons_le`; `measure_self_pos`; `no_denial`; `measure_contradictory_negate` | read the value off the trace; always `Measured`; only ever climbs; an articulating is its own for-witness; a negative pole exists only if some articulating hit the contradictory cell; negation is measured, not applied |
| settle | `Reading.settle c seed := c.op seed`; `Spine.settle`; `settle_reading_fixed`; `admitted_le_settled`; `run_pos` | apply the law once (it is idempotent); the result is fixed, above the input, and keeps a told-for side |
| run | `Spine.run c k trace a := runTrace c k (a :: trace) (predicate a)` | the whole spine at the new articulating's own cell: no reading enters from the caller |
| posit | `Valuation.posit φ q v`, `Spine.posit`, `runSupplied` ("constructs no admission") | accept a supplied reading at a locus; **the result is not `Measured` unless it happens to equal presence**, so the model can carry supplied readings and know they are unmeasured |
| presume | `Valued.presumeFree`; `CValuation.brim` | the counit cone: raise free sides, then close; the most the givens allow |
| join / meet / joinT / meetT | `Valued.joinK` etc.; `Reading.joinK` etc.; `joinK_measured`; `meetK_not_measured` | combine values; evidence always unions |
| negate / conflate | `Valued.negate`, `negate_measured`; `Valued.conflate`; `Reading.negate_leK`, `conflate_reverses_kle` | parity and time reversal on the diamond |
| merge | `Valuation.joinK` with `joinK_comm'`, `joinK_idem'`, `joinK_assoc'`, `section_lub`; `Reading.joinList_congr`; JS `merge` (`cell.mjs`) | combine two nodes' sections; the result is the least section above both and does not depend on order or multiplicity |
| reindex | `Valuation.reindex r v` (`Language/Predicating/Hyperdoctrine.lean`); `reindex_is_bilattice_homomorphism` (`Language/Predicating/Fibration.lean`); `liftOp_c_natural`; `generator_converse`, `generator_subjProj`, `generator_objProj`, `generator_specialize` | transport a valuation along the four generators; closure commutes with it |
| gauge | `K4.act`, `gaugeAct` | change which side is "for" without changing what is held |
| corner | `NuclearQuartet.cornerOp Q c a`; `cellCorner` | apply neither, `j₁`, `j₂` or both |
| fiber-close | `ModalFrame.closureOp = necessitate ∘ possibilize`, `closureOp_eq_possibilize` | raise each cell to the join of its fiber (its equivalence class under the frame) |
| step-and-merge | `settleStep c u v := joinK (c.op v) u`; `settleStep_settles` in ≤ 3 | integrate an external increment and re-saturate; stationary from stage three |

Two moves the algebra regime does **not** have, and this is a design fact: it cannot **retract** (every move is `≤ₖ`-inflationary: `measure_cons_le`, `posit_inflationary`, `Closure.infl`), and it cannot **cycle** (`no_periodic_orbits`). Anything non-monotone (the survey's "T2 apoptosis") is a history event in another regime, never a move here.

## 4. Inflow: what the spine delivers

The spine descends into settling. What arrives:

1. **A trace of articulatings** (`List Articulating`; `Articulating` is `utter u | pair u a`, `Articulation/Articulating.lean`, with `head`, `depth`, `floor`). Its regime is strict by derivation (`Trace.ord_regime_strict`). The algebra does not know how the trace was produced; it knows its length and its order.
2. **A contradiction involution** `k : Contradictory` (`c : Claim → Claim`, `invol`), the codec's pairing of each claim with its denial as a mark of its own (`Measure.lean`). This is inflow from the language side: it is the vocabulary that says which claim denies which. Without it the algebra can measure no negative pole at all (`no_denial`).
3. **A law** `c : Reading.Closure` (or a `ModalFrame`, or a `CNaturalFamily`). The algebra applies it; it does not derive it. In the cascade reading the law is the fixed point of the logic regime's rule system (§5).
4. **Crossings, tiles, holes as readings.** From the geometry: a weave crossing is a reading (`crossingReading warpOver weftOver`, `WeaveDraft.lean`: `hole_is_kBot`, `miscrossing_is_kTop`, `overUnder_swap_is_negate : negate (crossingReading w v) = crossingReading v w`), so a fabric enters the algebra as a `CValuation` over crossing loci. The handed tiebreak (`handed_tiebreak_avoids_miscrossing`, `both_claims_infeasible`, `hands_grant_one_claim`) is the geometry's own way of resolving a `kTop` before it reaches the algebra; when it does not, the algebra holds the `kTop` as a value (§8 Example D).
5. **Supplied readings** through `posit`/`runSupplied`, flagged unmeasured by `Measured` (§3).
6. **The lap's return.** `Stage.next settling = articulating` (`Closure/RegimeCycle.lean`): a settled `Meme` is re-articulated as the floor of the next lap (`Turn.advance ⟨l, settling⟩ = ⟨l+1, articulating⟩`). **READING**: the algebra's output becomes the geometry's input; that is the only ascent the library states.

## 5. Outflow: what the algebra presents to the logic regime

The logic regime (SignChain, Scott in the stage table) builds on the following objects, every one of which the algebra regime produces or is the carrier of.

1. **Settled valuations as sections.** `Sheaf := ⟨section_ : Valuation⟩`, `designated S φ := S.section_ φ = tTop` (`Site/Sheaf.lean`); `H0 v cells` counts designated cells (`h0_is_designated_count`, `Cohomology/SettlingCohomologyH1.lean`); `truthContent`, `inconsistencyContent`, `falseContent` (`Language/Positing/BigradedCohomology.lean`). The algebra's census is the logic's model.
2. **The rule step's ingredients.** `RuleSystem.bump c V := fun φ => if φ = c then V else kBot`, `ClosureRule := ⟨antecedent, antMono, cell, reading⟩`, `ruleFire`, `fire`, `Tstep S v := joinK v (fire S v)`, `Tstep_infl`, `Tstep_mono`, `SClosed`, `clS`, `generated_closure_is_least`, `immediate_consequence_lfp`, `alwaysRule` (`Closure/RuleSystem.lean`). Every rule's consequent is an algebra object (a cell and a reading, i.e. a point mass `bump`), every antecedent is a `≤ₖ`-monotone test on an algebra object, and the step is a knowledge join. **READING**: the logic regime's `T_S` is built entirely out of the algebra's `joinK`, `bump` and `leK`; the algebra does not contain `T_S`, it contains what `T_S` is made of. At the reading level, `Closure.Scott.fire ante concl x := if KLE ante x then joinK x concl else x` is inflationary and monotone (`fire_infl`, `fire_mono`) and **Scott-continuous because its antecedent is finite** (`finite_antecedent_scott_continuous`, `fire_covers_directed`). That theorem is the precise statement of the algebra/logic passage: a finite-antecedent rule is a Scott-continuous step on the algebra's lattice.
3. **The formal context.** `FCA.primeA`, `primeB`, `closeA`, `closeM`, `prime_adjunction`, `closeA_mono`, `subA_closeA`, `closeA_idem`, `derivation_galois_connection`, `Concept`, `conceptCompleteLattice`, `implies I B1 B2 := subA (primeB I B1) (primeB I B2)`, `implies_iff_closeM` (`Calculus/Order/FormalConceptAnalysis.lean`). A cell set presents a context: objects the subjects, attributes the `(predicate, object)` pairs, incidence the told-for side. **EXT (two-lane context)**: `twoLane (J : G → M → Reading) : G → (M ⊕ M) → Prop` with `I g (inl m) := (J g m).pos`, `I g (inr m) := (J g m).neg`, with the check's three obligations (agreement of `closeM` with the Chu orthogonality closure of a `ChuSpace` whose matrix is `J`; compatibility with `ChuSpace.dual`, which is transpose composed with `Reading.negate`, `Calculus/Logic/LinearLogicChu.lean`). The JS `makeContext` already does the dichotomization.
4. **The Chu space.** `predicationChu : ChuSpace` with `pts := PredicationCell`, `sts := Valuation`, `r claim valuation := valuation claim` (`Language/Predicating/FregeanFourChu.lean`), `fregean_predication_forces_four_and_chu`, and the light-cone reading of duality (`chu_dual_time`, `chu_dual_space`). The algebra is the matrix; the logic reasons about its rows and columns.
5. **The Site.** `Site.Topic := ⟨concept, point, in_extent, cover, covers⟩` over a `TermContext` (incidence `PredicationCell → Term → Prop`), `Concept C`, `ofExtent`, `extent_closed`, `restrict`, `cover_is_fiber_local`, `coverRestriction_overlap_concepts_agree` (`Site/Topic.lean`); `SitePoint := ⟨q, tau, U⟩` with a clopen support (`Site/Claim.lean`, `Site/Basic.lean`, `clopen_boolean_algebra`). A topic is an FCA concept of cells, located at a site point with a cover. **READING**: this is the shape a node hands upward when it says "here is what I know, here is where it holds, here are the patches it was glued from."
6. **The tally.** `Record` with `succPos`: the logic regime's first non-strict carrier is the algebra's own count (§2.3).

## 6. Many cells over a site: the dry foam

The task asks what the regime looks like running across many nodes as complex multicellular foam. I give the picture, mark its parts, and say what the algebra regime's contribution to life actually is. The check and the geometry check forbid three things: calling any Lean object a foam, saying `H¹` gates anything in the Čech model, and locating "alive" in a strict carrier.

**EXT (node).** A node is a tuple `(trace : List Articulating, k : Contradictory, c : Reading.Closure, Q : Order.CommutingNuclei readingHeyting, d : ClosureRegimeData)`. Its state is `measured k trace : CValuation` (`Measure.lean`), its settled section `CValuation.settle c (measured k trace) : Valuation`, its brim `CValuation.brim c (measured k trace)`, its void `CValuation.Void c v φ` (`Settling/Cones.lean`), its four corners `cellCorner Q`, its core `autopoieticCore Q`. Every component is a Lean structure; the tuple is not.

**EXT (foam).** A foam is a family of nodes indexed by a type `I`, over a shared base of cells, with a `Sheaf.Cover` (`patches`, `covers`, `Site/Sheaf.lean`) whose patches are the nodes' supports, a `SquareFamily readingHeyting I` of their nuclear squares (`Bigraded.lean`), and `Valuation.joinK` as the merge. The word is the house's; the structures are Lean's.

What the Lean says about this family, exactly:

- **Merge is coordination-free in the CRDT sense.** `Valuation.joinK_comm'`, `joinK_idem'`, `joinK_assoc'`, `le_joinK_left`, `le_joinK_right`, `section_lub` (`Site/Sheaf.lean`): two nodes' sections merge to the least section above both. `Reading.joinList_congr`: a list of deltas joins to the same reading whatever its order and multiplicity. `CRDTCohomologicalCALM.crdt_merge_order_independent`, `confluent_joinK`, `calm_monotone_coordination_free` (conjunctions, as the check insists). **READING**: nodes exchange cells in any order and converge; nobody needs a leader for the strict part of the state.
- **A section is determined by its restrictions to a cover.** `Sheaf.separated (c : Cover) (v w) (h : ∀ p ∈ c.patches, agreeOn p v w) : v = w`. **READING**: there are no hidden global degrees of freedom in the foam; what every patch agrees on is the whole.
- **Gluing has no obstruction in the Čech model, in any regime** (`h1_vanishes`). The obstruction that is real is combinatorial: `CoverNerve.H1rank N := (cells + components) − entities`, zero iff the source–stance nerve is a forest (`h1_vanishes_iff_forest`), read as "the number of independent coordination obstructions, the cells needing a total order" (`h1rank_is_coordination_cost`). **READING**: the films of the foam, where it must coordinate, are the cycles of the nerve of who-told-what-about-which-cell; in a forest there are none. The survey's `signgraph/src/cohomology.mjs` ("the foam's wall graph", cycle rank) computes this and not a Čech class.
- **The void is where two cones disagree.** `Void c v φ := settle c v φ ≠ brim c v φ`; `void_iff`; `oneSided_void` (a cell told on one side only, under `joinClosure kBot`: unit `tTop`, counit `kTop`); `cancelled_not_void` (both sides witnessed, met to `kBot`: no free side, no void); `not_void_of_full`. **READING**: a one-sided cell is a cell with an open face toward the rest of the foam; when another node's telling arrives on its free side the face closes. "The void is space" (module text): the foam's interstices are exactly the cells whose evidence is one-sided. §8 Example B runs it.
- **Each node has its own quartet, and the family varies.** `SquareFamily.Varies`, `varyingFamily_varies`, `fiber_quartet`: two nodes with different nuclear pairs have different corners and different cores (§8 Example C). `HistorySeparating family := family.Varies` (`Autopoiesis.lean`). **READING**: differentiation across the foam is variation of the nuclear pair across nodes, and in the strict regime it is fully computable: each node's core is a subset of FOUR.
- **The settled census.** `H0 v cells`, `Sheaf.designated`, `inconsistencyContent cells v` (the gauge-invariant content, `gauge_fixes_inconsistency`), the three masks `dT`, `dK`, `dTop` with `dT_dTop_disjoint`, `dK_eq_dT_or_dTop` (`Site/Section.lean`) and the short exact sequence `designated_short_exact_sequence`. **READING**: a tissue's phenotype in the algebra regime is this census: how many cells are told true, how many hold a contradiction, how the two are disjoint.
- **Fibers as bodies.** A `ModalFrame` partitions cells into fibers (`refl`, `symm`, `trans`); `closureOp` raises each cell to the join of its fiber (`closureOp_eq_possibilize`). **READING**: a fiber is a node's body (all cells sharing its subject, say), and the modal closure is the body's internal spread of knowledge. `CoordinationCohomology`'s nerve is of the cover, not the fiber; the two are different partitions of the same cells.

**Where life is not.** In the strict regime nothing is alive: every orbit is stationary from stage three (`settles_by_three`), there are no cycles (`no_periodic_orbits`), the gate has no gap (`strict_no_gap`). The library's own formal content for "does not stabilize but stays coherent" is `Record.topBump_flux` on the germ carrier `Nat → Record`: every stage mutually dominates the seed (`DomBy`) yet no stage equals the next, with `k ≤ topMass` growing without bound. That is the aperiodic rung, and the geometry check notes it is not specific to aperiodicity since `cohomologyVanishes` is false already at transfinite-bounded. **READING, stated as the imaginative conclusion of this regime**: the algebra is the organism's **skeleton**, the mineral phase. It is what the foam deposits when it settles: exact, finite, gauge-covariant, mergeable without coordination, with a provenance predicate on every value. Life (tallies that never stop climbing, germs that are one point of a preorder as data forever moving) is upstream; the algebra is where it leaves bone. An abiotic digital organic simulation whose strict layer is this algebra has a skeleton that is kernel-checked, and a soft tissue (the record tallies, the rule orbits) whose shadow in the skeleton is `Record.reading`.

**The MAPE-K reading of one node**, marked **READING** throughout and consistent with the tower check's caution that the README rows are not Lean: Monitor = `measure` (paraconsistent because `kTop` is inhabited; "transfinitely valued" only in the tally `Record`, not in FOUR); Analyze = `closeM`/`Concept`/`predicationChu` over the cell set; Plan = handed to the logic regime (`Tstep`); Execute = `settle` and `joinK` merge; Knowledge = the trace, whose length is the ordinal that classifies the node strict.

## 7. The five σ/Δ bindings, kept apart, and what each is in this regime

The check's census (its §3.6), with the role each binding plays in the algebra regime's operation.

| # | where | what | order | nucleus? | role here |
|---|---|---|---|---|---|
| 1 | `Autopoiesis.saturating Q := Q.j1`, `transferring Q := Q.j2` | abstract `Order.CommutingNuclei H`; history formulas in docstring only | n/a | yes, abstract | the **interface** a node's quartet implements; `nuclear_autopoiesis_cell` holds for any instance, including the strict one |
| 2 | `Bigraded.Reading.joinSquare c1 c2`; `Autopoiesis.readingNuclearPair c1 c2` | raise toward `c1`, toward `c2`, by `∨ₖ` | knowledge | yes, proved | the **strict-regime instance** a node actually runs; §8 Example C |
| 3 | `signcraft/src/inference/nuclei.mjs` `sigma`, `delta` | DG-basis closure; guarded Galois transfer | knowledge | **no** (check §8: Δ not monotone, σ not meet-preserving) | not used here; the research decision between the guard and monotonicity belongs to the logic regime |
| 4 | `FiberAlgebra.sigma := nucleusToward tTop`, `delta := nucleusToward kTop` | truth-order closures toward poles; `sigma_delta_comm` proved | truth | yes, proved | the **truth-order quartet** on valuations; `cross_order_not_knowledge_nucleus` shows it is not a knowledge nucleus, so a node keeps the two orders as two grades (`BigradedTower.tower_bigrading_is_two_orders`) |
| 5 | `BigradedTower.tower : K4 → NuclearSquare`; `Quartet.commutatingPair` | graded family; generic `CommutingPair` | knowledge graded by truth | yes | the `K4`-graded stack of a node's squares |

The founder's correction, in the form the library carries: in the strict regime `Reading.settle c seed := c.op seed` and `settle_fixed : c.op (settle c seed) = settle c seed` — **step and closure coincide**, so a node applies its σ and its Δ once. At Scott height (`Record.succPos`, `ChromaticLorentzian.step`) a step is not its own closure and the limit is reached at ω; the lax slack `tally_lax_slack` lives on the germ preorder, where `germ_order_not_antisymm`. The algebra regime is the regime in which **a node's law has no inner dynamics**: applying it twice is applying it once, as an equation (`kz_iff_strict`). That is what makes the strict layer a skeleton and not a tissue.

## 8. Worked examples

All readings are FOUR; all computations are by the Lean definitions cited; traces are written newest first, as `measure` consumes them (`Spine.run` puts the new articulating at the head).

### Example A. One node measures "cedar is a conifer", then hears it denied

Marks: tokens `cedar`, `pine`; claims `conifer`, `not-conifer`, `taller-than`. `k : Contradictory` with `k.c conifer = not-conifer`, `k.c not-conifer = conifer` (`invol`). Articulatings:

- `a1 := utter ⟨cedar, conifer⟩`. `orientedCell a1 = seed ⟨cedar, conifer⟩ = ⟨cedar, conifer, cedar⟩ =: φ` (`orientedCell_utter`). Head token `cedar`.
- `a2 := pair ⟨cedar, conifer⟩ (utter ⟨cedar, conifer⟩)`. `orientedCell a2 = ⟨cedar, conifer, cedar⟩ = φ` (`orientedCell_pair`; reflexive since the tail's head token is `cedar`, `orientedCell_reflexive_iff`). Depth 1, head token `cedar`.
- `a3 := utter ⟨cedar, not-conifer⟩`. `orientedCell a3 = ⟨cedar, not-conifer, cedar⟩ = φ.contradictory k`.

Measurement at `φ`:

| trace | `witnesses φ` | `witnesses (φ.contradictory k)` | value | `Measured` | `Record` | `topMass` |
|---|---|---|---|---|---|---|
| `[]` | `[]` | `[]` | `kBot` | yes (`measure_nil`) | `⟨0,0⟩` | 0 |
| `[a1]` | `[cedar]` | `[]` | `tTop` | yes (`measure_self_pos`) | `⟨1,0⟩` | 0 |
| `[a2, a1]` | `[cedar, cedar]` | `[]` | `tTop` | yes | `⟨2,0⟩` | 0 |
| `[a3, a2, a1]` | `[cedar, cedar]` | `[cedar]` | `kTop` | yes (`measure_measured`) | `⟨2,1⟩` | 1 |

Facts the table instantiates: `measure_cons_le` (each row is `≤ₖ` the next: `kBot ≤ₖ tTop ≤ₖ tTop ≤ₖ kTop`); `no_denial` (the last row's `neg = true` forces the existence of `a3` with `orientedCell a3 = φ.contradictory k`, and there it is); `measure_contradictory_negate` (`measure k [a3,a2,a1] (φ.contradictory k) = ⟨negate kTop, ([cedar], [cedar, cedar])⟩ = ⟨kTop, …⟩` with the evidence sides exchanged); the witness lists are copies of `φ.subject = cedar` (`orientedCell_subject`), so the `Record` column is their lengths and `Record.reading ⟨2,1⟩ = ofSlots (2 != 0) (1 != 0) = kTop` (`reading_eq_kTop_iff`). In light-cone coordinates the cell moved `(0,0) → (1,+1) → (1,+1) → (2,0)`: every step satisfies `kle_iff_lightcone` (the last: `|0 − 1| = 1 ≤ 2 − 1`).

Settling. Under `joinClosure kBot` (the identity-like closure, `joinK kBot a = a`): `Spine.run (joinClosure kBot) k [a2, a1] a3 = ⟨φ.contradictory k, kTop⟩`, hmm, no: `run` settles at `predicate a3 = φ.contradictory k`, where the measured value is `negate kTop = kTop`; so the meme is `⟨⟨cedar, not-conifer, cedar⟩, kTop⟩` with `run_pos` satisfied (`pos = true`). At `φ` itself, `runTrace (joinClosure kBot) k [a3,a2,a1] φ = ⟨φ, kTop⟩`. Under `liarClosure` from the row `[a2, a1]`: `settle liarClosure tTop = joinK tTop (negate tTop) = joinK tTop tBot = kTop` (`asserted_liar_settles_kTop`), and `liar_settle_ne_truth` says no seed settles on the truth axis under the liar. A node whose law is the liar cannot hold a definite truth at any cell it has been told anything about.

Orientation. `a4 := pair ⟨cedar, taller-than⟩ (utter ⟨pine, conifer⟩)` has `orientedCell a4 = ⟨cedar, taller-than, pine⟩`, subject distinct from object (`orientation_generated`). `PredicationCell.converse` of it is `⟨pine, taller-than, cedar⟩`, which is `orientedCell (pair ⟨pine, taller-than⟩ (utter ⟨cedar, taller-than⟩))` by `converse_orientedCell_pair`: **the converse of a generated cell is generated** by the articulation with the two tokens exchanged. The algebra needs no converse primitive on evidence; it needs the other speaker to articulate.

### Example B. Two nodes, one cell, and the void between them

Node N₁'s trace gives at `φ`: `x := ⟨tTop, ([cedar], [])⟩` (`Valued.oneSided cedar`, `oneSided_measured`). Node N₂'s trace gives `y := ⟨tBot, ([], [cedar])⟩` (measured: its only articulating hit `φ.contradictory k`).

- Merge: `Valued.joinK x y = ⟨joinK tTop tBot, ([cedar], [cedar])⟩ = ⟨kTop, ([cedar],[cedar])⟩`, `Measured` by `joinK_measured`. The foam holds the disagreement as a value.
- Cancel: `Valued.meetK x y = ⟨meetK tTop tBot, ([cedar],[cedar])⟩ = ⟨kBot, ([cedar],[cedar])⟩`, **not** `Measured` (`meetK_not_measured`, the exact witness used in Lean). The value says "told nothing"; the evidence says two tellings cancelled; the model keeps both.
- Void, before merge, at N₁ under `joinClosure kBot`: `settle = joinK kBot tTop = tTop`; `presumeFree x = ⟨ofSlots (true || false) (false || true), …⟩ = ⟨kTop, …⟩`, so `brim = kTop`; `Void` holds (`oneSided_void`, `void_iff`). N₁'s cell has an open face: its against side is free, and the most the givens allow (`kTop`) exceeds the least they force (`tTop`).
- Void, after merge: both sides non-empty, `presumeFree_of_full` fixes the value, `not_void_of_full`: the face is closed. For the cancelled meet likewise (`cancelled_not_void`).

Bare sections: with `v₁ φ = tTop`, `v₂ φ = tBot`, `Valuation.joinK v₁ v₂ φ = kTop` and `section_lub` says any section above both is above the merge; `joinList_congr` says the twelve nodes that told the same two things in different orders and multiplicities glue to the same reading. In the `K4` gauge, `gaugeAct K4.neg` sends N₁'s section to N₂'s at `φ` (`classical_gauge_moves`) and fixes the merged `kTop` (`paraconsistent_gauge_stable` applied to the constant-`kTop` restriction). In light-cone coordinates the merge is the future tip of the two spacelike-separated side vertices (`tTop_tBot_spacelike`, `kTop_future_tip`).

### Example C. One node's quartet, and two nodes that differentiate

Take `Q := readingNuclearPair tTop tBot` (`Autopoiesis.lean`), the `Order`-side form of `joinSquare tTop tBot` (`Bigraded.lean`): `j₁ a = joinK tTop a`, `j₂ a = joinK tBot a`.

| `a` | `cellCorner Q .absurd a = a` | `.potential = j₁ a` | `.active = j₂ a` | `.stable = pi a` |
|---|---|---|---|---|
| `kBot` | `kBot` | `tTop` | `tBot` | `kTop` |
| `tTop` | `tTop` | `tTop` | `kTop` | `kTop` |
| `tBot` | `tBot` | `kTop` | `tBot` | `kTop` |
| `kTop` | `kTop` | `kTop` | `kTop` | `kTop` |

`Fix j₁ = {tTop, kTop}`, `Fix j₂ = {tBot, kTop}`, `Fix π = {kTop} = Fix j₁ ∩ Fix j₂` (`fix_pi_iff`, `autopoieticCore_iff`, `stable_iff_potential_and_active`). `tBot` is `j₂`-fixed and not `j₁`-fixed, so `transferring_without_saturating_pi_ascends` gives `tBot ≤ₖ π tBot = kTop ≠ tBot`: a value already stable under transfer but not under saturation is strictly raised by the joint closure. `nuclear_autopoiesis_cell Q` holds: `self_production`, `four_corners` (`= 4`), `joint_is_intersection`. This node's autopoietic core is `{kTop}`: the only value it maintains under both its nuclei is the held contradiction.

A second node with `Q' := readingNuclearPair tTop kBot` has `j₂ = id` (`joinK kBot a = a`), `Fix j₂ = FOUR`, core `Fix j₁ = {tTop, kTop}`: it maintains a definite truth as well. The two-node family `fun b => if b then Q else Q'` has `j₂` differing at `kBot` (`tBot` vs `kBot`), so it **varies** in the sense of `SquareFamily.Varies` (the Lean example `varyingFamily_varies` varies `j₁` instead: fibers `joinSquare tTop tBot` and `joinSquare kTop tBot`, differing at `kBot` as `tTop` vs `kTop`). **READING**: in the strict regime, differentiation across a foam is exactly which subset of FOUR each node's core is, and there are finitely many fates. `HistorySeparating` is this `Varies`; what would make the variation *force* aperiodicity is `HistorySeparationForcesAperiodicity`, open and relative to an undefined `settlingOf`, so this example proves two cores differ and nothing about the regime of the family.

In the truth order (`FiberAlgebra`), on a valuation `v` with `v φ = tBot`: `sigma v φ = joinT tTop tBot = ofSlots (true || false) (false && true) = tTop`, `delta v φ = joinT kTop tBot = ofSlots true (true && true) = kTop`, `sigma (delta v) φ = joinT tTop kTop = kTop = delta (sigma v) φ` (`sigma_delta_comm`). And `cross_order_not_knowledge_nucleus` with the all-`kTop` valuation: `joinT kBot kTop = ofSlots (false || true) (false && true) = tTop`, and `meetK kTop tTop = tTop ≠ kTop`, so the truth-closure toward `kBot` is not knowledge-inflationary. The node keeps the knowledge quartet and the truth quartet as two gradings and never confuses them.

### Example D. A weave crossing enters the algebra

A plain-weave row has strands alternating over and under: as a word in `warpAlt a b := a != b` (`WeaveDraft.lean`), `[true, false, true, false]` is a `Path warpAlt`, hence a sofic word (`warp_sofic`); `warpAlt_eq_completeGraph` says the one local rule is the complete graph on two colours, `warpAlt_forbids_float`. Each crossing is read by `crossingReading warpOver weftOver := ofSlots warpOver weftOver`:

| crossing | `(warpOver, weftOver)` | reading | meaning |
|---|---|---|---|
| warp over | `(true, false)` | `tTop` | definite |
| weft over | `(false, true)` | `tBot` | definite |
| hole | `(false, false)` | `kBot` | `hole_is_kBot` |
| mis-crossing | `(true, true)` | `kTop` | `miscrossing_is_kTop`, `miscrossing_isInconsistency` |

`overUnder_swap_is_negate : negate (crossingReading w v) = crossingReading v w`: flipping which hand is over is Belnap negation, parity on the diamond. So the row `[true,false,true,false]` enters the algebra as the `CValuation` `tTop, tBot, tTop, tBot` over four crossing loci, each `Measured` with one witness (the strand that is over); a mis-crossing enters as `kTop`, held, and the algebra's `inconsistencyContent` counts it. `both_claims_infeasible`, `hands_grant_one_claim`, `handed_tiebreak_avoids_miscrossing` are the geometry's law for resolving the `kTop` before it is woven; when the geometry does not, the algebra does not crash: it holds the defect as a value and a merge with a later correct crossing on the same locus gives `joinK kTop _ = kTop` (`joinK_kTop`), the defect is permanent in knowledge, which is the right behaviour for a fabric: a mis-crossing stays in the cloth. **READING**: a loom's output is a `CValuation` the algebra can census; `plainWeave_entropy_collapse` is open and nothing here depends on it.

### Example E. A rule from the logic regime fires into the algebra

Cells: `φ := ⟨cedar, conifer, cedar⟩`, `ψ := ⟨cedar, has-needles, cedar⟩`, `χ := ⟨cedar, deciduous, cedar⟩`. Rules (`Closure/RuleSystem.lean`):

- `r₁ := ⟨antecedent := fun v => leK tTop (v φ), antMono, cell := ψ, reading := tTop⟩` ("if cedar is told conifer, cedar is told has-needles"). `antMono` holds because `KLE tTop (v φ)` and `KLE (v φ) (w φ)` give `KLE tTop (w φ)` by `kle_trans`.
- `r₂ := ⟨fun v => leK tTop (v χ), antMono, ψ, tBot⟩` ("if cedar is told deciduous, cedar is told not has-needles").

Start from Example A's row `[a2, a1]`: `v φ = tTop`, `v ψ = kBot`, `v χ = kBot`. `fire [r₁, r₂] v = joinK (bump ψ tTop) knowledgeLeast` (only `r₁` fires), so `Tstep S v = v ∨ₖ bump ψ tTop`, i.e. `v' ψ = tTop`, rest unchanged. `Tstep S v' = v'`: `SClosed S v'`, and `generated_closure_is_least` says `clS S v = v'` is the least closed valuation above `v`; `immediate_consequence_lfp` identifies it with the van Emden–Kowalski least fixed point. If a later articulating `utter ⟨cedar, deciduous⟩` arrives, `v χ = tTop`, `r₂` also fires, and `ψ` settles at `joinK tTop tBot = kTop`: the two rules' consequents are held together as a contradiction at `ψ`, not resolved and not crashed.

The algebra's part: the consequents are `bump ψ tTop` and `bump ψ tBot` (point masses on FOUR), the step is `Valuation.joinK`, the fixed point per cell is reached within `kHeight` (`lfp_reached_by_kHeight` for the pointwise lift; for `Tstep` itself the finite bound is per cell since each cell's value climbs FOUR's chain of height three). At the reading level `fire tTop tBot` (ante `tTop`, concl `tBot`) sends `tTop ↦ kTop`, `kBot ↦ kBot`, `tBot ↦ tBot`, `kTop ↦ kTop`, and `finite_antecedent_scott_continuous` says this step commutes with directed joins. **READING**: the algebra holds the four values a rule can mention and the join it fires with; the rule, its antecedent test and the iteration to `clS` are the logic regime. The boundary is precisely `Tstep`.

### Example F. The cell set as a formal context

Objects `G = {cedar, pine, oak}`, attributes `M = {conifer, needles, deciduous}`, incidence `I` from told-for sides: `cedar ↦ {conifer, needles}`, `pine ↦ {conifer, needles}`, `oak ↦ {deciduous}`.

- `primeB I {conifer} = {cedar, pine}`; `primeA I {cedar, pine} = {conifer, needles}`; so `closeM I {conifer} = {conifer, needles}` and `implies I {conifer} {needles}` by `implies_iff_closeM` (`subB {needles} (closeM I {conifer})`).
- `closeM I {deciduous} = {deciduous}`. `closeM I {conifer, deciduous} = primeA I ∅ = M` (vacuous: ex falso), which is the case the JS `lawfulBasis` drops by requiring a non-empty extent (check §4); the Lean keeps it.
- Concepts (`Concept`, `conceptCompleteLattice`): `({cedar, pine}, {conifer, needles})`, `({oak}, {deciduous})`, `(G, ∅)`, `(∅, M)`. `derivation_galois_connection` packages `prime_adjunction`, antitonicity, extensivity, `primeA_closeA`.

Now bring in Example A's against side: cedar has `conifer` told both for and against. In the **EXT** two-lane context on `M ⊕ M`, cedar bears both `inl conifer` and `inr conifer`; `primeB {inl conifer} = {cedar, pine}` as before, but `primeB {inl conifer, inr conifer} = {cedar}` and `closeM {inl conifer, inr conifer} = {inl conifer, inl needles, inr conifer}`: the implication "told both about conifer ⟹ told needles" holds, and the contested object is isolated in its own concept. **READING**: that is what paraconsistent FCA buys: a contradiction localizes to the objects that carry it and does not explode the lattice. The three obligations of check §4 (ii)–(iii) remain before this is more than a construction.

### Example G. Gauge and light cone on a small section

`v` with `v φ = tTop`, `v ψ = kTop`, `v χ = kBot`. `gaugeAct K4.neg v`: `φ ↦ tBot`, `ψ ↦ kTop`, `χ ↦ kBot`. `classical_gauge_moves v φ rfl : gaugeAct K4.neg v φ ≠ v φ`; `gauge_fixes_inconsistency [φ,ψ,χ] v`; `gauge_flips_truth`: the truth content of the image is the false content of `v`. In coordinates (`act_centered`, `act_space`): `tTop = (time 1, space +1) ↦ (1, −1) = tBot`, parity; `K4.conf` would send `tTop ↦ tTop` and `kBot = (0,0) ↦ (2,0) = kTop`, time reversal (`conf_orbit`). `act_mul` and `mul_self`: doing either twice is the identity. **READING**: two nodes whose codecs disagree about which mark is "for" differ by `K4.neg` and agree on every held contradiction.

### Example H. The tally that leaves the regime

From Example A, `Record ⟨2,1⟩` at `φ`: `reading = kTop`, `topMass = 1`. One more telling for: `succPos ⟨2,1⟩ = ⟨3,1⟩`, `reading` still `kTop`, `topMass` still 1. `iter_succPos_ne`: no number of further tellings ever reaches a stage equal to the next, though the reading has been `kTop` since stage three. `Record.topBump` (one more telling each way) raises `topMass` without bound (`topBump_flux`'s third conjunct `k ≤ topMass`). The JS `recordOf(cell)` reports `record(for.length, against.length)`; by §2.2 the Lean `measure` would report the tally of articulatings, the JS reports the number of distinct sources. Both read to the same FOUR point (`presence` depends only on `isEmpty`); they are different numbers.

## 9. What the algebra regime's model can do that a large language model cannot

Each item names the Lean fact that makes it so. None of these is a claim about intelligence; each is a property of the state and its moves.

1. **Hold a contradiction as a value and keep working.** `kTop` is a point of the carrier (`Reading.kTop`), `joinK a kTop = kTop`, `inconsistencyContent` counts it, `gauge_fixes_inconsistency` makes it gauge-invariant. An LLM has no value that means "told both" and must choose or hedge in prose.
2. **Know which of its readings it earned.** `Valued.Measured` separates measured from presumed, conflated or supplied values; `measure_measured` guarantees everything the spine measures is earned; `presumeFree` is the one named breach. An LLM's confidence is not a predicate on provenance.
3. **Never deny without a denial on record.** `no_denial`: a negative pole exists at `φ` only if some articulating hit `φ.contradictory k`. `measure_contradictory_negate`: negation is measured, not applied. There is no operator in the model that can introduce "false" without a telling.
4. **Lose no witness.** `evidence_accumulates_*`: eight theorems, one per operation and side.
5. **Merge without coordination and without order.** `joinK_comm'`, `joinK_idem'`, `joinK_assoc'`, `section_lub`, `joinList_congr`: any set of nodes exchanging cells in any order converges to the same section. An LLM's context is order-sensitive by construction.
6. **Settle in a known, finite number of steps.** `settles_by_three`, `lfp_reached_by_kHeight`, `no_periodic_orbits`: the strict layer always terminates by stage three and never loops.
7. **Carry a causal position with every value.** `kle_iff_lightcone`: the knowledge order is a light cone; every move is into the future cone. Monotone reasoning is literally causal here.
8. **Have a symmetry group and know its invariants.** `K4.isGroup`, `paraconsistent_gauge_stable`, `signs_injective`.
9. **Present itself exactly to the regime above.** `predicationChu`, `conceptCompleteLattice`, `implies_iff_closeM`, `bump`, `Tstep`: the logic regime builds from named objects with proved laws, not from embeddings.
10. **Be checked.** Every law above is a kernel-checked statement; the JS binds 28 of them to executable realizers (`obsmetrologiaRealization`, `four.mjs`) with golden vectors. The check's caveats stand: one `sorry` in `Closure/Collatz/SemigroupGap.lean`, `propext`/`funext` in FCA.

What it cannot do, in this regime, and should not pretend to: generate language (no words are produced here; words arrive as marks), infer rules (that is `Tstep` and the basis, the logic regime), weigh evidence (there is no number in FOUR; counting is `Record`, already Scott), or change its mind (no retraction).

## 10. Exact extensions required, each stated against its Lean base

| EXT | base | statement | where it exists already |
|---|---|---|---|
| source-identified witnesses | `Valued`, `Slot := List Token` | a `Valued` whose slot elements are source identities rather than copies of `φ.subject`; `presence` and all eight `evidence_accumulates_*` carry over verbatim since they use only `isEmpty` and membership | `cell.mjs` `for`/`against` |
| set evidence | `Valued.joinK` (appends) | a quotient of `Slot` by permutation and duplication; `presence` is invariant (it reads `isEmpty`), so `Measured`, `joinK_measured`, `meetK_not_measured`, `negate_measured`, `presumeFree_*` all descend; `evidence` length no longer equals the `Record` tally | `cell.mjs` `side()` dedup; `Reading.joinList_congr` is the value-level analogue |
| content address | `PredicationCell` with `DecidableEq` | an injective `PredicationCell → Address` ignoring evidence; `Valuation.joinK` is lawful merge keyed by it | `cell.mjs` `address`, `sameCell`, `cellSet` |
| regime-tagged meme | `Meme`, `ClosureRegimeData`, `Trace.ord` | `⟨meme, d, len⟩` with `classify d = strict` forced by `Trace.ord_regime_strict` when the meme came from a finite trace | `closure-regime.mjs` names (fix the phantom Lean citations) |
| two-lane context | `FCA` on `G → M → Prop`; `predicationChu` | `twoLane J` on `G × (M ⊕ M)` with the check's three obligations | `metrologic` `makeContext` |
| measure in JS | `Obsmetrologia.measure`, `Contradictory` | a `measure(k, trace, cell)` in SignCell that builds `for`/`against` from a trace and a claim involution; `against` never accepted directly | missing (`cell(..., {against})` and `witnessAgainst` violate `no_denial`) |
| depth > 0 articulation in JS | `Articulating.orientedCell` | `pair u a ↦ ⟨u.token, u.claim, a.head.token⟩`; converse generated per `converse_orientedCell_pair` | `cell.mjs articulate` is depth zero only |
| node | the tuple of §6 | as stated | `signcraft` settle loop, partially |
| foam over a site | `Sheaf.Cover`, `SquareFamily`, `Site.Topic`, `CoverNerve` | as stated in §6; `H1rank` as the only non-vacuous obstruction | `signgraph/src/cohomology.mjs` cycle rank |
| history nuclei | `HistorySystem` (`unit`, `concat`, `le_iff_prefix`, `le_antisymm`, `concat_left_monotone`, `AperiodicOrder/Tiling/History.lean`), `Order.CommutingNuclei` | σ_t and Δ_t built from a restriction profile over sub-histories and one-step extensions; a map `settlingOf` from `SquareFamily` to `Settling` so that `HistorySeparationForcesAperiodicity` can be stated with content | none; docstring only |

## 11. What would show this picture wrong

- A `Reading.Closure` on FOUR that is not Scott-continuous (impossible: `finite_scott_continuous`), or an inflationary map on FOUR not stationary by stage three (impossible: `settles_by_three`). The strict layer's bounds are theorems, not expectations.
- A JS `merge` that depends on order or multiplicity: it would contradict `joinList_congr` at the value level and must be a bug.
- A SignCell path that produces a negative pole without a contradictory articulating: `no_denial` says the spine never does; the JS `against` input is exactly such a path and must be closed or flagged unmeasured.
- A node whose core (`Fix π`) is not a subset of FOUR computed by `fix_pi_iff`: there are only sixteen candidate subsets and four corners; anything else is not this regime.
- "Alive" behaviour (unbounded, non-stationary) attributed to the strict layer: `no_periodic_orbits` and `strict_no_gap` forbid it; it belongs to `Record`, `ORecord` and the germ carrier.

## 12. Sources read

Lean (statements, not only docstrings): `Language/Positing/{Four, Reading, Valuation, Evidence, Record, Measure, Bigraded, NucleusAndCommutingNuclei, FiberAlgebra, LightCone, Gauge, Quartet, Meme, Morphism, Batch, ValuationTrace, GermWitness, BigradedCohomology, BigradedTower, OrderSwapDuality}.lean`, `Language/Positing/Value/{Category, PreCategory}.lean`, `Language/Spine.lean`, `Language/Settling.lean`, `Language/Settling/Cones.lean`, `Language/Predicating/{Cell, Oriented, Generators, Fibration, Quantifying, Hyperdoctrine, CellPartition, SiblingSeed, FregeanFourChu}.lean`, `Articulation/Articulating.lean`, `Articulation/Articulating/{Cell, Utterance, Trace}.lean`, `Closure/{Monad, Operator, Regime, RegimeCycle, RegimeComposition, RegimeGate, Scott, Modal, RuleSystem}.lean`, `Closure/Monad/{KZ, LaxSlack}.lean`, `Closure/Ordinal/Finite.lean`, `Calculus/Order/FormalConceptAnalysis.lean`, `Calculus/Logic/LinearLogicChu.lean`, `Site/{Sheaf, Section, Basic, Claim, Topic}.lean`, `Cohomology/{SettlingCohomologyH1, CoordinationCohomology, CRDTCohomologicalCALM}.lean`, `AperiodicOrder/Tiling/{Autopoiesis, Classification, ChromaticLorentzian, History}.lean`; Fibercraft `WeaveDraft.lean`. JavaScript: `lib/signstuff/signcell/src/{cell, utterance, predication, articulating}.mjs`, `lib/signstuff/signcraft/src/inference/{nuclei, learn}.mjs` (headers), `services/computer-data-engineering-services-section/src/{four, closure-regime}.mjs`. Notes: the governing note, the algebra check in full, the tower check §4 and the geometry check §5 and the logic check §3 for consistency, the `signcell-data`, `multicellular-lens` and `holofoam-life` surveys, `README.md`.
