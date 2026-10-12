---
title: "Cascade check, algebra regime: SignCell against Obsmetrologia"
description: "Adversarial check of the claims that the 2026-10-08 cascade note makes about the algebra regime (SignCell, data): the regime table, the sigma/Delta correction and the bare-reading versus witnessed-carrier reading of kz_iff_strict, the FCA passage, the SignCell program item, the SignCell code claims and four Lean targets. Each claim is quoted and marked CONFIRMED, WRONG or UNSUPPORTED against the Lean statements and the JavaScript, with what the note missed."
date-created: 2026-10-08
kind: engineering-research-note
keywords:
  - adversarial-check
  - closure-regime
  - kz-lax-idempotence
  - kz-iff-strict
  - nuclear-quartet
  - sigma-delta
  - formal-concept-analysis
  - signcell
  - signstuff
  - obsmetrologia
status: working-note-adversarial-check-of-the-algebra-regime-complete
produced-by: info-0d adversarial-check subagent (Claude Sonnet 5.5), reading the working tree of the monorepo at HEAD 8e6723572da, Lean at lib/.../obsmetrologia, JavaScript at lib/.../signstuff
---

# Cascade check, algebra regime: SignCell against Obsmetrologia

## 0. Verdict first

The governing note is `2026-10-08-note-on-realizing-signstuff-along-the-algebra-logic-language-geometry-cascade.md`
(called "the note" below). I checked every claim it makes about the algebra regime against Lean
statements (not docstrings alone) and against the JavaScript. Short form:

1. **The founder's sigma/Delta correction, as the note states it ("in the Scott regime they are KZ-lax
   idempotent"), is not what the library says, and is in places the opposite.** The library puts
   `mu` = identity in the strict *and* Scott regimes (`strict_regime_mu_identity`,
   `mu_identity_of_cohomologyVanishes`), its one inhabited lax-slack witness at the *aperiodic*
   corner (`Record.tally_lax_slack`, `aperiodic_gap_matches_lax_slack`), and one docstring says
   the closure monad is "strict only when Scott-continuous" (`Bigraded.lean` header). Every `Nucleus`
   in Lean has `idem` as a structure field, so there is no lax sigma or Delta anywhere in Lean.
   What the library does contain at Scott height is a **non-idempotent step with an idempotent
   limit** (`Record.succPos`, `ChromaticLorentzian.step_not_idempotent`). Non-idempotent is not
   KZ-lax: those steps violate the KZ inequality. §3 gives the full ledger. This needs to go back to the founder as a
   conflict between his correction and the library as written, not be smoothed over.
2. **The "bare reading versus witnessed carrier" reconciliation is unsupported and partly wrong.** Lean's
   `Valued` and `CValuation` carry no order at all; the only non-antisymmetric carrier in the tree is
   the germ preorder of tally *sequences* (`Record.germ_order_not_antisymm`), at the aperiodic rung,
   and it is not a witness-set carrier. The natural order on witness sets is inclusion, which is
   antisymmetric (`FCA.subA_antisymm`; JS sides are sets).
3. **The regime assignment is a declared table, not a derived fact, and the note uses it as if
   derived.** `Stage.regime` is a lookup; `Regime.lean` carries an `OPEN` marker saying flags are
   inputs and no ordinal determines them; `RegimeCycle.spine_rank_table_descends` carries another.
   Beyond that, the note's algebra anchors (`Positing/*`) sit in the **positing** stage, whose regime
   in the same table is **Scott**, and its §4 item 1 gives SignCell the whole spine
   (articulate, predicate, measure, settle), which spans all four regimes, not the strict one.
4. **The cascade direction has no Lean statement in the algebra to geometry order.** Lean has the
   spine descending (`Stage.next`) and a one-step return from strict straight to aperiodic
   (`return_rank_table_ascends`). strict to Scott to transfinite to aperiodic as an ordered path
   is the founder's frame, correctly labelled "reading (not yet a theorem)" in the note's §1.3, but
   the Rosetta note cited as supporting it does not (§2.3).
5. **The JavaScript sigma/Delta are not nuclei, and the pair-3 identification question is
   already answered negatively.** I ran them (no files written). Delta is not monotone (35 of 400
   random contexts), sigma is not meet-preserving (three-object counterexample, §5), so neither can
   instantiate `Order.Nucleus`, whose fields require both.
6. **FCA claims are mostly right as theorems and overstated as bridges.** The derivation Galois
   connection, closure and complete concept lattice are proved for arbitrary Prop-valued contexts. The
   Duquenne-Guigues basis, the "learning a logic is computing the basis" gloss, the settling
   identification and the FOUR-valued two-lane bridge to `predicationChu` have no Lean statement.
7. **Things the note missed that matter** are in §7: the fourth and fifth sigma/Delta bindings,
   `RegimeComposition`/`RegimeCycle`/`RegimeGate`, the `no_denial` rule that the JS violates, list
   versus set evidence, depth-zero-only articulation in the JS, a real `sorry`, and a JS citation
   of Lean names that do not exist.

Convention: Lean paths are relative to
`lib/emsenn/services/561-group/services/science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/lib/obsmetrologia/`
(so `Obsmetrologia/Closure/Regime.lean` means that tree). JS paths are relative to
`lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/`.
Verdict words: **CONFIRMED**, **WRONG**, **UNSUPPORTED**; a qualification follows the word when needed.

## 1. §1.1 of the note, the four closure regimes

### 1.1.1 The dichotomy

> "`Closure/Regime.lean` proves the **four-regime dichotomy** of the closure ordinal `κ`: four mutually
> exclusive, jointly exhaustive regimes at the boundaries `ω` and `ω₁`"

**WRONG as stated about `κ`; CONFIRMED for the flag classifier.** What is proved:

```
theorem classify_exhaustive (d : ClosureRegimeData) :
    classify d = strict ∨ classify d = scott ∨ classify d = transfiniteBounded ∨ classify d = aperiodic
theorem classify_strict / classify_scott / classify_transfiniteBounded / classify_aperiodic
theorem four_regime_flag_cases (d : ClosureRegimeData) : (exhaustive) ∧ (four iffs on the flags)
```

`classify` is a total `if`-chain on three `Bool`s, so exclusivity and exhaustiveness are properties
of a function, proved by case split. The file says so about itself, in the docstring of
`four_regime_flag_cases`:

> "-- OPEN: the corpus's four-regime dichotomy ... that a closure ordinal `κ` falls in exactly one of
> `κ < ω`, `κ = ω`, `ω < κ < ω₁`, `κ ≥ ω₁`, with the Scott-continuity and cofinality flags derived from
> the closure. Here the flags are inputs (`ClosureRegimeData`), and no ordinal or closure determines them."

and in the module header: "We model `κ` here by the corpus's own equivalent decidable characterizations".
The `κ` column of the note's table (`κ < ω`, `κ = ω`, `ω < κ < ω₁`, `κ ≥ ω₁`) appears only in docstrings;
no Lean definition computes a regime from an ordinal or from a closure. (The ordinal itself is built in
`Closure/OrdinalCore.lean` and `Closure/Ordinal.lean`; `classify` does not read it.) A note that builds on the
regime of a given closure must say "declared regime data", because deriving it is the open item.

### 1.1.2 Flags and constraints

> "each determined by three Boolean flags (Scott-continuous? finite base? countable cofinality?) with
> `finiteBase → scottContinuous` and `finiteBase → countableCofinality`"

**CONFIRMED.** `structure ClosureRegimeData` has fields `scottContinuous finiteBase countableCofinality : Bool`
and the two implications as proof fields `fin_scott`, `fin_cof`. `classify` order: finite, then Scott, then
countable cofinality. Related and useful: `Closure/Scott.lean` proves `finite_scott_continuous (c : Reading.Closure) :
IsScottContinuous c` (strict is inside Scott) and `scott_continuous_iff_omega_regime (d) : cohomologyVanishes (classify d) = true
↔ d.scottContinuous = true`.

### 1.1.3 The table

> "| strict | `κ < ω` (on the spine `κ ≤ 3`, `ClosureOrdinal`) | finite base; idempotent closure | settling |" and the Scott,
> transfinite-bounded, aperiodic rows.

**CONFIRMED for the regime and stage columns; qualified for "idempotent closure" and for `ClosureOrdinal`.**

* Stage column: `Stage.regime`: `articulating => aperiodic`, `predicating => transfiniteBounded`, `positing => scott`,
  `settling => strict` (`Closure/Regime.lean`). CONFIRMED. It is a `def` by cases, and the file calls it a table;
  `RegimeCycle.lean` states the same openly (§2.4 below).
* Flag characterisations per row: `classify_scott : classify d = scott ↔ (d.scottContinuous = true ∧ d.finiteBase = false)`;
  `classify_transfiniteBounded : ... ↔ (scottContinuous = false ∧ countableCofinality = true)`;
  `classify_aperiodic : ... ↔ (scottContinuous = false ∧ countableCofinality = false)`. CONFIRMED.
* "(on the spine `κ ≤ 3`, `ClosureOrdinal`)": the theorem is `Reading.strict_finite` /
  `Reading.settles_by_three` in `Closure/Ordinal/Finite.lean` (there is no file named `ClosureOrdinal`; the name is a
  docstring convention). Statement: `settles_by_three (f : Reading → Reading) (hf : ∀ a, KLE a (f a)) (x) : iter f 3 x = iter f 4 x`.
  CONFIRMED, with the point below.
* "idempotent closure" as the *character of the strict regime*: **WRONG as characterisation.** `settles_by_three`
  and `strict_finite` assume only that `f` is *inflationary*, not monotone, not idempotent. Their module header says
  so: "`Settling` modelled a settled value as the fixed point of an *idempotent* closure (one step). The corpus's
  settling is more general: it **iterates** the closure ... a monotone, inflationary endomap that need not be idempotent".
  Strict regime = finite base = iteration of an arbitrary inflationary map stabilises by `kHeight = 3`. Idempotence is
  a property of the *limit* closure `iter f 3`, not of the step. This is the right place to see what the founder's
  sentence can mean (§3.4).

### 1.1.4 Physical ordering

> "The distal-bypass note orders the same four as thermodynamic < causal < quantum < kinetic."

**CONFIRMED, source mislabeled.** The ordering is in
`lib/.../natural-science-services-section/content/text/glossary/terms/{thermodynamic,causal,quantum,kinetic}-existence.md`
(strict, Scott, transfinite-bounded, aperiodic respectively). I did not find a note titled "distal-bypass" giving
this order; `Cohomology/DifferentialBypass.lean` is the Lean neighbour. The glossary topic cites a theorem
`four_regime_dichotomy` that does not exist in `Regime.lean` (it is `four_regime_flag_cases`); documentation drift.

### 1.1.5 Sheaf and cohomology

> "`Sheaf.lean` proves `H¹ = 0` in the finite regime and identifies it with CRDT/CALM convergence; `Regime.lean`'s
> `cohomologyVanishes` declares `H¹ = 0` for strict and Scott."

**The second half CONFIRMED; the first half WRONG in strength.** `Site/Sheaf.lean` proves
`Reading.joinList_congr (l l') (h : ∀ a, a ∈ l ↔ a ∈ l') : joinList l = joinList l'` and `joinList_cons_mem`:
the knowledge join of deltas depends only on the set of deltas. The docstring adds "This is exactly H¹ = 0 in the
finite regime." The real `H¹` statements are in `Cohomology/SettlingCohomologyH1.lean`, and the key
theorem there says its own gluing "holds **unconditionally** in this model ... with no dependence on `r` or `hr`":
`h1_vanishes (D : Cech1) : H1Vanishes D` for every Čech datum. So Lean proves `H¹ = 0` for a model in which it
cannot fail; the regime gate is the declared `cohomologyVanishes` table (`cohomologyVanishes_iff` proves
only the table's own rows). The non-zero side is a chosen witness: `Classification.aperiodicWitness` with a
`carrier` whose `clInv` is nonzero (`aperiodicWitness_clinv_nonzero`), and `clinv_dichotomy` says `cl-inv = 0` for
strict/Scott, "while in the aperiodic regime it can be nonzero (witnessed)", not a computed obstruction from a
closure. The note's own word "declares" is right; "proves" is not.

## 2. §1.2 algebra row, and the cascade direction

### 2.1 The row

> "| **algebra** | strict | FOUR, its two orders, nuclei, closures that are idempotent: proof-irrelevant, thin |
> `Positing/Four`, `NucleusAndCommutingNuclei`, `Settling`, `ClosureOrdinal`, `Closure/Monad` `kz_iff_strict` |
> SignCell (data) | PAM |"

Piece by piece:

* "FOUR, its two orders": **CONFIRMED.** `Language/Positing/Four.lean`: `klein_four`, `InterlacedBilattice`, `four_initial`,
  `four_rigid`, `negate_preserves_kle`, `conflate_reverses_kle`; `Reading := Articulating.Corner` definitionally
  (`reading_is_phase`). Antisymmetry of `≤ₖ`: `Reading.kle_antisymm` (`Language/Settling.lean`).
* "nuclei": **CONFIRMED** (§3.2), noting there are two independent definitions (`Positing/Bigraded.lean` private
  `HeytingAlgebra`/`Nucleus`/`NuclearSquare`, and `Calculus/Order` `Order.Nucleus`/`Order.CommutingNuclei`).
* "closures that are idempotent": **CONFIRMED but by field**: `structure Reading.Closure` has `infl`, `mono` and
  `idem` as *fields* (`Language/Settling.lean` lines 65 to 69). `Valuation.ModalFrame.closureOp_idem` proves
  idempotence of the one concrete instance, and the proof uses symmetry and transitivity of the access relation
  (`possibilize_const`, S5), with finiteness entering through list-based joins (`FiniteFibration`). So even in the
  instance, idempotence is bought by transitivity, not by finiteness as such.
* "proof-irrelevant, thin": **CONFIRMED for bare readings and valuations** (`Reading.kle_antisymm`,
  `Valuation.leK_antisymm`, `no_laxSlack_of_antisymm`); "proof-irrelevant" is a gloss (the Lean fact is that
  `ClAlgebraStructure : Prop`, so `s = t` is `rfl`, `closure_algebra_property_like`). It does *not* extend to
  the witnessed carrier (§3.3).
* The Lean anchors versus the regime. **This is the structural problem with the row.** By `Stage.regime`, the module
  family `Language/Positing/*` is the **positing** stage, regime **Scott**, which the note's own §1.2 assigns to *logic*.
  `Positing/Four`, `NucleusAndCommutingNuclei` (under `Language/Positing/`), `Evidence`, `Measure`, `Record`, `Quartet` are all
  stage-positing files. The only strict-stage file in the list is `Settling`. A careful statement is: FOUR is
  the finite base of every stage ("over the finite reading lattice the regime is always strict-finite",
  `Ordinal/Finite.lean` header), so FOUR itself is strict whichever stage uses it; but then "SignCell is the strict
  regime" is true of its *carrier* and false of what SignCell does with it (§4). The note should not cite file
  location as regime evidence. Conversely the note's logic row anchors `CurryHowardLambek`, `Hyperdoctrine`,
  `Equality`, `LinearLogicChu` (under `Language/Predicating/` or `Calculus/Logic/`) sit in the **predicating** stage,
  regime **transfinite-bounded**, which the note assigns to *language*. The one-step shift is a property of
  directory names, not theorems, but it shows file-to-regime placement in the note's table cannot be defended by
  the library's own stage table.
* "SignCell (data) ... PAM": the library mapping data/code/networking/systems to regimes is the house's AGENTS
  dependency order, not a Lean statement. UNSUPPORTED in Lean (fine as design, but then it is design, not
  discovered structure).

### 2.2 The spine, the cycle, and which way is "cascade"

> "The language spine ... runs **articulate → predicate → measure → settle**, and `Stage.regime` assigns those stages the regimes
> aperiodic → transfinite → Scott → strict. So the spine climbs the cascade *from geometry to algebra*"

**CONFIRMED as to the Lean order; the verb "climbs" is the note's.** `Spine.run` composes `articulate`, `predicate`
(`orientedCell`), `Obsmetrologia.measured` (inside positing), `settle`. `Regime.lean` says "Read along the spine the regime
descends, each stage's characteristic closure tamer than the one before it"; `RegimeCycle.spine_rank_table_descends
(s) (h : s ≠ settling) : s.next.regime.rank + 1 = s.regime.rank`. Direction is geometry-side to algebra-side, agreed. One more
point the note does not use: `Stage.next` closes the spine into a cycle `articulating → predicating → positing → settling →
articulating` of period four (`Stage.next_four`), and the return step is `settling.next = articulating`.

> "Realization runs the other way, *from algebra to geometry* ... Language is downstream of logic in this direction."

**UNSUPPORTED in Lean, and the nearest Lean statement is different.** The only ascent in the tree is
`return_rank_table_ascends : settling.regime = strict ∧ settling.next.regime = aperiodic ∧ strict.rank = 0 ∧ aperiodic.rank = 3`:
a single step from rank 0 straight to rank 3, not strict → Scott → transfinite → aperiodic. The ranks
(`ClosureRegime.rank`: strict 0, Scott 1, transfinite-bounded 2, aperiodic 3) are a table and give an order on the tower, but
nothing in Lean says realization visits them in order, or that logic (Scott) precedes language (transfinite) in
construction. The note labels the realization direction "Reading (not yet a theorem)" in §1.3, which is accurate;
it should say the same about the rows' *order*, not only the "perception is the spine" gloss. Also worth flagging
as a possible backwards: in the spine, **predicating (the note's language row) comes before positing (the note's
logic row)**, so in spine direction language precedes logic; the note's "language downstream of logic" holds only
in the reversed reading.

### 2.3 The Rosetta citation

> "the 2026-04-06 Rosetta table (`.../gaming-services-section/.../2026-04-06-note-on-pws-core-systems-design.md`:
> "Computation (Algebra) | Logic (Language) | Topology (Geometry) | Physics (Dynamics)", with settlement = term
> normalization = cut elimination = sheafification = equilibration) supports the same order"

**WRONG as support.** The table (re-read at its source, lines 54 to 65) has four columns, but they are
*Algebra, Logic-(Language) as one column, Geometry, Dynamics*. It does not separate logic from language, and its fourth
column is physics/dynamics, not an aperiodic regime. Its row "Settlement" is described by the note itself as "the
SAME operation in four registers ... the algebra already does everything in all four modes simultaneously". That is a
simultaneity claim (four readings of one operation), the opposite of a strict-to-aperiodic cascade of distinct
closure behaviours. It supports "algebra, logic, geometry, dynamics are four registers" and "Curry-Howard-Lambek in
Rosetta terms = the first two columns identified"; it does not support the four-regime order. And its R1 to R23 system
(`σ(σ(M))→σ(M)`, `Δ(Δ(M))→Δ(M)`, `σ(Δ(M))→Δ(σ(M))`) is stated for nuclei, which are idempotent in Lean; see §3.5.

### 2.4 "Regime" is declared in the library, twice

`RegimeCycle.spine_rank_table_descends` is followed by: "-- OPEN: that the spine's passage descends a tower of closure
ordinals. Needs regimes derived from closures in place of the declared `Stage.regime` table." and the module's
`gap_flags_iff_upper_rank` is "a finite check of two tables, not a theorem about closures". The note's §1.1 to §1.2
treat the tower, the stage column and the cohomology column as established structure; the library says they are tables.

## 3. §1.4, the sigma/Delta correction, kz_iff_strict, bare versus witnessed

### 3.1 The statements, exactly

`Closure/Monad.lean`:

```
theorem kz_iff_strict (f : Reading → Reading) (hf : ∀ a, KLE a (f a)) :
    (∀ a, KLE (f (f a)) (f a)) ↔ (∀ a, f (f a) = f a)
```

Proof: three lines, `kle_antisymm` against inflation. The hypotheses are: a map on the **finite** type `Reading`, inflationary.
No Scott hypothesis, no regime, no 2-category. Generalisations with the same content:
`LaxSlackDiagnosis.kz_strict_of_antisymm` / `kz_iff_strict_of_antisymm` (any relation), `ModalFrame.closureOp_kz_iff_strict`
(valuations), `LaxSlack.no_laxSlack_of_antisymm` (any `PreValueCategory` with antisymmetric `le`).

> "`Closure/Monad.lean`: the closure 2-monad `Cl` is KZ (Kock–Zöberlein), lax-idempotent: `μ ⊣ η_Cl` with identity counit,
> so being an algebra is a property, not data. `kz_iff_strict`: **on the antisymmetric knowledge order**, the KZ inequality
> `f (f a) ≤ₖ f a` is equivalent to strict idempotence."

* The KZ equivalence: **CONFIRMED**, exact statement above.
* "the closure 2-monad is KZ ... `μ ⊣ η_Cl`": **UNSUPPORTED as a theorem about a 2-monad.** `Monad.lean`'s `mult` and `counit_triangle` are both
  `c.idem`. `Monad/KZ.lean` states `closure_kz_lax_idempotent`, a four-conjunct bundle whose conjuncts are inflation,
  idempotence, idempotence twice, and the KZ inequality (which "follows from idempotence and reflexivity of `leK`", `closureOp_kz_le`). There is
  no 2-category, no adjunction object, no unit/multiplication as morphisms: `KZ.lean` itself says it models the 2-monad
  "1-categorically over the thin valuation poset". "Property, not data" is `closure_algebra_property_like`, whose second
  conjunct `∀ s t : ClAlgebraStructure M v, s = t` holds because the structure lives in `Prop`.
* The quoted gloss "In a thin 2-category (a poset) antisymmetry forces strict; the 2-cell `μ` only survives where antisymmetry fails"
  is accurate to the docstring, **but the note omits the docstring's next clause**: "(the aperiodic regime, κ ≥ ω₁, where the
  orbit never stabilizes and carries all KZ-diamond 2-cell data)". `KZ.lean` says it twice more: "the non-identity `μ` survives only
  transfinitely/aperiodically" and "the lax `μ` carries content only in the higher regimes".

### 3.2 The nuclear statements

> "a nucleus is extensive, idempotent, meet-preserving; two commuting nuclei make `π = j₁ ∘ j₂` a nucleus with
> `Fix π = Fix j₁ ∩ Fix j₂`, the four corners `(A, Fix j₁, Fix j₂, A*)`"

**CONFIRMED.** `Calculus`-side `Order.Nucleus` fields `j`, `infl`, `idem`, `meet` and `Order.CommutingNuclei.compNucleus`,
`fix_pi_iff : Q.pi a = a ↔ (Q.j1.j a = a ∧ Q.j2.j a = a)`, `NuclearQuartet := CommutingNuclei`, `cornerOp`,
`stable_iff_potential_and_active` (in `Language/Positing/NucleusAndCommutingNuclei.lean`; the same theory with its own
types in `Positing/Bigraded.lean`). Important for §3.4: **`idem` is a structure field of every Lean `Nucleus`**
(both versions). `Quartet.lean` states the depth difference explicitly: "at articulating the pair are INVOLUTIONS (∼∘∼ = id, −∘− = id); at
settling they are IDEMPOTENT NUCLEI (j∘j = j)". There is no lax nucleus type in the library; the only lax structure is
`Positing.Value.LaxVClosure` (inflation, monotone, KZ; no meet-preservation), on a `PreValueCategory`.

### 3.3 The history nuclei of Autopoiesis

> "`AperiodicOrder/Tiling/Autopoiesis.lean`: the aperiodic regime carries two commuting nuclei filtered **by history**: `σ_t`
> saturating (past-facing: the largest element whose restriction profile across proper sub-histories is below that of `a`) and `Δ_t`
> transferring (future-facing: the least element already witnessed in every independent one-step extension)."

**UNSUPPORTED as Lean; CONFIRMED as docstring.** The formulas are in the module docstring (`σ_t(a) = ⋁{ b | ρ_{t₀}(b) ≤ ρ_{t₀}(a) ∀ t₀<t }`, `Fix(Δ_t) = ⋂_{s⊥t} image(H(i_{s,t}))`).
The Lean is:

```
def saturating  {H} (Q : Order.CommutingNuclei H) : Order.Nucleus H := Q.j1
def transferring {H} (Q : Order.CommutingNuclei H) : Order.Nucleus H := Q.j2
```

with the docstring "`(σ, Δ)` is modeled as an abstract `Order.CommutingNuclei H` (`σ = j₁`, `Δ = j₂`)". No history, no
restriction, no one-step extension is defined anywhere. The Axiom of History Separation is `HistorySeparationForcesAperiodicity`, "Stated without
proof (open)", and `varying_family_beside_aperiodic_witness` says of its three conjuncts "Three facts with no map between them". The same
file contains `readingNuclearPair (c1 c2 : Reading) : Order.CommutingNuclei readingHeyting`, described as "A worked `(σ, Δ)` example: raising toward `c₁`
is `σ`, raising toward `c₂` is `Δ` ... a faithful finite model of the commuting-square structure, the same one `Positing.Bigraded.Reading.joinSquare`
instantiates." So **inside Lean, pair 2 (Bigraded) is presented as an instance of the abstract interface that pair 1 (Autopoiesis) names**; what
is not proved is that the *history-filtration* interpretation is realized by any Heyting algebra. The note's "must not be identified without proof"
is right; its description of pair 1 as something defined overstates what is there. Because both are idempotent nuclei by field, the aperiodic regime's
non-stabilization cannot come from these σ and Δ.

### 3.4 The founder's correction

> "The founder's correction: σ and Δ are idempotent **only in the finite regime**; in the Scott regime they are **KZ-lax idempotent**,
> and that is why there is a finite regime at all."

**Against the library as written: WRONG on "KZ-lax in the Scott regime"; CONFIRMED in a weaker form that is not the same claim.** Evidence, strongest first:

1. `Monad/KZ.lean`: `theorem strict_regime_mu_identity (d : ClosureRegimeData) (hd : classify d = strict ∨ classify d = scott) (v) : closureOp M (closureOp M v) = closureOp M v`
   and `mu_identity_of_cohomologyVanishes`. Its heading: "`μ` is the identity in the low regimes ... in the strict (`κ<ω`) and Scott (`κ=ω`) regimes the
   lax `μ` reduces to the identity". (The proof ignores `hd`: both cases are `closureOp_idem`. The regime hypothesis is decoration.)
2. `Positing/Bigraded.lean` header: "the closure-2-monad `Cl` (KZ, lax-idempotent; **strict only when Scott-continuous, κ=ω**)". That is the
   classical lax + Scott-continuous gives strict reading, the *reverse* of "KZ-lax in Scott".
3. `Closure/Monad/LaxSlack.lean`: `mu_content_exactly_at_valued_gate`; the only inhabited `HasLaxSlack` is `Record.tally_lax_slack`, "sitting exactly at the
   cohomology-non-vanishing aperiodic gate". `RegimeGate.aperiodic_gap_matches_lax_slack : HasGap aperiodic ∧ HasLaxSlack tallyLaxClosure germPreValue.bot`.
   `Record.lean` section header: "The aperiodic regime requires a non-antisymmetric carrier".
4. `ChromaticLorentzian.lean` states the Scott-height example outright: the `ModalFrame` closure "is **idempotent** (the strict-finite regime, `closureOp_idem`)";
   the chromatic-Lorentzian `step` is **non-idempotent** (`step_not_idempotent : step (step mark0) ≠ step mark0`) with `settle` its idempotent
   limit at "`κ = ω`" (prose; the module never mentions `classify`).
5. `Record.succPos` (tally increment) is inflationary and monotone with `iter succPos (k+1) r ≠ iter succPos k r` (`iter_succPos_ne`), `Scott` rung of `regime_tower`.

What survives of the founder's sentence: **in the finite regime a one-step operator and its closure coincide** (`Settling.settle c seed = c.op seed`,
"For a closure the orbit stabilizes in one step (the finite-regime confluence ◇□ = □◇)"), whereas at Scott height the one-step operators are
**non-idempotent steps whose idempotence is only reached at the ω-limit** (4, 5). That is a real regime difference and it is the plausible meaning of
"idempotent only in the finite regime". It is not "KZ-lax idempotent", for a precise reason: the KZ inequality is `step (step a) ≤ step a`; with inflation
this makes `step² = step` on any poset by `kz_iff_strict`. The Scott-height steps satisfy the *opposite* strict inequality (`step² ≥ step`, strictly
at `mark0`), so they are not KZ at all. To obtain a lax slack one needs a **preorder that is not a partial order**, which is exactly how the library
builds its only witness (the germ order, aperiodic). Therefore "that is why there is a finite regime at all" is not derivable from `kz_iff_strict`: that
theorem holds on every antisymmetric carrier in every regime (`LaxSlack.mu_content_exactly_at_valued_gate` says the antisymmetric `ModalFrame` carrier
"can never realize lax slack at any regime (the gate is causally inert there)"). **Recommended wording for the founder:** keep the correction, state it as
"one-step σ, Δ are idempotent only where step = closure (finite); at Scott height they are non-idempotent steps with idempotent limits; KZ-lax slack
requires a non-antisymmetric carrier and the library currently places it at the aperiodic rung", and ask whether he wants the library's placement of slack
changed or his sentence adjusted. I have not decided that for him.

### 3.5 Bare reading versus witnessed carrier

> "on **bare readings** the knowledge order is a finite poset, antisymmetric, so KZ collapses to strict; that is the algebra, proof-irrelevant. On
> **witnessed** carriers (a cell with its for/against witness sets, a derivation term, a `CValuation`) two objects with the same reading are different
> data, antisymmetry fails as data, and re-closing is related to closing by a 2-cell, not an equation."

* Bare half: **CONFIRMED** (`kle_antisymm`; `Valuation.leK_antisymm`; `no_laxSlack_of_antisymm`).
* Witnessed half: **UNSUPPORTED and, in the form given, WRONG.**
  * `Valued` (`Language/Positing/Evidence.lean`) is `structure Valued where value : Reading; evidence : Slot × Slot` with `Slot := List Token`.
    It has **no order, no preorder and no closure**. `CValuation := PredicationCell → Valued` (`Language/Settling/Cones.lean`) likewise. The
    closure on witnessed data in Lean *forgets the witnesses*: `CValuation.settle c v φ := Reading.settle c (v φ).value`,
    `brim ... := Reading.settle c (Valued.presumeFree (v φ)).value`. So there is no Lean σ on a witnessed carrier to be lax.
  * The natural order on witnesses is list/set inclusion, which is antisymmetric on sets (`FCA.subA_antisymm`, via `propext`), and in the JS the sides are sets (`cell.mjs`
    `side()`: dedup, sort by canonical bytes). "Two objects with the same reading are different data" is true, but antisymmetry fails only for the *pulled-back
    preorder* `x ≤ y := reading x ≤ reading y`, which no Lean definition builds and which would discard exactly what makes the carrier witnessed.
  * The one non-antisymmetric carrier is `Record.germPreValue`: **sequences** `Nat → Record` of tally pairs under `DomBy` (bounded-difference domination),
    `Record.germ_order_not_antisymm : ∃ s t, DomBy s t ∧ DomBy t s ∧ s ≠ t`. Its elements are growing counts, not witness sets, and its regime is aperiodic.
  * "a derivation term": no Lean statement (the term calculus is in `CurryHowardLambek`, with no closure on terms and no order).
  * "proof-relevant": the nearest Lean fact is the *absence* of any proof-relevant order.
* "the Rosetta note's reduction system makes the 2-cells concrete: R1 `σ(σ(M)) → σ(M)` and R2 `Δ(Δ(M)) → Δ(M)` are written as oriented rewrites ... In the
  finite regime those rewrites are equalities; in the Scott regime they are the multiplication 2-cells, and the strongly normalizing, confluent R1–R23 system is
  what makes the lax structure coherent." **UNSUPPORTED.** The source (`2026-04-06-note-on-pws-core-systems-design.md`, lines 34 to 44) lists R1 to R23 and asserts
  "Sound, strongly normalizing, confluent" with no proof, and applies them to nuclei (σ, Δ idempotent by definition). The rewrite `σ(σ(M)) → σ(M)` has the
  same term on the right as the nucleus law's image, so nothing in the text makes it a 2-cell rather than an oriented equation, and the regime assignment
  "equalities in finite, 2-cells in Scott" is the note's own. There is no Lean for R1 to R23 (a search for a nuclear-language reduction system finds only
  `docs/verso/.../PositingSymmetryTower.lean`; Church-Rosser is proved for the simply-typed λ-calculus, `CurryHowardLambek.church_rosser`, which has no σ or Δ).
* "Lean target: exhibit a Scott-regime carrier (witnessed valuations over an infinite base) on which σ is KZ-lax and not strict, and prove R1/R2 are its `μ`." See §6, target 1.

### 3.6 The census of pairs

> "Three different pairs are called σ, Δ in this tree"

**WRONG on the count; the count is at least five, and the note's reason for caution is right.**

| # | Where | What it is | Idempotent by | Order | Nucleus? |
|---|---|---|---|---|---|
| 1 | `AperiodicOrder/Tiling/Autopoiesis.lean` `saturating`/`transferring` | abstract `Q.j1`, `Q.j2` of an `Order.CommutingNuclei H`; history formulas in docstring only | `Nucleus.idem` field | n/a (abstract `H`) | yes, abstract |
| 2 | `Positing/Bigraded.lean` `Reading.joinSquare c1 c2`; `Autopoiesis.readingNuclearPair` | raise toward constants `c1`, `c2` by `∨ₖ` on FOUR's knowledge Heyting algebra | field + `cases` | knowledge | yes (proved) |
| 3 | `signcraft/src/inference/nuclei.mjs` `sigma`, `delta` | DG-basis closure of a signed row; Galois transfer | not stated as a law; tested for the composite | knowledge | **no** (§5) |
| 4 | `Positing/FiberAlgebra.lean` `sigma`, `delta`, `sigma_delta_comm` | `nucleusToward tTop`, `nucleusToward kTop`: `joinT s ·` on the *valuation fibre*, truth order | `nucleusToward_idem` | **truth** | yes (proved) |
| 5 | `Positing/BigradedTower.lean` `tower : K4 → NuclearSquare`; `Quartet.commutatingPair` | graded family of same-order squares; generic `CommutingPair` | field | knowledge, graded by truth | yes |

The note names 1, 2, 3 and cites `FiberAlgebra` only through the JS comment and `cross_order_not_knowledge_nucleus`; it misses that **`FiberAlgebra` itself defines
literal `sigma` and `delta`** (item 4), which is the pair that has `σΔ = Δσ` proved (`sigma_delta_comm`). The three nearest are in different orders (4 truth, 2 and 3
knowledge) and `cross_order_not_knowledge_nucleus` is a theorem separating 4 from 2 and 3: `∃ v, ¬ fLeK v (fun φ => joinT kBot (v φ))`.

> "`BigradedTower.tower_bigrading_is_two_orders` shows the second order must enter as a grading axis, not a co-nucleus."

**CONFIRMED with qualification.** The statement is `(∀ g : K4, toFourCorner g = (knowledgeBit g, truthBit g)) ∧ (∃ v, ¬ fLeK v (...joinT kBot...))`; the first conjunct is
`rfl` and the second is `cross_order_not_knowledge_nucleus`. The "must" is the file's interpretation of those two facts, not a theorem of the form "no second nucleus exists".

> "`FiberAlgebra.cross_order_not_knowledge_nucleus` already shows a truth-closure is not a knowledge nucleus"

**CONFIRMED** (exact statement above; witness `meetK kTop (joinT kBot kTop) ≠ kTop`).

> "Whether pair 3 is an instance of pair 1 ... is an open identification, and until it is proved, pair 3 is only valid where its idempotence is: the strict regime."

**The identification is not open: it fails.** Pair 1 is an `Order.CommutingNuclei`; a nucleus is meet-preserving and (via `Nucleus.mono`) monotone. §5 shows the JS Δ is not monotone
and the JS σ is not meet-preserving, so neither is a nucleus on any carrier that makes their definitions typecheck. The surviving question is whether σ and Δ are
*closure operators* (inflationary, monotone, idempotent) on a suitable lattice; σ is (I could not break it), Δ is not.

## 4. §3.1, FCA

> "`Calculus/Order/FormalConceptAnalysis.lean` proves the derivation operators form a Galois connection, `closeA = primeB ∘ primeA` is a closure, and concepts form a
> complete lattice (Boolean case)."

**CONFIRMED.** Statements: `primeA I A := fun m => ∀ g, A g → I g m`, `primeB`; `prime_adjunction : subA A (primeB I B) ↔ subB B (primeA I A)`;
`closeA_mono`, `subA_closeA`, `closeA_idem`; `derivation_galois_connection`; `conceptCompleteLattice I : Order.CompleteLattice` with `sSup := familyJoin`;
`conceptLatticeData`. Qualification the note should carry: the context is `I : G → M → Prop` for **arbitrary types** (no `Fintype`, no finiteness), so the module is not
"finite"; and `closeA` is stated on the *object* side (`closeM` is the attribute-side closure used for implications).

> "`FCALambekCircle` edge (1): **FCA closure is settling closure** ('computing formal concepts is running the settling closure on a finite formal context')."

**UNSUPPORTED as stated; the theorem is a shape match.** `fcaClosureOp I : FCA.ClosureOp G` and `fca_closure_laws` prove extensive, monotone, idempotent for `closeA`.
The docstring itself says "settling-*shape* closure operator". No theorem relates `closeA` to `Reading.Closure`, to `Settling.settle`, or to any iteration; the carrier is the
powerset, not `Reading`; "finite" appears only in prose. What would make it a settling statement: a `Reading`-valued presentation of the powerset (e.g. an attribute set as a
function `M → Reading` ordered by knowledge) and a proof that `closeM` is `Valuation.liftOp`-compatible; none exists.

> "An attribute implication `B₁ ⟹ B₂` holds iff `B₂ ⊆ closeM B₁`"

**CONFIRMED**: `implies_iff_closeM : implies I B1 B2 ↔ subB B2 (closeM I B1)`.

> "the Duquenne–Guigues basis is the canonical finite presentation of the consequence operator an incidence induces."

**UNSUPPORTED in Lean.** A search for `Duquenne`, `pseudo-intent`, `canonical basis` over `Obsmetrologia/` finds nothing relevant. The DG basis is classical and the JS computes it
(`metrologic/src/closure/formal-context.mjs` `dgBasis`, Ganter's Next Closure), but nothing in Lean states that a set of implications is sound, complete, minimal or canonical
for `closeM`. Also note the JS uses `lawfulBasis`, which **drops implications whose premise has empty extent** (`extent(ctx, imp.from).size > 0`), deviating from the canonical basis to
avoid ex falso; the Lean side keeps ex falso (`implies` is vacuous for unrealized premises). Any golden-vector comparison has to account for that.

> "FCA is how evidence (algebra) becomes a theory (logic): **learning a logic is computing the implication basis of the evidence**, which is what `signcraft/src/inference/learn.mjs` does
> with metrologic's `formal-context`."

JS half **CONFIRMED**: `learn.mjs` `induceBasis(objects, attributes, pairs)` builds `makeContext`, then `lawfulBasis(ctx)`; the header says "The Duquenne–Guigues basis is INDUCED from witnessed
incidence". "algebra to logic passage" is **UNSUPPORTED** as a theorem and is interpretive; in Lean FCA lives in `Calculus/Order` and is regime-free. Note that in `learn.mjs` the induced
rules are used with `settle`, whose Δ is non-monotone (§5), so "inference = closure under the induced basis" is not literally a closure-operator statement in the JS.

> "Not proved: Belohlavek's many-valued FCA over a residuated lattice (prose in the module); for this library the case that matters is incidence valued in FOUR, i.e. the predication Chu space of
> `FregeanFourChu` read as a two-lane context."

* "Not proved ... prose": **CONFIRMED** (module header: "That generalization is documented here in prose; the **Boolean case `L = 2`** ... is what we prove").
* "the predication Chu space of `FregeanFourChu` read as a two-lane context": **UNSUPPORTED.** `FregeanFourChu.lean` proves `predicationChu : ChuSpace` with `pts := PredicationCell`,
  `sts := Valuation`, `r claim valuation := valuation claim`, and `fregean_predication_forces_four_and_chu` (three finite correspondences: evidence round trip `Bool × Bool ≃ Reading`, reading exhaustive,
  `chu_carries_reading`). `LinearLogicChu.lean` does not mention FCA or concepts, and `FormalConceptAnalysis` does not import Chu. The "two-lane context" is the standard attribute
  dichotomisation (the JS `makeContext` does exactly that: `A = M ⊔ ¬M`), and `independentEvidenceReading_slots` is the right lemma for its objects, but there is no Lean construction. What would be needed:
  (i) a definition `twoLane (J : G → M → Reading) : FCA context on G × (M ⊕ M)` with `I g (inl m) := (J g m).pos`, `I g (inr m) := (J g m).neg`; (ii) a theorem that `closeM` of this context agrees with
  the Chu-space orthogonality closure of a `ChuSpace` whose matrix is `J`; (iii) compatibility with `ChuSpace.dual` (transpose composed with `Reading.negate`) swapping the two lanes. Note that `predicationChu`'s states are
  *all valuations*, a function space, not a finite object set.

## 5. §4 item 1 and §5, the SignCell program and the code claims

### 5.1 §4 item 1

> "**Predication algebra model (SignCell, strict).** State: a valuation of predication cells by FOUR readings, *measured* from a trace of articulatings (never supplied: `Spine.run`), each cell carrying
> its witnesses and its content address; nuclear squares per fiber; the K₄ gauge; FCA contexts as predication Chu spaces (`FregeanFourChu`). Proof-irrelevant: settles to a fixed point in at most three steps on the spine."

Claim by claim:

* "valuation of predication cells by FOUR readings": **CONFIRMED** (`abbrev Valuation := PredicationCell -> Reading`, `Positing/Valuation.lean`).
* "*measured* from a trace of articulatings (never supplied: `Spine.run`)": **CONFIRMED for `run`/`runTrace`/`measure`; qualified.** `Spine.runSupplied` exists and "admits a caller-supplied `Reading` (`posit`)". The Lean also needs a
  `Contradictory` involution `k` as a parameter to `measure`; denial is measured as articulation of the contradictory cell (`no_denial`), never supplied. See §5.2.
* "each cell carrying its witnesses": **CONFIRMED in `Valued`; qualified.** Lean witnesses are `List Token` collected in trace order (`witnesses ψ trace`), with duplicates retained; `Valued.joinK` appends lists
  (`evidence := (x.evidence.1 ++ y.evidence.1, ...)`), so it is not idempotent on evidence; `Evidence.lean` calls this "lossless".
* "its content address": **UNSUPPORTED in Lean**: there is no content-address notion (ni, CBOR, SHA-256) in `Obsmetrologia`. It is JS-only (`cell.mjs` `address = semanticId(triple(value))`). The note's §2 table puts it next to Lean anchors, which is misleading.
* "nuclear squares per fiber": **CONFIRMED** (`SquareFamily`, `Varies`, `fiber_quartet`; `varyingFamily_varies`). Nothing in SignCell uses them.
* "the K₄ gauge": **CONFIRMED** (`Gauge.lean`: `K4`, `isGroup`, `cayley`, `gaugeAct : K4 → Valuation → Valuation`, `gauge_fixes_inconsistency`, `paraconsistent_gauge_stable`, `classical_gauge_moves`).
* "FCA contexts as predication Chu spaces": **UNSUPPORTED** (§4).
* "Proof-irrelevant": gloss; see §2.1.
* "settles to a fixed point in at most three steps on the spine": **WRONG as a statement about `Spine`.** `Spine.settle closure m` applies `closure.op` *once* (`Reading.settle c seed := c.op seed`) because `Reading.Closure` is idempotent by field; `settle_reading_fixed`
  is `c.idem`. The "at most three steps" theorem is `Reading.settles_by_three` for arbitrary inflationary endomaps and is used by `Spine` only through `spine_settles_by_three` in `Regime.lean`. Both are fine; they are different statements.
* **Regime of what SignCell does.** `Spine.run` composes `articulate` (aperiodic stage), `predicate` (transfinite-bounded), measurement (positing, Scott) and `settle` (strict). If SignCell owns the spine, as this item says, it is
  not "strict" in the library's own stage table; if it is "strict", it owns only `settle` and FOUR. The note needs to choose, and §2.2 of the note ("the spine climbs from geometry to algebra") then means SignCell's
  *input* side is the geometry end of the cascade, which sits badly with assigning geometry to SignCraft.

### 5.2 §5, "Algebra."

> "SignCell's cell is real (triple + FOUR + witness sets, content-addressed, join-semilattice merge)"

**CONFIRMED** in `signcell/src/cell.mjs`: triple `(subject, predicate, object)`; `side(witnesses)` dedups by canonical bytes and sorts, so sides are sets; `merge(left, right)` requires `sameCell`,
unions both sides, and sets the value to `knowledgeJoinReading(valueOf(left), valueOf(right))` (Lean `Valued.joinK` on values); `address = semanticId(triple(value))`, "Evidence never enters it". Qualification: this is a
**deliberate departure** from Lean's evidence as lists with duplicates (`Valued.joinK` appends, so `joinK x x` doubles witnesses). JS merge is idempotent on witnesses; Lean's is not. The Lean statement that supports the JS
design is only for bare readings (`Reading.joinList_congr`: join depends on the set of deltas, not order or multiplicity). A golden-vector comparison for `Valued.joinK` would fail on evidence unless the Lean side
is changed to sets or the vectors compare `presence` and `value` only. The JS also writes a `value` only when it differs from `presence` (so absence of the key *is* `Measured`), which mirrors `Valued.Measured` well.

> "`Spine.run`'s discipline (measure, never accept a supplied reading) is not enforced"

**CONFIRMED, with the precise gap.** (a) `cell(s, p, o, {for, against, value})` and `evidence({... value})` accept any FOUR reading as `value` (via `written`); nothing computes a reading from a trace; there is no `measure`
in `signcell/src`. Lean's `Valued` structure also admits a free `value`; its discipline is that `Spine.run` goes through `measure`. (b) **`against` witnesses are accepted directly** (`cell(..., {against: [...]})`, `witnessAgainst`),
which Lean forbids at the spine: "There is **no denial primitive**: `no_denial` shows the only way a cell's reading carries a negative pole is that some articulating in the trace landed on the contradictory cell"
(`Positing/Measure.lean`, `no_denial`, `measure_contradictory_negate`). The JS has no `Contradictory` involution on claims (grep for `contradictor` in `signcell/src` finds only a description string in `semantic-carriers.mjs`). That is the
sharper form of the note's finding. (c) The sanction: Lean permits supplied readings through `runSupplied`/`posit` ("constructs no admission"), so "never accept" is stronger than Lean.

> "a reading's regime is not carried"

**CONFIRMED** for SignCell: no import of regimes. Correction: the data layer already ships the four names. `computer-data-engineering-services-section/src/closure-regime.mjs` exports `closureRegimeNames`, `regimeCost`,
`regimeDecidable`, `costlierRegime`; `signcell` depends on that package but does not use the module (only `signchain/src/contracts/phase.mjs` imports it). **Its header cites Lean names `regimeCost` and `regimeDecidable`
that do not exist in the Lean tree** (a search finds neither). The Lean counterparts are `ClosureRegime.rank` and `ClosureRegime.costlier` (`RegimeCycle`, `RegimeComposition`).

> "the nuclear square is not a first-class object"

**CONFIRMED** (no nucleus code in `signcell`). In `signcraft` σ and Δ exist as functions but not as a square with `Fix`, corners or `π`, and they are not nuclei (below).

Further SignCell gap not in the note: **articulation is depth zero only.** `cell.mjs articulate(token, claim) = cell(token, claim, token, {for: [token]})` builds only the reflexive seed. `utterance.mjs` has
`articulatingPair`, `articulatingHead`, `articulatingDepth`, `articulatingFloor`, but nothing equivalent to Lean's `Articulating.orientedCell` (`⟨u.token, u.claim, a.head.token⟩` for `pair u a`, `Language/Predicating/Oriented.lean`),
so cells with distinct subject and object are never produced by articulation (`Spine.predicate_oriented`, `Articulating.orientation_generated` are unrealized). The four predicate generators (`Generator.all`) are matched
by `converse`, `subjectProjection`, `objectProjection`, `specialize` in `cell.mjs`.

## 6. §6, the Lean targets

**Target 1.** "A Scott-regime carrier (witnessed valuations, infinite base) where σ is KZ-lax and not strict; R1/R2 as its multiplication 2-cells; R1–R23 coherence as the lax structure."

**UNSUPPORTED, and as phrased it requires material the library does not have or contradicts.** Reasons and what is needed: (i) a `LaxVClosure` with `HasLaxSlack` requires a non-antisymmetric `PreValueCategory`
(`genuine_lax_cone_needs_non_thin_carrier`); witnessed valuations under an inclusion order are antisymmetric, so the carrier must be built on purpose (a preorder pulled back along `value`, or the germ order). (ii) "σ" must then be a
lax *nucleus* (add a lax meet law); no such structure exists, and the nucleus laws in Lean are strict. (iii) "Scott regime" cannot be proved of the carrier: it can only be *declared* by supplying `ClosureRegimeData` flags, since
`classify` reads flags (`Closure/Scott.regimeData`); `IsScottContinuous` is defined only for `Reading.Closure`, so one must first define Scott-continuity for a closure on a `PreValueCategory` over directed families and show the
lax-slack witness satisfies it. This is where the classical result bites: lax-idempotent + Scott-continuous gives strict is what the library's own prose claims; the target would have to refute that prose. (iv) R1/R2 as `μ`: needs
the R1 to R23 system formalised first (§3.5). A tractable replacement the library supports: take `tallyLaxClosure` on `germPreValue` as the existing inhabited slack, state its regime honestly as aperiodic, and add a *separate* Scott-height
theorem for the non-idempotent step with idempotent limit (`Record.succPos` or `ChromaticLorentzian.step`) tied to `classify` through an explicit `ClosureRegimeData`.

**Target 3.** "Many-valued FCA over FOUR (Belohlavek, presently prose)."

**CONFIRMED as a gap** (module prose). Needs `Order.ResiduatedLattice`-valued incidence in `FormalConceptAnalysis`; note `ResiduatedLatticeStandalone` is already imported there. The FOUR case is not a residuated *lattice*
in the integral-commutative sense used by `lambekOfResiduated` unless one uses the two-lane reduction of §4, which keeps incidence Boolean. That reduction (Boolean contexts on `M ⊔ ¬M`) is likely the cheaper route and
sufficient for the JS, since `makeContext` already does it.

**Target 4.** "Identify or separate the JS σ/Δ (DG closure, Galois transfer) and the `Autopoiesis` history nuclei."

**Resolvable now, in the separating direction.** The JS pair is not an `Order.CommutingNuclei` (§5). To *close* the question: prove in Lean that DG-style Horn closures are not meet-preserving (`a → c`, `b → c` over a three-object
context is the counterexample, §5) and that the guarded Galois transfer is not monotone. What remains open is the correct statement: σ is a closure operator on the lattice of sets of signed attributes; Δ becomes a closure operator
only if the guard `extent(held) = ∅` is dropped (then it is plain `closeM`, a Lean-proved closure), at the cost of ex falso. The research decision is between the guard (local contradiction, non-monotone) and monotonicity. Also: the note's census of three pairs must become five (§3.6).

**Target 7.** "Regime-tagged readings: the 'transfinitely-valued' value as a reading paired with its regime classification, with the passage laws between regimes."

**PARTLY ALREADY IN THE LIBRARY; the note missed it.** (a) Tagged object: `AperiodicOrder/Tiling/Classification.lean` `structure Settling` has `regime : ClosureRegime` and `carrier : H1Carrier`, with the vanishing constraint
(`cohomologyVanishes regime = true → carrier.clInv = H1Class.zero`); `Language/Positing/Value/Category.lean` has `regimeOf V T d := classify d`, `four_regime_v_independent`. Neither pairs a `Reading` with a regime, and in both the regime is a supplied
field or flags. (b) Passage laws: `Closure/RegimeComposition.lean` `ClosureRegimeData.both`, `classify_both_ge`, `classify_both_eq_costlier`, `classify_both_jump` (Scott with uncountable cofinality run with transfinite-bounded is aperiodic): a composite is never cheaper than its
costlier part, with one proved jump case. `Closure/RegimeCycle.lean`: `Stage.next`, `ClosureRegime.rank`, the spiral and the "ahead certificate". `Closure/RegimeGate.lean`: `HasGap`, `gap_matches_nonvanishing`, `cohomologyVanishes_derived`. These are the
available passage laws, and `classify_both_ge` is directly relevant to the architecture: **a system composed of SignCell, SignChain, SignGraph has a regime at least that of its costliest component**, which fits the AGENTS composition order but makes the claim
"SignCell is strict" a statement about SignCell alone. (c) The JS `closure-regime.mjs` (names, cost, `costlierRegime`) is the natural home for a tagged-reading type, with the Lean citation fixed.

## 7. What the note missed that matters for realizing the library, in this regime

1. **JS Δ is not monotone and JS σ is not meet-preserving** (§8). Consequences: no `Order.Nucleus` instance; `Valuation.lfp_is_settled` and `Closure.mono`-based theorems (`settleLift_least`, `closure_merge`) do not apply to `settle`'s σ∘Δ; the settled value depends on iteration order in general, which breaks the CALM
   reading the note builds on in §2 (coordination-free planning) unless Δ is repaired.
2. **The test the note leans on does not assert commutation.** `signcraft/test/inference/commutation.test.mjs` counts `σΔ = Δσ` and logs it; the `assert` is `(σΔ)² = σΔ` on 60 seeded contexts. My independent 400-context run
   found commutation in every case and composite idempotence in every case, so the claim is probably true on this generator, but "commutation asserted numerically in tests" is inaccurate: it is measured, not asserted.
3. **Lean's no-denial rule and `Contradictory`** are the real content of "never supply a reading" and the JS violates them (§5.2).
4. **List versus set evidence** (§5.2) is a golden-vector hazard.
5. **Closure on witnessed data forgets witnesses in Lean** (`CValuation.settle`, `brim`), and the unit/counit cone pair `settle ≤ brim` with `Void` is the only existing Lean structure for witnessed settling, with `cancelled_not_void` and `oneSided_void` as the cases. It is the proper starting
   point for any witnessed-carrier theory, much closer than lax slack.
6. **`Closure/Operator.lean`** gives algebra-level laws the JS settle should mirror and does not: `liftOp_idem`, `closure_merge : cl (joinK (cl X) Y) = cl (joinK X Y)`, `lfp_is_settled`, `no_periodic_orbits`, `CNaturalFamily` with `c_natural` (closure commutes with reindexing).
   These need `mono`; see item 1.
7. **`ModalFrame` is S5 (reflexive, symmetric, transitive) over finite fibres** (`Closure/Modal.lean`); its closure equals `◇` on equivalence classes (`closureOp_eq_possibilize`). The "settling closure ◇∘□" of the docstrings is `◇` in the one instance.
8. **The library has a `sorry`**: `Closure/Collatz/SemigroupGap.lean:406`, `theorem parentBarrierGap_holds : ParentBarrierGap := by sorry`, imported by `Closure.lean` through `Closure.Collatz.SemigroupGap`. The note's §0 claims "no `sorry`"; also `FormalConceptAnalysis` uses `propext` and `funext`
   (`subA_antisymm`), while `lakefile.toml` advertises "an axiom law that admits only Quot.sound". Both bear on the "kernel-checked" claim. The file count (271 under `Obsmetrologia/`) is correct.
9. **Docs that cite theorems that do not exist**: `four_regime_dichotomy` (glossary topic), `regimeCost`/`regimeDecidable` (`closure-regime.mjs`). Any further reading of those documents as evidence should be verified against names first.
10. **Regime of the composite** (`classify_both_ge`) and **the tower is a cycle** (`Stage.next`) are the two regime facts about how libraries compose and how laps close; the note's tower (§4 item 5) is stated through `SettlementSpiral` only.

## 8. The JavaScript experiments (nothing written to disk)

All run with `node --input-type=module -e` from `signcraft`, importing `src/inference/nuclei.mjs` and `@red-cup-engineering/metrologic/closure/formal-context`.

* **Δ is not monotone.** Context objects `o1{a,b}`, `o2{a,b}`, `o3{c}`; basis `b→a`, `a→b`. Valuation `v` = object `x` told for `a`; `v2 ≥ v` adds `c`. `delta(v)` forces `x b` (since `{a}` is realized by `o1`, `o2`, closure `{a,b}`);
  `delta(v2)` does not (`{a,c}` is realized by no object, the guard `extent(held).size === 0` skips transfer) and so lacks `x b`. Hence `v ≤ₖ v2` yet `Δ v ≰ₖ Δ v2`. On 400 random denial-aware contexts the
  absence-of-key check flagged 35 non-monotone cases.
* **σ is not meet-preserving.** Objects `o1{a,c}`, `o2{b,c}`, `o3{}`; basis `a→c`, `b→c`. `v1` = `x` told `a`, `v2` = `x` told `b`; their knowledge meet is bottom everywhere, `σ(⊥)` is empty, but `σ(v1) ∧ₖ σ(v2)` carries `x c` as potential.
  So `σ(v1 ∧ v2) ≠ σ(v1) ∧ σ(v2)`: not a nucleus. (Its inflation, idempotence on tested inputs and monotonicity were not broken.)
* **Composite idempotence and commutation held** on 400 random contexts (0 violations of either), consistent with the test's assertion.

## 9. Corrections to propose to the note (for whoever edits it; I edited nothing)

1. §1.1: replace "proves the four-regime dichotomy of the closure ordinal κ" by "proves that a three-flag classifier is total and its four cases exclusive; deriving the flags from a closure or ordinal is open (`four_regime_flag_cases`)". Cite `Stage.regime` and `cohomologyVanishes` as tables.
2. §1.2: remove file location as evidence for regime. State that `Language/Positing/*` is the Scott stage in the library's table, or split the row into "carrier FOUR (strict, finite base)" and "SignCell's operations (all four stages)".
3. §1.2/§1.3: replace the Rosetta citation with an accurate one (four registers of one operation; logic and language one column). State that Lean's only ascent is the one-step return `strict → aperiodic`.
4. §1.4: state the founder's correction in the form the library can carry (§3.4) and flag the conflict; quote the omitted "(the aperiodic regime, κ ≥ ω₁ ...)" clause and `strict_regime_mu_identity`. Delete or re-found the witnessed-carrier paragraph (§3.5). Say there are at least five σ/Δ bindings and that pair 3 is not a nucleus.
5. §3.1: change "FCA closure is settling closure" to "FCA closure has the settling closure's laws (extensive, monotone, idempotent)"; drop "Duquenne–Guigues ... canonical" as a Lean-backed fact; state the Chu bridge as a target with the three obligations of §4.
6. §5 algebra: add no-denial, list-versus-set evidence, depth-zero articulation, and the existing `closure-regime.mjs` with its phantom Lean citations.
7. §6: rewrite target 1 as in §6 above; target 4 as a decision between guarded and monotone Δ; target 7 to start from `Settling.regime`, `RegimeComposition` and `RegimeCycle`.
8. §0: correct "no `sorry`" and the axiom statement.
