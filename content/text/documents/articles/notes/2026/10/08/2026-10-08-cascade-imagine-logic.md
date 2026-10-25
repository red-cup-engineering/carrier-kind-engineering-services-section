---
title: "Cascade imagine, logic regime: what the SignChain logical inference model does"
description: "The imagine stage for the logic regime (SignChain, code) of the 2026-10-08 cascade program, built only on what the adversarial check of that regime confirmed: the chain as a machine whose state is a rule system over a witnessed valuation with a free-energy ledger and a second-order rule dynamic, whose moves are tell, fire, orbit, reindex and quantify, residuate, normalize, nuclear-normalize and re-rule, what flows in from the algebra regime and out to the language regime, how many chains over a shared site behave as a dry foam of closure cells with contradiction held in-cell rather than as a gluing obstruction, what such a machine does that a large language model cannot, six worked examples with real FOUR readings, real rules and real words computed by hand against the Lean statements, and a register of thirteen precisely stated extensions with their proof obligations. Every mechanism is tagged as a named Lean declaration or as a numbered extension."
date-created: 2026-10-08
kind: engineering-research-note
keywords:
  - logical-inference-model
  - closure-rule-system
  - immediate-consequence-operator
  - scott-regime
  - hyperdoctrine
  - curry-howard-lambek
  - nuclear-formula
  - free-energy-ledger
  - rule-dynamics
  - autopoiesis
  - coordination-cohomology
  - signchain
  - signstuff
  - obsmetrologia
status: working-note-imagine-stage-logic-regime-built-only-on-the-adversarial-check-not-yet-reviewed-by-the-founder
produced-by: imagine subagent (Claude Fable 5.1), reading 2026-10-08-cascade-check-logic.md first, then the Obsmetrologia Lean statements and the signstuff sources directly at monorepo HEAD ce9505039a1
---

# Cascade imagine, logic regime: what the SignChain logical inference model does

## 0. Scope, ground rules, notation

This is the imagine stage for one regime of the founder's program: the **logic** regime,
realized by **SignChain** (the code library, in the house's data → code → networking →
systems order). The governing note is
`2026-10-08-note-on-realizing-signstuff-along-the-algebra-logic-language-geometry-cascade.md`
("the note"); the adversarial check of this regime is `2026-10-08-cascade-check-logic.md`
("the check"). This note builds only on what the check confirmed, respects its corrections,
and reads the Lean statements itself where a claim matters.

Two tags are used throughout, and nothing mechanical goes untagged:

- **[Lean: `File.lean` `name`]** — the mechanism is that declaration, used exactly as stated.
  Paths are relative to
  `services/science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/lib/obsmetrologia/Obsmetrologia/`
  (abbreviated `Obs/`). Code paths are relative to
  `services/engineering-services-section/services/computer-engineering-services-section/lib/signstuff/` (abbreviated `SS/`); metrologic is at
  `.../computer-engineering-services-section/services/computer-data-engineering-services-section/lib/metrologic/`.
- **[EXT-n]** — a precisely stated extension of a named Lean structure, with its proof
  obligation. All extensions are collected in §10. An extension is a design commitment,
  not a fact; nothing below treats one as proved.

Three corrections from the check govern everything here and are not re-argued:

1. **No lax σ/Δ at Scott in Lean.** `Reading.kz_iff_strict` [Lean: `Closure/Monad.lean`] and
   `closureOp_kz_iff_strict` [Lean: `Closure/Monad/KZ.lean`] make the KZ inequality
   *equivalent* to strict idempotence on antisymmetric carriers; `strict_regime_mu_identity`
   says μ is the identity in the strict and Scott regimes; `no_laxSlack_of_antisymm`
   [Lean: `Closure/Monad/LaxSlack.lean`] forbids lax slack on any antisymmetric carrier at
   any regime; the one inhabited slack, `Record.tally_lax_slack` [Lean:
   `Language/Positing/Record.lean`], sits on the germ preorder at the aperiodic corner. Every
   `Order.Nucleus` has `idem : ∀ a, j (j a) = j a` as a field [Lean:
   `Language/Positing/NucleusAndCommutingNuclei.lean`]. So in this note **every closure the
   chain runs is strictly idempotent**; the founder's correction ("KZ-lax at Scott") is
   carried as a *hypothesis with a named candidate carrier* (§5.3, EXT-13), never as a fact.
2. **R1–R23 are the equational rewrite theory of two commuting nuclei**, not KZ 2-cells:
   `Positing.NuclearFormula.Step` [Lean: `Language/Positing/NuclearFormula.lean`] with
   soundness proved for `interp_R1`, `interp_R2`, `interp_R3`, `interp_R4`, `interp_R7` only,
   termination and confluence unported. They are used here exactly within that scope (§3.8,
   §8.D).
3. **Regimes are declared, not derived** (`regimeOf_v_independent`, the `OPEN` marker in
   `Closure/Regime.lean`); "the chain is Scott" is a design assignment with a named extractor
   to build (EXT-11), and the library's own Scott content is the finite-antecedent firing
   theorem `finite_antecedent_scott_continuous` [Lean: `Closure/Scott.lean`].

The three σ/Δ pairs the task names (`Autopoiesis` history nuclei, `Positing.Bigraded`
`joinSquare`, `SS/signcraft/src/inference/nuclei.mjs`) are kept apart; the check's census adds
`FiberAlgebra.sigma/delta`, the `HyperdoctrineDual` swap and `Closure/Modal.lean`'s `□◇`.
Where this note needs two commuting operators for a chain, it names a *seventh* candidate pair
(EXT-8) and says what it would take to relate it to any of the six.

FOUR is written with the library's four names, which this note uses interchangeably with the
Belnap letters: `kBot = absurd` (⊥, told none), `tTop = potential` (t, told for),
`tBot = active` (f, told against), `kTop = stable` (⊤, told both) [Lean:
`Language/Positing/Reading.lean` `kBot`, `kTop`, `tTop`, `tBot`]. The knowledge order is `≤ₖ`
(`KLE`), the truth order `≤ₜ` (`TLE`). A cell is `⟨subject, predicate, object⟩`
[Lean: `Language/Predicating/Cell.lean` `PredicationCell`]; a valuation is
`PredicationCell → Reading` [Lean: `Language/Positing/Valuation.lean` `Valuation`].

## 1. The regime, as confirmed: what the chain is in Lean

The check's ledger leaves the following standing as the logic regime's actual Lean content.
This is the material the imagination below is made of; nothing else is load-bearing.

**Consequence operators presented by rules.** A rule is a `≤ₖ`-monotone Boolean antecedent on
the valuation plus one `(cell, reading)` consequent [Lean: `Closure/RuleSystem.lean`
`ClosureRule` with fields `antecedent`, `antMono`, `cell`, `reading`]; a system is a list
[`RuleSystem := List ClosureRule`]; a consequent is the valuation `bump c V` (`V` at `c`, `⊥ₖ`
elsewhere); one step is van Emden–Kowalski `Tstep S v := joinK v (fire S v)`; `Tstep` is
inflationary and monotone (`Tstep_infl`, `Tstep_mono`); `SClosed S v := Tstep S v = v`;
a closed valuation respects every fired rule (`rule_respecting`); the three-fold iterate `clS`
is, *when it is a fixed point*, the least `S`-closed valuation above the seed
(`generated_closure_is_least`, `immediate_consequence_lfp`, both with hypothesis
`hfix : SClosed S (clS S v)`), and the least one is unique (`least_closed_unique`, by
`vle_antisymm`). A worked instance discharges `hfix` (`alwaysRule`, `alwaysRule_lfp`).

**The orbit and its ledger.** `ruleOrbit S seed n` iterates `Tstep` [Lean:
`Dynamics/Flow/FreeEnergyLyapunov.lean`]; it ascends (`ruleOrbit_le_succ`) and stays below
every closed point above the seed (`ruleOrbit_le_closed`). `kHeight` is `0,1,1,2` on
`⊥, t, f, ⊤`; `deficit cells v w = Σ (kHeight (w φ) − kHeight (v φ))` is the free energy,
antitone along the climb (`deficit_antitone`), strictly dropping at a firing
(`deficit_strict_of_fires`), zero exactly at height-equilibrium (`deficit_eq_zero_iff`);
`stepFlux` decomposes as `commits + mints + 2·jumps` (`stepFlux_decomposition`), and the
**cascade ledger** `rule_ledger` says, for any `S`-closed `w ≥ₖ seed` and any horizon `N`,
`deficit cells seed w = ruleOrbitFlux S seed cells N + deficit cells (ruleOrbit S seed N) w`.
A three-rule chain pays one commit per stage for three stages (`chain_cascade_receipts`), and
a `t`-cell that stops truth-firing has become `⊤` (`truth_loss_is_record_gain`).

**Second-order dynamics on the rules themselves.** `RuleDynamics` is an endomap on
`RuleSystem` with `orbit`, `FixedRules`, `FixedAt`, `RuleResidue` [Lean:
`Closure/RuleDynamics.lean`]; once fixed the orbit is constant (`fixedAt_orbit_add`), and
closure under a settled generator inherits the lfp theorem (`settled_rules_closure_lfp`);
`rewriteTo target` settles after one meta-step (`rewriteTo_fixedAt_one`,
`rewriteTo_closure_lfp`).

**The base category and the fibration over it.** The four generator classes are *derived*:
every natural partial reindexing of entity pairs is one of `identity`, `converse`,
`subjectProjection`, `objectProjection` on an invariant support [Lean:
`Language/Predicating/Generators.lean` `natural_partial_cases`, `natural_of`, `natural_comp`,
`token_natural_cases`, with `converse_cell`, `subjProj_cell`, `objProj_cell` tying them to
`PredicationCell.converse/subjProj/objProj`]; `Predicating.Morphism := PredicationCell →
PredicationCell` [Lean: `Language/Predicating/Morphism.lean`]. Reindexing is precomposition
`reindex r v := v ∘ r`, contravariantly functorial and monotone [Lean:
`Language/Predicating/Hyperdoctrine.lean` `reindex`, `reindex_comp`, `reindex_mono`]; the
converse is its own adjoint (`converse_adjunction`, `galois_reindex`), with Frobenius
(`converse_frobenius`) and a commuting-reindexing Beck–Chevalley (`beck_chevalley`). For a
`FiniteFibration` (base map with each cell's preimage as a finite list, `mem_fiber`),
`existsF` is the fiber knowledge-join and `forallF` the fiber knowledge-meet, and
`∃_f ⊣ f* ⊣ ∀_f` holds (`existsF_adjunction`, `forallF_adjunction`) [Lean:
`Language/Predicating/Quantifying.lean`]; the truth-order triple `existsT`/`forallT` holds
too (`existsT_adjunction`, `forallT_adjunction`) [Lean: `Language/Predicating/Equality.lean`],
and it is the `swap`-conjugate of the knowledge triple (`dual_adjoint_system`,
`conj_existsF_eq_existsT`) [Lean: `Language/Predicating/HyperdoctrineDual.lean`]. **Equality
is derived**: `classicalEq s o = if s = o then tTop else tBot` and
`paraconsistentEq s o = if s = o then kTop else kBot` (`classicalEq_eq`, `paraconsistentEq_eq`),
as `∃ᵗ_g(1ᵗ)` and `∃ᵏ_g(1ᵏ)` over the diagonal fiber.

**Residuation on FOUR, in the truth order.** `readingFuse`/`readingImp` transport the twist
product's `fuse ⟨x,y⟩ ⟨z,v⟩ = ⟨x·z, (x→v)∧(z→y)⟩` and `imp ⟨x,y⟩ ⟨z,v⟩ = ⟨(x→z)∧(v→y), x·v⟩`
over the two-element residuated lattice `Two` to `Reading`, and
`readingFuse_tle_iff : TLE (readingFuse a b) c ↔ TLE a (readingImp b c)`; with the middle
argument fixed, `diamond_adjoint_box` [Lean: `Calculus/Logic/LinearLogicChu.lean`;
`Calculus/Logic/TwistProductResiduation.lean` `fuse`, `imp`, `fuse_leT_iff`, `unit_ne_tTop`].
The unit is `⊤`, not `t`. No knowledge-order tensor exists in Lean (check §2.5).

**Lambek, algebraically and commutatively.** `LambekAlgebra` is a lattice-ordered monoid with
`lres`, `rres` and the two bi-residuation fields [Lean: `Calculus/Logic/LambekCalculus.lean`];
`lambekOfResiduated` makes every integral commutative residuated lattice a Lambek algebra with
`lres = rres` [Lean: `Calculus/Logic/FCALambekCircle.lean`,
`commutative_collapses_to_single_implication`]. No sequent calculus, no derivations (check §2.6).

**FCA.** For any `I : G → M → Prop`, the derivation operators form a Galois connection, `closeA`
is a closure, concepts form a complete lattice, and `implies I B₁ B₂ ↔ subB B₂ (closeM I B₁)`
[Lean: `Calculus/Order/FormalConceptAnalysis.lean` `prime_adjunction`, `closeA_idem`,
`conceptCompleteLattice`, `implies_iff_closeM`]. The Duquenne–Guigues basis is code only
(`dgBasis`, `lawfulBasis` in metrologic `src/closure/formal-context.mjs`).

**The CHL calculus.** `Ty` (`base`, `arrow`, `prod`, `unit`), de Bruijn `Tm`, a typing
relation `HasTy`, β/projection `step`, its closure `Red`, Church–Rosser by Takahashi
(`par_triangle`, `church_rosser`) [Lean: `Language/Predicating/CurryHowardLambek.lean`];
`propOfTy v φ base = (Reading.pos (v φ) = true)` and `curry_howard` (which does not mention a
term); the CCC laws at the meta level (`ccc_exponential_adjunction`, by `rfl`); the four
type-formers biject with the four corners as labels only (`chl_quartet_is_nuclear`,
`TypeFormer.toCorner`). Normal-order normalization is fuel-bounded and, when it returns,
sound, normal and unique (`normalize_red`, `normalize_normal`, `normalize_unique`) [Lean:
`Language/Predicating/NormalOrder.lean`]; no termination theorem, no subject reduction.

**The nuclear rewrite theory.** `NuclearFormula` with `Saturate`, `Transfer`, Heyting
connectives; `interp` into any Heyting algebra with `CommutingNuclei`; `Step` with 27 root
constructors and congruence; measures `nuclearW`, `entanglement` with
`nuclearW_R3_decreases`, `nuclearW_R4_decreases`, `nuclearW_R7_preserved`, `entanglement_R7`;
soundness `interp_R1`, `interp_R2`, `interp_R3`, `interp_R4`, `interp_R7` [Lean:
`Language/Positing/NuclearFormula.lean`].

**Nuclei and their quartet.** `Nucleus` (`infl`, `idem`, `meet`), `Fix`, `CommutingNuclei`,
`pi := j₁ ∘ j₂`, `fix_pi_iff : pi a = a ↔ (j₁ a = a ∧ j₂ a = a)`, `square` [Lean:
`Language/Positing/NucleusAndCommutingNuclei.lean`]; the `AutopoiesisCell` bundle
(`self_production`, `four_corners`, `joint_is_intersection`) for any `CommutingNuclei H`
[Lean: `AperiodicOrder/Tiling/Autopoiesis.lean` `nuclear_autopoiesis_cell`, `cellCorner`,
`autopoieticCore_iff`]; `joinSquare c₁ c₂` on `heytingK` as the worked instance [Lean:
`Language/Positing/Bigraded.lean`].

**Coordination.** `Cover`, `agreeOn`, `separated` [Lean: `Site/Sheaf.lean`]; `Cech1`,
`Cocycle`, `Coboundary`, `glue`, `h1_vanishes` (every agreeing family glues uniquely, every
datum, every regime) [Lean: `Cohomology/SettlingCohomologyH1.lean`]; `CoverNerve` with
`H1rank = (cells + components) − entities`, `CoordinationFree`, `h1_vanishes_iff_forest`,
`h1rank_is_coordination_cost` [Lean: `Cohomology/CoordinationCohomology.lean`]; the CALM
conjunction: monotone orbit and order-independent merge
(`calm_monotone_coordination_free`, `calm_fiber_merge_order_independent`, `confluent_joinK`)
[Lean: `Cohomology/CRDTCohomologicalCALM.lean`]. The check is right that these are about
`ModalFrame`, not `RuleSystem`; the bridge is an extension (EXT-10).

**What the regime is not, in Lean.** No `Derivation` datatype for `RuleSystem` (consequences
are valuations); no witnessed valuation with a closure on it (`Valued` has no order); no
non-antisymmetric Scott carrier; no proof-relevant hom (`propOfTy` is `Prop`); `HasTy` unused
outside its file; `typed-theory.mjs` is the base category, not a term calculus. Each of these
is where an extension begins.

## 2. The chain: its state

A **chain** is one node's logical inference model. Its state is six things. The first three are
Lean structures taken as they are; the last three are extensions of Lean structures.

**S1. A cell base with its generators.** The cells the chain speaks about, closed under the four
generator morphisms. [Lean: `PredicationCell`; `Generators.IndexMap`, `Generators.Support`,
`Generators.reindexCell`; `Predicating.Morphism.converse/subjectProjection/objectProjection/
specialize`.] Operationally this is the graph `typed-theory.mjs` builds (`theoryOfData`:
objects are cells and their subject/object terms, edges the four morphisms) — the check's §5.1
identifies it as the hyperdoctrine's index category, and this note keeps it in that role.

**S2. A rule system `S`.** [Lean: `ClosureRule.RuleSystem`.] Each rule's antecedent is, in
practice, a finite list of `(cell, threshold)` pairs read conjunctively — exactly
`SS/signchain/src/rules.mjs` `rule(name, [{cell, atLeast}], {cell, reading})` — which is a
`≤ₖ`-monotone Boolean test on the valuation, so it is a `ClosureRule` whose `antMono` is
discharged by threshold monotonicity (`KLE_pos_mono` [Lean: `FreeEnergyLyapunov.lean`] for
the for-side; the against-side by the same four-case `decide`). The syntactic finiteness of
antecedents is what makes the chain Scott (§5.1).

**S3. The second-order dynamic `D` on `S`.** [Lean: `ClosureRule.RuleDynamics` with `step`,
`orbit`, `FixedRules`, `RuleResidue`.] This is the chain's *learning*: the map that rewrites
the rule system between settlements. The chain carries `D` as state because the question
"has this node stopped learning?" is `D.FixedRules S` and the answer changes over time.

**S4. [EXT-1] A witnessed valuation `W : PredicationCell → Valued`.** `Valued` is a reading with
its for/against witness slots [Lean: `Language/Positing/Evidence.lean` `Valued`, `presence`,
`Measured`, `joinK`, `meetK`, `joinK_measured`, `meetK_not_measured`,
`evidence_accumulates_joinK`]. The chain's readings are its projection `W.value : Valuation`.
EXT-1 states a *witnessed* `Tstep` on `W` whose value-projection is `Tstep S` on `W.value` and
whose evidence only grows (§10). SignChain's `bilattice.mjs` already transcribes `Valued`
(check §2.9); `rules.mjs`'s `fireRule` adds witnesses on told sides; the extension is the
theorem relating the two.

**S5. [EXT-2] A derivation store `Π`.** For each cell and each lane, the list of derivations
`{rule, from : List PredicationCell}` that told it [code: `rules.mjs` `derivation(r)`]. EXT-2
is the inductive `Derivation S seed φ V` with a soundness theorem into `ruleOrbit`
(§10). `Π` is distinct from `W.evidence`: evidence names *tokens* (articulatings that
witnessed), derivations name *rules and premise cells* (what licensed a telling). Both are
kept; neither is ever discarded (the house discipline of `Slot`, `Evidence.lean` header).

**S6. [EXT-3] The ledger and the regime datum.** The ledger is `(deficit, ruleOrbitFlux,
commits, mints, jumps)` over the chain's support cells [Lean: `FreeEnergyLyapunov.lean`], a
Lean object as it stands. The regime datum is a `ClosureRegimeData` *extracted from `S` and
the base* [Lean: `Closure/Regime.lean` `ClosureRegimeData`, `classify`]; the extractor is
EXT-11. The chain stores both because "how far from settled" and "what kind of settling this
is" are what it reports to its neighbours (§6).

A chain's content address (the algebra regime's `ni` discipline, SignCell's `address`) covers
S1, S2, S4 and S5. Two chains with the same address have the same rules, the same readings,
the same witnesses and the same derivations; the check's observation that `address` excludes
evidence (`SS/signcell/src/cell.mjs`) is for the *cell* address, and the chain address is
proposed over the whole state so that a derivation can point at a chain-state, not only at a
triple.

## 3. The chain: its moves

The chain's instruction set is nine moves. Each is a named Lean operation or an extension of
one. Together they are what "a logical inference model" does, as against predicting a token.

### 3.1 Tell — seed a cell

`tell c V` joins `bump c V` onto the valuation [Lean: `RuleSystem.lean` `bump`,
`Valuation.joinK`]. In the chain a tell never arrives bare: it arrives *measured* from the
algebra regime (§4.1), as a `Valued` whose value is its presence (`measure_measured`), so a
tell is `W ↦ W ⊔ᵏ bump_valued c x` with `x : Valued`; its witness slots are appended
(`evidence_accumulates_joinK`). The code's `runMachineAction(state, {kind: "tell", reading})`
in `SS/signcraft/src/inference/kernel.mjs` accepts a caller-supplied reading; the chain does
not (the spine's discipline, `Spine.run`: "no reading enters from the caller"). That is a
change to make, not a fact about the present code.

### 3.2 Fire — one immediate-consequence step

`fire S v` is the `≤ₖ`-join of every applicable rule's consequent; `Tstep S v = v ⊔ fire S v`
[Lean: `RuleSystem.lean` `fire`, `Tstep`, `Tstep_infl`, `Tstep_mono`]. Positivity is the whole
reason this is monotone, and monotone is the whole reason the foam needs no coordination
(§6). A firing is receipted: `stepFlux` and its itemization (`commits`: ⊥→t or ⊥→f;
`mints`: t/f→⊤; `jumps`: ⊥→⊤, worth two) [Lean: `FreeEnergyLyapunov.lean`
`stepFlux_decomposition`]. With EXT-1, a firing also appends the firing rule's derivation
record to `Π` at the consequent cell, on the told lane.

### 3.3 Orbit — settle to quiescence with the books open

`ruleOrbit S seed n` [Lean]. The chain runs the orbit until `SClosed S (ruleOrbit S seed n)`;
at each stage it checks the cascade ledger: `deficit seed w = ruleOrbitFlux n + deficit (orbit
n) w` for the reached `w` [Lean: `rule_ledger`]. Two runtime invariants fall out of theorems:
a stage that fires must discharge at least one unit (`deficit_strict_of_fires`), and a stage
with no firing discharges none (the flux is a sum of per-cell height differences of equal
valuations). The code's `settle()` in `SS/signcraft/src/inference/nuclei.mjs` throws on exactly
these two conditions ("H-theorem violation", "unwitnessed flux"); in the chain they are not
runtime checks but consequences, which is what it means for the kernel to have been read.

When the orbit reaches a fixed point, `generated_closure_is_least` and
`immediate_consequence_lfp` apply with `hfix` discharged by the reached equality, so the
settled valuation is the *least* `S`-closed valuation above the seed, and unique
(`least_closed_unique`). On a finite base the orbit terminates because each cell climbs at
most twice in height (`kHeight` is bounded by 2, `kHeight_lt_of_lt`), so the deficit is a
`Nat` strictly decreasing at every firing stage. On an open-ended base the orbit is the
ω-limit (§5.1, EXT-12).

### 3.4 Reindex and quantify — move along the generators

For a generator `r : Morphism`, `reindex r v = v ∘ r` reads a cell's value through the
morphism [Lean: `Hyperdoctrine.lean` `reindex`]. For the converse this is its own adjoint
(`converse_adjunction`); for the projections the chain builds a `FiniteFibration` over its
*own finite token universe* [EXT-4] and takes `existsF`/`forallF` (knowledge join/meet over
the fiber) and `existsT`/`forallT` (truth join/meet) [Lean: `Quantifying.lean`,
`Equality.lean`]. The two existentials answer two different questions about "alice teaches
someone": `∃ᵏ` aggregates *evidence* (both lanes anywhere in the fiber give ⊤), `∃ᵗ`
aggregates *truth* (one told-for member gives t). §8.B computes both. Equality is not stored,
it is computed: `paraconsistentEq s o` and `classicalEq s o` [Lean: `Equality.lean`].

The adjunctions are what make quantified queries *answers* rather than searches:
`leK (existsF F v) w ↔ leK v (reindex F.base w)` says that to check an existential bound one
checks a pointwise bound on the fiber, and conversely. This is the hyperdoctrine working as a
query planner, with the four generator classes as the only index moves it will ever need
(`natural_partial_cases`: there is no fifth).

### 3.5 Residuate — ask what would license this

Given a premise reading `b` and a goal reading `c`, `readingImp b c` is the greatest `a` with
`readingFuse a b ≤ₜ c` [Lean: `LinearLogicChu.lean` `readingFuse_tle_iff`]. The chain uses it
as the exact answer to "what reading on the companion cell would make this conclusion hold
in the truth order": no search, a table lookup on FOUR (§8.C). This is the truth-order
residuation the check confirms; the knowledge-order relational residuation the code's
`algebra.mjs` runs (`residualLeft`, `residualRight`, per Boolean lane) is a different structure
and is left as the Lambek target EXT-6 (a non-commutative `LambekAlgebra` on relation
matrices), not conflated with `readingImp`.

### 3.6 Normalize — reduce a proof term to its normal form

Where a derivation has been compiled to a `Tm` [EXT-5], the chain reduces it by `stepNO` and
`normalize n` [Lean: `NormalOrder.lean`]; when `normalize n t = some u`, `u` is a reduct, is
normal, and is the unique normal form (`normalize_red`, `normalize_normal`,
`normalize_unique`); confluence of the untyped reduction is `church_rosser` [Lean:
`CurryHowardLambek.lean`]. The chain states the fuel honestly: `normalize` returns `Option`,
and typed termination is the obligation in EXT-5. What normalization buys the chain is
*proof identity*: two derivations of the same cell are the same proof iff their compiled
terms have the same normal form, which is the difference between `derivationIdentity`'s
step-sequence comparison in `typed-theory.mjs` (two traces are two proofs) and a logic
(two traces may be one proof).

### 3.7 Re-rule — learn by rewriting the generator

`D.step S` [Lean: `RuleDynamics.lean`]. The chain's primary `D` is **basis induction**: read
the settled witnessed valuation as a formal context `I : G → M → Prop` (objects = subjects
that occur, attributes = signed predicates, incidence = told lane), compute the implication
basis, compile each implication `B₁ ⟹ B₂` to rules `bump`-ing each `m ∈ B₂` at threshold
`t` (or `f` for a denied attribute) under the conjunctive antecedent `B₁`. The Lean content is
that an implication holds iff `B₂ ⊆ closeM I B₁` [Lean: `implies_iff_closeM`], so a compiled
rule is sound for the context it was induced from; the basis's minimality and completeness
(Duquenne–Guigues) are classical and unported, and the code's `lawfulBasis` keeps only
implications with realized premises to avoid ex falso (check §2.7). The code's
`learningCurve` in `SS/signcraft/src/inference/learn.mjs` re-induces the basis every round:
that loop *is* `D.orbit` for `D := induce ∘ settle`, and EXT-7 names it so.

Once `D.FixedRules S` holds, first-order settling under `S` is the lfp theorem again
(`settled_rules_closure_lfp`); until then the node carries `RuleResidue` and reports it. This
is the regime's own small version of "recursively self-improving knowledge": not a new level
of the tower (the tower check is clear that `BigradedTower` has no levels) but a second-order
orbit on the generator, whose fixed point is a theory that has stopped changing under its own
evidence.

### 3.8 Nuclear-normalize — canonical forms for closure-plans

When the chain must decide the order in which to apply two commuting closures to a goal
formula (a plan written in `NuclearFormula` with `Saturate` and `Transfer`), it rewrites by
`Step` to a `NormalForm` [Lean: `NuclearFormula.lean`]. What is proved and therefore used:
every rewrite by R1, R2, R3, R4 or R7 preserves the interpretation in any Heyting algebra with
commuting nuclei (`interp_R1..R4`, `interp_R7`); R3 and R4 strictly decrease `nuclearW`
(`nuclearW_R3_decreases`, `nuclearW_R4_decreases`); R7 preserves `nuclearW` and strictly
decreases `entanglement` (`nuclearW_R7_preserved`, `entanglement_R7`). So a plan rewritten
with those five rules only, measured lexicographically by `(nuclearW, entanglement)`,
terminates and denotes the same closure. For the other 22 constructors the chain does not
rewrite until soundness is proved (EXT-9); the check's §2.3 judges those proofs routine. §8.D
runs a plan to normal form and evaluates both ends in `joinSquare`.

### 3.9 Report — ship the receipt

A settlement's receipt is: the settled `W`, the derivation store `Π`, the ledger (`deficit`
at seed, total flux, the itemized stages), the contested cells (`isInconsistency (v φ)`
[Lean: `Language/Positing/BigradedCohomology.lean`]), and the regime datum. Nothing in a
receipt is a probability. The code's `settle()` returns `{v, basis, trace, steps, ledger,
obstructions}` and `obstructionsOf` lists contested cells with a refusal number; the chain's
receipt is that shape with EXT-1/2 attached.

## 4. Inflow from the algebra regime; outflow to the language regime

### 4.1 What comes down from algebra (SignCell)

The algebra regime's product is a **measured valuation**: readings derived from a trace of
articulatings, never supplied. [Lean: `Language/Spine.lean` `run`, `runTrace`, `measure`,
`measure_nil_knowledgeLeast`, `run_pos`; `Language/Positing/Measure.lean` `measure`,
`measure_measured`, `no_denial`, `measure_contradictory_negate`, `measured : CValuation`.]
Three facts about the inflow shape the chain:

- **Everything that arrives is `Measured`** (`measure_measured`): value equals presence. The
  chain's seed therefore satisfies `Measured` cellwise, and `joinK` preserves it
  (`joinK_measured`), so a settled valuation is `Measured` *unless a rule told a side with no
  articulating behind it*. That is exactly what a derivation is: a telling whose witness is a
  rule, not a token. In the chain, a cell whose value exceeds its token-presence has, by
  construction, a derivation in `Π` for the excess lane. (EXT-1 states this as the invariant
  `value = presence ⊔ derived`.)
- **No denial is seeded** (`no_denial`): a measured against-side exists only because an
  articulating landed on the contradictory cell `φ.contradictory k` [Lean: `Measure.lean`
  `Contradictory`, `PredicationCell.contradictory`]. So the chain's against-lane has two
  sources only: the contradictory mark in the trace, and a rule with consequent `tBot`. This
  is why the code's denial lane (`NEG + m` attributes, `lawfulBasis` carrying
  `penguin ∧ bird ⟹ ¬flies`) is the right shape: denial is a *predicate*, `k.c flies`, not a
  primitive.
- **The reading at the articulated cell is told-for** (`run_pos`), and settling never withdraws
  it (`KLE_pos`). The chain inherits monotonicity from the spine and never retracts; retraction
  is not in this regime (§6.4).

Also from the algebra: the incidence as a formal context (the settled valuation's told lanes
read as `I : G → M → Prop`), which §3.7 turns into rules; and the K₄ corner structure, which
the chain uses only as the four names of FOUR.

### 4.2 What goes down to language (SignGraph)

The check's §6.5 restates the passage honestly: "a rule system's *linear* derivation chains
form a sofic language", which is true and close to `derive`. The chain hands the language
regime three things:

- **Linear derivation chains as paths.** A `derive` result in `typed-theory.mjs` is a list of
  steps each labelled by one of the four morphisms between cells; that is literally a `Path`
  in a `Graph PredicationCell` whose edges are the rule-licensed morphisms [Lean:
  `AperiodicOrder/Tiling/SoficShift.lean` `Path`, `sft_is_sofic`, `SoficImage.factor`]. A
  projection `π` from cells to tokens (the language's surface alphabet) makes the set of
  surface strings a sofic image. [EXT-10a states it.] Tree-shaped derivations (several
  premises) are *not* handed down as words; they are handed down as the bracketed linearization
  the language regime chooses, which is the language regime's own theorem to state (check
  §2.12).
- **Typed holes.** A quantified cell `existsF F v φ`, `forallF F v φ` with its fiber is a typed
  question: which `ψ` in the fiber carries the told lane. The language surface the code already
  has (`speak.mjs`: "a hole is a typed question; speaking is Gibbs-saturating holes from their
  witnessed read fibers"; `relconlang.mjs`: the particles `ta`/`na` told-for, `sha` told-both,
  `mu` told-none, `ku` question) consumes exactly this: a RelConLang clause `ku kelu ga ran-um
  do ?` is a request to fill a hole in the object fiber of `ran` at subject `kelu`, and the
  chain's answer is the fiber join with its witnesses. The chain does not pick the surface
  word; it supplies the cell and its reading, and the particle `ta`/`sha`/`mu` is the reading's
  spelling.
- **The basis as lexicon.** Each implication the chain induced is a one-line law that the
  language regime can spell (`learnedImplications` in `learn.mjs` already renders them). The
  language regime's Lambek side (sentences as derivations) would take the chain's rules as
  the lexicon's types; that passage is EXT-6's and the language note's business.

Nothing flows down as a weight. The only real numbers near the chain are in the code's
`generate.mjs` (Gibbs sampling at a temperature) and `adapt.mjs` (conductance decay), which
the check locates outside Lean; in the cascade they belong to the *choice* of which hole to
speak next, a language-regime matter, not to what is true at a cell.

## 5. What "Scott" means for the chain, operationally

### 5.1 Finite antecedents on an open-ended base

The library's Scott content is one mechanism: a finite-antecedent firing operator commutes
with directed joins, because a finite antecedent is covered by a directed join iff it is
covered by some member [Lean: `Closure/Scott.lean` `fire`, `fire_covers_directed`,
`finite_antecedent_scott_continuous`; `IsScottContinuous`; `finite_scott_continuous` for the
finite carrier]. The chain's rules have finite antecedents (S2), so each rule's firing is
Scott-continuous in that sense. The regime difference between algebra and logic is then
*not* the fiber (every cell settles by three, `spine_settles_by_three` [Lean:
`Closure/Regime.lean`]) but the **base**: a chain over a finite cell universe is strict; a
chain over an open-ended universe — new tokens arriving for as long as the node runs, as in
the code's `objectsOf(ctx, v)` which admits objects the context never saw — has a cascade
that need not stop at any finite stage, and whose limit is the ω-join of the orbit. The
library's Scott witness is the tally `Record.succPos`, inflationary and fixed nowhere
(`scott_no_fixed_point` [Lean: `Closure/RegimeGate.lean`]); the chain's picture of the same
thing is a node that keeps being told.

[EXT-11] extracts `ClosureRegimeData` from `(S, base)`: `scottContinuous := every rule's
antecedent is a finite conjunction of thresholds` (a syntactic property of S2),
`finiteBase := the cell universe is finite`, `countableCofinality := true` (the orbit is
ω-indexed), with `fin_scott` and `fin_cof` discharged. `classify` then lands in `strict` for a
finite universe and `scott` for a countable one, and `scott_excludes_nonscott` guarantees the
chain is never classified transfinite or aperiodic. The chain *carries its regime*, as the
note's §6 target 7 asks, by computing it.

[EXT-12] states the ω-limit: for finite-antecedent `S` over a countable cell universe,
`v_ω := ⨆ₙ ruleOrbit S seed n` (pointwise, each cell's orbit is eventually constant because
`kHeight ≤ 2`) is `S`-closed and is the least `S`-closed valuation above the seed. The
pointwise argument is the one `RuleSystem.lean`'s scoping note sketches in prose; the theorem
is unwritten.

### 5.2 Gap-free, cohomology-vanishing

In the library's gate, Scott has no gap (`scott_no_gap`), its cohomology flag is `true`
(`cohomologyVanishes`), and it is exactly where `IsScottContinuous` lands
(`scott_continuous_iff_omega_regime`) [Lean: `Closure/RegimeGate.lean`,
`Closure/Scott.lean`]. For the chain this means: the settled value is attained in the limit
with no stage-ω jump that a finite stage misses (that is the transfinite-bounded regime's
`ORecord.omegaPos`, not ours), and gluing many chains' sections has no obstruction (§6.2). The
chain is the last regime in which the foam is dry.

### 5.3 Where lax idempotence could enter, if the founder's correction is to be realized

Everything the chain computes on readings is strictly idempotent, by the three theorems in §0.
The founder's correction says that at Scott height σ and Δ should be *KZ-lax*, and the check
says that needs a Scott-classified, non-antisymmetric carrier that does not exist. The chain
offers one concrete candidate and marks it as exactly that.

Consider §8.A's orbit. At stage 3 the rule `r_pen` fires: the readings do not change
(`Tstep` at a fixed point is the identity), but the derivation store `Π` gains a *second
derivation* of `⟨y, penguin, y⟩ = t` (from `¬flies ∧ bird`), beside the seed's own. On
readings, `Cl (Cl v) = Cl v`. On `(W, Π)` pairs, `Cl (Cl (W, Π)) ≠ Cl (W, Π)` while
`Cl (Cl (W, Π)) ≤ Cl (W, Π)` in any order that compares by reading projection. That is the
shape of `HasLaxSlack` [Lean: `Language/Positing/Value/PreCategory.lean` `LaxVClosure`
(`op`, `infl`, `mono`, `kz`), `HasLaxSlack`, `laxSlack_witnesses_nonantisymmetry`].

[EXT-13] states the carrier: `PreValueCategory` with carrier `Valuation × DerivationStore`,
`le (v, Π) (w, Σ) := leK v w` (the projection preorder), and `op := witnessed Tstep` (EXT-1
plus derivation recording). Then `kz` holds, `infl` and `mono` hold, and `HasLaxSlack op (W, Π)`
holds at any state where a re-derivation occurs. Two cautions are part of the statement, not
footnotes. First, the projection preorder makes slack *cheap*: it is non-antisymmetric by
construction, and the library's own warning (`genuine_lax_cone_needs_non_thin_carrier`) is
that the interesting content is a 2-cell with data, which `le : Prop` does not carry. Second,
under the alternative order "derivation-store inclusion", the carrier is antisymmetric again
and `no_laxSlack_of_antisymm` collapses it to strict. So the founder's correction, if it is to
be a theorem in this regime, is the statement that **the right order on proof-relevant
settling is the projection preorder**, and the content of its 2-cells is the re-derivation
records. That is a design decision for the founder; this note only shows where it would live
and that nothing in the chain's reading-level behaviour depends on it.

## 6. Many chains over a site: the foam

A node is a chain. A site is a set of cells with a cover by nodes' patches [Lean:
`Site/Sheaf.lean` `Cover` (patches, `covers`)]. Two nodes overlap where their patches both
hold at a cell. This section says what the foam of many chains does, in the logic regime, and
which Lean structure each behaviour is.

### 6.1 The cell of the foam: a closure cell, not a nucleus cell

The note wants each node to be an autopoiesis cell. The Lean `AutopoiesisCell` is stated for
`CommutingNuclei H` on a Heyting algebra [Lean: `Autopoiesis.lean` `nuclear_autopoiesis_cell`],
and a nucleus preserves meets (`Nucleus.meet`). **Rule closure does not preserve meets**: for
`S = {a ⟹ c, b ⟹ c}`, `cl {a} ∩ cl {b} ∋ c` but `cl (∅) = ∅`. So a chain's closure is a
`Closure` (inflationary, monotone, idempotent — `Reading.Closure` [Lean:
`Language/Settling.lean`] lifted to valuations) and *not* a `Nucleus`; the `AutopoiesisCell`
bundle cannot be inhabited by rule closure. This is a finding of this note, not of the check,
and it follows from the field list of `Nucleus`.

What survives is the quartet law without the meet axiom. Inspecting the proof of
`fix_pi_iff` [Lean: `NucleusAndCommutingNuclei.lean`]: `pi a = a → j₂ a = a` uses `j₂ a ≤ j₁
(j₂ a) = a ≤ j₂ a` (inflation twice, no meet), and `j₁ a = j₁ (j₂ a) = a` uses the fixed
point; the converse is immediate. So [EXT-8] defines `CommutingClosures` on the valuation
poset (two closures with `comm`) and re-proves `fix_pi_iff`, `square` and the
`AutopoiesisCell` bundle's three fields for it. A **closure cell** is a node with two
commuting closures `(σ_node, Δ_node)`, quartet `(W, Fix σ, Fix Δ, Fix σ ∩ Fix Δ)`.

Which two? EXT-8 names the seventh pair, distinct from the six in the census:
`σ_node := cl^S` (closure under the node's own rules, the lfp of `Tstep S`), and
`Δ_node := (· ⊔ᵏ w_nbr)`, the join with the neighbours' settled sections restricted to the
shared cells — a `joinClosure` [Lean: `Settling.lean` `joinClosure k`], which is also the
shape of pair 2 (`Bigraded.joinNucleusK`) lifted from readings to valuations. **They need not
commute**: `σ (v ⊔ w) ≥ σ v ⊔ w` with strict inequality whenever `v` and `w` together fire a
rule neither fires alone (`{a ∧ b ⟹ c}`, `v = {a}`, `w = {b}`). So commutation is a
*property of the node-and-neighbourhood*, to be checked, and when it fails the node iterates
`σ ∘ Δ` to the joint fixed point, which exists by Knaster–Tarski on the finite lattice [Lean:
`Calculus/Order/KnasterTarskiStandalone.lean` `Mono`, `lfp_least`, `lfp_least_of_fixed`] and
lies in `Fix σ ∩ Fix Δ` regardless. This is precisely what the code's `settle()` does
(`delta` then `sigma`, iterated until equal) and precisely why its commutation is "asserted
numerically": the composite's one-pass idempotence is the commutation property, and the loop
is the fallback when it fails. The imagined chain makes the diagnosis explicit: a node
reports `commutes : Bool` with its receipt, computed as `σ (Δ W) = Δ (σ W)` on its support.

The four corners then read, for a node: `W` (what it holds), `Fix σ` (what its own theory
cannot add to: self-closed), `Fix Δ` (what its neighbours cannot add to: transfer-closed),
`Fix σ ∩ Fix Δ` (doubly quiescent: the node's settled section, `A*`). `cellCorner` names them
by the four FOUR corners [Lean: `Autopoiesis.lean` `cellCorner`], and the chain uses those
names as the states of a node: *potential* (own-closed only), *active* (transfer-closed only),
*stable* (both), *absurd* (neither). A node that is `stable` on its whole support has nothing
to do until it is told or until `D` rewrites its rules.

### 6.2 Dry foam: merge is a join, and it needs no coordination

On a shared cell, two nodes' readings merge by `joinK` [Lean: `Site/Sheaf.lean`
`joinList_congr`: the join is independent of order and multiplicity;
`CRDTCohomologicalCALM.lean` `calm_fiber_merge_order_independent`,
`calm_monotone_coordination_free`]. Because every node's orbit is `≤ₖ`-monotone and every
merge is a join, the foam is a CRDT: replicas converge to the same section whatever the
delivery order. The Čech datum of the nodes' local sections over the cover, *when it is a
cocycle* (agreeing on overlaps), glues to a unique global section [Lean:
`SettlingCohomologyH1.lean` `Cech1`, `Cocycle`, `glue`, `glue_coboundary`, `glue_unique`,
`h1_vanishes`]; a section is determined by its restrictions (`separated`).

**When the datum is not a cocycle** — node N₁ reads `x.flies = f` and node N₂ reads
`x.flies = t` — the regime does not record an obstruction. It merges to `⊤` (`joinK f t =
kTop`) and holds the contradiction *in the cell*, with both witnesses kept
(`joinK_measured`, `evidence_accumulates_joinK`; the companion `meetK_not_measured` is the
"absurd reached, witnesses kept" law for the meet). The foam stays dry: every film of
disagreement collapses into a ⊤-cell, which is a value, not a hole. This is the logic
regime's defining behaviour under disagreement, and it is the behaviour the README calls
*paraconsistent*: ⊤ is inhabited and the machine keeps running through it.

### 6.3 Where the films are: the cover nerve's cycle rank

What does *not* vanish is the combinatorial coordination cost. Form the nerve of the node
cover: vertices = nodes, edges = overlapping pairs, components by union-find. Its
`H1rank = (cells + components) − entities` is zero iff the nerve is a forest, and it counts
the independent cycles, "each an irreducible coordination obstruction (a cell needing a total
order)" [Lean: `CoordinationCohomology.lean` `CoverNerve`, `H1rank`, `CoordinationFree`,
`h1_vanishes_iff_forest`, `h1rank_is_coordination_cost`]. For the foam this is the honest
reading of "films": a cycle in the node cover is a place where, *if* one wanted to decide
`f` against `t` rather than hold `⊤`, a total order would be needed. The chain never wants
that; it ships the contested cell and the cycle rank together, and the geometry regime
(the distal bypass, the refusal number) decides what to do with a film. [EXT-10] constructs the
`CoverNerve` of a node cover from the chains' patch incidence (`CoverNerve.ofIndexedCoverIncidence`
already exists for `IndexedCoverIncidence`; the extension is the map from a set of chains to
that structure).

The geometry check's warning is kept: "H¹" names several things in the tree, and in this
regime only two are in play — the Čech `H¹` of `F_U`, which vanishes for cocycles, and the
nerve's cycle rank, which is a count. Neither is the sheaf Laplacian of `cellular-sheaf.mjs`.

### 6.4 The foam as an abiotic organism

With the Lean names fixed, the organic reading is exact rather than decorative:

- **Growth front** = the cells at which `Tstep` fires this stage: `deficit_strict_of_fires`
  says each firing lowers the free energy by at least one, `deficit_nonneg` that it is bounded
  below. Growth is monotone and finite per cell (height ≤ 2).
- **Metabolism** = the ledger: commits, mints, jumps, summed to the flux, conserved against
  the deficit (`rule_ledger`). A node's "energy budget" at a stage is a `Nat` and is
  published.
- **Differentiation** = concepts: the closed sets of the node's context (`Concept`,
  `conceptCompleteLattice` [Lean: `FormalConceptAnalysis.lean`]); a settled row is the
  concept its object falls into. The multicellular vision note's "differentiates each cell into
  a formal concept" is this, with the Lean name attached.
- **Membrane** = the node's patch `p : PredicationCell → Bool` in the `Cover`.
- **Scar** = a `⊤`-cell: the register transfer `truth_loss_is_record_gain` counts, at each
  stage, exactly how many `t`-cells became `⊤` — the node keeps a count of its wounds.
- **Division** = `RuleDynamics`: `D.step S` may split a rule system into two (two nodes with
  disjoint supports and a shared boundary), and `rewriteTo` is the surgery that replaces a
  node's theory in one meta-step.
- **Death and retraction** = not in this regime. Nothing is ever withdrawn
  (`calm_monotone_coordination_free`, monotone orbit; `KLE_pos`); a node cannot un-tell. The
  aperiodic regime, where `Record.topBump` climbs forever and the germ order has slack, is
  where irreversible history lives; the logic foam hands its scars upward and does not heal
  them.

"Abiotic digital organic simulation" is then a precise claim: the foam grows, metabolizes,
differentiates and scars by theorems about `Nat`-valued heights on FOUR, with no biology and
no real numbers in the laws.

## 7. What the chain can do that a large language model cannot, and the converse

Each item names the Lean fact that makes it so.

1. **Every told cell carries its licence.** A reading above token-presence has a derivation
   in `Π` naming the rule and premise cells (`rule_respecting` says a closed valuation holds
   every fired consequent; EXT-2 makes the witness a datum). An LLM's token has no licence.
2. **Contradiction is a value, not a failure.** `⊤` is inhabited; merging `t` with `f` gives
   `kTop` with both witnesses kept (`joinK_measured`); the orbit continues
   (`Tstep_mono`). The register transfer is counted (`truth_loss_is_record_gain`). An LLM has
   no state for "told both" except a lower-confidence token.
3. **It knows when it is done, and by how much it was not.** `deficit_eq_zero_iff` is the
   stopping criterion; `rule_ledger` is the invoice. An LLM has no fixed point to reach.
4. **Nodes merge without consensus.** Join merges are order-independent
   (`joinList_congr`); the orbit is monotone; agreeing families glue uniquely
   (`h1_vanishes`). Coordination-free, by theorem, in this regime. Multi-agent LLM systems
   coordinate by prompt.
5. **Learning retracts exactly.** An implication holds iff `B₂ ⊆ closeM I B₁`
   (`implies_iff_closeM`); one counter-object makes it false and the re-induced basis drops it.
   The code's own comment calls exact implications "proof-grade but brittle" and adds a
   weighted layer (`induceWeightedImplications`, noisy-OR at confidence ≥ 0.55); the chain
   keeps the weighted layer *out of the laws* and in the language regime's choice of what to
   say next. Gradient learning cannot retract one fact.
6. **Quantifiers are adjoints, not searches.** `existsF_adjunction`, `forallF_adjunction`,
   and their truth duals; equality derived (`classicalEq_eq`, `paraconsistentEq_eq`). An LLM
   approximates "someone" and "everyone" statistically.
7. **"What would make this true" is a lookup.** `readingFuse_tle_iff`: the greatest licensing
   companion is `readingImp b c`. An LLM must generate candidates.
8. **It knows its own regime.** `finite_antecedent_scott_continuous` and EXT-11 classify the
   node; an infinitary-antecedent question ("for all `o` in an infinite set") is *outside* its
   regime (the file's own prose: quantifier closures over infinite `E` are not Scott) and the
   node says so rather than answering. An LLM has no regime.
9. **Proofs have canonical forms.** When `normalize` returns, the form is unique
   (`normalize_unique`); two derivations are one proof or two, decidably on the normal form.
10. **The laws are kernel-checked.** Every claim above names a theorem; the chain's conformance
    is tested against Lean golden vectors (the method `SS/signstuff-evm` already uses).

And what it cannot do: it does not generalize past closure (an unseen attribute column is
`⊥`, as the survey notes of `algebra.mjs`); its basis induction is exponential in the
attribute alphabet (`dgBasis` walks closed sets in lectic order); it has no sequence model
(the language regime's job); and every claim it makes about an open world is as good as the
articulatings it was handed. The chain is not a replacement for a language model. It is the
thing a language model should be *downstream of*.

## 8. Worked examples

All readings, rules and words below are real: the penguin context is the fixture of
`SS/signcraft/test/inference/denial.test.mjs`; the RelConLang particles are the tables of
`SS/signcraft/src/inference/relconlang.mjs`; every arithmetic step is against the Lean
definitions named.

### 8.A A penguin, settled by a rule system, with the ledger

**Context** (`G = {p1, p2, r1, r2}`, `M = {penguin, bird, flies}`): `p1, p2` are penguins and
birds and are *witnessed not to fly* (denial rows); `r1, r2` are birds that fly. Intents:
`p1, p2 ↦ {penguin, bird, ¬flies}`, `r1, r2 ↦ {bird, flies}`. The supported basis
(`lawfulBasis`), computed by hand as the pseudo-intents with realized premises:

- `∅ ⟹ {bird}` (every object is a bird);
- `{penguin, bird} ⟹ {¬flies}`;
- `{¬flies, bird} ⟹ {penguin}`;
- `{flies, bird}` is closed; premises `{¬penguin}`, `{¬bird}`, `{penguin, flies, bird}` have
  empty extent and are dropped (ex falso guard).

The test asserts the second law is present; this agrees.

**As a Lean rule system.** Cells for a fresh object `y` (subject = object = `y`, as `infer.mjs`
does with `at`): `φ_pen = ⟨y, penguin, y⟩`, `φ_bird = ⟨y, bird, y⟩`, `φ_fly = ⟨y, flies, y⟩`.

- `r_bird := alwaysRule φ_bird tTop` [Lean: `RuleSystem.lean` `alwaysRule`] — from `∅ ⟹ bird`.
- `r_nofly := ⟨fun v => (v φ_pen).pos && (v φ_bird).pos, _, φ_fly, tBot⟩` — from
  `{penguin, bird} ⟹ ¬flies`; `antMono` by `KLE_pos_mono` twice.
- `r_pen := ⟨fun v => (v φ_fly).neg && (v φ_bird).pos, _, φ_pen, tTop⟩` — from
  `{¬flies, bird} ⟹ penguin`; `antMono` by the against-side analogue of `KLE_pos_mono`
  (same four-case `decide`).

`S_y = [r_bird, r_nofly, r_pen]`.

**Seed x: told only "penguin".** `seed = bump φ_pen tTop`. The orbit `ruleOrbit S_y seed`:

| stage | `φ_pen` | `φ_bird` | `φ_fly` | fired | height | `stepFlux` |
|---|---|---|---|---|---|---|
| 0 | t | ⊥ | ⊥ | — | 1 | — |
| 1 | t | t | ⊥ | `r_bird` | 2 | 1 (commit) |
| 2 | t | t | f | `r_nofly` (needs `bird` at stage 1) | 3 | 1 (commit) |
| 3 | t | t | f | `r_pen` fires, `joinK t t = t`: no change | 3 | 0 |

Stage 3 equals stage 2, so `SClosed S_y (clS S_y seed)` holds and `generated_closure_is_least`
applies: this is the least `S_y`-closed valuation above the seed. The ledger: `deficit
[φ_pen, φ_bird, φ_fly] seed w = (1−1) + (1−0) + (1−0) = 2`, `ruleOrbitFlux 3 = 1 + 1 + 0 = 2`,
`deficit (orbit 3) w = 0`: `rule_ledger` closes. The chain reports: `x.bird = t` licensed by
`r_bird`; `x.flies = f` licensed by `r_nofly` from `[φ_pen, φ_bird]`. The test's assertions
(`bird = potential`, `flies = active`, lanes `pos` and `neg` both witnessed,
`ledger.closes = true`) are these lines. The difference from the code: `sigma` runs
`impClosure` to its fixed point inside one `settle` step, so the code reports one step with two
witnesses where Lean's `Tstep` reports two stages; the fixed point and the flux are the same,
which is what `generated_closure_is_least` guarantees.

**Seed y: told "penguin" and "flies".** `seed = bump φ_pen t ⊔ bump φ_fly t`, height 2.

| stage | `φ_pen` | `φ_bird` | `φ_fly` | fired | height | `stepFlux` |
|---|---|---|---|---|---|---|
| 0 | t | ⊥ | t | — | 2 | — |
| 1 | t | t | t | `r_bird` | 3 | 1 (commit) |
| 2 | t | t | ⊤ | `r_nofly`: `joinK t f = kTop` | 4 | 1 (**mint**) |
| 3 | t | t | ⊤ | `r_pen`: `joinK t t`, no change | 4 | 0 |

`deficit = 2 = 1 commit + 1 mint`, matching the test's `mints = 1` and `flies = stable`.
`isInconsistency (v φ_fly) = true`; `truth_loss_is_record_gain` at stage 1→2 counts one
`t`-cell that stopped truth-firing and became `⊤`: the register transfer, one unit. The
contradiction is local: `φ_pen` and `φ_bird` stay `t`. With EXT-1 the against-lane witness
of `φ_fly` is the derivation `{rule: r_nofly, from: [φ_pen, φ_bird]}` and the for-lane
witness is the seed's token: both kept, neither cancels the other.

**Where the lax question shows up.** At stage 3 in both runs, `r_pen` re-derives `φ_pen = t`.
On readings this is the identity. In `Π` it is a new entry. §5.3's EXT-13 is exactly this
line of the table.

### 8.B Quantifying over who alice teaches

Tokens `alice`, `bob`, `carol`; predicate `teaches`. Valuation `v`:
`⟨alice, teaches, bob⟩ = t` (told she does), `⟨alice, teaches, carol⟩ = f` (told she does not;
by `no_denial`, this means an articulating landed on the contradictory predicate `k.c teaches`
at that cell), all else `⊥`.

**Converse.** `reindex PredicationCell.converse v ⟨bob, teaches, alice⟩ = v ⟨alice, teaches,
bob⟩ = t` [Lean: `Hyperdoctrine.lean` `reindex`, `converse_adjunction`]: "bob is-taught-by
alice" is the same cell read through the converse, and the adjunction says nothing is lost
either way (`reindex_converse_converse`).

**Subject projection, over the node's finite universe [EXT-4].** `F_s` with
`base = subjProj`, `fiber ⟨alice, teaches, alice⟩ = [⟨alice, teaches, alice⟩,
⟨alice, teaches, bob⟩, ⟨alice, teaches, carol⟩]`; `mem_fiber` holds because the node's
universe is `{alice, bob, carol}`. (Over the unrestricted `Token`, the fiber is infinite and
no `FiniteFibration` exists — `Hyperdoctrine.lean`'s header says the projection case needs a
finite entity index. This is why EXT-4 is needed, not a convenience.)

- `existsF F_s v ⟨alice, teaches, alice⟩ = joinList [⊥, t, f] = kTop` — *evidence* of alice
  teaching someone is on both lanes: ⊤.
- `existsT F_s v ⟨alice, teaches, alice⟩ = joinTList [⊥, t, f]`: `joinT f tBot = f`,
  `joinT t f = (max pos, min neg) = (T, F) = t`, `joinT ⊥ t = t` — "alice teaches someone" is
  **true** [Lean: `Equality.lean` `existsT`, `joinTList`].
- `forallT F_s v ⟨alice, teaches, alice⟩ = meetTList [⊥, t, f]`: `meetT f tTop = f`,
  `meetT t f = (F, T) = f`, `meetT ⊥ f = f` — "alice teaches everyone" is **false**.
- `forallF F_s v ⟨alice, teaches, alice⟩ = meetList [⊥, t, f] = kBot` — nothing is told on
  both lanes about all of them.

The adjunction in use: to check `existsF F_s v ≤ₖ w` at the projected cell, check
`v ψ ≤ₖ w (subjProj ψ)` for each `ψ` in the fiber (`existsF_adjunction`); the chain never
searches beyond the fiber list.

**Equality, derived.** `paraconsistentEq alice alice = kTop`, `classicalEq alice bob = tBot`
[Lean: `Equality.lean` `paraconsistentEq_eq`, `classicalEq_eq`]; and the two agree on *where*
(`two_equalities_one_diagonal` [Lean: `HyperdoctrineDual.lean`]).

**Spelled for the language regime.** The RelConLang request `ku kelu ga ran-um do ?` (force
`ku` question; `kelu ga` subject; `ran-um` verb root `ran` with the settled aspect `-um`;
`do ?` an empty object) is the hole `⟨kelu, ran, _⟩`. The chain answers with the object fiber
of `ran` at `kelu` and the reading per member; the surface spells `t` as `ta`, `⊤` as `sha`,
`⊥` as `mu` (the particle table in `relconlang.mjs`). The chain does not choose the word
order; it supplies the cell.

### 8.C Residuation: what would license the conclusion

`readingImp b c` on FOUR, from `imp ⟨x,y⟩ ⟨z,v⟩ = ⟨(x→z)∧(v→y), x∧v⟩` over `Two` with
`t = (T,F)`, `f = (F,T)`, `⊥ = (F,F)`, `⊤ = (T,T)` [Lean: `TwistProductResiduation.lean`
`imp`; `LinearLogicChu.lean` `readingImp`]:

| premise `b` | goal `c` | `readingImp b c` | read as |
|---|---|---|---|
| t | t | t | a true companion suffices |
| t | f | f | to reach a denied goal from a told premise, the companion must be denied |
| f | t | t | from a denied premise anything true is licensed |
| f | f | t | likewise |
| t | ⊤ | f | to reach "told both" from "told for", add the denial |
| ⊤ | t | t | |
| t | ⊥ | ⊥ | nothing licenses "told nothing" from "told for" except telling nothing |
| ⊤ | ⊥ | ⊥ | |

Check of the adjunction on one row (`readingFuse_tle_iff`): `a ⊙ t ≤ₜ f ↔ a ≤ₜ f`. Compute
`fuse (x,y) (T,F) = (x, ¬x ∧ y)`; this is `f = (F,T)` iff `x = F, y = T`, i.e. `a = f`; and
`a ≤ₜ f` (pos ≤ F, T ≤ neg) iff `a = f`. Both sides agree.

The chain's use: in 8.A's seed y, the goal "`flies` settles to `f`" from premise "`flies` told
`t`" has `readingImp t f = f` — the only companion reading that would license it in the truth
order is a denial. The chain therefore does not try to *infer* consistency; it reports that
consistency would cost a denial of the seed, which the regime cannot issue (no retraction,
§6.4). That is a precise, lookup-grade account of why the cell is `⊤`.

### 8.D A nuclear plan, normalized and evaluated in `joinSquare`

Plan: `M₀ = Saturate (Transfer (conj (Saturate (var x)) (var y)))` — "transfer the conjunction
of a saturated `x` with `y`, then saturate". Rewrite by `Step` using only the five sound rules
and congruence [Lean: `NuclearFormula.lean`]:

1. `saturate_step (R4 …)`: `Saturate (conj (Transfer (Saturate x)) (Transfer y))`;
   `nuclearW`: 16 → 14 (`nuclearW_R4_decreases`).
2. `R3`: `conj (Saturate (Transfer (Saturate x))) (Saturate (Transfer y))`; 14 → 13
   (`nuclearW_R3_decreases`).
3. `conj_left (R7 …)`: `conj (Transfer (Saturate (Saturate x))) (Saturate (Transfer y))`;
   `nuclearW` 13 → 13 (`nuclearW_R7_preserved`), `entanglement` 2 → 1 (`entanglement_R7`).
4. `conj_left (transfer_step (R1 …))`: `conj (Transfer (Saturate x)) (Saturate (Transfer y))`;
   13 → 9.
5. `conj_right (R7 …)`: `conj (Transfer (Saturate x)) (Transfer (Saturate y))`; 9 → 9,
   `entanglement` 1 → 0.

The result is a `NormalForm`: no root rule matches (`Transfer (Saturate _)` is R7's target
orientation; no nested `Saturate`/`Transfer`; no `conj` under a modality). Lexicographic
`(nuclearW, entanglement)`: `(16,1) > (14,1) > (13,2) > (13,1) > (9,1) > (9,0)`.

**Evaluate both ends in pair 2** [Lean: `Bigraded.lean` `joinSquare c₁ c₂` on `heytingK`,
`joinNucleusK c a := joinK c a`], with `c₁ = t` (Saturate = `joinK t`), `c₂ = f` (Transfer =
`joinK f`), `ρ x = ρ y = ⊥`:

- `interp M₀`: `Saturate x = t`; `conj t ⊥ = meetK t ⊥ = ⊥`; `Transfer ⊥ = f`;
  `Saturate f = joinK t f = ⊤`.
- `interp (normal form)`: `Transfer (Saturate ⊥) = joinK f t = ⊤`; same for `y`;
  `conj ⊤ ⊤ = ⊤`.

Equal, as `interp_R1`, `interp_R3`, `interp_R4`, `interp_R7` and the congruence cases
guarantee. (In this square `pi = joinK f ∘ joinK t` is constantly `⊤`: everything is
"stable" under it; the example is about the rewriting, not about an interesting quartet.)
Pair 2 is the only one of the three σ/Δ pairs this example touches; nothing here is about
`Autopoiesis` or `nuclei.mjs`.

### 8.E A proof term at a told-for cell

`φ = ⟨alice, teaches, bob⟩` with `v φ = t`, so `propOfTy v φ Ty.base = (Reading.pos t =
true)` holds [Lean: `CurryHowardLambek.lean` `propOfTy`]. The type `arrow base base` has the
term `lam (var 0)` with `HasTy [] (lam (var 0)) (arrow base base)` by `HasTy.lam HasTy.zero`.
The term `fst (pair (lam (var 0)) star)` steps by `pi1` to `lam (var 0)`;
`normalize 2 (fst (pair (lam (var 0)) star)) = some (lam (var 0))` [Lean: `NormalOrder.lean`
`stepNO`, `normalize`], and `normalize_unique` says no other normal reduct exists. What the
Lean does *not* do, and the chain must not claim: `curry_howard hB (arrow base base)` is
`fun _ => hB`, a proof that never looks at the term; and `HasTy` is not preserved by `step` in
any theorem. EXT-5 is the compile `Derivation → Tm` with `HasTy` soundness and subject
reduction; until then the chain's proof identity is by `Π` records, not by `Tm`.

### 8.F Three nodes, one visitor: a film with no obstruction

Nodes: N₁ the penguin colony (cells over `p1, p2`), N₂ the robin aviary (over `r1, r2`), N₃ the
visitor desk (over `x`). N₃ shares `x`'s cells with both N₁ and N₂ (each admits the visitor
against its own context). N₁ and N₂ share nothing. Nerve: `entities = 3`, `cells = 2`,
`components = 1`; `H1rank = (2 + 1) − 3 = 0`: a forest, `CoordinationFree` [Lean:
`CoordinationCohomology.lean`]. N₁ settles `x` to `{bird = t, flies = f}` (8.A), N₂ (basis
`∅ ⟹ bird`, `{flies, bird}` closed, no denial rows) settles `x` to `{bird = t}`. The two local
sections *agree* on the overlap (`bird = t`; N₂ is silent on `flies`, and `⊥ ⊔ f = f`), so the
Čech datum is a cocycle and glues (`h1_vanishes`): `x = {bird = t, flies = f}`.

Now let N₁ and N₂ also share a cell (both admit a bird `z`): `cells = 3`, `H1rank = 1`: one
film. Suppose N₂'s context has been told `z.flies = t` and N₁ derives `z.flies = f` from
`z.penguin = t`. The local sections disagree; the datum is not a cocycle; the merge is
`joinK f t = ⊤`. The foam does not stall: `z.flies = ⊤`, both witnesses kept, one mint on the
register. The film's rank `1` is reported alongside: *if* anyone wants `z.flies` decided,
exactly one total order is needed. In the logic regime nobody wants it; the chain's
`obstructionsOf` (code) ships the contested cell and the refusal number, and the geometry
regime takes it from there.

## 9. Reading the present code as the chain

The check's §6 gives the realization order; this section only says, per file, which part of
the imagined chain it already is, so the engineering stage does not build a parallel engine.

- `SS/signchain/src/rules.mjs` **is** S2 and §3.2: conjunctive threshold antecedents,
  single consequent, `step = v ⊔ fire(v)`, a derivation record per telling. It is the closest
  code to `ClosureRule`; it lacks EXT-1's evidence-address witnesses (the check's point about
  `address` excluding evidence) and the ledger.
- `SS/signchain/src/bilattice.mjs` **is** `Valued` (S4's carrier); `log.mjs` is the
  append-only trace the algebra regime measures from.
- `SS/signchain/src/typed-theory.mjs` **is** S1, the index category of the four generators,
  with `derive` as linear-chain search (`Path`) and `derivationClosure` as the thin
  reachability closure (`sameGeneratedRule` discards traces — the check's sharpening). It
  stays; it gets the fibration over it (`reindex`, `existsF`/`forallF`, EXT-4) rather than
  being replaced by `Tm`.
- `SS/signcraft/src/inference/nuclei.mjs` `settle` **is** §6.1's iterate-to-joint-fixed-point
  loop with the ledger; `sigma` is `σ_node` (closure under the induced basis), `delta` is a
  partial transfer that the check shows is not monotone (the `extent(...).size === 0` guard),
  so it is not `Δ_node` yet. `stepLedger`, `knowledgeHeight` are `stepFlux`, `kHeight`-sums.
- `SS/signcraft/src/inference/learn.mjs` `learningCurve` **is** `D.orbit` for the basis-induction
  dynamic (EXT-7); `induceWeightedImplications` is outside the laws and belongs to the
  language regime's choice function.
- `SS/signcraft/src/inference/kernel.mjs` `runMachineAction` **is** the move dispatcher
  (`tell`, `settle`, `questions`, `generate`); it must stop accepting bare readings on `tell`
  (§3.1), and its empty `effects` list is where the receipt (§3.9) goes.
- metrologic `src/closure/formal-context.mjs` **is** the FCA passage (`closeAttrs` = `closeM`,
  `impClosure`, `dgBasis`, `lawfulBasis`); the Lean has the Galois connection and
  `implies_iff_closeM`, not the basis.
- `SS/signcraft/src/inference/relconlang.mjs`, `speak.mjs` **are** the first consumer in the
  language regime of §4.2's typed holes.

## 10. Register of extensions

Each extension names the Lean structure it extends, states what is to be defined or proved,
and says what the chain does with it. None is claimed.

- **EXT-1 Witnessed immediate consequence.** Extends `ClosureRule.Tstep` and `Valued`. Define
  `WValuation := PredicationCell → Valued` and `TstepW S : WValuation → WValuation` such that
  `(TstepW S W).value = Tstep S W.value` pointwise, `W.evidence ⊆ (TstepW S W).evidence`
  pointwise on both slots, and a fired rule adds a *derivation witness* on the told lane.
  Prove the projection equation and evidence accumulation (by `evidence_accumulates_joinK`).
  Invariant to prove: `value = presence ⊔ derived`, where `derived` is the join of fired
  consequents. Used by §2 S4, §3.1–3.3, §8.A.
- **EXT-2 Derivations as data.** Extends `RuleSystem.lean`. Inductive
  `Derivation (S) (seed) : PredicationCell → Reading → Type` with constructors `seed` (the
  cell's seed reading) and `fire r (hr : r ∈ S) (premises : derivations making
  `r.antecedent` true)`. Soundness: a derivation of `(φ, V)` implies `KLE V (ruleOrbit S seed n
  φ)` for some `n`; completeness: if `KLE V (ruleOrbit S seed n φ)` and `V ≠ kBot` then a
  derivation exists. The store `Π` is the list of derivations per cell and lane.
- **EXT-3 Regime datum carried.** Extends `ClosureRegimeData`: a chain state includes `d :
  ClosureRegimeData` with `d = extract S base` (EXT-11). Used by §2 S6, §5.
- **EXT-4 Node-local finite fibrations.** Extends `FiniteFibration`. For a finite token
  universe `U` and a generator `g`, construct `F_g : FiniteFibration` whose `base = reindexCell
  g` and whose `fiber φ` enumerates the cells over `U` mapping to `φ`, with `mem_fiber` proved
  *for the restricted cell type* (cells with subject, object ∈ `U`). Obligation: either a
  subtype `PredicationCell_U` with its own `Valuation`, or a proof that the chain's valuations
  are `⊥` off `U` so the unrestricted statement holds. Used by §3.4, §8.B.
- **EXT-5 Derivations compile to terms.** Extends `CurryHowardLambek.Tm`/`HasTy`. A map
  `compile : Derivation S seed φ V → Tm` with `HasTy Γ_S (compile d) (tyOf φ V)`; subject
  reduction `HasTy Γ t A → step t t' → HasTy Γ t' A`; typed strong normalization. Only after
  these does §3.6 give proof identity. The check's §5.2 lists the same three.
- **EXT-6 A non-commutative Lambek algebra of relations.** Extends `Lambek.LambekAlgebra`.
  Instantiate it on Boolean relation matrices with `dot` = composition, `lres`/`rres` the two
  residuals of `SS/signcraft/src/inference/algebra.mjs`; prove the bi-residuation fields. The
  first non-trivial non-commutative instance in the tree; the language regime's Lambek edge.
- **EXT-7 Basis induction as a rule dynamic.** Extends `RuleDynamics`. Define `induce : WValuation
  → RuleSystem` (context from told lanes, implication basis, compile to rules) and
  `D_induce.step S := induce (settleW S W)`. Prove: each compiled rule is sound for the context
  it was induced from (`implies_iff_closeM`). Open (classical, unported): Duquenne–Guigues
  minimality and completeness; the supported-basis variant's relation to `closeM`.
- **EXT-8 Commuting closures and the closure cell.** Extends `CommutingNuclei`/`AutopoiesisCell`.
  Define `CommutingClosures` on the valuation poset (two `Closure`-shaped maps with `comm`);
  re-prove `fix_pi_iff`, `square`, and the three `AutopoiesisCell` fields without `meet`.
  Define `σ_node := cl^S`, `Δ_node := (· ⊔ᵏ w_nbr)`; prove they are closures; *decide*
  commutation per node (it fails in general; counterexample in §6.1); prove the joint fixed
  point of `σ ∘ Δ` exists and lies in `Fix σ ∩ Fix Δ` (Knaster–Tarski). Explicitly not claimed:
  any identification with `Autopoiesis.saturating/transferring`, `Bigraded.joinSquare`,
  `FiberAlgebra.sigma/delta`, or `nuclei.mjs`'s pair.
- **EXT-9 The rest of the nuclear rewrite theory.** Extends `NuclearFormula`. Soundness
  `interp_Rk` for the 22 unproved root constructors; strong normalization by lexicographic
  `(nuclearW, entanglement)`; confluence by critical pairs. Until then §3.8 uses R1–R4, R7 only.
- **EXT-10 The foam's cover and nerve.** Extends `Sheaf.Cover`, `Cech1`, `CoverNerve`. From a
  finite set of chains with patches, build the `Cover` (prove `covers`), the `Cech1` datum of
  settled sections, and the `CoverNerve` (via `IndexedCoverIncidence`); state the merged
  section as `glue` when the datum is a cocycle and as the pointwise `joinK` otherwise.
  **EXT-10a**: the linear derivation chains of `derive` form a `Path` in the generator graph,
  and their token projection is a `SoficImage`.
- **EXT-11 Regime extractor.** Extends `ClosureRegimeData`/`classify`. `extract (S : RuleSystem)
  (base : finite or countable) : ClosureRegimeData` with `scottContinuous := finite-antecedent
  S`, `finiteBase := base finite`, `countableCofinality := true`; prove `classify (extract S
  finite) = strict` and `classify (extract S countable) = scott`. This replaces the declared
  `Stage.regime` for the chain, which is what the `OPEN` marker in `Regime.lean` asks for.
- **EXT-12 The ω-limit of the cascade.** Extends `ruleOrbit`. For finite-antecedent `S` over a
  countable cell universe: `v_ω φ := ruleOrbit S seed (n_φ) φ` where `n_φ` is the stage at
  which cell `φ` stops climbing (exists since `kHeight ≤ 2`); prove `SClosed S v_ω` and
  leastness. Also: generalize `IsScottContinuous` from `Reading.Closure` to valuation
  closures and prove `Tstep S` satisfies it for finite-antecedent `S`.
- **EXT-13 The lax candidate.** Extends `PreValueCategory`/`LaxVClosure`. Carrier
  `Valuation × DerivationStore` with `le := leK ∘ fst`; `op := TstepW` with derivation
  recording; prove `kz`, `infl`, `mono`, and `HasLaxSlack op s` at any state where a
  re-derivation occurs (e.g. §8.A stage 3). State and keep the two cautions of §5.3. Decision
  for the founder: whether this projection preorder is the intended order of proof-relevant
  settling.

## 11. The picture in one paragraph

A chain is a node that holds cells with their readings, their witnesses and their licences,
under a finite list of positive rules it induced from what it was told; it settles by firing
those rules until nothing fires, keeping an exact ledger of every unit of knowledge it adds
and never withdrawing one; it answers quantified and residuated questions by adjunctions over
the four generator moves and spells the answers as typed holes for the language below; it
rewrites its own rules when its evidence changes and knows when it has stopped learning; it
knows it is a Scott-regime machine because its antecedents are finite and its base is
open-ended; and when many chains share a site they merge by joins with no coordination,
collapse every disagreement into a held contradiction rather than a stall, and report the
cycle rank of their overlaps as the price someone else would pay to decide. Every one of those
sentences is a named Lean theorem or a numbered obligation above. Language is what the chain
says; logic is what it is.
