---
title: "Adversarial check of the cascade note, regime tower: the whole loop across the four libraries"
description: "A claim-by-claim check of sections 0, 1.2, 1.3, 1.4, 2 (every row), 4 item 5 and the new-class paragraph of the 2026-10-08 cascade note against the Obsmetrologia Lean statements, the Rosetta and SPOTCOMP notes, and the SignCraft kernel code: each claim quoted and marked CONFIRMED, WRONG, QUALIFIED or UNSUPPORTED, with what the library says instead, and what the note missed."
date-created: 2026-10-08
kind: engineering-research-note
keywords:
  - adversarial-check
  - closure-regime
  - stage-regime
  - kz-lax-idempotence
  - nuclear-quartet
  - regime-cycle
  - settlement-spiral
  - bigraded-tower
  - mape-k
  - signstuff
status: working-note-adversarial-check-of-the-tower-regime-read-against-lean-statements
produced-by: info (Claude Sonnet 5.5), adversarial check stage, regime "tower"; Lean read at the checked-out working tree
---

# Adversarial check: the tower regime of the cascade note

Subject: `2026-10-08-note-on-realizing-signstuff-along-the-algebra-logic-language-geometry-cascade.md`
(called "the note"). Scope: its section 0, section 1.3, section 2 (every row), section 4 item 5, and the
paragraph beginning "Why this is a new class". Because section 1.3 and section 2 lean on the regime table of
section 1.2 and the sigma/Delta reading of section 1.4, those are checked too (they decide most verdicts).

Lean root, abbreviated `L/`: `.../obsmetrological-services-section/lib/obsmetrologia/Obsmetrologia/`.
Fibercraft: `.../fibercraft-services-section/lib/obsmetrologia-fibercraft/ObsmetrologiaFibercraft/`.
Code root, abbreviated `S/`: `.../computer-engineering-services-section/lib/signstuff/`.
Verdict words: CONFIRMED (a Lean statement or code line says it), WRONG (the library says otherwise),
QUALIFIED (true in part; the part that fails is named), UNSUPPORTED (no statement found; what would be needed).

## 0. Verdict in one page

1. **The note's central cascade-direction claim is not in the library as a four-step chain.** The library has
   one four-stage cycle (`Stage.next`, `L/Closure/RegimeCycle.lean`): articulating, predicating, positing,
   settling, then back to articulating. It descends the regime rank by one rung per step
   (`spine_rank_table_descends`) and returns from rank 0 to rank 3 in a single jump
   (`return_rank_table_ascends`). Nothing states a realization pass strict, Scott, transfinite, aperiodic. Both
   directions are lookups in declared tables, and the file marks the descent claim OPEN.
2. **The regime assignments of the note's table (section 1.2) disagree with `Stage.regime` for most of the
   Lean anchors it cites.** `Stage.regime` is a four-line table (`L/Closure/Regime.lean`, section D). The
   modules the note files under "algebra", "logic" and "geometry" sit in directories belonging to other
   stages (section 2 below).
3. **The founder's correction as written in section 1.4 contradicts three Lean theorems.** Strict `mu`
   (idempotence) holds in the Scott regime in the library (`mu_identity_of_cohomologyVanishes`,
   `L/Closure/Monad/KZ.lean`), lax slack is proved impossible on every antisymmetric carrier at every regime
   (`no_laxSlack_of_antisymm`, `L/Closure/Monad/LaxSlack.lean`), and the only inhabited lax slack in the tree
   (`Record.tally_lax_slack`) is filed by the library at the aperiodic rung (`mu_content_exactly_at_valued_gate`).
   Also `Order.Nucleus` carries `idem : j (j a) = j a` as a structure field, so every sigma/Delta typed as a
   nucleus in Lean (Autopoiesis, Bigraded) is strictly idempotent in whatever regime it is used. The
   correction cannot be adopted into the note as "proved"; either the library's rung assignment or the
   correction has to change, and that is the founder's call (section 4).
4. **The "tower" of section 4 item 5 is not what `BigradedTower` is.** `BigradedTower` stacks a K4-indexed
   family of nuclear squares on the single algebra `Reading.heytingK`. It has no levels and no seeding. The
   lap structure the note wants is `RegimeCycle.Turn`/`dervish`, which the note never cites; there a lap adds a
   fixed residue to a tally record, and the balanced case accumulates contradiction mass.
5. **Section 0 contains a false "no `sorry`".** `L/Closure/Collatz/SemigroupGap.lean:406`:
   `theorem parentBarrierGap_holds : ParentBarrierGap := by sorry`.
6. **No node loop exists in the code.** `runMachineAction` has four actions (tell, settle, questions,
   generate), its `effects` list is always empty, its `tell` accepts caller-supplied readings, and no AOE node
   loop was found in this tree.

## 1. Section 0 ("The request, read as words that mean something")

**C0.1** "dependency-free Lean 4, about 271 files, no `sorry`, no axioms past `Mark` and `Articulating`".

- "dependency-free": CONFIRMED. `lake-manifest.json` has `"packages": []`; `lakefile.toml` description:
  "A dependency-free Lean 4 library ... under an axiom law that admits only Quot.sound."
- "about 271 files": CONFIRMED. `find Obsmetrologia -name '*.lean' | wc -l` gives 271.
- "no `sorry`": WRONG. `L/Closure/Collatz/SemigroupGap.lean:406`, docstring "Frontier hole. The parent-barrier
  semigroup gap itself ... not yet proved", body `by sorry`. (Other hits for the word are comments.)
- "no axioms past `Mark` and `Articulating`": WRONG as phrased. There are no `axiom` declarations; a
  line-start search finds none. `Mark` is `structure Mark where surface : String` (`L/Primitive/Mark.lean`),
  so the library is not "built from nothing" but from Lean core `String`. `Articulating` is an `inductive`
  (`L/Articulation/Articulating.lean:42`, constructors `utter`, `pair`). The accurate statement is the
  lakefile's: axiom law admitting only `Quot.sound` (and `propext` in places, per `CrossingAudit` comments).

**C0.2** "most of it kernel-checked in Obsmetrologia". QUALIFIED. Several of the statements the note builds on
are tables or flag classifiers, not derivations from closures, and say so themselves:

- `four_regime_flag_cases` (`L/Closure/Regime.lean`): the docstring ends with `-- OPEN: the corpus's
  four-regime dichotomy ... Here the flags are inputs (ClosureRegimeData), and no ordinal or closure
  determines them.` Exhaustiveness is `classify_exhaustive`, true because `classify` is a total `if`-chain.
- `spine_rank_table_descends`: `-- OPEN: that the spine's passage descends a tower of closure ordinals. Needs
  regimes derived from closures in place of the declared Stage.regime table.`
- `cohomologyVanishes` is "A table, not a computation: no H^1 is computed here."
- `gap_flags_split`: "A finite check of the declared flag tables ... the flags are not read off any closure."

**C0.3** PAM/SPOTCOMP/TDP/SHP: "PAM ... named in the 2026-05-21 SPOTCOMP note ... as 'the CPU': FOUR as the data
type, `<=k`/`<=t` comparators, ... the four cell-level generator classes as the instruction set"; TDP "category
is program"; "SHP ... is the language". CONFIRMED, spot-checked against `2026-05-21-note-on-spotcomp.md`
(section "The six subsystem-views"): "**PAM ... (the CPU)**: FOUR is the data type; <=k/<=t comparators; ...
the four cell-level morphism generator classes are the instruction set"; "**TDP ... (the bytecode/program)**:
'category is program' made operational. A SPOTCOMP program is a closure-rule set; execution is iterating Cl to
lfp"; "**SHP ... (the language)**". QUALIFIED on use: the SPOTCOMP section says the views "are not separate
systems; they are six co-present ways of reading SPOTCOMP ... all six views are co-present in every SPOTCOMP
execution." They are not layers, so the note's section 1.2 column "SPOTCOMP: PAM / TDP / SHP / MAS+TRC" assigns
co-present views to successive regimes without any statement licensing it. SPOTCOMP also labels MAS "(the
network)" and TRC "(the memory)": by the house layering (data, code, networking, systems) MAS belongs with
SignGraph, not with "SignCraft (systems)" as the note's table has it.

**C0.4** "Every term in that request names existing mathematics in this tree". QUALIFIED. The two modules the
note's tower and Lambek story need are not formalized: `plainWeave_entropy_collapse` is stated at full strength
and open (`Fibercraft/WeaveDraft.lean:198`), and the FCA-Lambek closing edge is prose. The note says as much
in sections 3.3 and 3.6; the section 0 sentence overstates relative to them.

## 2. Section 1.2: the regime-to-stage-to-cascade table (it decides sections 1.3 and 2)

The note: "The founder's cascade and the regimes line up one to one." The Lean statement it rests on:

```
def Stage.regime : Stage → ClosureRegime
  | articulating => aperiodic | predicating => transfiniteBounded
  | positing => scott        | settling => strict
```

(`L/Closure/Regime.lean`; `regimeStageBij` makes it a bijection.) This is CONFIRMED as the note's column
"spine stage (Stage.regime)". What is not in the library is the next link: that strict is "algebra", Scott
"logic", transfinite-bounded "language", aperiodic "geometry". `Regime.lean` says only: "A regime is the
character of one stage's closure; a corner (Articulating.Corner) is a value inside a stage. The two fours are
different objects and are not identified here." No Lean file uses the words algebra/logic/language/geometry as
regime names. So that link is UNSUPPORTED, and the note's own anchors test it badly:

| Lean anchor the note cites | Where it lives (stage by directory) | `Stage.regime` of that stage | Row the note puts it in |
|---|---|---|---|
| `Positing/Four`, `NucleusAndCommutingNuclei` | `Language/Positing/` | Scott | algebra (strict) |
| `Settling`, `Settling/Cones` | `Language/Settling` | strict | algebra (Settling), geometry (Cones) |
| `CurryHowardLambek`, `Hyperdoctrine`, `Equality`, `Syntax`, `FregeanFourChu` | `Language/Predicating/` | transfinite-bounded | logic (Scott) or language |
| `LightCone` | `Language/Positing/` | Scott | geometry (aperiodic) |
| `Closure/RuleSystem` | `Closure/`, theorems conditional on a 3-step fixed point (below) | strict by hypothesis | logic (Scott) |
| `ChromaticLorentzian` | `AperiodicOrder/Tiling/`, but its own text: "a concrete transfinite (kappa = omega) carrier" | Scott height | geometry (aperiodic) |
| `SoficShift`, `FiniteLocalRule` | `AperiodicOrder/Tiling/`, finite transition graphs | finite base, so `classify` gives strict | language (transfinite) |

Directory placement is not a theorem, so none of these rows is refuted by location alone; but a "one to one"
claim whose own anchors fall in the wrong rung in six of eight lines has no support. In particular the library
puts CHL, hyperdoctrine and equality in the *predicating* stage, which `Stage.regime` makes transfinite-bounded;
the note calls that rung "language" and calls CHL "logic (Scott)". `Stage.positing`, the Scott rung, is
described as "evidence admitted at predicated cells, measured off a trace", which reads as the monitoring row,
not the logic row.

The note's Rosetta citation is also misread. Section 1.2: the table "'Computation (Algebra) | Logic (Language) |
Topology (Geometry) | Physics (Dynamics)' ... supports the same order." The source
(`2026-04-06-note-on-pws-core-systems-design.md`) has four columns of which **logic and language are one column**
(header "Logic (Language)") and the fourth is **Dynamics**, not a separate "language" step; its text says
"Settlement = cut elimination = sheafification = equilibration. These aren't metaphors, they're the SAME
operation in four registers." Four registers of one operation, co-present, not an ordered cascade, and no
regime appears in it. CONFIRMED for the quoted equation chain ("Term normalization | Cut elimination |
Gluing/sheafification | Equilibration"); WRONG that it supports a logic-then-language order.

The distal-bypass note (`.../561-group-services-section/.../2026/07/16/2026-07-16-the-distal-bypass.md`) does
give "ordered thermodynamic < causal < quantum < kinetic (strict, Scott, transfinite, aperiodic)": CONFIRMED as
an ordering, and it matches `ClosureRegime.rank` (0 to 3). But the same passage says "Three of them have H^1 = 0 ...
The aperiodic regime alone extends the base", while `cohomologyVanishes` has transfinite-bounded `false`
(`obstruction_valued_iff`: valued exactly at transfinite-bounded and aperiodic). The note quotes the ordering and
the Lean table in neighbouring sentences (section 1.1) without flagging that the prose and the Lean table
disagree on the third rung.

## 3. Section 1.3: "Two directions through the cascade"

**C1.3a** "The language spine (`Language/Spine.lean`) runs **articulate -> predicate -> measure -> settle**".
CONFIRMED: `Spine.run closure k trace a := runTrace closure k (a :: trace) (predicate a)`, with `runTrace`
settling `measure k trace phi`; `Spine.lean` header: "articulate ... predicate ... measuring reads the value ...
settle applies an explicit Reading.Closure". `measure` is not a `Stage` constructor; it is the work of
`Stage.positing`.

**C1.3b** "`Stage.regime` assigns those stages the regimes aperiodic -> transfinite -> Scott -> strict."
CONFIRMED (the definition above). QUALIFIED: `Spine.lean` imports no regime; the pairing is made in
`Regime.lean` section D and the spine's own regime is *declared* (`spineData` sets `finiteBase := true`;
`spine_is_strict : classify spineData = strict := rfl`; its docstring: "this holds by definition").

**C1.3c** "So the spine climbs the cascade *from geometry to algebra*." UNSUPPORTED as phrased, and the verb is
backwards relative to the library. `Regime.lean`: "Read along the spine the regime descends, each stage's
characteristic closure tamer than the one before it"; `RegimeCycle`: "Read as a passage, the spine descends the
tower". The library has a rank (strict 0, Scott 1, transfinite 2, aperiodic 3) and the spine goes 3 to 0. To say
that is "geometry to algebra" one needs the unproved identification of rung 3 with geometry and rung 0 with
algebra (section 2 above). The statement the library does make is: `spine_rank_table_descends (s) (h : s <>
settling) : s.next.regime.rank + 1 = s.regime.rank`, proved by `cases s <;> rfl` and labelled OPEN above.

**C1.3d** "no caller supplies a reading: `measure_nil_knowledgeLeast`, `run_pos` 'what is articulated is told
for'". Names and the quoted docstring CONFIRMED (`L/Language/Spine.lean`:
`measure_nil_knowledgeLeast`, `run_pos`, docstring "**What is articulated is told for.**"). QUALIFIED:

- The same file defines `posit` ("admits a caller-supplied FOUR reading") and `runSupplied`, which does accept
  a supplied reading; `run` is the measured composite, `runSupplied` its unmeasured sibling.
- `run` still takes a caller-supplied `closure : Reading.Closure` and a `k : Contradictory`; `Closure` carries
  `idem` as a field (`Reading.settle_fixed`), so "settles to a finite fixed point" is by hypothesis of the
  argument, not derived from the regime.

**C1.3e** "Realization runs the other way, *from algebra to geometry*: settled readings present a logic ...; the
logic generates a language ...; the language tiles a geometry." UNSUPPORTED. What the library has in that
direction is `Stage.next settling = articulating` and `return_rank_table_ascends`
(`settling.regime = strict`, `settling.next.regime = aperiodic`, ranks 0 and 3, all `rfl`): one jump from rung 0
to rung 3, no stop at Scott or transfinite-bounded, again a table lookup. The remaining two steps
(settled readings "present a logic", logic "generates a language") correspond to no theorem; the nearest
candidates (FCA closure as settling closure, `FCALambekCircle` edge 1; Lambek edge 3) are named in the note's
own section 3 and the closing edge is stated there as "not formalized". The note labels the MAPE-K reading "(not
yet a theorem)" but states the direction itself as fact.

**C1.3f** "**Language is downstream of logic** in this direction." UNSUPPORTED. In the Lean tree the logic modules
(`CurryHowardLambek`, `Hyperdoctrine`, `Equality`) live inside `Language/Predicating/`; there is no import or
theorem making language (sofic/SFT, `AperiodicOrder/Tiling`) depend on them (a search of
`SoficShift.lean`/`FiniteLocalRule.lean` for any use of the regime or of the Predicating logic finds none).
This is the founder's frame, flagged as such in the task, and the note is right to adopt it; it should be
presented as a frame to be proved (note section 6 item 5 does this), not as something the library states.

**C1.3g** "perception is the spine, action is the cascade, and the README's MAPE-K loop is the two together".
Marked "Reading (not yet a theorem)" by the note: fair. One structural point the note misses: the library's
single object is a **closed** cycle with a spiral lift (`Turn`, `advance`, `advance_four`). The spine already
closes through its residue; splitting it into a perceiving spine and an acting cascade replaces one proved
four-cycle by two unproved halves.

## 4. Section 1.4 (sigma/Delta), because section 2 and section 4 item 5 inherit it

**C1.4a** Founder's correction: "sigma and Delta are idempotent **only in the finite regime**; in the Scott
regime they are KZ-lax idempotent, and that is why there is a finite regime at all." Checked against:

- `Reading.kz_iff_strict` (`L/Closure/Monad.lean`): for monotone-inflationary `f` on `Reading`,
  `(forall a, KLE (f (f a)) (f a)) <-> (forall a, f (f a) = f a)`. Its docstring: "the projection of
  lax-idempotence + Scott-continuity => strict idempotence ... the 2-cell mu only survives where antisymmetry
  fails (the aperiodic regime, kappa >= omega_1 ...)".
- `mu_identity_of_cohomologyVanishes (d) (hcoh : cohomologyVanishes (classify d) = true) (v) :
  closureOp M (closureOp M v) = closureOp M v` (`L/Closure/Monad/KZ.lean`): `mu` is the identity on exactly the
  strict and Scott regimes ("mu collapses to the identity exactly where the KZ diamond carries no H^1").
- `no_laxSlack_of_antisymm` (`L/Closure/Monad/LaxSlack.lean`): on any antisymmetric `PreValueCategory`, no
  `LaxVClosure` has lax slack anywhere. `closureOp_no_lax_slack`: the modal closure on valuations over an
  arbitrary (possibly infinite) cell set has none.
- `mu_content_exactly_at_valued_gate`: the one inhabited lax slack, `Record.tally_lax_slack`, is the
  "aperiodic corner"; `cohomologyVanishes aperiodic = false`; the carrier is the germ preorder, not
  antisymmetric (`Record.germ_order_not_antisymm`).
- `ChromaticLorentzian.chromatic_lorentzian_classification` (`L/AperiodicOrder/Tiling/ChromaticLorentzian.lean`)
  is the Lean's Scott-height (kappa = omega) carrier: its *step* is non-idempotent (`step_not_idempotent`), but
  the closure that matters, `settle`, is the past-closure with absorption `settle (step x) = settle x`. A
  non-idempotent single step is not a KZ-lax closure.

Verdict: the half "sigma and Delta are strictly idempotent in the finite regime" is CONFIRMED (they are
`Order.Nucleus` values, whose structure field is `idem : forall a, j (j a) = j a`,
`L/Language/Positing/NucleusAndCommutingNuclei.lean:125`). The half "in the Scott regime they are KZ-lax" is
WRONG against the library as it stands: the library proves strict idempotence for closures in the Scott regime
and puts lax slack at the aperiodic rung. The motivating clause ("that is why there is a finite regime at all")
is UNSUPPORTED: `kz_iff_strict` says the strict/lax distinction is antisymmetry, not finiteness; finiteness
enters via `finiteBase` in `ClosureRegimeData`, a flag.

To avoid this being read as a rejection of the founder: the cleanest consistent options are (i) re-file
`tally_lax_slack` and the germ preorder at the Scott rung, which would also require changing
`regime_tower` and `unattained_settling_gate`, whose Scott rung (`Record.succPos`, "no fixed point anywhere")
currently has `hasFixedPoint = false` (`RegimeGate.scott_no_fixed_point`); or (ii) keep the library and say the
note's correction applies to the aperiodic regime. Which is intended is not decidable from the code.

**C1.4b** "the aperiodic regime carries two commuting nuclei filtered **by history**: `sigma_t` saturating
(past-facing: the largest element whose restriction profile across proper sub-histories is below that of `a`)
and `Delta_t` transferring". QUALIFIED. `Autopoiesis.lean` defines `saturating Q := Q.j1`,
`transferring Q := Q.j2` for an abstract `Order.CommutingNuclei H`; the "largest element ..." and "least element
... witnessed in every one-step extension" formulas appear only in the module docstring. Lean does not construct
history nuclei. `nuclear_autopoiesis_cell` is proved for *any* Heyting algebra with commuting nuclei, so it
holds equally in the strict regime (its worked instance is `readingNuclearPair` on FOUR, `joinK` nuclei).
The link to aperiodicity is `HistorySeparationForcesAperiodicity`, "Stated without proof (open)"; the
companion theorem `varying_family_beside_aperiodic_witness` says its three conjuncts have "no map between them".

**C1.4c** "R1 `sigma(sigma(M)) -> sigma(M)` and R2 ... In the finite regime those rewrites are equalities; in the
Scott regime they are the multiplication 2-cells, and the strongly normalizing, confluent R1-R23 system is what
makes the lax structure coherent." WRONG as an account of the source. The Rosetta note, same section, says "Why
exactly four: The submonoid M(sigma,Delta) under composition has exactly four elements: {id, sigma, Delta, pi}.
Forced by idempotence + commutativity. Without commutativity, alternating compositions don't stabilize". The
reduction system is written for nuclei (idempotent), and the four-element monoid depends on idempotence. Read
as 2-cells of a lax monad it would not give four elements. Also, "strongly normalizing, confluent" is a prose
claim in a 2026-04-06 "mined" note, not a Lean theorem; no `R1`-`R23` appears in the Lean tree (the Lean has
`NuclearFormula.lean`, whose relation to the R-system was not established here).

**C1.4d** "Three different pairs ... must not be identified without proof." CONFIRMED and well-taken, with one
refinement: pair 2 (`Reading.joinSquare`) and pair 1 (Autopoiesis) share a *type* (`Order.CommutingNuclei`) and
`Autopoiesis.history_filtration_distinct_from_value_order` proves only that both satisfy the same quartet law
via different data. A fourth object with the same name, the Rosetta note's sigma ("Saturate") as logic and
Delta ("Transfer") as category theory, is the CHL-column reading; it is not any of the three. For pair 3 the
note says its "idempotence is asserted by construction and ... commutation is asserted numerically in tests".
QUALIFIED: `S/signcraft/test/inference/commutation.test.mjs:38-60` measures both commutation and `(sigma Delta)^2
= sigma Delta` on random contexts ("assert.equal(squareHolds, N ... settle's fixed point depends on it"); and
`settle` in `nuclei.mjs` terminates by `valuationEq(cur, s.v)` and throws on non-convergence within `maxSteps`,
so it does not assume idempotence. The comment at the top of `nuclei.mjs` ("they are not the truth-order
quartet of FiberAlgebra.lean ... must never be identified") is quoted fairly.

## 5. Section 2: the README loop, row by row

Quote (README, lines 12-17): "paraconsistent transfinitely-valued data-monitoring", "content-addressed
evidence-substrate analyzing", "coordination-free deductive-truth planning", "database-proof executing",
"recursively-self-improving knowledge"; mention of MAPE-K is on line 10. The README names MAPE-K once and
does not map the four service names to M, A, P, E; that mapping (monitoring, analyzing, planning, executing,
knowledge) is the obvious reading and fine, but it is the note's.

### Row 1: data-monitoring

Claim: "the spine, geometry -> algebra; the value is FOUR (paraconsistent: top is inhabited) and carries its closure
ordinal / regime (transfinitely valued); articulate, predicate, measure, settle; regime classification of each
settling" with anchors `Spine`, `Measure`, `Regime`, `ClosureOrdinal`, `Closure/Ordinal*`.

- "the value is FOUR ... top is inhabited": CONFIRMED (`Reading.kTop`; `run_pos`; the Evidence module keeps both
  witnesses, "absurd reached, witnesses kept", `meetK_not_measured`).
- "spine, geometry -> algebra": see C1.3c, UNSUPPORTED as phrased.
- "carries its closure ordinal / regime": UNSUPPORTED. The spine returns `Meme := <cell, reading>`
  (`Spine.posit`); neither type has a regime field. `ClosureRegimeData` is a separate structure of three Bool
  flags "inputs, not read off a closure or an ordinal". The only bridge from an actual ordinal to the flags is
  `DifferentialBypass.ordinal : kappa.isFinite = d.finiteBase`, one field, tied to one flag (`L/Cohomology/DifferentialBypass.lean`).
  Needed: a reading type (or a `Meme` extension) paired with a `ClosureRegime`, plus passage laws; the note
  correctly lists this as section 6 item 7.
- "transfinitely valued": QUALIFIED. FOUR is not transfinite-valued. The ordinal-valued carriers are `ORecord`
  (`omegaPos`) and `Closure.Ordinal`; the library files `ORecord` at the transfinite-bounded rung
  (`regime_tower`), where it settles "exactly at stage omega". But `Regime.lean` header defines Scott as
  `kappa = omega` and transfinite-bounded as `omega < kappa < omega_1`. The library therefore has an internal
  tension (a stage-omega fixed point filed above Scott) which the note does not mention and inherits.

### Row 2: evidence-substrate analyzing

Claim: "algebra; cells with witness sets, addressed by `ni` (canonical CBOR, SHA-256, RFC 6920); FCA over the
evidence" with anchors `FregeanFourChu`, `FormalConceptAnalysis`, `Evidence`, `Record`.

- Witness sets and lossless evidence: CONFIRMED (`L/Language/Positing/Evidence.lean`: "`Valued` bundles a
  `value : Reading` with `evidence : Slot x Slot`"; `evidence_accumulates_joinK`).
- Content addressing: UNSUPPORTED in Lean. A search for sha, content-address, RFC 6920, cbor in the Lean tree
  finds nothing. It exists only in JS (`computer-content-engineering-services-section/semiotic-content-address`,
  imported by `S/signcraft/src/settle.mjs:25`). The Lean has nothing to say about address stability.
- Regime: the row says "algebra" (strict), but section 3.1 of the same note calls FCA "the algebra -> logic
  passage". Internally inconsistent. Also `Record` is the Scott-rung carrier of `regime_tower` (the topless
  tally record, with `Record.succPos` having no fixed point), so its anchor contradicts the strict row.

### Row 3: deductive-truth planning

Claim: "logic, in the strict and Scott regimes where `H^1 = 0` (CALM: monotone deduction needs no
coordination); closure-rule systems; the plan is a derivation" with `RuleSystem` (`generated_closure_is_least`,
`immediate_consequence_lfp`), `Sheaf`, `CRDTCohomologicalCALM`.

- Theorem names: CONFIRMED to exist (`L/Closure/RuleSystem.lean:320`, `:351`; `L/Cohomology/CRDTCohomologicalCALM.lean`,
  a module, not a theorem).
- "T_S least fixed point": QUALIFIED strongly. The statements are conditional:
  `immediate_consequence_lfp (S) (v) (hfix : SClosed S (clS S v))`, where `clS S v := Tstep S (Tstep S (Tstep S v))`
  is the **three-fold** iterate. The module says so: "For a system whose three-fold iterate is already a fixed
  point (the finite-reading regime)", and "The general Datalog cascade across infinitely many cells reaches its
  fixed point at kappa = omega ...; that ordinal bound is ClosureOrdinal/ClosureOrdinalRegime territory." So the
  RuleSystem theorems are the **strict** regime, by hypothesis. The Scott content is
  `Closure.Scott.finite_antecedent_scott_continuous` (`L/Closure/Scott.lean:298`), stated for one `fire ante
  concl` over a `DirectedFamily` of finite lists, not for the omega-chain of a rule system.
- "`H^1 = 0`": QUALIFIED. `settling_cohomology_h1_vanishes` (`L/Cohomology/SettlingCohomologyH1.lean:238`) carries
  the regime hypothesis `hr` but its own text says "h1_vanishes ... hold **unconditionally** in this Cech model
  ... `hr` ... gates only the regime-dichotomy conjunct". So `H^1 = 0` is proved for a constant-local-family
  model in every regime; the regime gating is the table. The file adds "The genuine, regime-dependent
  phenomenon, cl-inv actually nonzero, is not witnessed here". Separately `LandauerEntropy.landauer_zero_iff_reversible`
  gives a *different* `H^1` (`CoverNerve.H1rank`) that is nonzero exactly for cyclic nerves of any size; no
  theorem relates that rank to the regime table. The note uses "`H^1 = 0`" for both.
- "CALM: monotone deduction needs no coordination": CONFIRMED in the form the library states (`Valuation.joinK`
  commutative, associative, idempotent; `section_lub`; `calm_monotone_coordination_free`). It holds because
  the knowledge join is a semilattice, a regime-independent fact, so it does not distinguish strict from
  Scott or from any other rung.
- "the plan is a derivation": UNSUPPORTED. `RuleSystem` fires cells to readings; there is no derivation
  *object* in it (witnesses are not terms). Derivation terms are in `CurryHowardLambek` (STLC), whose
  link to `RuleSystem` is not stated anywhere.

### Row 4: database-proof executing

Claim: "logic -> language -> geometry: execute derivations over the history database; every effect carries its
proof; `T_S` lfp over the history; SignCraft history and settlement" with `RuleSystem`, `Settlement`, `Site/*`.

- UNSUPPORTED in Lean: the library has no notion of effect, execution, or database. `Settlement.lean` and
  `Site/*` are about a site paired with content admitted by the site's law. A theorem would have to state that
  a history (a site of cells) carries a rule-system lfp and that each admitted effect is a derivation of its
  cell; not found.
- UNSUPPORTED in code, contradicted at the kernel: `runMachineAction` (`S/signcraft/src/inference/kernel.mjs`)
  returns `effects: Object.freeze([])` in both `accepted` and `refusal`; every branch has an empty effect list
  by construction. The `settle` branch appends a `receipt` `{kind, steps, ledger, adapted}` to the journal:
  counts and a free-energy ledger, not a derivation term; the `generate` branch appends `generated.wit`. So
  "every effect carries its proof" has no referent yet: there are no effects, and the receipts are not proofs.
- Regime path "logic -> language -> geometry" is the note's, see section 2.

### Row 5: recursively-self-improving knowledge

Claim: "geometry -> algebra at the next level: the aperiodic regime extends the base irreversibly; the doubly
quiescent layer `A* = Fix pi` seeds the next level's free carrier; tower fiber seeding ('H*_t at level n = H_t
at level n+1', Rosetta note); the settlement spiral" with `BigradedTower`, `Autopoiesis`, `SettlementSpiral`
(honest slice), `HistorySeparationForcesAperiodicity` (open). See section 6 for the full check; summary:

- `A* = Fix pi`, "doubly quiescent": CONFIRMED as definition (`Autopoiesis.autopoieticCore`, `autopoieticCore_iff`).
- "seeds the next level's free carrier": UNSUPPORTED in Lean; the sentence is verbatim in the Rosetta prose
  ("Tower Fiber Seeding: H*_t at level n = H_t at level n+1 ... Each level is a fresh CHL orbit with new nuclei")
  and nowhere in `.lean` (search for "level n+1", "next level", "fiber seeding" returns only unrelated docstrings).
- `BigradedTower` as the anchor: WRONG (section 6).
- `SettlementSpiral` as the anchor: WRONG as to subject. The module is the Padovan/Fibonacci/Tribonacci/n-bonacci
  growth tower and substitution-matrix row-sums (`padovanCount_eq`, `fibonacciCount_eq`, `nbonacci_le_two_pow`,
  `inflationOrder_holds`). It explicitly disavows the regime-to-Pisot identification, and records that the legacy
  strict row "is actively mistaken" (`strictRowIsDisavowed`): "Padovan and Fibonacci settlings are the *same*
  regime (aperiodic)". It says nothing about nuclei, `A*`, or levels. The note's "(honest slice)" is accurate;
  the module just is not about this. The Lean for laps is `Closure/RegimeCycle.lean`.
- `HistorySeparationForcesAperiodicity` is open: CONFIRMED.
- "the aperiodic regime extends the base irreversibly": supported by the distal-bypass prose; in Lean the
  nearest statement is `residue_dichotomy` (nonzero residue: no fixed point, never repeats, one germ class).
  UNSUPPORTED as "extends the base": `finiteBase` is a flag, not a thing that grows.

### Row 6: language-systems multiplexer

Claim: "language, plural: many languages as factor maps of one logic, translated by Chu morphisms; the language
fibers over `@lenticule-science/communicating`" with `FiniteLocalRule.factor_of_sft_is_sofic`,
`SoficImage.factor`, `LinearLogicChu`, `FregeanFourChu`.

- Names: CONFIRMED (`FiniteLocalRule.lean:94`: `factor_of_sft_is_sofic (step : Graph A) (pi : A -> B) (p)
  (hp : Path step p) : SoficImage step pi (p.map pi) := <p, hp, rfl>`; `SoficShift.lean:49,77`).
- What they say: a letter-to-letter map applied to a path of a finite graph, with the witness the path itself.
  Proof is `rfl`-level. That a natural language is such a factor image of "a logic's types" is UNSUPPORTED:
  no Lean statement mentions logic types as an SFT, the Lambek calculus as generating a shift, or any natural
  language. Needed: an SFT whose paths are derivations of a residuated logic (the note's section 6 item 5)
  and a letter map to tokens.
- "translated by Chu morphisms ... adjointness is fidelity": UNSUPPORTED; `LinearLogicChu` has Chu spaces over FOUR with
  tensor/hom residuation, no translation fidelity statement was found.
- Regime: a finite transition graph has finite base, hence `classify` = strict. The row's regime "language,
  transfinite-bounded" has no connection to sofic shifts in any Lean statement.

## 6. Section 4 item 5 ("The tower")

Quote: "**The tower.** The aperiodic regime extends the base; the doubly quiescent layer of one level is the free
carrier of the next. Each lap through the cascade lifts one level. That is 'recursively-self-improving
knowledge', and it is why the machine never repeats a lap."

1. "The aperiodic regime extends the base": UNSUPPORTED in Lean (prose in distal-bypass note only).
2. "the doubly quiescent layer of one level is the free carrier of the next": UNSUPPORTED. Source is Rosetta
   prose. Lean `autopoieticCore` is `Fix pi` inside one Heyting algebra `H`; there is no function from a
   Heyting algebra and a commuting pair to the next algebra. `BigradedTower.lean` is, in its own words, "a
   K4-graded family of nuclear quartets" with `tower : K4 -> NuclearSquare Reading.heytingK`: every grade is a
   square on the **same** `heytingK`, `gradePoles` assigns pole pairs `(kBot,kBot)`, `(tTop,kBot)`, `(tBot,kBot)`,
   `(kTop,kBot)`. The grading axes are knowledge and truth (`tower_bigrading_is_two_orders`). "Tower" here means
   four grades stacked side by side. Citing it as the level-lifting tower (as section 2 does) is WRONG.
3. "Each lap through the cascade lifts one level": QUALIFIED. The Lean has laps (`Turn.lap`, `advance_four`:
   four steps give `<t.lap + 1, t.stage>`) and what a lap does: `iterSeq_residueBump` ("k laps add k copies of
   the residue"). There is no "level" type and no lifting. A lap changes the carried tally record by adding a
   fixed record `c`.
4. "the machine never repeats a lap": CONFIRMED only conditionally. `dervish (c) (s)` has three conjuncts: the
   stage returns every four steps; for `c <> Record.kBot` the carried record never returns
   (`carried ... advance^4 <> carried ...`) and stays in the seed's germ class (`DomBy` both ways); for
   `c = Record.kBot` "the spiral is a circle: every position carries the seed". `residue_dichotomy` is the
   underlying statement. So "never repeats" is a property of nonzero residue; the zero-residue lap repeats
   exactly, at stage zero.
5. "That is recursively-self-improving knowledge": UNSUPPORTED, and the Lean points elsewhere for what a lap
   accumulates. With the lemma `balanced_residue_holds_bias`, a balanced residue (told for equally as against,
   e.g. `topBump`, residue `<1,1>`) "keeps every term's truth bias fixed while the contradiction mass grows";
   `unbalanced_residue_drifts` shows an unbalanced one drifts the bias. What a lap accumulates in the library is
   residue, including contradiction mass. Calling that "self-improvement" needs a statement that the
   residue is evidence for something (a fitness, a ledger). The `nuclei.mjs` free-energy ledger
   (`ledger_total`/`closes` from `FreeEnergyLyapunov.lean`) is the nearest and is a within-lap, finite-regime
   bookkeeping.
6. Mislabel cluster: the library's `tower` words are `regime_tower` (one carrier per regime: FOUR; topless
   `Record`; completed `ORecord`; germ preorder), `BigradedTower`, `PortVershik`/`JeandelRaoSubstitutionTower`
   and `Closure/Odometer` (a Bratteli/Vershik odometer with real levels: `vershikIter_fixed_iff`,
   `tower_periodicity_dichotomy`, `vershikHull_minimal_aperiodic`). Only the last has levels in the sense the
   note wants. The note names none of these in item 5.

## 7. The paragraph "Why this is a new class and not a relabelled LLM"

Quote: "a large language model lives entirely in the language regime ... The cascade machine holds each regime
explicitly, moves upward by the spine (perception) and downward by the cascade (realization), keeps contradiction
as a value, carries a proof for every inference, settles coordination-free where `H^1 = 0`, and has its laws
checked by a kernel."

- "a large language model lives entirely in the language regime": UNSUPPORTED. There is no Lean statement
  about LLMs; and "language regime" is the transfinite-bounded rung only if C section 2's identification
  holds. A rigorous version would exhibit the LLM's computation as a closure with a computed
  `ClosureRegimeData`; the library cannot compute flags from a closure (Regime.lean, OPEN comment).
- "holds each regime explicitly": UNSUPPORTED; `ClosureRegimeData` holds flags, not regimes inside the machine.
- "moves upward by the spine ... downward by the cascade": reversed relative to the library's own words (the
  spine "descends", C1.3c), and the cascade direction is unproved (C1.3e).
- "keeps contradiction as a value": CONFIRMED in Lean (`Reading.kTop`, `Valued`) and in code
  (`obstructionsOf` in `nuclei.mjs`: contested cells "held as data, never collapsed").
- "carries a proof for every inference": UNSUPPORTED in code (section 5 row 4: receipts are counts and ledgers,
  derivation witnesses are not terms per the note's own section 5) and in Lean there is no theorem connecting
  `RuleSystem` firings to `CurryHowardLambek` terms.
- "settles coordination-free where `H^1 = 0`": see row 3; the Lean `H^1 = 0` is unconditional in the Cech
  model, and CALM here is semilattice confluence, so the qualifier "where" is vacuous in the library's sense.
- "has its laws checked by a kernel": QUALIFIED. The Lean laws are kernel-checked (barring the one `sorry` and
  the flagged OPEN statements); the JavaScript that would run them is not. The note's own section 7 plans
  Lean golden-vector conformance and says `signstuff-evm` does this "for FOUR, `Valued` and `Record`" only. For
  `nuclei.mjs` the evidence is property tests on random contexts, which is measurement, not a kernel check.

## 8. Code side: the loop in the four libraries

`S/signcraft/src/inference/kernel.mjs`, `runMachineAction(state, action)`:

- Actions: `tell`, `settle`, `questions`, `generate`; otherwise a `refusal`. No monitor/analyze/plan/execute
  phases, no scheduler, no node identity, no transport.
- `tell` requires `typeof object/attribute === "string"` and `isReading(action.reading)`. The reading is
  **caller-supplied** (`withReading(state.v, ...)` then `knowledgeJoinReading`). This is the `Spine.runSupplied`
  pattern, not `Spine.run`: the "measured, never supplied" discipline of the Lean spine is not implemented at the
  actor boundary. This confirms the note's section 5 "Algebra" bullet.
- `makeMachineState` computes `basis = lawfulBasis(ctx)` once; `settle`, `tell` and `generate` never recompute it.
  Learning (`adapt`) updates the conductance complex `cx` (Physarum flux), not the Duquenne-Guigues basis. So the
  sense of self-improvement in this code is edge-weight adaptation on a fixed theory, not extension of the
  base (the Lean aperiodic reading) and not induction of a new basis (the FCA reading of the note's 3.1).
- `effects` is the frozen empty array on every path, `generated.wit` and `settle` receipts go to `journal`: see row 4.
- `generate` takes `action.random` in [0,1) as a parameter: the actor is deterministic given the action, which is good,
  but "coordination-free deductive-truth planning" does not describe a Gibbs sampler over an enabled cone.
- `settle` in `nuclei.mjs`: the loop applies `delta` then `sigma`, stops when `valuationEq(cur, s.v)`, and throws if
  `fired > 0 && flux === 0` ("H-theorem violation") or on `maxSteps` exhaustion. On finite G x M it is the strict
  regime (the number of cells is finite and readings only rise). The code never touches the Scott regime
  (no infinite base) and carries no regime tag; `S/signcraft/src/settle.mjs` imports `closureRegimeName` and
  `regimeOfOrdinal` from metrologic, so a regime *name* is computed from an ordinal in a different module, but
  not threaded through `runMachineAction`'s state or result.
- Library dependency graph (package.json): `signcell` has no sign* dependency; `signchain` depends on `signcell`;
  `signgraph` on `signcell`, `signchain`; `signcraft` on all three. This is a data, code, networking,
  systems layering (AGENTS.md), CONFIRMED as a layering; nothing in `package.json` or any README ties it to a
  regime.
- AOE node loop: none found in this tree. A search of the engineering section for `aoe` file names and for the
  string in `S/` finds only the sentence in `S/README.md`: "AOE's communicating descent consumes these libraries
  directly." The MAPE-K loop of the README therefore has no implementation to check; the nearest actor is
  `runMachineAction` above, whose four actions cover a fragment of M and E.

## 9. What the note missed that matters for realizing the library

1. **`Closure/RegimeCycle.lean` is the library's account of the cascade/tower and is not cited.** It defines
   `Stage.next`, `ClosureRegime.rank`, `Turn`, `Turn.advance`, `residueBump`, `dervish`, `AheadCertificate`,
   `GermCertificate`, `gap_flags_split`. A realization of "laps" must be a data type with `lap` and `stage`, a
   carried record, and a residue; the zero-residue case must be a circle and nonzero a spiral.
2. **`Closure/RegimeGate.lean`** shows the naive gate fails: "cohomology vanishes iff the settled value is
   attained at a finite stage" is false at Scott. The honest gate has three flags (`hasFixedPoint`,
   `attainedAtFiniteStage`, `weaklyQuiescent`). Any code that reports a regime from a settlement needs these
   three, not one. The note's `settle.mjs` remark (non-Scott firings only at limit stages) is a one-flag view.
3. **`Closure/Monad/KZ.lean` and `Monad/LaxSlack.lean`, `Language/Positing/GermWitness.lean`,
   `Value/PreCategory.lean`.** The library's own construction of the carrier on which `mu` is non-identity
   (`PreValueCategory`, `LaxVClosure`, `HasLaxSlack`, `DomByW` the witnessed order that keeps residues as arrows
   and composes by adding bounds). This is the closest existing object to the note's "closures carry their
   2-cells", and it uses tally records, not witness sets. The note's section 6 item 1 asks for a Scott-regime
   carrier with lax sigma; the library has already proved that no such carrier can be antisymmetric, so the
   target must be restated as "a non-antisymmetric carrier at the rung where the founder wants it".
4. **`ScottFace.lean`** (`L/Cohomology/ScottFace.lean`): a packaged kappa = omega corner whose base is `Nat`,
   with `closureOrdinal_lub_of_finite_approximations` and `differential_bypass_h1_vanishes`. This is the Scott
   rung's actual statement and should be the anchor of any "logic" claim at omega.
5. **`DifferentialBypass.lean`** is not the distal bypass of the economics notes. It is the mu/nu agreement of
   closure algebra and settling coalgebra at zero increment (`MuNuAgreement`, `differential_bypass_sound`). The
   note's section 4 item 4 and section 7 item 4 ("`H^1` actually computed and handed to the distal bypass";
   "the borders the distal bypass classifies") use the economics note's meaning ("the self-financing loop that
   exploits local pricing anomalies", `2026-06-26-obsmetrologia-to-semiocenic-metastabliity.md`). No Lean
   statement classifies borders. Two things share a name; the realization must not conflate them.
6. **Two incompatible `H^1`s** (Cech constant-family in `SettlingCohomologyH1`, regime-gated by a table; the
   `CoverNerve.H1rank` cycle rank in `LandauerEntropy`/`CoordinationCohomology`, nonzero on finite cyclic
   nerves) and `cl-inv` (`clinv_dichotomy`: zero for strict/Scott). `SignGraph/cohomology.mjs` and
   `cellular-sheaf.mjs` compute something; which of the two is the target is not stated by the note.
7. **The Lean's Scott-height carriers** and what they show: `ChromaticLorentzian` (idempotent closure, non-idempotent
   step), `ScottFace`, `Record.succPos` (no fixed point). None is a lax-idempotent closure. This is the data the
   founder's correction has to meet.
8. **Internal inconsistency of regime tower assignments** noted above: `omega_ahead` (a settle at stage omega)
   is filed at the transfinite-bounded rung (`gap_flags_beside_certificates`) whereas the header defines
   kappa = omega as Scott. Whoever realizes "ahead certificates" in code needs to know which rung to tag.
9. **The `Reading.Closure` structure carries `idem` as a field** (`Reading.settle_fixed`). Every
   spine and settle theorem is therefore for strictly idempotent closures by construction; a lax or
   history-filtered closure would need a different type than `Reading.Closure`, which is what `LaxVClosure` is.
10. **`Closure/Odometer.lean`** and the Bratteli/Vershik modules are the actual "tower with levels" in Lean.
    Whether their levels correspond to anything in the note's laps is not examined here; it is the candidate to
    check before writing any "level n to level n+1" code.
11. **The Fibercraft `plainWeave_entropy_collapse` and the weave statement count**: the note is right that it
    is open; the realization must not claim two-dimensional weave coherence.

## 10. Corrections the note needs (for the next revision)

Do these in the note; none requires new mathematics.

1. Section 0: replace "no `sorry`, no axioms past `Mark` and `Articulating`" with "one `sorry`
   (`SemigroupGap.parentBarrierGap_holds`), no `axiom` declarations, axiom law Quot.sound".
2. Section 1.2: state the table as a proposal, and add the Lean `Stage.regime` stage names beside the cascade
   names. Remove "supports the same order" for the Rosetta table (logic and language are one column there, and
   Dynamics is the fourth), or quote that as the evidence against a separate logic and language step.
3. Section 1.3: state the verified fact only: the spine is the cycle `Stage.next` (period four), declared
   rank descent 3 to 0, one-step return 0 to 3 (`return_rank_table_ascends`), all tables, one OPEN. Mark
   "algebra to geometry realization through logic and language" as the founder's frame (unproved).
4. Section 1.4: the founder's correction conflicts with `mu_identity_of_cohomologyVanishes`,
   `no_laxSlack_of_antisymm`, `mu_content_exactly_at_valued_gate`. Report it as such; do not write that R1/R2 "are"
   the Scott `mu`. R-system idempotence is the four-element-monoid premise in the Rosetta source.
5. Section 2: fix the `BigradedTower` and `SettlementSpiral` citations in the self-improvement row (use
   `RegimeCycle` for laps and the Rosetta prose for seeding, labelled as prose); mark the `H^1 = 0` entries
   with "unconditional in the Cech model" and the T_S theorems with "hypothesis: three-fold iterate fixed".
6. Section 4 item 5: say "a lap adds a residue (`iterSeq_residueBump`); with nonzero residue the carried record
   never repeats (`dervish`); the level-seeding claim is Rosetta prose, not Lean".
7. New-class paragraph: remove "has its laws checked by a kernel" unless qualified by "in the Lean library"; remove
   "carries a proof for every inference" until derivation witnesses are CHL terms.

## 11. Verdict table (compact)

| Claim (location) | Verdict |
|---|---|
| 271 files; dependency-free (0) | CONFIRMED |
| no `sorry` (0) | WRONG (`SemigroupGap.lean:406`) |
| no axioms past Mark and Articulating (0) | WRONG as phrased (no axioms; Mark is a String structure) |
| PAM/TDP/SHP quotes (0) | CONFIRMED; QUALIFIED as layers (SPOTCOMP says co-present views) |
| Four regimes dichotomy "proved" (1.1) | QUALIFIED (flag classifier; ordinal bridge OPEN) |
| `Stage.regime` table (1.2/1.3) | CONFIRMED |
| strict/Scott/transfinite/aperiodic = algebra/logic/language/geometry (1.2) | UNSUPPORTED; anchors fall in other rungs |
| Rosetta "supports the same order" (1.2) | WRONG (logic = language column; Dynamics fourth; same operation in four registers) |
| spine articulate, predicate, measure, settle (1.3) | CONFIRMED |
| "spine climbs ... from geometry to algebra" (1.3) | UNSUPPORTED; library says descends |
| `measure_nil_knowledgeLeast`, `run_pos` quotes (1.3) | CONFIRMED; `runSupplied` coexists |
| realization algebra to geometry through logic, language (1.3) | UNSUPPORTED (only a one-step table return) |
| language downstream of logic (1.3) | UNSUPPORTED in Lean (frame) |
| Scott regime sigma/Delta KZ-lax (1.4) | WRONG against library; open for founder |
| sigma/Delta strictly idempotent in finite regime (1.4) | CONFIRMED (and in every regime, by `Nucleus.idem`) |
| history nuclei formulas for sigma_t, Delta_t (1.4) | QUALIFIED (docstring only; abstract nuclei in Lean) |
| R1/R2 as lax 2-cells (1.4) | WRONG as account of source (idempotence is its premise) |
| three sigma/Delta pairs not to be identified (1.4) | CONFIRMED |
| JS idempotence "asserted by construction" (1.4) | QUALIFIED (random-context test, settle loop) |
| Row 1 value is FOUR, paraconsistent | CONFIRMED |
| Row 1 carries its regime | UNSUPPORTED |
| Row 2 evidence cells, witness sets | CONFIRMED; content addressing UNSUPPORTED in Lean |
| Row 3 T_S lfp; names | CONFIRMED to exist; strict-by-hypothesis, not Scott |
| Row 3 `H^1 = 0` in strict and Scott | QUALIFIED (unconditional in Cech model; table; two `H^1`s) |
| Row 4 database-proof executing | UNSUPPORTED (no effects in Lean or code) |
| Row 5 `A*` seeds next level | UNSUPPORTED in Lean (Rosetta prose) |
| Row 5 `BigradedTower` anchor | WRONG (K4 grading on one algebra) |
| Row 5 `SettlementSpiral` anchor | WRONG subject (number theory; disavows regime map) |
| Row 5 `HistorySeparationForcesAperiodicity` open | CONFIRMED |
| Row 6 factor maps of one logic | names CONFIRMED; claim UNSUPPORTED |
| 4.5 "never repeats a lap" | CONFIRMED only for nonzero residue (`dervish`) |
| 4.5 "lifts one level"; "self-improving" | UNSUPPORTED; lap adds residue incl. contradiction mass |
| New class: contradiction as value | CONFIRMED |
| New class: proof for every inference; laws kernel-checked in the machine | UNSUPPORTED / QUALIFIED |

## 12. Sources read

Lean: `L/Closure/{Regime,RegimeGate,RegimeComposition,RegimeCycle,SettlementSpiral,Monad,RuleSystem,Scott,Odometer}.lean`,
`L/Closure/Monad/{KZ,LaxSlack}.lean`, `L/Closure/LaxSlackDiagnosis.lean`, `L/Language/Spine.lean`,
`L/Language/Positing/{BigradedTower,GermWitness,Record,Evidence,NucleusAndCommutingNuclei}.lean`,
`L/Language/Positing/Value/PreCategory.lean`, `L/AperiodicOrder/Tiling/{Autopoiesis,ChromaticLorentzian,FiniteLocalRule}.lean`,
`L/Cohomology/{LandauerEntropy,DifferentialBypass,SettlingCohomologyH1,CRDTCohomologicalCALM,ScottFace}.lean`,
`L/Site/Sheaf.lean`, `L/Primitive/Mark.lean`, `L/Articulation/Articulating.lean`; Fibercraft `WeaveDraft.lean` (name only).
Notes: the cascade note (full), the 2026-04-06 Rosetta note (full), the 2026-05-21 SPOTCOMP note (views section
and four-generator lines), the 2026-07-16 distal-bypass note (regimes and time sections). Code:
`S/signcraft/src/inference/{kernel,nuclei}.mjs`, `S/signcraft/package.json`, the other three `package.json`
files, `S/README.md`, `S/signcraft/test/inference/commutation.test.mjs` (grep). Not read: the survey notes
beyond grep, `signchain/typed-theory.mjs`, `rules.mjs`, `signgraph/cohomology.mjs`; the `R1`-`R23`
correspondence to `NuclearFormula.lean`; whether a Lean build was run (it was not; "kernel-checked" statements
here mean the repository's `.olean` build artifacts exist, not that they were re-run in this check).
