---
title: "Cascade check, logic regime: SignChain against the Lean library"
description: "Adversarial check of the logic-regime claims in the 2026-10-08 cascade note (section 1.2 logic row, 1.4 R1-R23 as KZ 2-cells, section 2 planning and executing rows, 3.2 Curry-Howard-Lambek, 3.3 Lambek, 4 item 2, 5 logic, 6 targets 1, 2, 5): each claim quoted and judged CONFIRMED, WRONG or UNSUPPORTED against the Obsmetrologia Lean statements and the SignChain and SignCraft inference code, with what the note missed."
date-created: 2026-10-08
kind: engineering-research-note
keywords:
  - adversarial-check
  - closure-regime
  - kz-lax-idempotence
  - nuclear-formula
  - curry-howard-lambek
  - lambek-calculus
  - formal-concept-analysis
  - closure-rule-system
  - signchain
  - signstuff
status: working-note-adversarial-check-of-the-logic-regime-not-yet-reviewed-by-the-founder
produced-by: adversarial-check subagent (Claude Sonnet 5.5), reading Obsmetrologia and the signstuff sources directly at monorepo HEAD 8e6723572da
---

# Cascade check, logic regime: SignChain against the Lean library

Subject: `2026-10-08-note-on-realizing-signstuff-along-the-algebra-logic-language-geometry-cascade.md`
(called "the note" below; its sections are cited as "note §").

All Lean paths are relative to
`services/science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/lib/obsmetrologia/Obsmetrologia/`
and abbreviated `Obs/`. All code paths are relative to
`services/engineering-services-section/services/computer-engineering-services-section/lib/signstuff/`
and abbreviated `SS/`. One claim below was checked by running code (the Δ monotonicity
counterexample, §2.12); everything else is a reading of statements. I did not build the Lean
library; "proved" below means "a theorem with that statement is present in the file".

## 0. Verdict in one page

1. **The founder's correction, as the note states it, is contradicted by the library it cites.**
   `Reading.kz_iff_strict` (`Obs/Closure/Monad.lean`) says that on an *antisymmetric* order KZ
   inequality and strict idempotence are *equivalent*. That is a collapse theorem, not a
   statement that Scott-regime closures are lax. `strict_regime_mu_identity`
   (`Obs/Closure/Monad/KZ.lean`) says outright that in the strict **and Scott** regimes the
   multiplication `μ` is the identity. The only inhabited non-identity `μ` in the tree is
   `Record.tally_lax_slack`, on the germ preorder of record sequences, which `Obs/Closure/Monad/LaxSlack.lean`
   (`mu_content_exactly_at_valued_gate`) and `regime_tower` (`Obs/Closure/Regime.lean`) place at the
   **aperiodic** corner. The module docstring of `Obs/Closure/Monad.lean` says the same: "the 2-cell
   μ only survives where antisymmetry fails (the aperiodic regime, κ ≥ ω₁ ...)". The Lean library
   therefore says the KZ-lax content lives where the library puts the *geometry* row, not the
   logic row. If the founder wants lax idempotence in the Scott regime, that is a **new theorem to
   prove** (a Scott-regime carrier that is not antisymmetric), not a reading of `Closure/Monad.lean`.
2. **R1-R23 are not KZ 2-cells anywhere in Lean.** They are the constructors of an inductive
   rewrite relation `Positing.NuclearFormula.Step` (`Obs/Language/Positing/NuclearFormula.lean`),
   interpreted in a Heyting algebra with `CommutingNuclei`, where `Nucleus.idem` is an *equation*
   (`Obs/Language/Positing/NucleusAndCommutingNuclei.lean`). Soundness is proved for five of the
   27 rule constructors (`interp_R1`, `interp_R2`, `interp_R3`, `interp_R4`, `interp_R7`). Strong
   normalization and confluence are explicitly "unported" (the file's own words). The Rosetta note's
   "sound, strongly normalizing, confluent" is therefore a claim with no kernel check.
3. **The note's "logic = Scott = proof-relevant" row has no Lean anchor.** No theorem assigns a
   rule system, the CHL calculus, the hyperdoctrine or FCA to a regime (`regimeOf` ignores the
   closure: `regimeOf_v_independent`, `Obs/Language/Positing/Value/Category.lean`). The theorems
   the row cites are strict-finite (`clS` is a three-fold iterate under a hypothesis `SClosed S (clS S v)`)
   or `Prop`-valued (`propOfTy`), hence proof-*irrelevant* by construction. `HasTy` is not used by any
   theorem outside its own file.
4. **Cascade direction.** Regime-to-stage assignments are CONFIRMED (`Stage.regime`). The note's
   stepwise ascent algebra to logic to language to geometry is *not* a Lean statement. The Lean
   statements are a stepwise **descent** (`spine_rank_table_descends`) and a **single jump** back
   up from strict to aperiodic (`return_rank_table_ascends`), both by definition from declared
   tables, and the descent carries an in-file `OPEN` comment.
5. **Lambek is only algebra in Lean, and only the commutative case is connected.** There is no
   sequent calculus, no derivations, and the one bridge (`lambekOfResiduated`) is for *integral
   commutative* residuated lattices where the two residuals coincide. Sofic shifts
   (`Obs/AperiodicOrder/Tiling/SoficShift.lean`) are languages of finite paths in a finite graph,
   that is regular languages, whereas Pentus's theorem the note leans on is about context-free ones.
6. **Code.** The note's account of `typed-theory.mjs` is CONFIRMED and can be sharpened (the
   closure is thin, forgetting alternative derivations). The note does not mention that the four
   inference morphisms of `typed-theory.mjs` are exactly the four generator classes of
   `Obs/Language/Predicating/Generators.lean`, that is, the *base category* of the hyperdoctrine
   rather than a would-be term calculus, so "replace it with the CHL term calculus" would discard the
   category the Lean fibration sits over. `nuclei.mjs` is worse than the note says: Δ is not monotone
   (counterexample run in §2.12), so it is not a nucleus, or even a closure operator, in any regime.

## 1. Sources actually read

Lean: `Closure/{Regime,Monad,Monad/KZ,Monad/LaxSlack,RegimeCycle,RegimeGate,Scott,RuleSystem,RuleDynamics}.lean`,
`Language/Positing/{NuclearFormula,NucleusAndCommutingNuclei,Bigraded,FiberAlgebra,Evidence,Record,Reading,Value/Category,Value/PreCategory}.lean`,
`Language/Predicating/{CurryHowardLambek,NormalOrder,Hyperdoctrine,HyperdoctrineDual,Quantifying,Equality,Syntax,Generators,Morphism}.lean`,
`Calculus/Logic/{FCALambekCircle,LambekCalculus,LinearLogicChu}.lean`, `Calculus/Order/FormalConceptAnalysis.lean`,
`AperiodicOrder/Tiling/{Autopoiesis,SoficShift}.lean`, `Settlement.lean`, `Cohomology/CRDTCohomologicalCALM.lean`,
`Dynamics/Flow/FreeEnergyLyapunov.lean` (the `rule_ledger` section), and the `ObsmetrologiaPhysicalScience/Settlements.lean` location.
Code: `SS/signchain/src/{typed-theory,rules,bilattice,log}.mjs`, `SS/signcell/src/cell.mjs` (`address` only),
`SS/signcraft/src/inference/{algebra,network,learn,kernel,nuclei,adapt,generate}.mjs`,
`computer-data-engineering-services-section/lib/metrologic/src/closure/formal-context.mjs`.
Prose: the Rosetta note (`2026-04-06-note-on-pws-core-systems-design.md`, lines 32-46, 78) and the
SPOTCOMP note (`2026-05-21-note-on-spotcomp.md`, line 1615).

## 2. Claim ledger

Labels: **CONFIRMED** (statement found; quoted or named), **WRONG** (the library or code says
otherwise), **UNSUPPORTED** (no statement found; what is needed is given). A claim with several parts
is split.

### 2.1 Note §1.2, logic row: regime

> "| **logic** | Scott | consequence operators presented by rules; proofs and their rewrites: proof-relevant | ..."

**(a) "logic" sits at "Scott" as a regime: UNSUPPORTED.**
What exists: `ClosureRegime.scott` and `Stage.regime Stage.positing = ClosureRegime.scott`
(`Obs/Closure/Regime.lean`). The stage `positing` is documented there as "evidence admitted at
predicated cells, measured off a trace; its closure is Scott-continuous". That is a description of
*measuring* (the perception side), not of consequence operators or proofs. No theorem relates
`ClosureRule.RuleSystem`, `CurryHowardLambek`, `Hyperdoctrine` or `FCALambekCircle` to a
`ClosureRegimeData`. The reason is structural: `regimeOf V T d := classify d` ignores `V` and `T`
(`regimeOf_v_independent`), and `ClosureRegimeData` is three declared Booleans
(`scottContinuous`, `finiteBase`, `countableCofinality`). A regime is declared, not computed from a
closure. `spine_rank_table_descends` carries the comment "OPEN: ... Needs regimes derived from
closures in place of the declared `Stage.regime` table."
What would be needed: a construction `ClosureRule.RuleSystem -> ClosureRegimeData` (finite-antecedent
rules give `scottContinuous`; finite cell set gives `finiteBase`), with `classify` landing in `scott`
for an infinite cell set. `Closure/Scott.lean` has the ingredient only over the finite `Reading`:
`finite_scott_continuous` and `finite_antecedent_scott_continuous` ("fire to `kTop` exactly when a
fixed finite antecedent set is covered"), both over finite carriers, and
`scott_continuous_iff_omega_regime : cohomologyVanishes (classify d) = true ↔ d.scottContinuous = true`
(which is a table identity on declared flags).

**(a') The stage-to-regime table the note quotes: CONFIRMED.**
`Stage.regime`: `articulating => aperiodic`, `predicating => transfiniteBounded`,
`positing => scott`, `settling => strict`; `regimeStageBij` makes it a bijection.

**(a'') The note's anchor files sit in the wrong stages if directory is read as stage: QUALIFICATION.**
The logic-row anchors `Hyperdoctrine`, `Equality`, `CurryHowardLambek` live under
`Language/Predicating/`, the stage whose regime is **transfinite-bounded**, which the note assigns to
*language*. The algebra-row anchors `Positing/Four`, `NucleusAndCommutingNuclei` live under
`Language/Positing/`, whose regime is **Scott**, which the note assigns to *logic*. `Hyperdoctrine.lean`
itself says it "sits at the **settling** level" (the strict stage). Directory is not a regime
theorem, so this is not WRONG, but the note's table cannot claim the library's authority for its
row assignment; the assignment is the note's (and the founder's) reading, and the library's
stage-to-theory placement points three different ways.

**(b) "consequence operators presented by rules": CONFIRMED.**
`ClosureRule.ClosureRule` (fields `antecedent : Valuation -> Bool`, `antMono`, `cell`, `reading`),
`RuleSystem := List ClosureRule`, `Tstep S v := Valuation.joinK v (fire S v)`,
`clS S v := Tstep S (Tstep S (Tstep S v))` (`Obs/Closure/RuleSystem.lean`). Note that a rule's
consequent is a single `(cell, reading)` assertion and its antecedent an opaque monotone Boolean test,
so a rule is not a sequent or a typed term.

**(c) "proofs and their rewrites: proof-relevant": WRONG as stated for the Lean; UNSUPPORTED as a design.**
- `propOfTy v φ : Ty -> Prop` (`Obs/Language/Predicating/CurryHowardLambek.lean`) is `Prop`-valued, so
  its "proofs" are proof-irrelevant. `ccc_exponential_adjunction` is proved by `⟨fun _ => rfl, fun _ => rfl⟩`
  and `ccc_prod_eta` by structure eta, because the hom-sets are propositions.
- The only lax structure in the library, `LaxVClosure` (`Obs/Language/Positing/Value/PreCategory.lean`),
  has `kz : ∀ v, V.le (op (op v)) (op v)` with `le : carrier -> carrier -> Prop`, a **thin** 2-cell. Its
  "slack" (`HasLaxSlack`) is two mutually-`≤` but unequal objects (`laxSlack_witnesses_nonantisymmetry`).
  There is no data-carrying 2-cell, no rewrite path, no coherence.
- The term calculus `Tm`/`step`/`Red` is data-carrying, but it is disconnected from the proposition
  reading (see §2.9).
What would be needed for proof-relevance: a `Type`-valued derivation of `RuleSystem` consequences
(an inductive `Derivation S v cell reading`), or a 2-category in which closure multiplication is a cell
with content. `Closure.Monad.TemporalTwoCategory` is referenced in the `KZ.lean` header as built in
`Predicating.TemporalTwoCategory`; I did not find that file in `Language/Predicating/` (the listing
has no `TemporalTwoCategory.lean`; there is `Temporal.lean`), so the header's pointer is stale or the
module lives elsewhere. Not used here.

**(d) Anchor existence: CONFIRMED with scope notes.** All of `Closure/RuleSystem`, `Hyperdoctrine`,
`Equality`, `CurryHowardLambek`, `LinearLogicChu`, `LambekCalculus`, `FCALambekCircle` exist.
Scope: `Hyperdoctrine.lean` proves adjoints, Frobenius and Beck-Chevalley only for the
bijection (`converse`) case (`galois_reindex`, `converse_adjunction`, `converse_frobenius`,
`beck_chevalley` for commuting `r`, `s`); general quantifiers are in `Quantifying.lean`
(`existsF_adjunction`, `forallF_adjunction`) for a `FiniteFibration` (fibers given as finite lists).
`Equality.lean`'s equalities are *readings* of a pair of entities (`classicalEq_eq`,
`paraconsistentEq_eq`: `if s = o then tTop/kTop else tBot/kBot`), not an identity type with an
elimination rule. `FCALambekCircle` is listed by the note in both the logic and language rows.

**(e) "SignChain (code)" and "TDP": CONFIRMED as house convention, not as mathematics.**
`AGENTS.md` fixes data, code, networking, systems; the SPOTCOMP note line 1615 reads "**TDP — Theory
Derivation Program** ... A SPOTCOMP program is a closure-rule set; execution is iterating Cl to lfp".
That TDP is "category is program" and PAM's instruction set is the four generator classes
(SPOTCOMP line 1613, 314) is itself relevant to §3.1 below.

### 2.2 Note §1.4: the correction and Monad.lean

> "The founder's correction: σ and Δ are idempotent only in the finite regime; in the Scott regime they are KZ-lax idempotent, and that is why there is a finite regime at all."

**WRONG relative to the cited Lean; flagged for the founder, not for me to overrule.**
The statements:
- `Reading.kz_iff_strict (f) (hf : ∀ a, KLE a (f a)) : (∀ a, KLE (f (f a)) (f a)) ↔ (∀ a, f (f a) = f a)`
  (`Obs/Closure/Monad.lean`). The proof uses `kle_antisymm`. It says KZ and strict **coincide** on
  `Reading`; it does not say KZ is a weaker property that Scott-regime closures enjoy.
- `closureOp_kz_iff_strict` (`Obs/Closure/Monad/KZ.lean`) is the same on `Valuation`.
- `strict_regime_mu_identity (d) (hd : classify d = strict ∨ classify d = scott) (v) : closureOp M (closureOp M v) = closureOp M v`
  — "Strict / Scott regime ⟹ μ is the identity". Its own docstring: "the lax μ only diverges from the
  identity in the transfinite-bounded and aperiodic regimes". (The proof is vacuous in the regime
  hypothesis: it holds for every `ModalFrame`; the regime is decoration.)
- `no_laxSlack_of_antisymm` (`Obs/Closure/Monad/LaxSlack.lean`): on any antisymmetric `PreValueCategory`,
  `¬ HasLaxSlack T v`, for every closure, at every regime.
- `mu_content_exactly_at_valued_gate`: antisymmetric `ModalFrame` valuations have identity `μ` and cannot
  carry slack at any regime; the germ carrier has `HasLaxSlack Record.tallyLaxClosure Record.germPreValue.bot`
  at the declared **aperiodic** corner (`cohomologyVanishes ClosureRegime.aperiodic = false`).
- The Scott-regime witness in `regime_tower` is the bare `Record` with `succPos`, and
  `Record.kle_antisymm` holds there. So even the library's own Scott carrier is antisymmetric, and any
  closure on it is strict by `no_laxSlack_of_antisymm`.
Consequence: "σ,Δ are KZ-lax in the Scott regime" has no model in Obsmetrologia. What the library
supports is: **strict idempotence is forced on every antisymmetric carrier in every regime; lax
slack requires a non-antisymmetric carrier, and the one built is aperiodic.** Why a finite regime
exists, as far as the library says, is `Reading.strict_finite`/`settles_by_three` (finite lattice,
`κ ≤ 3`), and the Scott regime's distinguishing feature in `regime_tower` is an inflationary monotone
map with no fixed point at all (`Record.iter_succPos_ne`, `scott_no_fixed_point`), not laxness.
What would make the founder's statement true: a new `PreValueCategory` that is non-antisymmetric yet
classified Scott by a derived (not declared) `ClosureRegimeData`, with a lax *nucleus* (inflationary,
monotone, KZ, meet-preserving up to the order) on it. Nothing of the kind is in the tree.

Also relevant: the KZ theorems are about the single closure `Cl = closureOp M = □∘◇`
(`Obs/Closure/Modal.lean`: `closureOp v := necessitate M (possibilize M v)`), not about the nuclear pair
σ, Δ. The `Monad.lean` docstring asserts the two are "met here as the closure's KZ-diamond", but no
theorem in `Monad.lean`, `Monad/KZ.lean` or `Monad/LaxSlack.lean` mentions `NuclearSquare` or `CommutingNuclei`.

> "`kz_iff_strict`: **on the antisymmetric knowledge order**, the KZ inequality `f (f a) ≤ₖ f a` is equivalent to strict idempotence."

**CONFIRMED** (exact: the statement above).

> "Closure/Monad.lean: the closure 2-monad `Cl` is KZ (Kock–Zöberlein), lax-idempotent: `μ ⊣ η_Cl` with identity counit, so being an algebra is a property, not data."

**CONFIRMED as docstring, UNSUPPORTED as theorem.** The module header says it. The theorems are
1-categorical: `Reading.mult` and `Reading.counit_triangle` both have statement `c.op (c.op v) = c.op v`
and proof `c.idem v`; `Reading.Closure` and `VClosure` bundle `idem` as a **field equation**
(`idem : ∀ v, op (op v) = op v`, `Obs/Language/Positing/Value/Category.lean`). No adjunction `μ ⊣ η_Cl`
is stated. The K2 "property not data" is `closure_algebra_property_like` and is proved by `rfl` on a
`Prop` structure over a poset.

> "`NucleusAndCommutingNuclei.lean`: a nucleus is extensive, idempotent, meet-preserving; two commuting nuclei make `π = j₁ ∘ j₂` a nucleus with `Fix π = Fix j₁ ∩ Fix j₂`"

**CONFIRMED.** `structure Nucleus` fields `infl`, `idem : ∀ a, j (j a) = j a`, `meet`; `CommutingNuclei`
with `comm`; `compNucleus`, `fix_pi_iff`. Note again `idem` is an equation field: every nucleus in the
tree, including every instance of `Autopoiesis.saturating`, is strictly idempotent *by definition of the
structure*. A KZ-lax σ cannot be an `Order.Nucleus`.

> "`AperiodicOrder/Tiling/Autopoiesis.lean`: ... `σ_t` saturating (past-facing: the largest element whose restriction profile across proper sub-histories is below that of `a`) and `Δ_t` transferring (future-facing: the least element already witnessed in every independent one-step extension)."

**CONFIRMED as docstring; UNSUPPORTED as Lean content.** The file's definitions are
`def saturating (Q : CommutingNuclei H) : Nucleus H := Q.j1` and `def transferring ... := Q.j2`. The
history formulas `σ_t(a) = ⋁{ b | ρ_{t₀}(b) ≤ ρ_{t₀}(a) ∀ t₀<t }` exist only in the comment. The
docstring also says the aperiodic regime carries "all 2-cell information of the KZ diamond" — in
the aperiodic regime, again not Scott.

### 2.3 Note §1.4: the reconciliation paragraph

> "on **bare readings** the knowledge order is a finite poset, antisymmetric, so KZ collapses to strict; that is the algebra, proof-irrelevant."

**CONFIRMED** (`Reading.kz_iff_strict`, `Reading.kle_antisymm`).

> "On **witnessed** carriers (a cell with its for/against witness sets, a derivation term, a `CValuation`) two objects with the same reading are different data, antisymmetry fails as data, and re-closing is related to closing by a 2-cell, not an equation."

**UNSUPPORTED, and the mechanism is probably wrong.**
- `Valued` (`Obs/Language/Positing/Evidence.lean`) is `value : Reading` plus `evidence : Slot × Slot`;
  the file defines `presence`, `Measured`, `joinK`, `meetK`, `negate`, `presumeFree`, but **no order on
  `Valued`**, so there is no antisymmetry to fail.
- In the code the witness order is *set inclusion*: `knowledgeLeq` and `truthLeq` in
  `SS/signchain/src/bilattice.mjs` compare witness sets by `includes`, which is antisymmetric on sets.
  Cells are deduplicated by `cellSet`. So the implemented witnessed order is a partial order.
- The only antisymmetry failure in Lean is the germ preorder `Record.DomBy` on *sequences of records*
  under bounded-difference domination (`germ_order_not_antisymm`: `fun n => ⟨n,0⟩` and `fun n => ⟨n+1,0⟩`).
  That is an asymptotic equivalence, carries no witnesses and has nothing to do with derivation terms.
- `CValuation` is defined in `Obs/Language/Positing/Measure.lean` (value plus evidence at every cell)
  and likewise has no stated order whose antisymmetry fails.
- A derivation-term carrier (`Tm` with `Red`) would give a preorder with mutual reducibility only if
  one quotients by reachability; `Tm` is untyped and `Red` is confluent but not symmetric, so mutual
  reducibility between distinct terms exists only for divergent or looping terms (for example Ω under the
  untyped `step`), which is not the situation described.
What would be needed: define the ordered carrier (say, derivations ordered by "is a reduct of" or
"is proof-embedded in") and prove the antisymmetry failure; then show the closure on it is `LaxVClosure`.
Until then the proof-relevance story for σ is the note's hypothesis.

> "The Rosetta note's reduction system makes the 2-cells concrete: R1 `σ(σ(M)) → σ(M)` and R2 `Δ(Δ(M)) → Δ(M)` are written as **oriented rewrites**, and R7 `σ(Δ(M)) → Δ(σ(M))` is called CHL normalization."

**CONFIRMED as prose, with one WRONG implication.** `NuclearFormula.Step` has `R1 (M) : Step (Saturate (Saturate M)) (Saturate M)`, `R2`, and
`R7 (M) : Step (Saturate (Transfer M)) (Transfer (Saturate M))`, so the orientation is right, and the
Rosetta note line 78 says "R7 IS CHL normalization". But `NuclearFormula.lean` imports only
`NucleusAndCommutingNuclei`; there is no import or theorem relating `NuclearFormula` to
`Predicating.CurryHowardLambek`. R7 is a commutation rewrite of two modal operators on Heyting-modal
formulas; CHL normalization in the Lean is β/projection on `Tm`. They are different rewriting systems
on different term languages. "Makes the 2-cells concrete" does not follow: an oriented rewrite is not
a 2-cell unless a 2-category is built whose cells it presents.

> "In the finite regime those rewrites are equalities; in the Scott regime they are the multiplication 2-cells"

**First half CONFIRMED in a stronger form; second half UNSUPPORTED (and contradicted, §2.2).**
`interp_R1 : interp Q rho (Saturate (Saturate M)) = interp Q rho (Saturate M) := Q.j1.idem _` is an
equality for **every** `HeytingAlgebra` with `CommutingNuclei`, finite or not. So R1/R2 are equalities
wherever the nuclei are `Order.Nucleus`, in every regime for which a nucleus exists. Interpreting them
as multiplication 2-cells needs a different semantic structure (lax nuclei), which does not exist.

> "the strongly normalizing, confluent R1–R23 system is what makes the lax structure coherent."

**UNSUPPORTED on every count.**
- *Counting.* The `Step` inductive has the root rules R1-R11, R12, R13, R12s, R13s, R14-R17, R18, R18',
  R19, R19', R20-R23: 27 root constructors plus congruence closure; "R1-R23" is the archive's
  name, not the Lean's count.
- *Soundness.* Only `interp_R1`, `interp_R2`, `interp_R3` (`Q.j1.meet`), `interp_R4` (`Q.j2.meet`) and
  `interp_R7` (`Q.comm`) are stated. Nothing for R5, R6, R8-R23. (By hand the others look sound
  using nucleus meet-preservation and `comm`; for example R8 `j₁(j₁M ∨ N) = j₁(M ∨ N)` follows from
  monotonicity and idempotence. That is my reading, not a Lean fact.)
- *Termination.* The file defines `NormalForm`, `modalCount`, `transferCount`, `entanglement`, `nuclearW`
  and proves `nuclearW_R3_decreases`, `nuclearW_R4_decreases`, `nuclearW_R7_preserved`, `entanglement_R7`.
  The docstring says: "This file proves the numeric measure lemmas that are independent of the **unported
  confluence argument**." No `Step`-decreases-measure theorem for all rules, no well-foundedness, no
  strong normalization, no critical-pair analysis, no confluence. By hand each non-R7 root rule I checked
  (R1, R5, R8, R12, R20) strictly decreases `nuclearW`, and R7 preserves it while strictly decreasing
  `entanglement`, so a lexicographic termination proof looks routine; it is unwritten.
- *Coherence.* The system is an equational presentation of strict nuclei. Replacing equalities by
  2-cells changes the critical pairs: R3, R5 (preservation of meets and ⊤) and R7 (commutation) would
  also have to become lax cells with chosen directions, and confluence of the equational rewriting
  says nothing about coherence of the cells. That is a Squier-style (higher rewriting) obligation,
  and it is the content of the note's §6 target 1, not a consequence of the Rosetta note's claim.

> "Three different pairs are called σ, Δ in this tree, and they must not be identified without proof: 1. ... `Autopoiesis`; 2. ... `Positing.Bigraded` (`Reading.joinSquare`) ...; 3. ... `signcraft/src/inference/nuclei.mjs`"

**CONFIRMED but the count is too low (QUALIFIED).** Pair 2: `Bigraded.joinSquare (c1 c2 : Reading) : NuclearSquare heytingK`
with `joinNucleusK c := ⟨joinK c ·, ...⟩` — CONFIRMED. Pair 1 is abstract (`:= Q.j1`) — CONFIRMED. Further σ's the
note does not list (§4.1): `FiberAlgebra.sigma`/`delta` (truth-closures `joinT tTop`, `joinT kTop`), the
`Reading.swap`-conjugation written σ in `HyperdoctrineDual.lean` ("σ-transport", `conj`, `swap_meetK`), and
the KZ closure `Cl = □◇` itself, which `Monad.lean` ties to the pair in prose only.

> "`FiberAlgebra.cross_order_not_knowledge_nucleus` already shows a truth-closure is not a knowledge nucleus, and `BigradedTower.tower_bigrading_is_two_orders` shows the second order must enter as a grading axis, not a co-nucleus."

**CONFIRMED** (both names exist: `FiberAlgebra.lean:452`, `BigradedTower.lean:222`).

> "[pair 3:] whose idempotence is asserted by construction and whose commutation is asserted numerically in tests."

**QUALIFIED; the real defect is worse.** `nuclei.mjs`'s header says "Commutation σΔ=ΔσΔ-shape is
asserted numerically in tests" — CONFIRMED. Idempotence is not asserted in code; it follows from
`impClosure` and the Galois double prime being closure operators (true of the textbook operators). But Δ
as coded is **not monotone** (§2.12), hence not a nucleus and not a closure operator at any regime,
which the note's "valid only where its idempotence is: the strict regime" misses: the failure is not about
the regime, it is the `extent(ctx, held).size === 0` guard.

### 2.4 Note §2: planning and executing rows

> "| coordination-free deductive-truth planning | logic, in the strict and Scott regimes where `H¹ = 0` (CALM: monotone deduction needs no coordination) | closure-rule systems; the plan is a derivation | `RuleSystem` (`generated_closure_is_least`, `immediate_consequence_lfp`), `Sheaf`, `CRDTCohomologicalCALM` |"

- "`H¹ = 0` in the strict and Scott regimes": **UNSUPPORTED as a theorem, CONFIRMED as a declared table.**
  `cohomologyVanishes` (`Obs/Closure/Regime.lean`) is `true` for `strict` and `scott`; its docstring: "A
  table, not a computation: no H¹ is computed here." `Obs/Closure/Regime.lean` header: "The table computes no cohomology."
- "`generated_closure_is_least`, `immediate_consequence_lfp`": **CONFIRMED to exist; both are conditional.**
  `generated_closure_is_least (S) (v) (hfix : SClosed S (clS S v)) : leK v (clS S v) ∧ SClosed S (clS S v) ∧ ...`
  and `immediate_consequence_lfp` carry the hypothesis `hfix`, "for a system whose three-fold iterate is
  already a fixed point (the finite-reading regime)". The file's "scoping note": "`Tstep` is monotone and
  inflationary but not in general idempotent: a single firing may enable a further firing (cascade)." Without
  `hfix`, `clS` is three steps of a cascade, not a closure. The general infinite cascade "reaches its fixed
  point at κ = ω ... `ClosureOrdinal`/`ClosureOrdinalRegime` territory": stated in a comment, with no theorem.
  So the Lean content under the "planning" row is the **strict-finite** fragment with an assumed fixed point.
- "CALM: monotone deduction needs no coordination": **UNSUPPORTED for rule systems.**
  `calm_monotone_coordination_free (M : ModalFrame) (seed)` (`Obs/Cohomology/CRDTCohomologicalCALM.lean`) is
  about `ModalFrame.orbit` (the □◇ closure on a frame) and `joinList_congr`; the file has no occurrence of
  `RuleSystem`/`ClosureRule` (confirmed by grep: only `FreeEnergyLyapunov`, `NSCFiring`, `Closure.lean`,
  `RuleSystem`, `RuleDynamics` mention them). What is needed: a theorem that `Tstep S` (or `clS S`)
  commutes with any merge order of seeds — true by monotonicity and joins, but unwritten for `Tstep`.
  Positive note: `confluent_joinK` is total (`Confluent u w` always holds by the join), so the Lean notion of
  confluence there is trivial and cannot support a claim about coordination-free *planning*.
- "the plan is a derivation": **UNSUPPORTED.** `Closure/RuleSystem.lean` has no derivation datatype.
  `Tstep`/`clS` produce valuations. The nearest Lean object is `ruleOrbit` and `rule_ledger` in
  `FreeEnergyLyapunov.lean` (an accounting of knowledge-height gained per stage), a ledger, not a proof.
  `RuleDynamics` (`settled_rules_closure_lfp`, `rewriteTo_closure_lfp`) is a second-order dynamic on rule
  systems that inherits the same conditional lfp.

> "| database-proof executing | logic → language → geometry: execute derivations over the history database; every effect carries its proof | `T_S` lfp over the history; SignCraft history and settlement | `RuleSystem`, `Settlement`, `Site/*` |"

**UNSUPPORTED in Lean; PARTLY CONFIRMED in code, but the kernel has no effects.**
- Lean: `Settlement.lean` abstracts `Settlement Content Admits base` and instantiates it only as
  `Settlement.ofCech1`. The tiling, bead and hole instances and the four-fold theorem are in a
  different library (`ObsmetrologiaPhysicalScience/Settlements.lean`, located under
  `natural-science-services-section/.../physical-science-services-section/lib/`). Nothing connects
  `RuleSystem` to `Settlement` or `Site/*`. "Execute derivations over the history database" has no Lean
  referent: there is no history, effect or database in the logic files.
- Code: `SS/signchain/src/rules.mjs` does attach a derivation witness to each told cell
  (`derivation(r) = { rule: r.name, from: antecedent addresses }`), a correct Fitting-style
  immediate-consequence step ("`step = mergeCellSets(valuation, fire(rules, valuation))`"). But
  (i) `address` is `semanticId(triple(value))` and its docstring says "Evidence never enters it"
  (`SS/signcell/src/cell.mjs`), so a witness names *which cells* licensed a telling, not *which evidence on
  them* did: it is a one-level provenance record, not a content-addressed proof DAG, and the header's
  "content-addressed back to what licensed it" overstates it; (ii) the machine-level executor
  `SS/signcraft/src/inference/kernel.mjs` returns `effects: Object.freeze([])` from both `accepted` and
  `refusal`, in every branch: "every effect carries its proof" is vacuously true because the machine
  emits no effects.

### 2.5 Note §3.2: Curry–Howard–Lambek

> "an STLC with products and unit, Church–Rosser proved by Takahashi complete development (`par_triangle`, `church_rosser`)"

**CONFIRMED.** `inductive Ty` (`base`, `arrow`, `prod`, `unit`), `inductive Tm`, `inductive HasTy`,
`inductive step` (beta, pi1, pi2 and congruences), `Par`, `dev`, `par_triangle : Par t u → Par u (dev t)`,
`par_diamond`, `par_confluent`, `church_rosser : Red t u → Red t v → ∃ w, Red u w ∧ Red v w`. Scope: `step`
is defined on **untyped** `Tm`, so confluence is for the untyped reduction relation; there is no eta.

> "types read as propositions whose base case is `Reading.pos (v φ) = true` — a told-for reading of a valuation at a predication cell, not a free `Prop` (`curry_howard`)"

**CONFIRMED textually, and QUALIFIED because the theorem is nearly trivial.**
`propOfTy v φ Ty.base = (Reading.pos (v φ) = true)` and `curry_howard (hB : Reading.pos (v φ) = true) : ∀ A : Ty, propOfTy v φ A`.
The hypothesis `hB` makes the single atom true, after which *every* type built from →, ×, unit is
inhabited, including `base`'s own function types (`arrow A C => fun _ => curry_howard hB C`). The type
theory has exactly one atom and one cell `φ`; `propOfTy` is not parameterized by terms; `HasTy` does not
occur in `propOfTy` or in `curry_howard`. The headline says "terms ARE proofs", but the theorem does not
mention a term. The semantic content is "if one cell reads positive then every proposition built from one
atom is true", which is a weaker statement than an assignment of readings to many atoms.

> "the cartesian closed laws and the currying adjunction (`ccc_exponential_adjunction`), bundled as `curry_howard_lambek`"

**CONFIRMED to exist; the content is meta-level and proof-irrelevant.** `ccc_exponential_adjunction`
states `(∀ f, uncurryFn ... (curryFn ... f) = f) ∧ (∀ g, curryFn ... (uncurryFn ... g) = g)` for functions
between `propOfTy` propositions, proved by `rfl`. `structure CurryHowardLambek` bundles `types_are_props`,
`beta_confluent`, `ccc_terminal`, `ccc_product`, `ccc_exponential`; the three `ccc_*` fields are about
`propOfTy`, and `beta_confluent` is about `Tm`; no field relates the two. The module's own opening says
"There is no dedicated Curry–Howard node in the corpus: the correspondence is the categorical-logic
**projection**" — a shadow.

> "and `chl_quartet_is_nuclear`: the four type formers {terminal, product, exponential, dual} biject with the nuclear FOUR."

**CONFIRMED as a bijection of labels; the "dual" is `base`.** `inductive TypeFormer | terminal | product |
exponential | dual`, with docstring "`dual` — `base` (the atomic object, read as the remaining/dual corner)".
`Ty` has no dual or negation former. `TypeFormer.toCorner` sends `terminal ↦ potential`, `exponential ↦ active`,
`product ↦ stable`, `dual ↦ absurd`; `chl_quartet_is_nuclear := ⟨TypeFormer.cornerBij⟩`. With
`Reading.tTop = potential`, `tBot = active`, `kTop = stable`, `kBot = absurd` (`Obs/Language/Positing/Reading.lean`)
and `Autopoiesis.cellCorner` (`potential ↦ σ`, `active ↦ Δ`, `stable ↦ π = σΔ`, `absurd ↦ id`), the bijection
pairs `unit` with the corner that `cellCorner` sends to σ, and `arrow` with Δ. No theorem relates the *action*
of those type formers to the nuclear operators: it is a bijection of four-element sets with no structure
preservation. It supports the sentence "there are four, and they can be named by the four corners", not
"the type formers are the nuclei".

> "The hyperdoctrine (`∃_f ⊣ f* ⊣ ∀_f`, `Hyperdoctrine`, `Quantifying`, `Equality`) is the dependent level."

**QUALIFIED.** The adjunctions are real (`existsF_adjunction`, `forallF_adjunction`; truth-order duals
`existsT_adjunction`, `forallT_adjunction`; `dual_adjoint_system` packages `existsT F = conj (existsF F)`),
but (i) only for `FiniteFibration`s (finite fiber lists), (ii) Frobenius reciprocity is proved only for the
converse (`converse_frobenius`, `frobenius_dual`), (iii) Beck–Chevalley only for commuting reindexings
(`beck_chevalley`: `reindex r (reindex s v) = reindex s (reindex r v)`, a triviality about function composition
rather than a pullback-square statement). The `CurryHowardLambek.lean` header says "the hyperdoctrine IS the
CHL correspondence read at the level of dependent type theory"; no Σ/Π/Id type former is constructed. The
syntactic calculus for the dependent level does not exist: the closest, `Predicating/Syntax.lean`
(`PredicationSyntax.Ty` with `pred`, `arr`, `prod`; intrinsically typed `Term`), is a **second, separate**
STLC with no reduction relation and no link to `CurryHowardLambek.Tm`.

> "`LinearLogicChu` gives Chu spaces over FOUR with the tensor/hom residuation."

**QUALIFIED.** `ChuSpace`, `dual`, `dual_involution`, `ChuMap`, `dualMap` are general. The FOUR residuation is
`readingFuse_tle_iff : TLE (readingFuse a b) c ↔ TLE a (readingImp b c)` — in the **truth order** `leT` only,
transported from `TwistProduct.fuse_leT_iff`. There is no tensor/hom adjunction in the knowledge order, and
no `ChuSpace` over FOUR is constructed in this file (the FOUR content is `four_star_autonomous`, a pair of
facts about `TwistProduct` and `negate`). The note's §4 item 1 ("FCA contexts as predication Chu spaces
(`FregeanFourChu`)") is outside this check.

> "This is the logic a logical inference model *is*: inference produces terms, terms are proofs, proofs normalize confluently, and in the Scott regime the normalization steps are the KZ 2-cells (§1.4)."

- "inference produces terms": **UNSUPPORTED.** `RuleSystem` produces valuations. No function in Lean maps a
  consequence to a `Tm`.
- "proofs normalize confluently": **QUALIFIED.** `church_rosser` (confluence) and, in `NormalOrder.lean`,
  `mem_reducts_iff`, `stepNO_sound`, `stepNO_none`, `normalize_red`, `normalize_normal`, `normalize_unique`.
  But every `normalize_*` is conditional on `normalize n t = some u` (fuel). There is **no termination
  theorem**: no strong or weak normalization for typed terms, no subject reduction (`HasTy` is preserved by
  `step`: absent; grep finds `HasTy` only in `CurryHowardLambek.lean`). On untyped `Tm`, Ω has no normal form.
  So "proofs normalize" is false as a theorem; "normal forms, when they exist, are unique" is true.
- "in the Scott regime the normalization steps are the KZ 2-cells": **UNSUPPORTED**, §2.2-2.3.

### 2.6 Note §3.3: Lambek

> "`FCALambekCircle` edge (3): every integral commutative residuated lattice is a commutative Lambek algebra."

**CONFIRMED.** `lambekOfResiduated (R : Order.ResiduatedLattice) : Lambek.LambekAlgebra`, with
`lres := fun a c => R.imp a c`, `rres := fun c b => R.imp b c`, `e := R.top`; `residuated_lattice_is_commutative_lambek`;
`TwoLambek`. The file text: "the single residual `imp` serves as *both* the left residual `lres` and the right
residual `rres`".

> "The **closing edge is not formalized**: Wurm (2012) ... Pentus (1993) ..."

**CONFIRMED.** The header says "documented not formalized" and the `CircleData` structure has three fields
(`fcaClosure`, `conceptLattice`, `lambek`), the fourth edge absent.

> "Read in the cascade direction, Lambek is how a logic generates a language: sentences are derivations in a residuated logic."

**UNSUPPORTED, with a mismatch to the Lean.**
- `Calculus/Logic/LambekCalculus.lean` defines `structure LambekAlgebra` (a lattice-ordered monoid with
  `lres`, `rres`, and two adjunction fields) and derives algebraic laws (`modus_ponens_left`, `lres_one`,
  `lambek_biresiduation`, `commutative_collapses_to_single_implication`). It has **no sequent calculus, no
  formula or type syntax, no derivations, no soundness or completeness**. "Sentences are derivations" needs
  an inductive proof system (Lambek's `/`, `\`, `·` with the sequent rules), soundness into `LambekAlgebra`,
  and a parser relation from words to derivations; none exists.
- The only non-trivial instances of `LambekAlgebra` are `Trivial` (one element) and, via edge (3), the
  **commutative** ones. In the commutative case `lres = rres` (`commutative_collapses_to_single_implication`),
  so the word-order distinction that makes the Lambek calculus a *grammar* logic is erased: the
  commutative calculus is Lambek–van Benthem (LP), whose derivations are word-order-free. The
  note's "sentence = derivation" would, on the available Lean, describe bag-of-words.
- A non-commutative model exists in the code and not in Lean: `SS/signcraft/src/inference/algebra.mjs` has
  distinct `residualLeft` (`A\B`) and `residualRight` (`B/W`) for composition of Boolean relation matrices.
  Instantiating `Lambek.LambekAlgebra` on finite `Rel × Rel` matrices (join as union, product as relational
  composition) would be the first honest non-commutative instance and would also certify the residuation
  the code uses (§2.11).

> "Read in the spine direction, the syntactic concept lattice (FCA over strings × contexts) lifts an observed language back to the logic that generates it."

**UNSUPPORTED.** `FormalConceptAnalysis.lean` is over arbitrary `G M : Type` with `I : G → M → Prop`, so
strings × contexts is a legal instance. But there is no string monoid structure on concepts, no concept
product `(A,B)·(C,D) := ((A ∘ C)'')`, no residuals on the concept lattice, and no theorem that the result is a
`LambekAlgebra`. The note's wording ("lifts ... back to the logic that generates it") is Wurm/Buszkowski
folklore, not in the tree. Also the context-radius finding of the prototype is empirical.

> (in §3.4 / §4 item 3) language as "admissible words of local rules (SFT/sofic)" together with "sentences as Lambek derivations"

**WRONG as a combination (QUALIFICATION with consequences for §6 target 5).** `SoficShift.lean` defines
`Path (step : Graph A) : List A → Prop` (a word is admissible when every consecutive pair is an edge),
`SoficImage step π w` (a word is the `π`-image of a path), and proves `sft_is_sofic`, `SoficImage.factor`.
These are languages of finite words recognized by a finite graph: regular. Lambek grammars (Pentus) are
context-free, strictly more. A context-free or derivation-tree language is not a sofic image of an SFT
on its alphabet; a derivation of a sentence is a tree. The two notions can be reconciled only by an
explicit encoding (say, bracketed words, or paths in the derivation-tree-as-graph), which is a theorem
to state, not an identification.

### 2.7 Note §3.1 (FCA) as needed by §4 item 2

> "`FCALambekCircle` edge (1): **FCA closure is settling closure** ('computing formal concepts is running the settling closure on a finite formal context')."

**CONFIRMED textually, QUALIFIED as mathematics.** `fcaClosureOp I : FCA.ClosureOp G` and
`fca_closure_laws` show `closeA I` is extensive, monotone and idempotent. The "is settling closure" is
the docstring's reading: the two closures live on different carriers (`ExtSet G`, powerset of objects, versus
`Reading`/`Valuation`), and `FCA.ClosureOp` is a different structure from `Reading.Closure`. There is no
theorem identifying them or placing FCA in a regime. It does mean something for the regime story, though:
a closure with strict `idem` on a finite context is the **strict** regime's object, so the note's "FCA is
the algebra → logic passage" has FCA landing at *algebra*, by the note's own table. The note does not address
that its logic row therefore contains no object that is regime-distinct from algebra in Lean.

> "An attribute implication `B₁ ⟹ B₂` holds iff `B₂ ⊆ closeM B₁`"

**CONFIRMED.** `implies_iff_closeM : implies I B1 B2 ↔ subB B2 (closeM I B1)`.

> "the Duquenne–Guigues basis is the canonical finite presentation of the consequence operator an incidence induces."

**UNSUPPORTED in Lean.** A grep over the library for `Duquenne`, `Guigues`, `pseudo-intent`, "implication
basis", "stem base" finds nothing. The theorem (every valid implication follows from the DG basis; the basis is
minimal) is classical FCA, and the code implements it (`dgBasis` by Ganter's Next Closure in `metrologic/src/closure/formal-context.mjs`).
Moreover the code does not run the textbook object: `lawfulBasis` keeps only implications "whose premise
some object realizes" so as to avoid ex falso, and `settle` uses that supported sub-basis; Lean's
`closeM` is explosive on unrealized premises (the empty extent closes to all of `M`). The paraconsistent
variation (supported basis, denial lane via a doubled alphabet `M ⊔ ¬M`) is not the Lean theory's object
and has no Lean statement.

### 2.8 Note §4 item 2 (the Scott-regime logical inference model)

> "State: a consequence operator presented finitely — closure-rule systems (`T_S`), implication bases induced from the PAM by FCA, hyperdoctrine quantifiers, equality derived — whose inferences are CHL terms that normalize confluently; closures carry their 2-cells (the R1–R23 rewrites) instead of asserting idempotence."

Part by part:
- "closure-rule systems (`T_S`)": **CONFIRMED** (§2.1b), finite lists, conditional lfp.
- "implication bases induced from the PAM by FCA": **PARTLY CONFIRMED.** `induceBasis` in `learn.mjs` induces a
  DG basis from incidence pairs. PAM here is the FOUR-valued incidence; the code reads it as signed attributes
  (`heldSigned`: `m` for told-for, `NEG + m` for told-against), i.e. classical FCA on a doubled alphabet,
  which is not the many-valued FCA of §3 target 3.
- "hyperdoctrine quantifiers, equality derived": **CONFIRMED** for finite fibrations; `classicalEq_eq`,
  `paraconsistentEq_eq` derive them as `∃ᵗ_g(1ᵗ)` and `∃ᵏ_g(1ᵏ)` ("derived, not postulated").
- "whose inferences are CHL terms that normalize confluently": **UNSUPPORTED** (§2.5): no map from
  consequences to `Tm`; confluence yes, normalization not proved.
- "closures carry their 2-cells (the R1–R23 rewrites) instead of asserting idempotence": **UNSUPPORTED**
  (§2.3). R1-R23 are rewrites on *formulas about nuclei*, not on closure computations; there is no data
  structure in Lean or code that records a closure's 2-cell.

> "Inference is the Scott-continuous closure; learning is inducing the basis and residuating exactly; no gradients anywhere."

- "Inference is the Scott-continuous closure": **QUALIFIED.** In `learn.mjs` the exact inference is closure
  under the induced basis (`impClosure`), and prediction (`evaluateInduced`) falls back, when the closure does
  not already contain the target, on `induceWeightedImplications` with `minConfidence = 0.55` and a noisy-OR
  combination (`scoreWeighted`: `notP *= 1 - r.confidence`), and then on `predictTop` by continuation energy ΔF.
  The learned model that scores is a probabilistic rule list plus a physical energy, not the closure.
- "learning is ... residuating exactly": **CONFIRMED for `algebra.mjs`, WRONG as a description of the system.**
  `trainLayer`/`trainTwoLayer` do use exact residuals, restricted to witnessed rows (`restrictRows`) to avoid
  vacuous ⊤. But the machine's `settle` action adapts a conductance complex by the Physarum law
  `dD_e = |Q_e|^μ − γ·D_e` (`adapt.mjs`) and `generate` samples with Gibbs weights `Math.exp(-dF / T)`
  (`generate.mjs`), both real-valued dynamics with no Lean statement. "No gradients" is accurate by the files'
  own comments; "no real-valued machinery" is not.
- The residuation in Lean: the adjunction available is the **truth-order** `fuse ⊣ imp` on FOUR
  (`readingFuse_tle_iff`) and the abstract Lambek bi-residuation. `algebra.mjs` residuates a different
  product, lane-wise relational composition over the **knowledge** order, `joinK` of `meetK` ("In the two
  boolean lanes this is plain relational composition per lane"). That is the quantale of Boolean relations
  squared, a genuine non-commutative residuated structure but not the twist-product tensor of
  `LinearLogicChu`/`TwistProductResiduation`. No Lean theorem states the matrix residuation. The header's
  "residuation A\B ... is a theorem" is true classically and unchecked here.

### 2.9 Note §5: "Logic" (what the JavaScript gets wrong)

> "`signchain/src/typed-theory.mjs` is 'a small, correct reachability engine over a category-shaped graph, and it is not a CHL realization': no types-as-propositions, no terms, no normalization"

**CONFIRMED.** `derive` is a breadth-first search over `theory.rules` with `seen` deduplication; `typing`
returns a witness or an obstruction; there is no term syntax, no substitution, no reduction.

> "its proof carrier asks `derive` about edges `derive` already found, so obstructions are always empty."

**CONFIRMED.** `typedTheoryProofCarrier(theory)` builds `closure = derivationClosure(theory)` and then, for each
`rule` in `closure.generated`, calls `typing(closure.theory, rule.domain, rule.codomain)`. `closure.theory.rules`
is `closure.generated`, so every queried edge is in the rule set and `derive` returns it on its first step
(or by `baseObjectCoincides(premise, conclusion)` when `domain` coincides with `codomain`). So
`obstructions` is empty by construction.

*Sharpening the note missed:* the closure is *thin* as well. `composeInferenceRules` adds a composite only
when `!out.some(existing => sameGeneratedRule(existing, rule))`, and `sameGeneratedRule` compares only
`domain` and `codomain`, discarding `trace`. So when two different compositions connect the same pair of
objects, only the first trace survives. The carrier is a reachability relation, not a category of derivations.
`derivationIdentity` does compare step sequences, but the closure never produces two derivations of one edge.

> "`rules.mjs` is a sound Fitting-style bilattice rule engine but not connected to `typed-theory`, and its derivation witnesses are not terms."

**CONFIRMED.** `rules.mjs` imports only `signcell/cell` and `four`; `typed-theory.mjs` imports only `signcell/predication`
and `exact-number`. Witnesses are `{ rule: name, from: [addresses] }`. One refinement: `rules.mjs` is the *better*
match to the Lean's `ClosureRule` (positive monotone thresholds `atLeast`, a single `(cell, reading)` consequent,
`step = v ⊔ fire(v)`), which the note does not say; and the claim "reaches its least fixed point" in its header
corresponds to `generated_closure_is_least` only under the finite hypothesis `hfix`.

> "`nuclei.mjs` asserts σ/Δ idempotence by construction (valid only in the strict regime, §1.4) and checks commutation numerically."

**QUALIFIED; see §2.3 last item and §2.12.**

*Also in "logic" but not mentioned by the note:* `SS/signchain/src/bilattice.mjs` is a clean transcription
of `Obs/Language/Positing/Evidence.lean`'s `Valued` (join/meet keep every witness: `evidence_accumulates_*`;
`joinK_measured`, `meetK_not_measured`, `negate_measured`, `presumeFree`), and `SS/signchain/src/log.mjs` is an
append-only EAVT-style telling log. Neither is a realization gap; they are the algebra-side that the logic side
(typed-theory) does not use.

### 2.10 Note §6 target 1

> "A Scott-regime carrier (witnessed valuations, infinite base) where σ is KZ-lax and not strict; R1/R2 as its multiplication 2-cells; R1–R23 coherence as the lax structure."

**UNSUPPORTED as stated; here is what the library forces on the target.**
1. *Order.* `no_laxSlack_of_antisymm` + `laxClosure_idem_of_antisymm` say the carrier **must fail
   antisymmetry**. "Witnessed valuations" under witness-set inclusion do not (§2.3). The target must choose
   a preorder (asymptotic domination, or an order on derivation terms/rewrite classes) and prove the failure.
2. *Regime.* The target must also make the carrier Scott by a **derived** classification; in the library's
   table the non-antisymmetric carrier is aperiodic. Candidate route: `Record`-style sequences with finite-antecedent
   rules (so that `IsScottContinuous` holds) but a non-antisymmetric order. A non-antisymmetric Scott-continuous
   closure is not excluded by `scott_excludes_nonscott` (that theorem only excludes the non-Scott strata), so the
   target is consistent with the library, just not yet present.
3. *Structure.* σ is a nucleus; the target needs a **lax nucleus** (inflationary, monotone, KZ,
   meet-preserving up to the preorder), as a new structure beside `Order.Nucleus` (whose `idem` is a field equation).
   `NuclearFormula.interp` would need a second interpretation into it, in which R1/R2 become `≤` witnesses.
4. *2-cells.* If 2-cells must carry content (not mere `≤`), the target needs a `Type`-valued hom, which
   `PreValueCategory`'s `le : carrier → carrier → Prop` does not provide.
5. *R-system.* "R1-R23 coherence as the lax structure" needs the soundness of all rules in the lax
   setting (do R5-R23 still hold up to `≤`, and in which direction?), then termination (§2.3: unwritten) and a
   coherence theorem; the lax version of R7 (commutation as a distributive law with a chosen cell) is the
   crux.
The note's order of work should be: (a) prove the Boolean-obvious soundness of all 27 constructors in the strict
setting and strong normalization (these are in-library, finite, routine); (b) build the non-antisymmetric
Scott carrier; (c) only then define lax nuclei.

### 2.11 Note §6 target 2

> "The FCA–Lambek closing edge for finite contexts: the syntactic concept lattice of a finite sample is residuated and Lambek-sound; then over FOUR (two-lane incidence)."

**UNSUPPORTED as a theorem; feasible, and the dependencies are as follows.**
- Available: FCA over arbitrary `G M : Type` with `I : G → M → Prop`, the complete concept lattice
  (`conceptCompleteLattice`, `concept_lattice_is_complete`), `implies_iff_closeM`; `LambekAlgebra` as a
  structure with derived residuation laws; `Order.ResiduatedLattice`.
- Missing: (i) the string monoid structure on the context side and a concept product
  `dot (A,B) (C,D) := concept generated by { uv | u ∈ A, v ∈ C }`; (ii) its associativity, unit, and
  monotonicity (the standard argument uses closure of the extent under left/right context
  application); (iii) residuals `lres`, `rres` defined by quantifying over contexts; (iv) the two adjunction
  fields; (v) Lambek-**soundness** needs a sequent calculus to be sound *for* (absent), (vi) for "over FOUR", a
  FOUR-valued incidence needs a many-valued FCA (§3 target 3, prose only in the Lean header). Note also the
  Lean `Concept` is two-valued (`Prop`).
- A finite sample (a finite set of strings) has finitely many distinct contexts that separate them, but the
  syntactic concept lattice of a *language* is infinite; for a finite sample one must say which
  closure (contexts drawn from the sample vs. all contexts) is intended, since the sample-restricted lattice
  is not the monoid-closed one and the product may fail associativity there.

### 2.12 Note §6 target 5

> "Cascade passages as theorems: a closure-rule system's derivations form an SFT/sofic language under a declared projection; a sofic language's admissible patches form a settlement (`Settlement`) on a site."

**UNSUPPORTED; both halves have obstacles in Lean.**
- *First half.* `Closure/RuleSystem.lean` has no derivations (§2.4). Even with a `Derivation` type, a derivation
  is a tree or DAG; `Path step : List A → Prop` is a walk on a finite graph. A "declared projection" from
  derivations to words must be (i) a linearization (postorder, bracketed) such that the image set is
  sofic, which is false in general for tree-structured derivations over a recursive rule set (it would
  make every context-free derivation language regular), or (ii) restricted to **linear** derivation chains
  (one premise per step, as in `derive`'s `steps` list, which really is a path in the object graph), where the
  statement is true and close to trivial: the steps of `derive` are literally a `Path` in the graph whose
  vertices are base objects and whose edges are the rules. That reading matches `typed-theory.mjs` better
  than `RuleSystem`.
- *Second half.* `Settlement` is a generic structure `(Content, Admits, base)`; the only instance in this
  library is `ofCech1`. `Tiles` (a `localRule : Graph Carrier` with an `admissible` word), `Beads` and `Hole` are
  instantiated in the *separate* library `ObsmetrologiaPhysicalScience`
  (`ObsmetrologiaPhysicalScience/Settlements.lean`, theorem `tiles_beads_hole_cech1_are_settlements` named in
  the `Settlement.lean` header). So the target is partly done: sofic words as `Tiles` settlements is in that
  library. The note, which cites `Settlement` among Obsmetrologia modules, does not mention the split, and
  the dependency of the realization on a second Lean package.

## 3. Cascade direction and regime assignments

### 3.1 What is CONFIRMED

- `Closure/Regime.lean`: `Stage.regime` and `ClosureRegime.stage` as in §2.1; `spine_is_strict`,
  `spine_settles_in_settling_regime`, `spine_settles_by_three`.
- The note's §1.1 table of regimes, closure characters, and spine stages: CONFIRMED (including "on the
  spine `κ ≤ 3`").
- `regime_tower` exhibits one carrier per regime: `Reading` strict, `Record` Scott (`succPos`, no finite
  stage), `ORecord` transfinite-bounded (`omegaPos` as the stage-ω limit), germ preorder aperiodic
  (`tally_lax_slack`). That **derivation by carrier** is the only non-declared evidence for a regime in the
  library, and it assigns *nothing in the logic row* to Scott.

### 3.2 What is backwards or unsupported about direction

1. **Library direction is descent, one rung at a time, then a jump.**
   `Stage.next : articulating → predicating → positing → settling → articulating`;
   `spine_rank_table_descends (s) (h : s ≠ settling) : s.next.regime.rank + 1 = s.regime.rank`;
   `return_rank_table_ascends : settling.regime = strict ∧ settling.next.regime = aperiodic ∧ strict.rank = 0 ∧ aperiodic.rank = 3`.
   All are `rfl` over declared tables, with the comment "OPEN: that the spine's passage descends a tower of
   closure ordinals." The return is **settling to articulating directly** (rank 0 to rank 3). There is no
   theorem for a rung-by-rung ascent algebra → logic → language → geometry. The note's §1.3 claim "Realization runs the other way ... settled readings present a logic; the logic generates a language; the language
   tiles a geometry" is the founder's cascade, stated in prose; the library's only upward statement is the jump
   plus the residue spiral (`residue_dichotomy`, `dervish`, `Record.iterSeq_residueBump`). The note's
   "that is what lets the cascade close into a tower" is closer to `RegimeCycle.lean`'s "turn is a spiral"
   than to the §1.3 ascent.
2. **Mapping of logic to the middle of the tower.** On the library's rank table the logic row would be
   rank 1 (Scott), language rank 2, geometry rank 3. In `RegimeCycle`, the gap property is
   `gap_flags_iff_upper_rank : HasGap r ↔ 2 ≤ r.rank`: gaps (unattained settling, `RegimeGate.HasGap`) begin at
   **transfinite-bounded**, the note's *language*; Scott (the note's *logic*) is gap-free
   (`RegimeGate.scott_no_gap`) like strict. So the precise library difference between algebra and logic is
   *not* "strict versus lax"; it is that the Scott carrier's increment map has no fixed point at all
   (`scott_no_fixed_point`) while still not having a gap in the gate's sense, and the note's "logic is proof-relevant,
   algebra is proof-irrelevant" does not separate rows 1 and 2 in the Lean.
3. **Language as downstream of logic** — this is the founder's frame and nothing in the Lean falsifies it, but
   the Lean's only logic-to-language machinery (Lambek, §2.6) is algebraic and commutative; the sofic machinery
   (language) does not import any logic file (`SoficShift.lean` is self-contained; `FiniteLocalRule` welds
   colorings). So "downstream" is a design direction to *build*, not a dependency that exists in the tree.
4. **Misc. regime wording in §1.1**: "`Regime.lean`'s `cohomologyVanishes` declares `H¹ = 0` for strict and
   Scott": CONFIRMED (table). "`Sheaf.lean` proves `H¹ = 0` in the finite regime and identifies it with CRDT/CALM":
   not checked here beyond `CRDTCohomologicalCALM`'s theorems being about `ModalFrame`.

## 4. σ/Δ census (what must not be identified)

| # | Where | What it is | Idempotence | Regime tie |
|---|---|---|---|---|
| 1 | `AperiodicOrder/Tiling/Autopoiesis.lean` `saturating`/`transferring` | `Q.j1`, `Q.j2` of an abstract `CommutingNuclei H` | strict field `Nucleus.idem` | docstring: aperiodic; history formulas only in comments |
| 2 | `Positing/Bigraded.lean` `joinSquare c1 c2` | `joinNucleusK c a := joinK c a`, commuting, on `heytingK` | strict (`idem` by `cases`) | none |
| 3 | `Positing/FiberAlgebra.lean` `sigma`, `delta` | `joinT tTop`, `joinT kTop` pointwise truth-closures | `nucleusToward_idem` | none; proved *not* knowledge nuclei (`cross_order_not_knowledge_nucleus`) |
| 4 | `Language/Predicating/HyperdoctrineDual.lean` "σ" | `Reading.swap`, with `conj L := swap ∘ L ∘ swap` | involution (`conj_conj`) | none; an order-swap, not a closure |
| 5 | `Closure/Modal.lean` `closureOp` (`Cl = □◇`) | `necessitate (possibilize v)` | strict (`closureOp_idem`) | the thing `Monad.lean`/`KZ.lean` are about |
| 6 | `signcraft/src/inference/nuclei.mjs` `sigma`, `delta` | DG-basis implication closure; guarded Galois transfer | σ: closure; Δ: idempotent but **not monotone** | none declared |

Rows 1, 2, 5 are the ones the founder's correction concerns. Rows 3 and 4 were not in the note. No Lean theorem
links 6 to 1-5.

*Execution record for row 6 (Δ non-monotone).* Context objects `x:{a,b}`, `y:{a,b}`, attributes `{a,b,c}`.
New object `n` with `v1 = {n: a told-for}` and `v2 = v1 ⊔ {n: c told-for}` (so `v1 ≤ₖ v2`).
`delta(ctx, v1)` reads `n.b = potential` (told-for) because `extent({a})` is non-empty and `closeAttrs({a}) = {a,b}`;
`delta(ctx, v2)` reads `n.b = absurd` (= `kBot`, nothing told) because `extent({a,c})` is empty and the
`if (extent(ctx, held).size === 0) continue;` guard in `delta` skips the object. Run with
`node --input-type=module` from `SS/signcraft` importing `./src/inference/nuclei.mjs`; output
`b ... d1 potential d2 absurd`. Hence `v1 ≤ₖ v2` but `delta(v1) ≰ₖ delta(v2)`: Δ is not monotone, so not a
closure operator or nucleus. (σ, built from `impClosure` on a fixed `lawfulBasis`, is monotone.) The same guard is
the reason `settle` needs the "H-theorem violation" runtime checks. The design intent (a contradiction stays
local) is reasonable; it just means Δ is a *partial* transfer, and the nuclear laws (and R1-R23) do not apply to it
as coded.

## 5. What the note missed in this regime

1. **The typed-theory is the hyperdoctrine's base category.** The four inference morphisms in
   `typed-theory.mjs` (`specialization`, `converse`, `subjectProjection`, `objectProjection`) are the four
   generator classes derived in `Obs/Language/Predicating/Generators.lean` (`support_cases`,
   `natural_partial_cases`, `converse_cell`, `subjProj_cell`, `objProj_cell`) and the `Predicating.Morphism` base
   maps `PredicationCell → PredicationCell` over which `reindex`, `FiniteFibration`, `existsF` and `forallF` are
   built. SPOTCOMP line 314 says the same for PAM's instruction set. So `derive` computes paths in the *index
   category* of the fibration. The realization step is "give `typed-theory` the fibration over it" (valuations
   as fibers, `reindex` along rules, `existsF`/`forallF` along projections), not "replace it with `Tm`".
   Replacing it discards the base on which `Hyperdoctrine`/`Quantifying`/`Equality` are stated.
2. **Two unrelated STLCs and one unused typing relation.** `CurryHowardLambek.{Ty,Tm,HasTy}` (untyped terms +
   typing relation, one atom) and `PredicationSyntax.{Ty,Term}` (intrinsically typed, atom `pred`, no
   reduction). No bridge. `HasTy` has no uses outside its file, so the Lean has no subject reduction, no
   theorem that a well-typed term denotes into `propOfTy`, and `curry_howard` does not use terms. A
   realization needs these three proved before "types as propositions with told-for readings" is a calculus
   rather than a slogan.
3. **Normalization is conditional (fuel), and untyped.** `normalize` returns `Option Tm`; no termination
   theorem. For a *logic*, strong normalization of the typed fragment is the cut-elimination analogue and is
   missing.
4. **Regimes are declared, not derived,** `regimeOf` ignores the closure, `Stage.regime` is a table
   (`spine_rank_table_descends` is `rfl`), and `cohomologyVanishes` is a table. A logical inference model that
   "carries its regime" (the note's §6 target 7) has to *compute* `ClosureRegimeData` from a rule system; the
   library has the classifier but no extractor.
5. **Rule-system Lean model vs code model differ.** Lean: antecedent `Valuation → Bool` (arbitrary monotone
   test), consequent `bump cell reading`, `clS` = 3-fold iterate. Code (`rules.mjs`): conjunctive threshold
   antecedents, consequent adds witnesses on told sides with a derivation record. Lean has no witnesses in
   `Valuation` (it is `PredicationCell → Reading`), so Lean's `Tstep` cannot state that derivations are
   recorded; `Valued` (witnesses) and `Valuation` (readings) are not combined into a witnessed valuation
   with a closure on it. Closing that gap (a witnessed `Tstep` whose projection to readings is `Tstep`) is the
   first honest bridge between code and library for SignChain's logic.
6. **Settling over the chain: the free-energy ledger is Lean-checked for rule systems.**
   `rule_ledger (S) (seed) (cells) (hw : SClosed S w) (hseed : leK seed w) (N) : deficit cells seed w = ruleOrbitFlux S seed cells N + deficit cells (ruleOrbit S seed N) w`
   (`Dynamics/Flow/FreeEnergyLyapunov.lean`) is the exact accounting `settle` in `nuclei.mjs` checks at runtime
   (`ledger.closes`). That is a *real* Lean-code correspondence in the logic regime that the note does not
   mention; it is also the only place `Tstep` orbits (not just `clS`) have a theorem.
7. **Non-commutative Lambek model in code; none in Lean** (§2.6): `algebra.mjs`'s `residualLeft`/`residualRight`
   are a non-commutative residuated pair, an immediate target that also strengthens the Lean's Lambek edge.
8. **The DG basis and the paraconsistent variants are un-Lean'd** (§2.7); the "supported basis" is a design
   decision in `formal-context.mjs` (`lawfulBasis`) with no counterpart theorem.
9. **FOUR's tensor is a truth-order object.** `readingFuse_tle_iff` is `TLE`; the code's `compose` is a
   knowledge-order product. If the note's "linear-logic ops" for logic and "residuation" for learning are to be
   one structure, someone must show how the two orders' monoidal structures relate (the Lean's `bigraded` file
   keeps them separate by design: `tower_bigrading_is_two_orders`).
10. **`Hyperdoctrine` Beck-Chevalley is not a pullback statement** (§2.5), so "coherence of quantifiers" is
    weaker than the note suggests; and equalities are readings, not an identity type.
11. **A bigger point about the correction's cause.** `kz_iff_strict` + `no_laxSlack_of_antisymm` + the
    germ construction say the *library's reason for a finite regime* is that finite lattices are posets
    (so laxity collapses), and the reason lax cells exist at all is **loss of antisymmetry**, which in the
    library arises from *asymptotic equivalence of infinite objects* (germs). That points the founder's
    "why a finite regime exists" at germ-type (transfinite or aperiodic) carriers, not at witness-carrying
    carriers.

## 6. Consequences for the program (recommendations, ordered)

1. **Do not write "σ,Δ are KZ-lax in the Scott regime" into any realization spec** until a Scott-classified,
   non-antisymmetric carrier exists. Until then say: "in the library, closures are strictly idempotent on
   every antisymmetric carrier at every regime; lax slack is exhibited only on the germ preorder, at the
   aperiodic corner." If the founder intends something else by "KZ-lax", that is a new definition to state.
2. **Replace "R1-R23 are the KZ 2-cells" with "R1-R23 is the equational rewrite theory of two commuting nuclei,"** and
   target three Lean theorems: soundness of all `Step` constructors into `CommutingNuclei`; strong normalization
   by `(nuclearW, entanglement)`; confluence (critical pairs). These are in-library and routine.
3. **SignChain logic realization (code):** (a) keep `typed-theory.mjs` as the index category and make derivation
   closure keep *all* traces (or declare it thin); (b) add the fibration over it (valuations, `reindex`,
   `existsF`/`forallF`, equalities as derived readings), matching `Quantifying`/`Equality`; (c) make
   `rules.mjs` witnesses carry the evidence-addresses of the premises, not just the triple addresses;
   (d) add `Tm`/`HasTy`/`step` only together with a Lean-side `HasTy` ⇒ `propOfTy` soundness and subject reduction;
   (e) treat `nuclei.mjs` Δ as a partial transfer, not a nucleus, and drop R1-R23 claims for it.
4. **Lean-side additions that unblock honest claims:** a witnessed `Tstep` over `Valued` projecting to
   `Tstep`; a `Derivation` datatype for `RuleSystem`; `LambekAlgebra` on Boolean relation matrices; a sequent
   calculus with soundness for `LambekAlgebra`; typed strong normalization for `Tm`; an extractor
   `RuleSystem → ClosureRegimeData`.
5. **Language row:** treat sofic as the regular fragment and say so; Lambek parsing needs context-free power. The
   cascade passage "logic generates a language" should be restated as "a rule system's *linear* derivation
   chains form a sofic language", which is both true and close to `derive`.

## 7. Appendix: statements quoted from Lean (exact)

- `Reading.kz_iff_strict (f : Reading → Reading) (hf : ∀ a, KLE a (f a)) : (∀ a, KLE (f (f a)) (f a)) ↔ (∀ a, f (f a) = f a)` — `Closure/Monad.lean`.
- `strict_regime_mu_identity (d : ClosureRegimeData) (hd : classify d = ClosureRegime.strict ∨ classify d = ClosureRegime.scott) (v : Valuation) : closureOp M (closureOp M v) = closureOp M v` — `Closure/Monad/KZ.lean`.
- `no_laxSlack_of_antisymm {V : PreValueCategory} (hanti : ∀ x y, V.le x y → V.le y x → x = y) (T : LaxVClosure V) (v) : ¬ HasLaxSlack T v` — `Closure/Monad/LaxSlack.lean`.
- `tally_lax_slack : HasLaxSlack tallyLaxClosure germPreValue.bot` — `Language/Positing/Record.lean`.
- `structure Nucleus (H) where j; infl; idem : ∀ a, j (j a) = j a; meet` — `Language/Positing/NucleusAndCommutingNuclei.lean`.
- `inductive Step | R1 (M) : Step (Saturate (Saturate M)) (Saturate M) | R2 ... | R7 (M) : Step (Saturate (Transfer M)) (Transfer (Saturate M)) | ...` and `interp_R1 ... := Q.j1.idem _`, `interp_R7 ... := Q.comm _` — `Language/Positing/NuclearFormula.lean`.
- `generated_closure_is_least (S) (v) (hfix : SClosed S (clS S v)) : leK v (clS S v) ∧ SClosed S (clS S v) ∧ (∀ x, leK v x → SClosed S x → leK (clS S v) x)` — `Closure/RuleSystem.lean`.
- `propOfTy (v) (φ) : Ty → Prop` with `Ty.base => Reading.pos (v φ) = true`; `curry_howard (hB : Reading.pos (v φ) = true) : ∀ A : Ty, propOfTy v φ A`; `church_rosser (h1 : Red t u) (h2 : Red t v) : ∃ w, Red u w ∧ Red v w` — `Language/Predicating/CurryHowardLambek.lean`.
- `normalize_unique (h : normalize n t = some u) (hv : Red t v) (hnv : Normal v) : u = v` — `Language/Predicating/NormalOrder.lean`.
- `existsF_adjunction (F : FiniteFibration) (v w) : leK (existsF F v) w ↔ leK v (reindex F.base w)` — `Language/Predicating/Quantifying.lean`.
- `lambekOfResiduated (R : Order.ResiduatedLattice) : Lambek.LambekAlgebra` with `lres := fun a c => R.imp a c`, `rres := fun c b => R.imp b c` — `Calculus/Logic/FCALambekCircle.lean`.
- `implies_iff_closeM (I) (B1 B2) : implies I B1 B2 ↔ subB B2 (closeM I B1)` — `Calculus/Order/FormalConceptAnalysis.lean`.
- `return_rank_table_ascends : Stage.settling.regime = strict ∧ Stage.settling.next.regime = aperiodic ∧ strict.rank = 0 ∧ aperiodic.rank = 3` — `Closure/RegimeCycle.lean`.
