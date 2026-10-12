---
title: "Cascade imagine: the language regime (SignGraph, networking) in operation"
description: "What the language-regime model of the next-generation AI does when it runs, built only on what the adversarial check of the cascade note confirmed: its state (a measured FOUR-valued Chu space per language fiber and its biextensional collapse, a finite local rule, a lexicon-as-substitution, a Lambek algebra of categories, a transport rule system, a discourse cover nerve), its seven moves (hear, identify, well-form, parse and generate, settle, translate, glue), what flows in from the logic regime and out to the geometry regime, how it lives across many nodes as a foam of autopoiesis cells, what it can do that a large language model cannot, worked examples with real FOUR readings over RelConLang and Toki Pona words, real transport rules, real CVL phonotactic paths and real crossings, and the exact list of Lean structures used as named versus the extensions that must be stated and proved."
date-created: 2026-10-08
kind: speculative-design-note
keywords:
  - logical-inference-model
  - cascade
  - language-regime
  - signgraph
  - chu-space
  - biextensional-collapse
  - measured-chu
  - sofic-shift
  - finite-local-rule
  - lambek-calculus
  - cover-nerve
  - coordination-free
  - relconlang
  - toki-pona
  - autopoiesis
  - foam
status: imagine-stage-built-only-on-statements-the-adversarial-check-confirmed-extensions-marked-and-unproved
produced-by: info-imagine-language (Claude Fable 5.1), reading Obsmetrologia and ObsmetrologiaFibercraft Lean statements, the signstuff, communicating and language-systems code, and the 2026-10-08 cascade check of the language regime, at repository HEAD
---

# Cascade imagine: the language regime (SignGraph, networking) in operation

## 0. Standing: what this note is allowed to build on

This is the IMAGINE stage for the language rung of the cascade ALGEBRA → LOGIC → LANGUAGE → GEOMETRY. It follows the adversarial check `2026-10-08-cascade-check-language.md` and builds only on what that check CONFIRMED, under its corrections (§5 of the check). It also respects the sibling checks of the logic, geometry and tower regimes where they bear on this rung. The rule for every mechanism below: it is either a **named Lean structure or theorem** (file and name given, statement read, not only docstring) or an **EXTENSION**, stated precisely enough to be written down in Lean, and marked as such. Nothing marked EXTENSION is claimed proved. Paths: Lean paths are relative to `.../obsmetrological-services-section/lib/obsmetrologia/Obsmetrologia/` (written `Obs/`); Fibercraft is `.../fibercraft-services-section/lib/obsmetrologia-fibercraft/ObsmetrologiaFibercraft/` (`Fib/`); the physical-science package is `.../physical-science-services-section/lib/obsmetrologia-physical-science/ObsmetrologiaPhysicalScience/` (`PhysSci/`); code paths under `.../computer-engineering-services-section/` are abbreviated `signstuff/`, `communicating/` (`.../agent-organization-engine/lib/communicating`) and `langsys/` (`.../computer-language-systems-engineering-services-section`).

### 0.1 The confirmed statements this note stands on

From the check's summary table (rows 2, 11, 12, 14, 15, 16 and the §3 "missed" items), the Lean the language rung may lean on is:

| Lean object | File | What it states (read from the statement) |
|---|---|---|
| `Path step w` | `Obs/AperiodicOrder/Tiling/SoficShift.lean` | `w : List A` is a directed walk of `step : Graph A` (`Graph A := A → A → Bool`); one-step constraints only, finite words, `A` any `Type` |
| `SoficImage step π w` | same | `∃ p, Path step p ∧ p.map π = w`; `sft_is_sofic`, `sofic_of_decorated`, `SoficImage.factor` (letter-for-letter relabelling) |
| `substMap σ`, `substMap_preserves_path` | same, line 218 | a cross-alphabet substitution `σ : A → List B` with nonempty `stepB`-admissible images and `stepB`-allowed block boundaries across every `stepA`-allowed transition carries `stepA`-admissible words to `stepB`-admissible words |
| `fib_deep_sofic` | same | the Fibonacci substitution language is exactly the forgetful image of the decorated SFT `decoStep` |
| `GraphHom.map_path`, `Colorable.pullback`, `ProperColoring.map_path`, `factor_of_sft_is_sofic` | `Obs/AperiodicOrder/Tiling/FiniteLocalRule.lean` | a graph hom carries walks to walks; colourings pull back along homs; a proper colouring relabels walks into walks of `completeGraph C` |
| `ProperColoring`, `Colorable`, `completeGraph`, `GraphHom`, `properColoring_iff_hom`, `fourColouring` | `Obs/Calculus/Order/GraphColoring.lean` | colouring = graph hom into the complete graph on the palette; `fourColouring G := Colorable G Reading` |
| `K4_requires_FOUR`, `proper_completeGraph_injective`, `not_colorable_completeGraph` | `Obs/Calculus/Order/ChromaticNumber.lean` | every proper colouring of a complete graph is injective; these are facts about `K_C` |
| `kingAdjacency := completeGraph Reading`, `corpus_planar_tile_patches_four_colorable` | `Obs/Calculus/Order/TileAdjacencyChromatic.lean` | the three "conventions" are `K2`, `K3`, `K4`; the theorem ranges over a three-constructor inductive |
| `properK4Colourings_count = 24`, `edge_colouring_entropy` | `Obs/Calculus/Order/ColoringEntropy.lean` | counts of proper colourings of `K2`, `K3`, `K4` by `decide` |
| `LambekAlgebra` and its derived laws `modus_ponens_left`, `modus_ponens_right`, `dot_mono_left/right`, `lres_mono_right`, `lres_antitone_left`, `rres_mono_left`, `rres_antitone_right`, `lres_one`, `rres_one`, `lambek_biresiduation`, `commutative_collapses_to_single_implication` | `Obs/Calculus/Logic/LambekCalculus.lean` | a lattice-ordered monoid with two residuals and the two bi-residuation adjunctions as fields; **not** assumed commutative; instances: `Trivial` only |
| `lambekOfResiduated`, `TwoLambek`, `residuated_lattice_is_commutative_lambek`, `CircleData` | `Obs/Calculus/Logic/FCALambekCircle.lean` | every integral commutative residuated lattice is a commutative Lambek algebra; the closing (Wurm/Pentus) edge is prose |
| `ChuSpace`, `ChuSpace.dual`, `dual_involution`, `ChuMap` (`fwd`, `bwd`, `adj`), `ChuMap.id`, `ChuMap.comp`, `dualMap`, `four_star_autonomous`, `readingFuse_tle_iff`, `diamond_adjoint_box` | `Obs/Calculus/Logic/LinearLogicChu.lean` | FOUR-valued matrices and their transforms; the tensor/hom adjunction is on the alphabet FOUR over the truth order, not on Chu spaces |
| `predicationChu`, `fregean_predication_forces_four_and_chu` | `Obs/Language/Predicating/FregeanFourChu.lean` | points `PredicationCell`, states `Valuation`, matrix `v claim` |
| `RowEq`, `ColEq`, `collapse`, `collapse_separable`, `collapse_extensional`, `collapse_mk_eq_iff`, `ChuMap.collapse`, `measuredChu`, `measure_factors_collapse`, `token_identified_iff` | `Obs/Language/Identification.lean` | tokens against tests `(Claim × Token)` measured off a trace; identity by role is the biextensional collapse; Chu transforms descend to collapses |
| `measure`, `witnesses`, `mem_witnesses`, `measure_measured`, `measure_nil`, `measure_cons_le`, `measure_cons_self_pos`, `measure_contradictory_negate`, `Contradictory` | `Obs/Language/Positing/Measure.lean` | a cell's reading is `ofSlots (for-witnesses nonempty) (against-witnesses nonempty)`, the against-witnesses being those of the contradictory cell |
| `Spine.articulate`, `predicate`, `measure`, `run`, `run_pos`, `measure_nil_knowledgeLeast` | `Obs/Language/Spine.lean` | no reading enters from the caller; what is articulated is told for |
| `Synonymy`, `synonymy_refl/symm/trans`, `FiringType`, `flipFiring`, `StrongSettling`, `negTwist`, `StrongMLD`, `Antonymy`, `antonymy_symmetric`, `synonymy_equiv_and_negation_invisible` | `Obs/AperiodicOrder/Tiling/SynonymyAntonymy.lean` | lexical-semantic relations as theorems, **over `Settling`**, not over words |
| `ClosureRule` (`antecedent`, `antMono`, `cell`, `reading`), `RuleSystem`, `Tstep`, `clS`, `generated_closure_is_least`, `immediate_consequence_lfp` (both under the hypothesis `hfix : SClosed S (clS S v)`) | `Obs/Closure/RuleSystem.lean` | the consequence operator of a finite rule list and its least fixed point |
| `ClosureRegime`, `ClosureRegimeData`, `classify`, `Stage.regime`, `cohomologyVanishes`, `regime_tower`, `unattained_settling_gate` | `Obs/Closure/Regime.lean` | the regime is a classification of hand-set flags; `finiteBase = true → strict`; `Stage.predicating ↦ transfiniteBounded`; `cohomologyVanishes` is a table |
| `Stage.next`, `spine_rank_table_descends`, `return_rank_table_ascends` | `Obs/Closure/RegimeCycle.lean` | the four-stage cycle with rank descent and the single return jump |
| `IsNSC`, `forallAnteOp`, `forallAnteOp_isNSC`, `scott_continuous_iff_no_nsc_firing`, `nscRegimeData` (hand-set) | `Obs/Dynamics/Flow/NSCFiring.lean` | a `∀`-antecedent operator that retracts at the assembled join is the finite model of a non-Scott-continuous firing |
| `Cech1`, `Cocycle`, `Coboundary`, `glue`, `glue_coboundary`, `glue_unique`, `h1_vanishes` | `Obs/Cohomology/SettlingCohomologyH1.lean` | every agreeing family glues uniquely, for every datum (no regime hypothesis) |
| `CoverNerve`, `H1rank := (cells + components) - entities`, `CoordinationFree`, `h1_vanishes_iff_forest` | `Obs/Cohomology/CoordinationCohomology.lean` | the cycle rank of a source–stance nerve; zero iff the nerve is a forest |
| `calm_convergence_facts`, `calm_monotone_coordination_free`, `calm_fiber_merge_order_independent`, `Confluent`, `confluent_joinK` | `Obs/Cohomology/CRDTCohomologicalCALM.lean` | monotone orbit, order-independent merge, confluence: a conjunction, not an equivalence |
| `GaloisK`, `reindex`, `converse_adjunction`, `converse_frobenius`, `beck_chevalley` | `Obs/Language/Predicating/Hyperdoctrine.lean` | reindexing along converse is self-adjoint and satisfies Frobenius |
| `Settlement`, `Settlement.ofCech1` | `Obs/Settlement.lean` | a base, a content type indexed by the base, an admission predicate |
| `Settlements.ofTiles`, `Tiles` (`Carrier`, `localRule`, `word`, `admissible`) | `PhysSci/Settlements.lean`, `PhysSci/CondensedMatter/Crystal/Tile.lean` | an admissible word of a local rule is a settlement, definitionally |
| `warpAlt`, `warpAlt_eq_completeGraph`, `warpAlt_forbids_float`, `warp_sofic`, `crossingReading`, `hole_is_kBot`, `miscrossing_is_kTop`, `overUnder_swap_is_negate`, `defectFree_definite`, `both_claims_infeasible`, `hands_grant_one_claim`, `handed_tiebreak_avoids_miscrossing`, `plainWeave_entropy_collapse` (proved; the docstring is stale) | `Fib/WeaveDraft.lean` | a crossing is a reading; a mis-crossing is a held `⊤ₖ`; the hands grant one claim |
| `AutopoiesisCell`, `nuclear_autopoiesis_cell`, `autopoieticCore_iff`, `readingNuclearPair`, `history_filtration_distinct_from_value_order`, `HistorySeparationForcesAperiodicity` (open) | `Obs/AperiodicOrder/Tiling/Autopoiesis.lean` | for **any** `Order.CommutingNuclei H`, the cell with `A* = Fix σ ∩ Fix Δ` and four corners; the history reading is docstring |
| `kz_iff_strict`, `settleStep_settles`, `no_periodic_orbits` | `Obs/Closure/Monad.lean` | on the antisymmetric knowledge order KZ collapses to strict |
| `strict_regime_mu_identity`, `mu_identity_of_cohomologyVanishes` | `Obs/Closure/Monad/KZ.lean` | in the strict **and Scott** regimes `μ` is the identity on `Valuation` |
| `no_laxSlack_of_antisymm`, `mu_content_exactly_at_valued_gate`, `laxSlack_is_nsc_shaped_not_nsc_typed` | `Obs/Closure/Monad/LaxSlack.lean` | lax slack is impossible on any antisymmetric carrier; the one inhabited slack is `Record.tally_lax_slack` on the germ preorder, filed at the aperiodic rung |

Code facts the check established and this note uses: `communicating` imports all four SignStuff libraries and settles sentences through `signcraft/settle` (`communicating/src/speaking/listening/parsing/descending.mjs`); `lambek.mjs` is an arc-annotating proof carrier whose step names are `lexical | left-residual-application | right-residual-application | sentence-introduction | obstruction`; `translation.mjs` uses the identity as its factor map; `signgraph/src/fiber.mjs` is the hyperdoctrine over a site (pullback, `∃`, `∀`, Frobenius check); `signgraph/src/mesh.mjs` `generatedConcepts` is FCA over claims; `signgraph/src/site.mjs` `transportRules` turns specialization into SignChain rules; `signcraft/src/inference/relconlang.mjs` reads RelConLang particles `ta, na ↦ told(true,false)`, `sha ↦ told(true,true)`, `mu ↦ told(false,false)`; the RelConLang manifest (`langsys/apps/relation-language-corpus/data/manifest.json`) carries a `chu` matrix (`pts` = `ta, na, sha, mu`; `sts` = `truth, falsity`), a `sofic` field (alphabet `C, V, L`, a 3×3 graph), a `lambek` field (categories `S, NP, N, VP, FOUR, TOPIC` and 21 judgments typed `S`), and a `discourseCover` of `{entities: 4, cells: 4, components: 1}`.

### 0.2 The corrections this note obeys

1. **Regime label.** No Lean theorem puts a language object in the transfinite-bounded rung. By `classify` (`Obs/Closure/Regime.lean`), any finite base is `strict`; the finitary rule closure of `RuleSystem.lean` is at `κ ≤ ω`. So the language model below carries the regime its carriers earn: **strict** for every finite fiber (and it says so, §3.8), **Scott** for the infinite-but-monotone discourse closure, and transfinite-bounded only under the one hypothesis the library's own definition requires: a `∀`-antecedent rule over all earlier layers (`forallAnteOp_isNSC`), which in this regime is universal discourse closure. That is a conjecture the model is built to *test*, not a label it wears.
2. **Three meanings of "language", five levels.** Phonotactic (sofic), syntactic (Lambek, context-free, needs a non-commutative algebra and a sequent calculus that do not exist in Lean), lexical-semantic (`SynonymyAntonymy` over settlings; `mesh.mjs` over claims), tokens-and-roles (`Identification.lean`), discourse (cover `H¹`). They are kept apart below and each has its own move.
3. **No "the colouring is a valuation"**; `Valuation` is unconstrained and a proper colouring is constrained the opposite way. Colouring enters only as what it is in Lean: a graph hom into a complete graph, which carries admissible words (`ProperColoring.map_path`).
4. **Chu tensor and hom are not in Lean**; `four_star_autonomous` is about the alphabet. Translation is a `ChuMap`, nothing more and nothing less, and its content is `adj` plus `ChuMap.collapse`.
5. **Lambek is not the Lambek of CHL**; `lambekOfResiduated` is not on the road to word order (it is commutative and integral). A syntactic algebra must be a new, non-commutative, non-integral instance.
6. **SPOTCOMP**: MAS is the network and belongs with SignGraph; SHP is a packet format.
7. **σ/Δ.** The founder's correction says σ and Δ are idempotent only in the finite regime and KZ-lax in the Scott regime. The library, as the logic and tower checks found, says: every closure on an antisymmetric carrier is strictly idempotent at every regime (`kz_iff_strict`, `no_laxSlack_of_antisymm`, `strict_regime_mu_identity`), and the only inhabited lax slack is on the germ preorder, filed at the aperiodic rung (`mu_content_exactly_at_valued_gate`). This note does not write "KZ-lax at Scott" as a fact. It does something more useful for the founder's program: §9 exhibits the one carrier in the language regime that is **not antisymmetric** (witnessed valuations, `Valued`, compared by value) and states as an EXTENSION the theorem that would make the correction true there. The three σ/Δ pairs (Autopoiesis history nuclei; `Positing.Bigraded` `joinSquare`; `signcraft/src/inference/nuclei.mjs`) are not identified; the language cell's own pair (§6.3) is a fourth candidate, also not identified.

## 1. What the language model is, in one paragraph

The language regime's model is **a Chu-and-factor-map engine over measured traces**. Its primitive object is not a word and not a probability: it is `measuredChu k trace` (`Obs/Language/Identification.lean`), the FOUR-valued matrix whose rows are tokens, whose columns are tests `(Claim × Token)` and whose entry at `(t, (c, o))` is `(measure k trace ⟨t, c, o⟩).value`, the reading the trace actually shows at the oriented cell `t —c→ o`. A **language fiber** is such a matrix together with the finite local rule its surface strings obey (`Path step`), the substitution that spells its categories as strings (`substMap σ`), the Lambek algebra its categories live in (`LambekAlgebra`, residuals as the two directions of combination), the transport rules its predicates specialise under (`ClosureRule` lists, `RuleSystem`) and the cover nerve of who has said what to whom (`CoverNerve`). A **word's identity is its role**: two tokens are one lexeme exactly when every test reads them alike (`token_identified_iff`), and the collapse (`ChuSpace.collapse`) is computed, not learned. A **translation is a Chu transform** between two fibers' measured spaces (`ChuMap`: forward on tokens, backward on tests, adjointness as an equality of readings), and its fidelity is the equation `adj` checked test by test. **Networking** and **language** are one thing here because a `ChuMap` *is* the SignGraph README's "contract of data carried between parties with demand transported back": `fwd` carries the data, `bwd` transports the demand (the test) back, `adj` is the contract. That is why the language rung is SignGraph.

## 2. State

A node holds, per language fiber ℓ it speaks or hears, the following. Each item is marked **[Lean]** (a named structure, instantiated) or **[EXT]** (an extension stated precisely in §8).

- **S1. The trace** `Tℓ : List Articulating` **[Lean]** (`Obs/Articulation/Articulating.lean`: `utter : Utterance → Articulating`, `pair : Utterance → Articulating → Articulating`; `Utterance = ⟨token, claim⟩`, `Token`/`Claim` each one `Mark`). Everything the node has heard in ℓ, as articulatings, append-only. Nothing else is stored about meaning: readings are measured from it (`Spine.measure`, `measure_nil_knowledgeLeast`).
- **S2. The contradiction codec** `kℓ : Contradictory` **[Lean]** (`Measure.lean`: an involution `c : Claim → Claim`). Denial is the articulation of the contradictory mark (`PredicationCell.contradictory`), so the against-lane of every reading is itself measured from articulatings.
- **S3. The measured Chu space** `Mℓ := measuredChu kℓ Tℓ` **[Lean]** and its collapse `Cℓ := ChuSpace.collapse Mℓ` **[Lean]**. `Cℓ.pts = Quot RowEq` is the node's **lexicon by role**; `Cℓ.sts = Quot ColEq` is its set of **distinguishing tests**. `collapse_separable` and `collapse_extensional` say the collapse has no two roles that read alike and no two tests that read alike: it is the node's actual discriminating power in ℓ.
- **S4. The phonotactic rule** `stepℓ : Graph Aℓ` **[Lean]** over a finite segment alphabet. For RelConLang the manifest's `sofic` field is already this object: `Aℓ = {C, V, L}` and `stepℓ = [[false,true,false],[true,true,true],[true,false,false]]`.
- **S5. The lexicon as a substitution** `σℓ : Lex → List Aℓ` **[Lean instance of `substMap`]** sending each lexeme (a collapsed point, or in the first realization a surface token) to its segment string, with the three hypotheses of `substMap_preserves_path` (nonempty, admissible, boundary-allowed) as per-lexicon proof obligations.
- **S6. The syntactic algebra** `Lℓ : LambekAlgebra` **[Lean structure; EXT for any instance other than `Trivial`]** whose carrier contains the manifest's categories (`S, NP, N, VP, FOUR, TOPIC` for RelConLang) and whose `dot`, `lres`, `rres` are the two directions of combination. §8 X1 gives the instance to build (Boolean relation matrices, non-commutative).
- **S7. The lexical type assignment** `tyℓ : Lex → Lℓ.carrier` **[EXT]**, finite.
- **S8. The transport rule system** `Sℓ : RuleSystem` **[Lean]** of `ClosureRule`s with `antMono`, generated from the site's specialisation morphisms (`signgraph/src/site.mjs` `transportRules`: specialization-for raises the general cell to `potential` when the specialised cell is at least `potential`; specialization-against raises the specialised cell to `active` when the general is at least `active`).
- **S9. The discourse cover nerve** `Nℓ : CoverNerve` **[Lean]** (`entities`, `cells`, `components`, with `entities_le_cells_add_components` and `components_le_entities` as fields), its `H1rank` the number of independent loops of who-told-what-against-whom.
- **S10. The regime datum** `dℓ : ClosureRegimeData` **[Lean structure; EXT for its extraction]**: for a finite trace, finite alphabet and finite rule list, `finiteBase = true`, hence `classify dℓ = strict`. The node carries this tag and reports it (§3.8). The one route to a non-strict tag is §3.8's `∀`-rule.

Across fibers a node holds `ChuMap`s **[Lean]** between its measured spaces (its translations) and, with other nodes, `ChuMap`s between its spaces and theirs (its contracts).

Nothing in S1–S10 is a real number, a weight or a probability. Every item is canonical data with a content address (SignCell `ni:` addresses for cells, per the survey notes), so the whole state is replayable from the trace.

## 3. Moves

Seven moves. Each is given with its Lean anchor, its inputs and outputs in the state above, and the one law that makes it a move of *this* regime and not a heuristic.

### 3.1 HEAR (articulate, predicate, measure)

Input: a surface line in ℓ. Output: `Tℓ` grows; `Mℓ` changes by the laws of `measure`.

The surface line is tokenised (`relconlang.mjs` `tokenize`) and parsed to oriented cells (`parseClause`: `nsubj`, `verb`, `dobj`, obliques `lo`/`ke`/`pa`, `ccomp` through `ve`). Each clause yields an `Articulating` whose head utterance is `⟨subject-token, claim⟩` with the claim the verb-with-object (Frege's unsaturated function, `mesh.mjs` `claimOf`), and `Spine.articulate t c` **[Lean]** appends it. The reading at the clause's own cell is then not chosen: `measure_cons_self_pos` **[Lean]** says the articulating is its own for-witness, and `Spine.run_pos` says the settled reading at that cell has `pos = true`. **What is articulated is told for.** This has an immediate consequence for the RelConLang particles, worked in §7.1: `sha` (hold under contradiction) is realised by articulating the clause **and** its contradictory, so that `measure` reads `ofSlots true true = kTop` by the definition of `measure` and `witnesses (φ.contradictory k)`; `mu` ("unusable") **cannot** be realised as a reading of the clause's own cell, because no articulating measures `⊥ₖ` at its own cell (`measure_cons_self_pos`). `mu` must be an articulating about the clause event: `⟨event-token, usable⟩` articulated under the contradictory claim, so the clause's event is told against on the predicate `usable` while the clause's content cell is not entered at all. The present `relconlang.mjs` table `mu ↦ told(false,false)` is therefore not a reading of the clause but an instruction not to articulate it; the Lean forces that distinction and the code should follow it.

### 3.2 IDENTIFY (collapse)

Input: `Mℓ`. Output: `Cℓ`, the roles and tests.

`ChuSpace.collapse Mℓ` **[Lean]**. Two tokens `t, t'` become one role iff `∀ c o, (measure k T ⟨t,c,o⟩).value = (measure k T ⟨t',c,o⟩).value` (`token_identified_iff`). This is the model's notion of **lexeme**: not a string, a row. Two tests become one iff every token reads them alike (`collapse_extensional`): this is the model's notion of a **distinction the language actually draws**. The collapse is recomputed as the trace grows; by `measure_cons_le` **[Lean]** (`measure` is `≤ₖ`-monotone in prepending), rows only rise, so roles can only split (a new test tells two tokens apart) and never merge; the role lattice refines monotonically. That is **differentiation** in the biological sense used in §6, and it is a theorem about the trace, not a training dynamic.

Lexical semantics on the collapse: **[EXT X3]** define `TokenSynonymy T t t' := (measuredChu k T).RowEq t t'` (literally Lean's `RowEq`, specialised) and `TokenAntonymy T t t' := ∀ c o, (measure k T ⟨t,c,o⟩).value = Reading.negate (measure k T ⟨t',c,o⟩).value`. The Lean `Semantic.Synonymy` / `Antonymy` (`SynonymyAntonymy.lean`) are over `Settling` with `CohEquiv` and `negTwist`; they share the *shape* (an equivalence relation; antonymy as equivalence after a negation twist; `antonymy_symmetric` via `negate_negate`) but are different objects, and the note does not identify them. What Lean already gives for the token versions: `TokenSynonymy` is an equivalence (it is `RowEq`, the kernel of a quotient, `collapse_mk_eq_iff`); `TokenAntonymy` is symmetric by `Reading.negate_negate`; and `measure_contradictory_negate` **[Lean]** says measuring the contradictory cell is negating the measurement, so **the antonym of a token under a claim is its reading under the contradictory claim**: `TokenAntonymy T t t' ↔ ∀ c o, measure ⟨t,c,o⟩ = measure ⟨t', k.c c, o⟩`. Antonymy is contradiction moved from the claim to the token. `mesh.mjs` `compareReadings` with its Jaccard `0.6` threshold is the heuristic the collapse replaces.

### 3.3 WELL-FORM (phonotactic, sofic)

Input: a string over `Aℓ`, or a sentence over `Lex`. Output: admissibility, with transport.

`Path stepℓ w` **[Lean]** decides a segment string. For a sentence `s : List Lex` with a sentence-level adjacency `stepLex : Graph Lex` (which lexemes may follow which; the regular fragment of syntax), `substMap_preserves_path stepLex stepℓ σℓ hne himg hbound s hs` **[Lean]** says: if the lexicon's images are nonempty and admissible and every allowed lexeme adjacency has an allowed segment boundary, the spelled sentence is phonotactically admissible. The three hypotheses are the lexicon's **proof obligations**, and the third is the exact Lean statement of **sandhi**: §7.3 works it on the RelConLang `L` row. Colourings enter here honestly: any `GraphHom stepLex H f` carries admissible sentences to admissible `H`-words (`GraphHom.map_path`), so a part-of-speech tagging that respects adjacency is a factor map and tag sequences inherit admissibility; a tagging that is a proper colouring (`properColoring_iff_hom`) yields tag sequences with no two equal neighbours (`ProperColoring.map_path`). That is all colouring says about language, and it is exactly what a sofic cover can do: regular constraints.

### 3.4 PARSE and GENERATE (syntactic, Lambek)

Input: a sentence with `tyℓ` assignments. Output: a derivation to `S`, or an obstruction, read in FOUR.

In `Lℓ : LambekAlgebra` **[Lean]** the two application steps are theorems: `modus_ponens_left a c : a · (a \ c) ≤ c` and `modus_ponens_right c b : (c / b) · b ≤ c`. A sentence `w₁ … wₙ` parses to `S` iff `tyℓ w₁ · … · tyℓ wₙ ≤ S` in `Lℓ`, and the chain of modus-ponens instances that witnesses the inequality is the derivation. The communicating carrier `lambek.mjs` already names its steps `left-residual-application` and `right-residual-application`; realised, those names denote `modus_ponens_left` and `modus_ponens_right` in a concrete `Lℓ`, and `proven` denotes the inequality holding, not "an `nsubj` arc exists". Word order is carried by **non-commutativity**: `commutative_collapses_to_single_implication` **[Lean]** says that if `dot` commutes then `lres a c = rres c a`, so in a commutative algebra `tyℓ(mi) · tyℓ(ran) · tyℓ(kelu)` and `tyℓ(kelu) · tyℓ(ran) · tyℓ(mi)` are the same element and "the relation relates me" parses whenever "I relate the relation" does. The only Lean instances today (`Trivial`, `TwoLambek`) are commutative; a non-commutative instance is **[EXT X1]**, and a sequent calculus with soundness is **[EXT X2]**. Generation is the same algebra run upward: given a target category `S` and a lexicon, choose a factorisation `S ≥ x₁ · … · xₙ` through the residuals (`one_le_lres`, `one_le_rres` give the unit; `lres_antitone_left`/`rres_antitone_right` say a stronger argument needs a weaker functor) and spell by `σℓ`. The FOUR reading of a parse is the reading of the cell it articulates (§3.1), not a confidence: an ambiguous attachment that produces two derivations with contradictory cells is `kTop` at those cells, held (the `stable` of `lambek.mjs`'s test), which is the design point the check asked to keep.

Context-free power: Pentus (prose in `LambekCalculus.lean`) caps Lambek grammars at context-free; the sofic layer is regular. The model keeps both and never claims the sofic layer parses.

### 3.5 SETTLE (discourse transport)

Input: the cells told by a stretch of discourse, `Sℓ`. Output: the least closed valuation above them.

`descending.mjs` builds cells from entries (a unary entry its reflexive cell `(s, p, s)`; an arc its cell and its two projections `(head, has-rel, head)`, `(dep, is-rel, dep)`) and specialisation edges as two rules per subject (told-for implies told-for, told-against implies told-against), then calls `settleValuation`. In Lean these are `ClosureRule`s **[Lean]**: antecedent "cell at least `potential`" is `≤ₖ`-monotone (`antMono` holds), consequent `bump cell reading`. `Tstep S v = v ∨ₖ fire S v` is inflationary and monotone (`Tstep_infl`, `Tstep_mono`), and `immediate_consequence_lfp` says that **if** `clS S v` is closed (`hfix`) it is the least fixed point above `v`. On FOUR-valued valuations the three-fold iterate closes by `settles_by_three`'s shape for a fixed finite cell list, which is the strict regime's own guarantee; the model computes `hfix` by checking `Tstep S (clS S v) = clS S v` and records the result as part of its regime report (§3.8). Chains of specialisation close without a separate transitive closure because the lfp is the closure (`descending.mjs` says this; `generated_closure_is_least` is the theorem).

### 3.6 TRANSLATE (Chu transform)

Input: two fibers ℓ, ℓ' with `Mℓ`, `Mℓ'`. Output: a `ChuMap Mℓ Mℓ'` or the list of tests on which none exists.

A translation is `f : ChuMap Mℓ Mℓ'` **[Lean]**: `fwd : Token → Token` (how ℓ's tokens are rendered), `bwd : Claim × Token → Claim × Token` (how ℓ''s tests are asked back in ℓ), `adj : ∀ a y, Mℓ'.r (fwd a) y = Mℓ.r a (bwd y)`. The contract: **the target reads the rendered token on a target test exactly as the source reads the source token on the pulled-back test.** `ChuMap.collapse f` **[Lean]** descends `f` to the role level: `fwd` respects `RowEq` (two source tokens that no source test distinguishes are rendered to target tokens no target test distinguishes), `bwd` respects `ColEq`. So **translation preserves identity-by-role**, as a theorem about every Chu transform. What translation may *lose* is precise: distinctions drawn by source tests that are not in the image of `bwd`. That is the fidelity statement, **[EXT X4]** as a theorem to write: for `f : ChuMap Mℓ Mℓ'`, `fwd a = fwd a'` implies `∀ y, Mℓ.r a (bwd y) = Mℓ.r a' (bwd y)`, i.e. two source tokens merged by the translation agree on every pulled-back test, and the tests outside `range bwd` are exactly where they may differ. Composition and inversion are `ChuMap.comp` and `dualMap` **[Lean]**. The present `translation.mjs` identity map is the trivial `ChuMap.id` on readings; the Mandarin-to-English LLM path with `{for, against}` evidence (`langsys/src/translation-evidence.mjs`) is a *candidate* `fwd` whose `adj` the model checks per test and whose failures it records as against-witnesses. §7.4 works a deixis map RelConLang → Toki Pona.

### 3.7 GLUE (many parties)

Input: statements from several sources about shared cells. Output: `H1rank`, the obstruction count, and the glued section where it is zero.

The sources × stances nerve is a `CoverNerve` **[Lean]**; `H1rank = (cells + components) - entities`, and `h1_vanishes_iff_forest` says it is zero iff the nerve is a forest. `signgraph/src/cohomology.mjs` `pricedNerve` computes this rank over `{source, cell, stance}` statements and also the `top` count (cells told both by different sources). Where `H1rank = 0` and the family agrees on overlaps, `glue` **[Lean, `Cech1`]** produces the unique global section (`glue_coboundary`, `glue_unique`); the geometry check is right that `h1_vanishes` is unconditional in the Čech model, so the *obstruction* content lives in `H1rank` (cycle rank) and in `top`, not in `Cech1`. Merging what many speakers said is coordination-free in the CALM sense **[Lean]**: `calm_fiber_merge_order_independent` says the fiber merge is `joinList` and `joinList_congr` says any arrival order of the same statements gives the same reading. The language regime therefore needs no consensus protocol to merge hearings; it needs one only to *resolve* `kTop`, which is the handed tiebreak of §4.3.

### 3.8 The regime report

The model carries and reports its regime, honestly: for a finite trace, alphabet and rule list, `finiteBase = true` so `classify = strict` **[Lean]**, `cohomologyVanishes strict = true` (a table), and the settle move terminates in three steps (`settleStep_settles`). The one way out of strict that the library's definition allows is a rule whose antecedent quantifies over **all** earlier layers: "every prior turn in this discourse agrees". Such a rule is not a `ClosureRule`, because it is not `antMono` (adding a disagreeing turn un-fires it), and `forallAnteOp_isNSC` **[Lean]** is its finite model (fires on every sub-stage, retracts at the join). So the model's state has **two tiers of rules**: monotone `ClosureRule`s (settle coordination-free, strict/Scott) and `∀`-rules (NSC, flagged, which the model may only *evaluate*, never close under). Whether real discourse needs the second tier is the conjecture the check named; the model is built to find out by counting how many of its `∀`-rules ever fire and retract. **[EXT X5]** is the extractor `RuleSystem → ClosureRegimeData` that makes the tag computed rather than hand-set (`nscRegimeData` is hand-set; the library says so).

## 4. What flows in from above and out below

### 4.1 In from the logic regime (SignChain)

- **Rule systems and bases.** The logic regime hands down `Sℓ : RuleSystem` **[Lean]**: transport rules from specialisation, and implication bases from FCA (`implies_iff_closeM` **[Lean, `FormalConceptAnalysis.lean`]**: `B₁ ⟹ B₂` holds iff `B₂ ⊆ closeM B₁`; the Duquenne–Guigues basis in `metrologic` `lawfulBasis` is the finite presentation, un-Lean'd per the logic check). The language regime fires them (§3.5); it does not invent them.
- **The predication Chu space.** `predicationChu` **[Lean]** (points `PredicationCell`, states `Valuation`) is the logic's matrix; `measuredChu` is its language-side relative, with tokens as points and `(Claim × Token)` as tests and the entry read off a trace rather than a valuation. `measure_factors_collapse` ties them: the measured value at any cell is the collapsed matrix at the collapsed subject and test.
- **The hyperdoctrine generators.** `converse`, `subjProj`, `objProj`, `specialize` (`Obs/Language/Predicating/Cell.lean`) and `reindex` with `converse_adjunction`, `converse_frobenius`, `beck_chevalley` **[Lean]** come down as the cell moves; `signgraph/src/fiber.mjs` already implements pullback, `∃` and `∀` along them with a Frobenius check. The language regime uses them to move readings between cells of a parse (subject projection reads `(s, has-rel, s)` from `(s, rel, o)`), which is what `descending.mjs`'s projections are.
- **Confluence and order independence.** `Confluent`, `confluent_joinK`, `joinList_congr` **[Lean]** come down as the licence to merge hearings without coordination.
- **The σ/Δ discipline.** The logic check's recommendation 1 comes down verbatim: no "KZ-lax at Scott" in any spec until a Scott-classified non-antisymmetric carrier exists. §9 names the language regime's candidate.

### 4.2 Out to the geometry regime (SignCraft)

- **Settlements.** Every admissible string is a `Tiles` and hence a `Settlement` **[Lean, `ofTiles`]**: base `⟨Aℓ, stepℓ⟩`, content the word, admission `Path`. The language regime hands geometry its utterances as settlements of the fiber's local rule, and the sofic case (admission `SoficImage`) is **[EXT X7]**. Geometry lays them out: a dialogue as a weave (§4.3), a corpus as a tiling.
- **Crossings.** When two speakers' claims meet at one cell, the crossing datum `(A claims over?, B claims over?)` is `crossingReading` **[Lean, `Fib/WeaveDraft.lean`]**: a hole is `kBot` (`hole_is_kBot`), a mis-crossing (both claim) is `kTop` (`miscrossing_is_kTop`), swapping who is over is `Reading.negate` (`overUnder_swap_is_negate`), and a defect-free crossing is one of `t, f` (`defectFree_definite`). Resolution is the handed tiebreak: `both_claims_infeasible` (budget one cannot grant both), `hands_grant_one_claim` (`solveL` keeps the weft claim, `solveR` the warp claim), `handed_tiebreak_avoids_miscrossing`. The language regime hands geometry the mis-crossings (its `kTop` cells) and receives back which hand resolved them; the RelConLang repair verb `ren` and the `ri` ("repair") particle are the surface of that return (§7.6).
- **The nerve as site.** `Nℓ : CoverNerve` and its `H1rank` go down as the site over which geometry computes gluing and, if the geometry regime's `clInv` classes are ever connected to the cycle rank (open, per the geometry check), the classifying invariants.
- **Traces as histories.** `Tℓ` goes down as the history over which an autopoiesis cell is built (§6.3); the geometry check's 3.7c says no cell over a `HistorySystem` exists in Lean yet, and this note does not pretend one does.

### 4.3 The cycle, not a ladder

`Stage.next` **[Lean, `RegimeCycle.lean`]** is `articulating → predicating → positing → settling → articulating`, with rank descending one rung per step and returning in one jump (`spine_rank_table_descends`, `return_rank_table_ascends`). The language model's HEAR is the articulating stage, IDENTIFY and PARSE are predicating (the stage whose declared regime is `transfiniteBounded`, which is why the predicating directory houses CHL and the hyperdoctrine), SETTLE is positing/settling, and the return jump is GENERATE: a settled valuation articulated back as a new utterance. The cascade direction (algebra → geometry) is the founder's frame and not a theorem; the cycle is the theorem, and the model runs the cycle.

## 5. What it can do that a large language model cannot

Each item names the theorem that makes it a capability rather than a hope.

1. **Say exactly why two words are one word.** `token_identified_iff`: two tokens are identified iff every claim toward every token measures them alike. The model can list the tests, and the first test that separates them when they come apart. An LLM has a cosine; this has a quotient.
2. **Never supply a reading.** `measure_nil_knowledgeLeast`, `run_pos`: an empty trace measures `⊥ₖ` everywhere, and an articulated claim is told for. A claim no one has made reads `kBot`, not "probably true". The model cannot hallucinate a reading because readings are not outputs; they are measurements of the trace.
3. **Hold a contradiction as a value.** `sha` is `kTop`; `miscrossing_is_kTop`; `gauge_fixes_inconsistency` (negation does not move the inconsistency content). The model keeps both sides, with their witnesses, until a hand resolves them. An LLM averages.
4. **State translation fidelity as an equation and enumerate its failures.** `ChuMap.adj` per test; `ChuMap.collapse` for identity preservation; the tests outside `range bwd` as the exact set of distinctions at risk. An LLM's translation has no invariant to check.
5. **Decide well-formedness and transport it.** `Path`, `substMap_preserves_path`, `GraphHom.map_path`: phonotactic admissibility is decidable, and the lexicon's sandhi obligations are hypotheses, not corpus statistics.
6. **Carry word order as algebra.** `commutative_collapses_to_single_implication` tells the model when its grammar has *lost* word order (the residuals coincide). Non-commutativity is a field, not a learned bias.
7. **Merge many speakers without coordination, and count the loops it cannot merge.** `joinList_congr`, `calm_fiber_merge_order_independent`, `H1rank`, `h1_vanishes_iff_forest`. The model knows its own `H1rank` and reports it.
8. **Report its regime and its termination.** `classify`, `settles_by_three`, `settleStep_settles`: for finite fibers the model terminates in three settle steps and says so; a `∀`-rule that fires and retracts (`forallAnteOp_isNSC`) is flagged as the thing that would move it out of the strict regime.
9. **Be replayed.** The state is a trace of content-addressed articulatings; `measure` is a function of the trace. Two nodes with the same trace have the same lexicon by role, exactly.
10. **Learn by refinement, monotonically.** `measure_cons_le`: hearing more never lowers a reading; roles only split. There is no catastrophic forgetting because nothing is overwritten.

What it cannot do that an LLM can: produce fluent text about a trace it does not have. The model's generation is bounded by its settled valuation and its lexicon by role. That is the point.

## 6. Many nodes: the foam

### 6.1 Cells, membranes, films

A **node** is a set of fibers (S1–S10) and its `ChuMap`s. Read as a cell of a foam:

- The **cell body** is the trace `Tℓ` and its measured space `Mℓ`.
- The **membrane** is the collapse `Cℓ`: what the node can and cannot distinguish. `collapse_separable`/`collapse_extensional` say the membrane has no redundant pores. Two nodes with the same collapse are the same phase in ℓ even if their traces differ, which is the Girard-incarnation reading the foam notes want (survey `theory-foam-life-language`), here as a theorem about quotients rather than a metaphor.
- A **film** between two nodes `n, n'` is a `ChuMap Mℓⁿ Mℓⁿ'` **[Lean]** where one exists, and where none exists the film is the list of tests that no `bwd` can pull back consistently. The film's *thickness* is `H1rank` of the two nodes' joint nerve: zero where their statements form a forest, positive where they loop.
- The **phase** of a cell at a locus is the knowledge join of what the observing nodes have told there (the foam notes' `Φ_D`), which is `joinList` over the fiber **[Lean, `calm_fiber_merge_order_independent`]**: `⊥` void, `t`/`f` bulk, `⊤` interface. The interface is exactly the mis-crossing of §4.2.

### 6.2 Moves of the foam

- **Growth.** Hearing (§3.1) appends to a trace; `measure_cons_le` says the cell's readings rise. Growth is monotone and coordination-free.
- **Differentiation.** As tests accumulate, `RowEq` classes split (§3.2). A cell differentiates by acquiring tests, never by forgetting rows.
- **Fusion.** Two cells whose traces are merged (list append, in any order: `joinList_congr`) have the measured space of the union; the collapse of the union refines both.
- **Death (T2).** A fiber whose collapse has one point (every token reads alike on every test) distinguishes nothing; it is dead in ℓ and is dropped. **[EXT]** as a rule; its detection is `collapse_separable` with `Quot RowEq` a singleton.
- **Neighbour swap (T1).** A new node whose `ChuMap`s change which pairs of existing nodes are connected through it. **[EXT]**; the foam notes' "dissensus".
- **Repair.** A `kTop` cell at a film is resolved by the handed tiebreak (§4.2) and the resolution is articulated back (`ren`, `ri`).

Nothing here is simulated physics. The cost functional the survey notes criticise is not needed: the dynamics are the three monotone facts (`measure_cons_le`, `Tstep_infl`, `joinList_congr`) and the two quotient facts (`collapse_separable`, `collapse_extensional`). "Abiotic digital organic simulation" means exactly that: a population of such cells over a shared site, each a fold over its own trace, exchanging `ChuMap`s, with the cycle rank of their nerve as the one global quantity.

### 6.3 The language cell as an autopoiesis cell

`nuclear_autopoiesis_cell` **[Lean]** holds for **any** `Order.CommutingNuclei H`: `A* = Fix σ ∩ Fix Δ` (`autopoieticCore_iff`), four corners, joint corner is the intersection. To make a language cell one, a commuting pair on its fiber algebra must be exhibited. Candidate **[EXT X9]**: on the knowledge Heyting algebra of valuations over the fiber's cells, `σ := clS Sℓ` (closure under the transport rules; a nucleus when `hfix` holds and meet-preservation is proved, which it is not yet in `RuleSystem.lean`), and `Δ := reindex` along the fiber's `ChuMap` round trip (transfer along a translation and back; `reindex` is meet-preserving by `reindex_meetK`, and self-adjoint along involutions by `galois_reindex`). The obligation is `Q.comm : σ (Δ a) = Δ (σ a)`. This pair is **a fourth σ/Δ** beside the Autopoiesis history nuclei, the Bigraded `joinSquare` and the `nuclei.mjs` pair, and is not identified with any of them; `history_filtration_distinct_from_value_order` **[Lean]** is the precedent for keeping such pairs apart. If the pair commutes, `A*` is the fiber's **autopoietic core**: the valuations fixed under both closing-by-rules and transferring-through-translation, the part of what a node knows that survives being said in another language and heard back.

## 7. Worked examples

All words are from `langsys/apps/relation-language-corpus` (RelConLang, code `x-rel`) and `langsys/services/tokipona-language-algebra/src/bundle.mjs` (Toki Pona, code `tok`). FOUR is written `kBot | tTop | tBot | kTop` as in `Reading`, with the JS names `absurd | potential | active | stable` beside them where the code is cited.

### 7.1 Hearing `sha ni ga lin do tilo` (x-rel-004)

Tokens: `sha ni ga lin do tilo`. `parseClause` reads `nsubj = ni` (marked after by `ga`), `verb = lin` (link), `dobj = tilo` (tile, marked before by `do`), particle `sha` = charge `stable`. The cell is `φ = ⟨ni, lin·tilo, ni⟩` read as the oriented cell `ni —lin→ tilo`, with the claim `c = lin-do-tilo`.

Realisation under Lean. Two articulatings enter the trace, because `sha` means "held under contradiction": `a₁ = utter ⟨ni, c⟩` and `a₂ = utter ⟨ni, k.c c⟩` (the contradictory claim, `Contradictory.c`). Then by `measure` **[Lean]**:

- `witnesses φ (a₁ :: a₂ :: T)` has head `ni` (from `a₁`, since `a₁.orientedCell = φ`), so the for-slot is nonempty;
- `witnesses (φ.contradictory k) (a₁ :: a₂ :: T)` has head `ni` (from `a₂`), so the against-slot is nonempty;
- `(measure k (a₁ :: a₂ :: T) φ).value = Reading.ofSlots true true = kTop` (`stable`).

The witnesses are carried (`measure_measured`: the value is built from exactly the witness lists it carries). Compare `ta ni ga lin do tilo` ("actively"): one articulating `a₁`, `ofSlots true false = tTop` (`potential`), by `measure_cons_self_pos`. Compare `na` ("pending"): the same `tTop`, and the check noted `ta` and `na` collapse in FOUR. Here is where they come apart in this model: `na` marks the claim's settlement as **not yet attained**, i.e. the clause enters the trace but the node's SETTLE move is deferred, so the reading is `tTop` *at stage 0 of its orbit*, and the pair `(reading, stage)` is the "transfinitely-valued" datum the README names (the check's target 7). `ta` is `tTop` with the orbit settled (stage ≤ 3, `settles_by_three`). The distinction `ta`/`na` is a **regime-stage** distinction, not a FOUR distinction, and `Valued` plus a stage index **[EXT]** is its carrier.

`mu ni ga lin do tilo` ("unusable"): by `measure_cons_self_pos` the clause cannot be entered and read `kBot`. Realisation: articulate `⟨event(ni-lin-tilo), k.c usable⟩`, i.e. the event entity is told against on `usable`, and the content cell is not articulated. Its reading stays `kBot` because nothing was said *of it*; what was said was *about* it. The code's `mu ↦ told(false,false)` must become "do not articulate; articulate the event's unusability".

### 7.2 Parsing `mi ga ran do kelu` and refusing `kelu ran mi`

Categories from the manifest's `lambek` field: `S, NP, N, VP, FOUR, TOPIC`. Type assignment `tyℓ` **[EXT X1/X2 for the instance; the steps below are Lean theorems in any `LambekAlgebra`]**, using `NPₛ` and `NPₒ` for marked subject and object (sub-elements of the carrier below `NP`):

- `mi : NP`, `kelu : NP`
- `ga : NP \ NPₛ` (marks the nominal to its left as subject: "`ga` marks the nearest topic/entity to its left as acting subject", grammar profile)
- `do : NPₒ / NP` (marks the nominal to its right as object)
- `ran : NPₛ \ (S / NPₒ)`

Derivation, each step a named theorem:

1. `mi · ga = NP · (NP \ NPₛ) ≤ NPₛ` by `modus_ponens_left NP NPₛ`.
2. `do · kelu = (NPₒ / NP) · NP ≤ NPₒ` by `modus_ponens_right NPₒ NP`.
3. `NPₛ · ran = NPₛ · (NPₛ \ (S / NPₒ)) ≤ S / NPₒ` by `modus_ponens_left NPₛ (S / NPₒ)`.
4. `(S / NPₒ) · NPₒ ≤ S` by `modus_ponens_right S NPₒ`.
5. Assemble with `dot_assoc`, `dot_mono_left`, `dot_mono_right` (`lambek_biresiduation` items 5 and 6): `(mi · ga) · ran · (do · kelu) ≤ NPₛ · ran · NPₒ ≤ (S / NPₒ) · NPₒ ≤ S`.

The everyday register `mi ran kelu` (reg-rel-001, no particles) needs `ran : NP \ (S / NP)` and the grammar profile's positional strategy ("the nearest nominal to the left of the verb is the acting subject when `ga` is absent"); that is a second lexical entry or a type-raising, and it is a decision the model records as a rule, not a probability.

Refusal: `kelu ran mi` with `ran : NP \ (S / NP)` gives `kelu · ran ≤ S / NP` and then `(S / NP) · mi ≤ S`, so it **parses**, and that is correct in a free-order language; in RelConLang the manifest says SVO with role recovery by position, so to refuse it the subject and object must be distinct elements (`NPₛ ≠ NPₒ` below `NP`), which the particles supply and the positional reading must supply too. The decisive Lean fact is about the *algebra*: in `TwoLambek` or any commutative instance, `lres a c = rres c a` (`commutative_collapses_to_single_implication`), so `NP \ (S / NP)` is `(S / NP) / NP`... in a commutative algebra `a \ c = c / a`, so a functor that wants its subject on the left is the same element as one that wants it on the right, and `kelu ran mi` and `mi ran kelu` are the same product. **Any grammar run in the library's present Lambek instances cannot see word order.** That is the sentence the check wanted stated, and it is why X1 is the first Lean target of this regime.

Reading of the parse: the cell `⟨mi, ran·kelu, mi⟩` is articulated (§3.1), `tTop`. If a second derivation attached `kelu` elsewhere and articulated a different cell, both are entered; a contradiction between them would be `kTop` at the shared cell and reported as `obstruction`, which is `lambek.mjs`'s `stable` reading of an ambiguous attachment, now a measurement.

### 7.3 Phonotactics of `kelu` and the sandhi obligation

The manifest's `sofic` field: alphabet `[C, V, L]` (indices 0, 1, 2) and graph

```
     C      V      L
C  false   true   false
V  true    true   true
L  true    false  false
```

`kelu` spells `C V C V`. `Path step [C,V,C,V]` **[Lean]** unfolds to `step C V ∧ step V C ∧ step C V = true ∧ true ∧ true`: admissible. `sava`, `tilo`, `rama`: likewise `C V C V`. `ran` spells `C V C`: `step C V ∧ step V C`, admissible. A word ending in `L` (none in the present lexicon; the note says "liquid codas only before fresh onsets") would end `… V L`, admissible since `step V L = true`.

Now the sentence level. Let `stepLex` allow `ran → kelu`, `mi → ran`, etc. `substMap_preserves_path stepLex step σ` **[Lean]** needs, for every allowed `a → b`, that `step (last (σ a)) (head (σ b)) = true`. For `ran → kelu`: last `C`, head `C`, and `step C C = false`. **The theorem does not apply**: `mi ran kelu` spelled is `C V | C V C | C V C V`, and at the `ran|kelu` boundary two consonants meet, which this phonotactic graph forbids. The model therefore learns, from Lean, that the manifest's sofic sketch and its lexicon are inconsistent as stated: either `step C C` must be `true` (consonant clusters across word boundaries allowed), or word boundaries are a fourth letter (a pause `#` with `step C # = step # C = true`), or the lexicon must respect a sandhi rule. The `L` row makes the same point sharper: `step L V = step L L = false`, so a liquid coda may be followed only by a consonant onset, exactly the manifest's prose ("liquid codas only before fresh onsets"), now a hypothesis `hbound` the lexicon must discharge. This is a real finding about the house data produced by reading one Lean statement against one JSON field, and it is the kind of thing the model does at every HEAR.

### 7.4 A translation as a Chu transform: deixis, x-rel → tok

Points: the RelConLang pronouns `mi, tu, sa, ni` and the Toki Pona pronouns `mi, sina, ona`. Tests: `(Claim × Token)`; take the claims `speaks` (the one who utters), `addressed` (the one spoken to), and `other`, each toward the token `here` (the utterance event). From the corpus, `mi` is first person, `tu` second (`tu ga kan do kano`, "second-person capability"), `sa` and `ni` third (`sa ga mor do rama`, "they mark the agent"; `sha ni ga lin do tilo`, "they link the tile"). Measured rows in `M_rel` (for-witness present or not; against by the contradictory):

| token | `(speaks, here)` | `(addressed, here)` | `(other, here)` |
|---|---|---|---|
| `mi` | `tTop` | `tBot` | `tBot` |
| `tu` | `tBot` | `tTop` | `tBot` |
| `sa` | `tBot` | `tBot` | `tTop` |
| `ni` | `tBot` | `tBot` | `tTop` |

In `M_tok` (`bundle.mjs`: `mi` person 1, `sina` person 2, `ona` person 3):

| token | `(speaks, here)` | `(addressed, here)` | `(other, here)` |
|---|---|---|---|
| `mi` | `tTop` | `tBot` | `tBot` |
| `sina` | `tBot` | `tTop` | `tBot` |
| `ona` | `tBot` | `tBot` | `tTop` |

Define `f : ChuMap M_rel M_tok` with `fwd : mi ↦ mi, tu ↦ sina, sa ↦ ona, ni ↦ ona` and `bwd` the identity on these three tests. Check `adj` **[Lean, the field]**: `M_tok.r (fwd a) y = M_rel.r a (bwd y)` for all twelve pairs: row of `ona` equals rows of `sa` and of `ni`, which it does. So `f` is a Chu transform, and `ChuMap.collapse f` **[Lean]** descends it: in the collapse of `M_rel` over these three tests, `sa` and `ni` are already **one role** (`RowEq sa ni`, by `token_identified_iff`: no test among the three separates them), so the translation merges nothing that the source distinguishes.

Now add a fourth RelConLang test that does separate them, say `(animate, here)` with `sa` `tTop` and `ni` `tBot` (the corpus glosses `sa` as "they (agent)" and `ni` as "they" of a tile; this is a hypothesis about the language, stated as a test). Then `RowEq sa ni` fails in `M_rel`, but `fwd sa = fwd ni = ona`. For `f` to remain a `ChuMap`, `adj` at `a = sa` and `a = ni` requires `M_rel.r sa (bwd y) = M_rel.r ni (bwd y)` for every Toki Pona test `y`, which holds iff no `bwd y` equals `(animate, here)`: the animacy test must lie **outside `range bwd`**. That is exactly fidelity as X4 states it: the translation exists, preserves identity by role (`ChuMap.collapse`), and loses precisely the distinctions whose tests Toki Pona cannot ask back. The model reports: "x-rel → tok merges `sa, ni ↦ ona`; the distinction `animate` is not transported." Nothing probabilistic was used.

### 7.5 Gluing: the manifest's own `H1rank`

The RelConLang manifest declares `discourseCover: {entities: 4, cells: 4, components: 1}` with the note "One intentional H1 loop: a speaker can hold a stable contradiction without explosion." By `CoverNerve.H1rank` **[Lean]**: `(cells + components) - entities = (4 + 1) - 4 = 1`. `h1_vanishes_iff_forest` says the nerve is not a forest; `CoordinationFree` fails by one loop. That is the manifest's declared design, now computed from the Lean definition it was written against.

The dialogue dlg-rel-001 works it on real turns: `ku tu ga kan do kano?` (speaker `mi`, question), `se tu ga kan do kano.` (speaker `tu`, answer), `ha mi ga lin do hena.` (speaker `mi`, acknowledgement). Under §3.1 the question is not an articulating of `⟨tu, kan·kano⟩` (it would read `tTop` and assert the capability); it is an articulating about the event, `⟨event, asked⟩`. The answer articulates `⟨tu, kan·kano⟩`: `tTop`, witness `tu`. The acknowledgement articulates `⟨mi, lin·hena⟩`: `tTop`, witness `mi`. Nerve: entities `{tu, kano, mi, hena}` (4), cells `{(tu,kan,kano) by tu, (mi,lin,hena) by mi}` (2), components: `{tu,kano}` and `{mi,hena}` (2). `H1rank = (2 + 2) - 4 = 0`: a forest, coordination-free, and `glue` **[Lean]** produces the unique global section. If `tu` had answered `tu ga nes do kano` (negating), the cell `(tu, kan, kano)` would be told against by `tu` while asked by `mi`; still a forest unless two sources told the same cell oppositely, which is the `top` count of `pricedNerve`, and §7.6.

### 7.6 A crossing and its repair

Speaker A: `ta mi ga ran do kelu` ("actively, I relate the relation": `(mi, ran, kelu)` told for, witness A). Speaker B: `tu ga nes do kelu` ("you negate the relation": `nes` is the negation verb; realised as A's claim articulated under the contradictory, `(mi, k.c ran, kelu)` told for, witness B, hence `(mi, ran, kelu)` told against by `measure`'s against-lane). At the cell `(mi, ran, kelu)` the crossing datum is `(A over?, B over?) = (true, true)`; `crossingReading true true = kTop` **[Lean, `miscrossing_is_kTop`]**: a mis-crossing, held. `both_claims_infeasible` **[Lean]**: at attention budget one the cell cannot grant both. `hands_grant_one_claim` **[Lean]**: the left solver keeps the weft claim, the right the warp claim; `handed_tiebreak_avoids_miscrossing`: either pick is a non-mis-crossing assignment. The language regime receives the pick from geometry and articulates the repair: `sha mi ga ren do ve mi ga ran do kelu` (reg-rel-003, "stable repair over an embedded proposition"): `ren` (repair) takes the embedded clause through `ve`, and `sha` marks that the repaired cell is **still** `kTop` in the trace (nothing is retracted: `measure_cons_le`) while the chosen hand's reading is what GENERATE speaks. The weave reading of a dialogue is then literal: A's turns are warp, B's are weft, every shared cell is a crossing read in FOUR, and `plainWeave_entropy_collapse` **[Lean, proved]** is the statement that a dialogue that strictly alternates with no float carries no information beyond its first crossing, which is the model's definition of a conversation that has settled.

## 8. The mechanisms, sorted: named versus extension

### 8.1 Named Lean structures used as they stand

`Articulating`, `Utterance`, `Token`, `Claim`, `Contradictory`, `PredicationCell`, `measure`, `witnesses`, `Spine.articulate/predicate/measure/run`, `measuredChu`, `ChuSpace`, `ChuMap`, `collapse`, `ChuMap.collapse`, `RowEq`, `ColEq`, `token_identified_iff`, `measure_factors_collapse`, `Graph`, `Path`, `SoficImage`, `substMap`, `substMap_preserves_path`, `GraphHom`, `GraphHom.map_path`, `ProperColoring`, `completeGraph`, `properColoring_iff_hom`, `ProperColoring.map_path`, `Colorable.pullback`, `LambekAlgebra` with `modus_ponens_left/right`, `dot_mono_left/right`, `lres_*`, `rres_*`, `lambek_biresiduation`, `commutative_collapses_to_single_implication`, `ClosureRule`, `RuleSystem`, `Tstep`, `clS`, `immediate_consequence_lfp`, `generated_closure_is_least`, `CoverNerve`, `H1rank`, `CoordinationFree`, `h1_vanishes_iff_forest`, `Cech1`, `glue`, `glue_coboundary`, `glue_unique`, `joinList_congr`, `calm_fiber_merge_order_independent`, `Confluent`, `confluent_joinK`, `reindex`, `converse_adjunction`, `converse_frobenius`, `beck_chevalley`, `Settlement`, `ofTiles`, `Tiles`, `crossingReading`, `hole_is_kBot`, `miscrossing_is_kTop`, `overUnder_swap_is_negate`, `defectFree_definite`, `both_claims_infeasible`, `hands_grant_one_claim`, `handed_tiebreak_avoids_miscrossing`, `plainWeave_entropy_collapse`, `AutopoiesisCell`, `nuclear_autopoiesis_cell`, `autopoieticCore_iff`, `ClosureRegimeData`, `classify`, `cohomologyVanishes`, `Stage.next`, `IsNSC`, `forallAnteOp_isNSC`, `measure_cons_le`, `measure_cons_self_pos`, `measure_contradictory_negate`, `settles_by_three`, `settleStep_settles`, `kz_iff_strict`, `no_laxSlack_of_antisymm`, `strict_regime_mu_identity`, `mu_content_exactly_at_valued_gate`.

### 8.2 Extensions, stated so they can be written

- **X1. A non-commutative `LambekAlgebra` on Boolean relation matrices.** Carrier `Fin n → Fin n → Bool`; `meet`/`join` pointwise; `dot` relational composition `(R;S) i k := ∃ j, R i j ∧ S j k` (decidable, finite); `e` the identity matrix; `lres R T := fun j k => ∀ i, R i j → T i k` (the left residual `R \ T`); `rres T S := fun i j => ∀ k, S j k → T i k` (the right residual `T / S`); prove `dot_lres_adj` and `dot_rres_adj`. For `n ≥ 2` `dot` is not commutative, so this is the first instance in which `lres ≠ rres` and word order is visible. `signchain`'s `algebra.mjs` `residualLeft`/`residualRight` (logic check §5.7) is its shadow. The syntactic-concept algebra of a finite judgment sample (the manifest's 21 judgments) is a second instance: `G := List Lex`, `M := List Lex × List Lex`, `I u (l, r) := l ++ u ++ r ∈ sample`, `dot` the closure of concatenated extents, residuals by the adjunctions; non-integral (the unit is the concept of the empty string).
- **X2. A Lambek sequent calculus `LSeq : List Fm → Fm → Prop`** with lexical axioms, `/L, \L, /R, \R, ·L, ·R`, and `sound : LSeq Γ A → ∀ (L : LambekAlgebra) (val : Fm → L.carrier), L.le (Γ.map val).foldr L.dot L.e (val A)`. Completeness (Wurm) is not needed for the engineering.
- **X3. Token-level synonymy and antonymy** as in §3.2, with the theorem `tokenAntonymy_iff_contradictory : TokenAntonymy T t t' ↔ ∀ c o, (measure k T ⟨t,c,o⟩).value = (measure k T ⟨t', k.c c, o⟩).value` from `measure_contradictory_negate`. Separate from `Semantic.Synonymy`; no identification claimed.
- **X4. Fidelity.** For `f : ChuMap C D`: `fwd_merge_agrees_on_pullbacks : f.fwd a = f.fwd a' → ∀ y, C.r a (f.bwd y) = C.r a' (f.bwd y)` (immediate from `adj`), and the definition `Lost f := {x : C.sts // ∀ y, f.bwd y ≠ x}` with the statement that two tokens merged by `f` can differ only on tests in `Lost f`.
- **X5. Regime extraction.** `regimeDataOfRuleSystem : RuleSystem → List PredicationCell → ClosureRegimeData` with `finiteBase := true` and the theorem `classify (regimeDataOfRuleSystem S cells) = strict`; and `IsForallRule : (Valuation → Bool) → Prop` characterising antecedents that fail `antMono` on some directed family, with `forallAnteOp` as the witness that such a rule is NSC (`forallAnteOp_isNSC`). The honest tag for finite fibers follows; the discourse conjecture becomes a count.
- **X6. The lexicon instance of `substMap_preserves_path`**: for the RelConLang `step` and lexicon, discharge `hne`, `himg`, `hbound`, which §7.3 shows presently fails at `C|C` boundaries; the fix (a boundary letter, or `step C C := true`, or a sandhi rule) is a language-design decision the model surfaces.
- **X7. The sofic settlement**: `ofSofic (step : Graph A) (π : A → B) (w : List B) (h : SoficImage step π w) : Settlement (Base := Σ A B, Graph A × (A → B)) (fun b => List b.2.1) (fun b w => SoficImage b.2.2.1 b.2.2.2 w) ⟨A, B, step, π⟩`, the existential-admission twin of `ofTiles`.
- **X8. A witnessed `Tstep`** over `Valued`-valued valuations whose projection to readings is `Tstep` (from the logic check), so that derivations carry premise addresses as data.
- **X9. The language cell's commuting pair** (§6.3): `σ := clS Sℓ` made a nucleus (needs meet-preservation and `hfix`), `Δ := reindex` along a `ChuMap` round trip, obligation `σ ∘ Δ = Δ ∘ σ`. Not identified with any existing σ/Δ.
- **X10. The non-antisymmetric carrier of §9.**
- **X11. `mu` and questions as event-level articulatings** (§7.1, §7.5): a codec `eventOf : PredicationCell → Token` and the claims `usable`, `asked`, with the theorem that articulating `⟨eventOf φ, k.c usable⟩` leaves `measure k T φ` unchanged.

## 9. Where the σ/Δ correction can live in this regime

The library's facts, read from statements: `kz_iff_strict` (KZ inequality ⇔ strict idempotence on `Reading`, antisymmetric); `no_laxSlack_of_antisymm` (no lax slack on any antisymmetric `PreValueCategory`); `strict_regime_mu_identity` (`μ` is the identity for data classifying strict or Scott); `mu_content_exactly_at_valued_gate` (the one inhabited `HasLaxSlack` is `Record.tally_lax_slack` on the germ preorder, at the aperiodic row of the table). Every carrier the language regime uses above (`Reading`, `Valuation`, `ExtSet`, `Concept`) is antisymmetric, so every closure on them is strictly idempotent, whatever regime label is attached. The founder's correction cannot be *read off* these.

The language regime does, however, own the one carrier that is naturally **not antisymmetric**: `Valued` (`Measure.lean`), a reading with its witness slots. Compare two `Valued` by value (`V.le x y := KLE x.value y.value`): this is a preorder, and it fails antisymmetry exactly when two measurements have the same reading with different witness lists. `measure` produces such pairs for free: `measure k (a :: a :: T) φ` and `measure k (a :: T) φ` have the same value (`ofSlots` of `isEmpty` is unchanged by a duplicate head) and different witness lists (one longer). **[EXT X10]** Define `T : LaxVClosure` on this preorder by "re-measure after re-articulating the trace's own head" (`T x := measure k (a :: T) φ` for the `a` that witnessed `x`), and state `HasLaxSlack T v := V.le (T (T v)) (T v) ∧ T (T v) ≠ T v`. If the witness lists differ while the value is fixed, slack is inhabited on a carrier that is **witnessed, not a germ**. Two things would then be true, and both must be said: (i) this would be lax slack on a carrier the language regime uses, which is what the founder's correction asks for; (ii) its regime is a separate question, because `classify` takes flags and nothing in the library derives the flags from a carrier (X5 would, for rule systems). Until (i) is proved and (ii) extracted, the language regime's spec says what the logic check's recommendation 1 says: closures are strictly idempotent on every antisymmetric carrier at every regime, lax slack is exhibited only on the germ preorder at the aperiodic corner, and the witnessed `Valued` preorder is the named candidate for the Scott-regime slack the founder expects. The three existing σ/Δ pairs and the language cell's X9 pair remain unidentified.

## 10. Dependency order and what moves where

`AGENTS.md`: data → code → networking → systems. The language primitives of this note are networking objects and belong in SignGraph: `ChuSpace`/`ChuMap`/`collapse` (the measured Chu space and its quotient; `signgraph/src/chu-term.mjs` and `cell-graph.mjs` are the present thin layer over `metrologic/chu.mjs`), `Path`/`SoficImage`/`substMap` (presently in `metrologic/.../analysis/sofic.mjs`, a systems-level location), `CoverNerve`/`H1rank` (already `signgraph/src/cohomology.mjs` `pricedNerve`), `LambekAlgebra` on relation matrices (X1; `algebra.mjs` in `signchain` is its code-level shadow and belongs to the logic rung, with the matrix instance exported to networking), the hyperdoctrine over a site (already `signgraph/src/fiber.mjs`). `communicating` (systems) is re-founded on them: `lambek.mjs` steps become `modus_ponens_*` instances in a concrete algebra; `translation.mjs` becomes a `ChuMap` with `adj` checked and `Lost f` reported; `descending.mjs` keeps `settleValuation` and gains the regime report; `relconlang.mjs` moves `mu` and questions to event-level articulatings (X11). MAS, not SHP, is the SignGraph correspondent in SPOTCOMP. Stale `RelMath.*` law citations in `chu-term.mjs` and `translation.mjs` become `Obsmetrologia.Chu.dual_involution` and `Obsmetrologia.AperiodicOrder.Tiling.SoficImage.factor` so golden-vector conformance can find them.

## 11. The claim of this stage, in one sentence

The language regime is the regime in which a reading is **asked back**: a token is what every test reads it as (`token_identified_iff`), a translation is a transform whose demand is transported back (`ChuMap.adj`), a sentence is a residuated combination whose arguments are asked for on a definite side (`modus_ponens_left`, `modus_ponens_right`), a spelled word is admitted by a rule its boundaries are asked to satisfy (`substMap_preserves_path`), and a discourse is coordination-free exactly when its nerve of askings is a forest (`h1_vanishes_iff_forest`); the model built from these is a quotient-and-contract engine over measured traces, which is what networking is, and it carries the strict regime its finite fibers earn until a `∀`-rule is seen to fire and retract.
