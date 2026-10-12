---
title: "Adversarial check of the cascade note: the language regime (SignGraph, networking)"
description: "Claim-by-claim verification of what the 2026-10-08 cascade note says about the language regime: the language row of the regime table, the multiplexer row, the Lambek closing edge, tile colouring as the language-to-geometry passage, the language model of section 4, the language bullet of section 5, and Lean targets 2 and 5. Each claim is quoted and marked CONFIRMED, WRONG or UNSUPPORTED against the Obsmetrologia Lean statements and the signgraph, communicating, tokipona, RelConLang and signcraft code, followed by what the note missed."
date-created: 2026-10-08
kind: engineering-research-note
keywords:
  - adversarial-check
  - closure-regime
  - transfinite-bounded
  - sofic-shift
  - lambek-calculus
  - formal-concept-analysis
  - tile-coloring
  - chu-space
  - signgraph
  - communicating
  - language-fibers
status: working-note-adversarial-check-of-the-language-regime
produced-by: info-adversarial-language (Claude Sonnet 5.5), reading Obsmetrologia and the signstuff code directly at repository HEAD 4a90514537a
---

# Adversarial check of the cascade note: the language regime

Subject note: `2026-10-08-note-on-realizing-signstuff-along-the-algebra-logic-language-geometry-cascade.md` (the "cascade note"). Its header status says "not yet adversarially checked"; this is that check for the language regime only. Sibling checks (algebra, logic, geometry, tower) are separate notes and are not repeated here.

Default posture is skepticism. A claim is CONFIRMED only when a Lean statement or a line of code says it; a name that merely appears in a file's header is not a statement. Abbreviations: Lean paths are relative to `Obsmetrologia/` inside `obsmetrological-services-section/lib/obsmetrologia/`; "communicating" is `agent-organization-engine/lib/communicating` (its `package.json` name is `@red-cup-engineering/communicating`, the `@lenticule-science/communicating` of the tokipona README is the older name).

## 0. Verdict in one page

1. The regime table's "language = transfinite-bounded" row is **UNSUPPORTED and probably wrong as stated.** `Closure/Regime.lean` `Stage.regime` pairs the *predicating* stage with `transfiniteBounded`, and no Lean theorem assigns a regime to any sofic shift, Lambek algebra, grammar or language. The one tiling-regime theorem that touches the sole SFT example (`ColorPredictor.lean`, `PredictorLevelColorEvidence.golden_is_strict`, from `StepN.inflation_pisot`) puts the Fibonacci/golden side in the **strict** regime. And by the library's own definition, transfinite-bounded requires a non-Scott-continuous (`forall`-antecedent) firing (`Dynamics/Flow/NSCFiring.lean`), whereas the derivable sentences of a finitary grammar are a least fixed point of a finitary rule operator, which the library puts at `kappa <= omega` (`Closure/RuleSystem.lean`, header).
2. The Lean anchors in the language row are **a different regime-bearing thing from the row's label.** The files cited as "language" live in `AperiodicOrder/Tiling/` (the directory the note itself files under "geometry") and `Calculus/Logic/`; the only cited file in a regime-bearing stage directory is `Language/Predicating/Syntax.lean`, which is typed lambda-term syntax over a predicate base, not natural-language syntax, and which sits in the same stage as the CHL/hyperdoctrine files the note files under "logic = Scott".
3. "Sentences as Lambek derivations" is **UNSUPPORTED in Lean.** `Calculus/Logic/LambekCalculus.lean` is an algebra of residuals (`LambekAlgebra`) with exactly one non-commutative-capable instance, `Trivial` (one element). There is no sequent calculus, no derivation type, no free Lambek algebra, no grammar. The only non-trivial instance is *commutative* (`TwoLambek`), where the two residuals coincide, so it cannot represent word order at all.
4. The note's **§5 language bullet is factually wrong in three ways**: (a) communicating *does* import SignStuff (signcell, signchain, signgraph, signcraft); (b) a Lambek-style proof carrier *does* exist (`communicating/src/speaking/listening/parsing/lambek.mjs`), though it is an annotation of dependency arcs rather than a checked derivation; (c) a second RelConLang parser and a "semiotic language model" already live inside SignCraft (`signcraft/src/inference/{relconlang,speak}.mjs`).
5. **"Tile colouring" is mostly an overstatement.** `TileAdjacencyChromatic.lean` proves facts about the complete graphs K2, K3, K4, relabelled "orthogonal", "triangular" and "king"; it does not mention any planar tiling. "The colouring is a valuation" has no Lean statement and conflicts with the definitions (a proper colouring forbids equal readings on adjacent vertices; a `Valuation` is an unconstrained `PredicationCell -> Reading`).
6. **Sofic is not the right size for sentences.** Sofic shifts have regular word languages; Lambek grammars generate exactly the context-free languages (Pentus, prose in the Lean header); natural-language syntax needs at least the latter. The only code that uses the sofic apparatus on languages (communicating's `sofic` manifest field) uses it for CV phonotactics, with a hand-written 3-letter graph, and its "translation factor map" is the identity on readings.
7. Items the note **missed that matter**: `Language/Identification.lean` (`measuredChu`, biextensional collapse: the actual Lean object for "tokens against tests measured off a trace"); `SynonymyAntonymy.lean` (synonymy and antonymy as theorems, but over tiling settlings, not words); `substMap_preserves_path` (the length-changing cross-alphabet substitution, which is the right tool for types-to-tokens, not the letter-for-letter `SoficImage.factor`); `Settlements.lean` `ofTiles` (target 5b already exists for SFT words, definitionally); the non-commutativity gap; the fact that SPOTCOMP's "the network" is MAS, not SHP; and the fact that Rosetta's table has **no separate language column**.

## 1. What the library actually says about the language regime

### 1.1 The stage-regime table (the thing the note leans on)

`Closure/Regime.lean`, lines 198-202:

```
def Stage.regime : Stage → ClosureRegime
  | Stage.articulating => ClosureRegime.aperiodic
  | Stage.predicating => ClosureRegime.transfiniteBounded
  | Stage.positing => ClosureRegime.scott
  | Stage.settling => ClosureRegime.strict
```

with `regimeStageBij` (a bijection `ClosureRegime ≃ Stage`) and the module's own warning: "A regime is the character of one stage's closure; a corner (`Articulating.Corner`) is a value inside a stage. The two fours are different objects and are not identified here." The stage order is the spine's composition order: articulating, predicating, positing, settling. The cascade note's regime column (strict, Scott, transfinite-bounded, aperiodic) therefore matches the table; the **direction** (spine descends in regime; "read along the spine the regime descends, each stage's characteristic closure tamer than the one before it", Regime.lean §D) matches §1.3 of the note. No reversal of direction was found in the note's statement of the table. What the note does not say is that the table is *definitional*: `spine_settles_in_settling_regime` is `rfl`, `cohomologyVanishes` is a table, and `ClosureRegimeData` flags are hand-set booleans ("the flags are inputs, not read off a closure or an ordinal", `classify` docstring).

### 1.2 What actually inhabits the transfinite-bounded rung

`regime_tower` (Regime.lean line 293) exhibits one carrier per rung: FOUR (`Reading.settles_by_three`) for strict; the topless `Record` with `Record.iter_succPos_ne` (no finite settling) for Scott; `ORecord` (`ORecord.omegaPos_least`, `ORecord.osuccPos_omegaPos`, the completed record settling exactly at stage omega) for transfinite-bounded; the germ preorder with `Record.tally_lax_slack` for aperiodic. Elsewhere:

- `Dynamics/Flow/NSCFiring.lean`: the corpus source of the rung is the **non-Scott-continuous firing**, "the responsible inference is a closure rule with a `forall`-antecedent over earlier layers" (header). `scott_continuous_iff_no_nsc_firing` is proved; `forallAnteOp` is the concrete witness; `nscRegimeData` is explicitly "hand-set ... not computed from `forallAnteOp` or any firing, so nothing here proves that NSC firings source the transfinite-bounded or aperiodic regimes", and the structural claim is marked `-- OPEN`.
- `Cohomology/FiringGenerators.lean`: `tbWitness` / `tbWitness_classifies`, "a concrete `Settling` whose regime data classifies to `ClosureRegime.transfiniteBounded`", with a `k = 3` finite witness of nonzero `H¹` classes (`firingGen_nonzero_h1_class`); "does not build the full transfinite sum".
- `AperiodicOrder/Tiling/ClassificationIncompleteness.lean`: `tbUnitSettling` (the transfinite-bounded settling at `cl-inv` coordinate 1) and `cohEquiv_tbUnit_aperiodicUnit`.
- `Closure/RegimeCofinality.lean`: `regimeDataOfCountableFiring` classifies to `transfiniteBounded` (line 233).

None of these carriers is a word, a sentence, a grammar or a language. The rung is characterised by *infinitary (universally quantified) rule firing and nonvanishing declared `H¹`* (`cohomologyVanishes ClosureRegime.transfiniteBounded = false`).

## 2. Claim-by-claim

Format: quoted claim; verdict; evidence.

### 2.1 §1.2 language row

> "language | transfinite-bounded | admissible words of local rules; sentences as derivations; many languages as factor maps of one logic | `SoficShift`, `FiniteLocalRule`, `LambekCalculus`, `FCALambekCircle` (closing edge), `Language/Predicating/Syntax` | SignGraph (networking) | SHP"

This row is five claims; each is checked separately.

**(a) "transfinite-bounded"** (the regime label for the language row). **UNSUPPORTED, with contrary evidence.**

- No Lean theorem or definition assigns a `ClosureRegime` to a sofic shift, an SFT, a `LambekAlgebra`, a context-free language or any word set. `grep ClosureRegime.transfiniteBounded` outside `Closure/Regime.lean` hits only the NSC/firing/cofinality/curvature files listed in §1.2.
- The only tiling-side regime theorems are `StepN.inflation_pisot : inflationRegime false = ClosureRegime.strict` and `StepN.inflation_salem : inflationRegime true = ClosureRegime.aperiodic` (`AperiodicOrder/Tiling/StepN/SalemRegime.lean`, lines 52 and 56), bundled as `PredictorLevelColorEvidence.golden_is_strict` / `salem_is_aperiodic` in `ColorPredictor.lean`. The SFT the library actually builds (`goldenStep`, the Fibonacci follower shift, `fib_deep_sofic`) is the golden/Pisot case: strict, not transfinite-bounded. (Caveat that cuts the other way: `inflationRegimeData onUnitCircle` is a hand-defined Boolean datum and nothing proves the Fibonacci substitution has `onUnitCircle = false`; the connection is by the two items sharing a bundle, not by a theorem. Either way it is not transfinite-bounded.)
- Library definition of the rung: `classify d = transfiniteBounded` iff `scottContinuous = false` and `countableCofinality = true` (`four_regime_v_independent`, `Language/Positing/Value/Category.lean` ~line 196). Any presentation on a finite base (finite alphabet, finite lexicon, finite grammar, finite sample; every prototype in this tree) has `finiteBase = true`, hence `strict` by `classify`'s first branch (`spine_is_strict` is the same computation). The infinite language of a finitary grammar is generated by a *positive finite-antecedent* rule operator, which `Closure/RuleSystem.lean` (header) places at "the strict / Scott regime `κ = ω`" and which the `clS`/`immediate_consequence_lfp` development proves reaches its least fixed point (line 351). A language is transfinite-bounded in the library's sense only if its rules have `forall`-antecedents over infinitely many earlier layers. The note never says which linguistic phenomenon that would be. Candidate answer, flagged as conjecture: unbounded/universal discourse closure ("everything previously said"), which is exactly what the declared `H¹ ≠ 0` would measure. That is a discourse-level claim, not an SFT/Lambek one.
- Direction check: the note says language is downstream of logic in realization (logic = Scott, language = transfinite-bounded, so `kappa` increases algebra to geometry). Lean states only the spine direction (regime descends along the spine). **No Lean statement gives a passage from the Scott rung to the transfinite-bounded rung**, and the library's own pipeline puts predicating (the claim-forming stage whose regime is transfinite-bounded) *before* positing (Scott). The note acknowledges the two directions (§1.3, "Reading (not yet a theorem)"), so this is not backwards, but "downstream" is a founder frame, not a library fact.

**(b) "admissible words of local rules".** **CONFIRMED, with limits.** `AperiodicOrder/Tiling/SoficShift.lean`:

```
def Path {A : Type} (step : Graph A) : List A → Prop
  | [] => True | [_] => True | a :: b :: r => step a b = true ∧ Path step (b :: r)
```

Admissible words are `Path` of a one-step transition graph. Limits the note does not state: (i) `A : Type` is unconstrained (the "finite type" in SFT is prose only; `Graph V := V → V → Bool` is arbitrary); (ii) rules are 1-step (2-block) only; (iii) words are finite `List A`; there is no shift space, no shift-invariance, no bi-infinite configurations, no language-of-a-shift (factorial, extendable) definition; (iv) there is no entropy of an SFT in Lean (`grep sftEntropy` over `*.lean` hits nothing; `fullShiftEntropy` is `logNat 2 N` in `Calculus/Real/Logarithm.lean`), the JS `sftEntropy = topologicalEntropy(transitions)` in `metrologic/src/models/dynamics/substitution/sofic.mjs` has no Lean counterpart.

**(c) "sentences as derivations".** **UNSUPPORTED.** Lean statements available:

- `Calculus/Logic/LambekCalculus.lean`: `structure LambekAlgebra extends Lattice` with `dot`, `lres`, `rres`, `e`, and the two bi-residuation fields `dot_lres_adj`, `dot_rres_adj`; derived laws `lambek_biresiduation`, `commutative_collapses_to_single_implication`; one instance `Trivial` (`Unit`). The header says Wurm completeness and Pentus expressivity are "documented here but **not formalized**".
- No sequent type, no derivation, no cut elimination, no free Lambek algebra, no lexicon assignment, no `Grammar`. (`grep -rn "Grammar\|Chomsky\|ContextFree"` over `Obsmetrologia/` returns only prose in these two files and `Predicating/Syntax.lean`'s word "grammar" for the term grammar.)
- The only derivation-bearing calculus in the library is the simply typed lambda calculus in `Language/Predicating/CurryHowardLambek.lean` (`church_rosser`, `curry_howard_lambek`). It is **structural** (weakening, contraction and exchange are available through the context and projections), so it is the wrong logic for word order.

**(d) "many languages as factor maps of one logic".** **UNSUPPORTED, and the cited theorem does not say it.** `SoficImage.factor` (SoficShift.lean line 77) states: if `w` is a `pi`-image of an admissible `A`-word then `w.map rho` is a `(rho . pi)`-image. It is closure of sofic words under **letter-for-letter** relabelling. Three mismatches with "languages as factors of a logic":

- Letter-for-letter means length-preserving; a translation or an expression of a logical type by a token string is not. The Lean tool for length-changing maps is `substMap` and `substMap_preserves_path` (SoficShift.lean line 218: a cross-alphabet substitution `sigma : A → List B` with nonempty admissible block images and allowed block boundaries sends `stepA`-admissible words to `stepB`-admissible words), together with `fib_deep_sofic`, the decorated cover whose forgetful image is exactly the Fibonacci substitution language. The note cites `SoficImage.factor` and `factor_of_sft_is_sofic` but not `substMap_preserves_path`. The latter is the statement a types-to-tokens map would instantiate.
- "Logic's types" is not an SFT alphabet anywhere. `PredicationSyntax.Ty` (Syntax.lean) is `pred | arr | prod`, an inductive type of types, with no transition graph.
- Direction: a factor goes from the richer cover to the poorer image. FOUR has four values, but RelConLang's charge axis has four particles, two of which (`ta`, `na`) read the same FOUR value (`data/stance-system.json`: both `"potential"`; `relconlang.mjs` `READING_PARTICLES`: both `told(true,false)`), and no particle reads the against-only value. FOUR is a quotient of the fiber's stance distinctions, not a cover of them.

**(e) Anchor files.**

- `SoficShift`: CONFIRMED for the statements in (b), (d). Not a regime-bearing file for "language": it lives in `AperiodicOrder/Tiling/`.
- `FiniteLocalRule`: CONFIRMED (`GraphHom.id`, `GraphHom.comp`, `GraphHom.map_path`, `Colorable.pullback`, `fourColouring_pullback`, `ProperColoring.map_path`, `factor_of_sft_is_sofic`). See §2.4 for what "local rule" means here.
- `LambekCalculus`: CONFIRMED as an algebra, not as a language device (c).
- `FCALambekCircle` closing edge: see §2.3.
- `Language/Predicating/Syntax`: WRONG as a "language" anchor. The module is "an intrinsically typed operator grammar over the predicate base": `Ty := pred | arr | prod`, de Bruijn `Var`, `Term := var | lam | app | pair | fst | snd`, and constants `idPred`, `constPred`, `pairPred`, `fstPred`, `sndPred`, `composePred`. Its only theorems are `predPower_zero`, `predPower_succ`, `rawOp_one`, all `rfl`. It contains no words, no lexicon, no sentence. It sits in `Language/Predicating/` with `CurryHowardLambek`, `Hyperdoctrine`, `Equality`, `Quantifying` and `FregeanFourChu`, all of which the note files under **logic = Scott**, yet the same directory is the stage `Stage.predicating`, whose regime is transfinite-bounded. Either the stage-regime table is not the cascade's regime assignment, or CHL and the hyperdoctrine belong in the language row. The note does not notice that its own anchors collide with its own table.

**(f) "SignGraph (networking)".** **UNSUPPORTED by Lean; partly supported by the house layering.** `AGENTS.md` fixes data, code, networking, systems and the note maps SignCell, SignChain, SignGraph, SignCraft to them; the SignGraph README ("a contract of data carried between parties with demand transported back is what networking is") is the Chu-morphism shape (`ChuMap`: `fwd`, `bwd`, `adj`). That makes networking a Chu-morphism notion; it does not make it a *language* notion. `signgraph/src` (3178 lines in 22 files) contains no word, grammar, sofic or Lambek content (`grep -n "sofic|lambek|admissible|grammar" *.mjs` finds only prose in `mesh.mjs`). What it does contain is the **hyperdoctrine over a site** (`fiber.mjs`: pullback with left and right adjoints exists/forall, Frobenius reciprocity checked on fibers; `site.mjs`), which the note places in SignChain's logic regime (§4 item 2 "hyperdoctrine quantifiers"). Counter-evidence to the assignment: the logic regime's hyperdoctrine is already implemented in the networking library.

**(g) "SHP".** **WRONG as a SignGraph correspondent; the SPOTCOMP mapping is crossed.** In `2026-05-21-note-on-spotcomp.md` (line 1611 ff.): PAM is the CPU, TDP the bytecode/program, TRC the memory, **MAS (Messaging Agentic Swarm) "the network"**, and SHP "the language": "the marked-up HTML format for messages in which every span's class names the morphism that produced it". The note's table assigns MAS + TRC to SignCraft (geometry/systems) and SHP to SignGraph (networking). By SPOTCOMP's own labelling, the network is MAS and belongs with SignGraph, while SHP is a document-markup packet format (a message encoding), not a language in the SFT/Lambek sense. This also illustrates a pattern: the "language" of SPOTCOMP is a wire format, the "language" of Obsmetrologia's `Language/` directory is the whole predication spine (articulate, predicate, measure, settle; see §3.1), and the "language" of the cascade row is sentences. Three meanings; the note uses all three without marking them.

### 2.2 §2 multiplexer row

> "autonomic language-systems multiplexer | language, plural: many languages as factor maps of one logic, translated by Chu morphisms | the language fibers (Toki Pona, English, Lakota, Latin, Mandarin, RelConLang, PTGAE) over `@lenticule-science/communicating` | `FiniteLocalRule.factor_of_sft_is_sofic`, `SoficImage.factor`, `LinearLogicChu`, `FregeanFourChu`"

**(a) The list of fibers.** Mostly CONFIRMED, one item questionable. Under `computer-language-systems-engineering-services-section/services/` the packages exist: `tokipona-language-algebra`, `english-language-algebra`, `lakota-language-algebra`, `latin-language-algebra`, `mandarin-language-algebra` (plus `claim-language-rendering-service`, `language-message-runtime-service`); `apps/` holds `arabic`, `english`, `lakota`, `latin`, `tokipona`, `relation` language corpora, `horsetail`, `panini`. Arabic is present and unlisted. **PTGAE** appears only in prose (`engineering-services-section/README.md` line 31: "General American English (PTGAE)"); it is not a package and likely double-counts the English fiber. RelConLang is a manifest (`apps/relation-language-corpus/data/manifest.json`, 35 + 3 + 4 corpus lines), not an algebra package, and the README calls it "manifest-first", "Research-grade" beyond the built core.

**(b) "over `@lenticule-science/communicating`".** WRONG name for the present package (`@red-cup-engineering/communicating@0.1.0`; the tokipona `package.json` depends on that name while its README still says `@lenticule-science/communicating@0.0.3`). More importantly the next sentence in the note's §5 ("separate engine ... does not import SignStuff's logic") is false; see §2.6(a).

**(c) "translated by Chu morphisms".** UNSUPPORTED in Lean for translation; the code does not do it either.

- Lean: `ChuMap C D` (`LinearLogicChu.lean` line 125) is `fwd : C.pts -> D.pts`, `bwd : D.sts -> C.sts`, and `adj : forall a y, D.r (fwd a) y = C.r a (bwd y)`. This is a definition of a morphism of FOUR-valued matrices. That the adjointness equation "is fidelity" of a translation is the note's reading; nothing in Lean ties a Chu transform to meaning preservation between languages. The library has `ChuMap.id`, `ChuMap.comp`, `dualMap`, `dualMap_dualMap`, `ChuSpace.dual_involution` and nothing else; **no tensor of Chu spaces and no internal hom of Chu spaces is defined**. The note's §3.2 sentence "LinearLogicChu gives Chu spaces over FOUR with the tensor/hom residuation" is WRONG: `four_star_autonomous` (line 225) states the tensor/hom adjunction `fuse a b <=T c <-> a <=T imp b c` and `negate (negate x) = x` for the *alphabet* FOUR (`Order.TwistProduct`), which is commutative. The header's sentence "The category Chu(FOUR) is *-autonomous" is prose; the Lean content is the alphabet's *-autonomy plus object and morphism duality.
- Code: `communicating/src/speaking/listening/algebra/translation.mjs` defines `const translateReadingValue = (value) => value;`. `translationFactorReceipt` records the identity map on the four readings, then reports `preservesTruthOrder` and `commutesWithNegate` as true, which they are for the identity. Its `law` field cites `"RelMath.Aperiodic.SoficShift.SoficImage.factor"` (a stale namespace; the Lean namespace is `Obsmetrologia`), and its sofic "witness" is `soficImage(graph, factor, sample)` on a hand-declared graph and sample (`manifest.sofic ?? [[false,true],[true,true]]`, sample `[0,1,0]` by default). It never reads a word of either language. `maturity: "Built+green"` is the label; the content is a receipt that a toy graph accepts a toy sample.
- The one translator in the tree that translates is `computer-language-systems-engineering-services-section/src/translation.mjs`: Mandarin-to-English by a Workers AI model call (`MANDARIN_TRANSLATION_MODELS`), wrapped by `translation-evidence.mjs`, which reads each segment's English against glossary, untranslated-Han, cue-fit and module-rule checks as `{for, against}` witness sets read into FOUR (`readingOfSides("extremal", ...)`). That is the house's evidence-around-a-model pattern, and it is the only working "multiplexer" path. It is not a factor map.
- Per-language Chu: `chuManifestReceipt` builds a Chu space whose points default to the lexicon's pronouns and whose states default to `["speaker","listener"]`, with every entry defaulting to `"absurd"`; it then checks `dual(dual(x)) = x`. This is the Lean `dual_involution` re-checked on deixis data. It is not a translation.

**(d) `LinearLogicChu`, `FregeanFourChu` as multiplexer anchors.** `FregeanFourChu.lean`: `predicationChu : ChuSpace` with `pts := FregeanPredication` (a `PredicationCell`), `sts := Valuation`, `r claim v := v claim`; `fregean_predication_forces_four_and_chu` bundles three **finite** correspondences (`evidence_roundtrip`, `reading_exhaustive`, `chu_carries_reading`), "true by the definition of `Reading` as two slots" (its own docstring). CONFIRMED as stated by that file; it carries no language. The Lean object that *does* take tokens against tests measured off a trace is `Language/Identification.lean`:

```
def measuredChu (k : Contradictory) (trace : List Articulating) : ChuSpace where
  pts := Token ; sts := Claim × Token
  r := fun t test => (measure k trace ⟨t, test.1, test.2⟩).value
```

with `ChuSpace.collapse` (biextensional collapse), `collapse_separable`, `collapse_extensional`, `ChuMap.collapse` ("Chu transforms descend"), `measure_factors_collapse`, `token_identified_iff`. This is the closest Lean statement to "a language fiber is a Chu space of tokens against contexts, and identity of a word is identity by role". **The note never cites it** (§3.6 below).

**(e) `FiniteLocalRule.factor_of_sft_is_sofic`.** The statement is `SoficImage step pi (p.map pi)` from `Path step p`; its proof is `⟨p, hp, rfl⟩`. It is true by the definition of `SoficImage`. CONFIRMED but vacuous as support for a multiplexer.

### 2.3 §3.3 Lambek closing edge

> "`FCALambekCircle` edge (3): every integral commutative residuated lattice is a commutative Lambek algebra."

**CONFIRMED.** `lambekOfResiduated (R : Order.ResiduatedLattice) : Lambek.LambekAlgebra` (FCALambekCircle.lean line 146) with `dot := R.fuse`, `lres a c := R.imp a c`, `rres c b := R.imp b c`, `e := R.top`; `lambekOfResiduated_comm` and `residuated_lattice_is_commutative_lambek` follow. `Order.ResiduatedLattice` (ResiduatedLatticeStandalone.lean line 49) carries `fuse_comm` and `one_eq_top` as fields, so both **commutativity and integrality are hypotheses** of the edge.

> "The **closing edge is not formalized**: Wurm (2012), syntactic concept lattices are complete semantics for the Lambek calculus; Pentus (1993), Lambek grammars generate exactly the context-free languages."

**CONFIRMED.** FCALambekCircle.lean header: "The full Wurm completeness ... and Pentus's expressivity are model- and language-theoretic and are stated here only in prose"; `CircleData` has three fields (`fcaClosure`, `conceptLattice`, `lambek`) and no fourth. LambekCalculus.lean header says the same. Citation check (outside the library): Wurm's completeness theorem and Pentus's context-freeness theorem are real results with these dates and content as far as the Lean headers state them; neither is re-derived anywhere in the repository.

> "Read in the cascade direction, Lambek is how a logic generates a language: sentences are derivations in a residuated logic."

**UNSUPPORTED and, as the library stands, ill-posed.** Three reasons:

1. The only Lambek algebras in Lean are `Trivial` (one element) and, through edge (3), commutative integral ones such as `TwoLambek`. In a commutative Lambek algebra "the two residuals coincide into a single implication" (`commutative_collapses_to_single_implication`); the calculus is then linear logic, which cannot distinguish "dog bites man" from "man bites dog". Word order requires a **non-commutative** instance, and `LambekAlgebra` as a structure permits one, but none is built.
2. The syntactic concept lattice of a language is generally **neither commutative nor integral** (its unit is the concept of the empty string, which is not the top). So edge (3), which lands only in the integral commutative class, is not on the route to the closing edge. FCALambekCircle's header sentence "In the many-valued (Belohlavek) setting the concept lattice of (2) carries the residuated/Lambek structure of (3), routing the loop back to (1)-(2)" is therefore misleading, and the cascade note repeats it in spirit (§3.1 and target 2 "then over FOUR"). Wurm's theorem is about ordinary (Boolean) syntactic concept lattices of languages; many-valued FCA is not on its path. The closing edge needs a *new* non-commutative, non-integral `LambekAlgebra` built from a context `(strings, contexts)`; it does not extend `lambekOfResiduated`.
3. "Cascade direction" for Lambek is Pentus (grammar to context-free language), which is also not formalized and which **caps** the language the logic can generate at context-free. That cap is a result the note should have stated, because the "language model" ambition of §4 item 3 ("each natural or constructed language a factor map") cannot be a regular (sofic) cover (see §2.4(e)) and must be at most context-free in this route.

> "Read in the spine direction, the syntactic concept lattice (FCA over strings × contexts) lifts an observed language back to the logic that generates it."

**UNSUPPORTED in Lean; plausible in the literature; directionally consistent.** Wurm's construction is a semantic direction (language to lattice). No Lean statement builds a concept lattice over `List Sigma` against contexts.

> "The prototype `signcraft/scripts/inference/syntactic-concept-weave.mjs` ... is a finite instance of that lift, and its finding — context radius trades memorization for generalization ..."

**Qualified.** I ran the prototype (`RADIUS=1`, `2`, `99`, with `node`):

| radius | strings | contexts | concepts | verdicts on unseen grammatical probes |
|---|---|---|---|---|
| 1 | 65 | 43 | 42 | `a bird chases the cat`, `the cat sees a bird`, `the dog sees the bird`: true; `the bird runs`: neither |
| 2 | 65 | 72 | 45 | `the dog sees the bird`: true; the other three: neither |
| 99 | 65 | 74 | 45 | same as radius 2 |

The reported trade-off reproduces (small radius generalises, large radius memorises), and the ungrammatical probes `dog the a`, `the the cat` stay `neither` while the refuted strings are `false`. Limits that the note's phrasing omits: (i) the "finite instance of that lift" is not a Lambek soundness check; the code computes `product(C1, C2) = (ext C1 . ext C2 ∩ G)''` on a *subfamily* of concepts (those generated by single strings and single contexts), so the object is not the full syntactic concept lattice and nothing guarantees it is residuated; (ii) the CYK chart uses binary rules only; (iii) the against lane is `refuted.some(r => key(r) === sentence)`, an exact-match lookup, so the FOUR verdict `both` can never occur and `false` never generalises; (iv) at radius 1 even `the bird runs` fails because `bird` and `runs` never share a generalising type with the right neighbours in the sample; (v) the header's "equivalently C1 <= C / C2 in the residuated lattice" is not a theorem anywhere. It is a useful experiment, not evidence for target 2.

### 2.4 §3.4 tile colouring

> "`SoficShift.lean`: an SFT is a transition graph, its admissible words are walks; a sofic shift is a 1-block factor image; `sft_is_sofic`, `SoficImage.factor`."

**CONFIRMED** (§2.1(b), (d)).

> "`FiniteLocalRule.lean` welds coloring and SFTs: a proper coloring is a graph hom into the colour shift, graph homs carry admissible words to admissible words (`GraphHom.map_path`), colourings pull back along factors, and `factor_of_sft_is_sofic`."

**CONFIRMED**, with the content of "colour shift" made explicit: in `GraphColoring.lean` the "colour shift" is `completeGraph C := fun a b => decide (a ≠ b)` and `properColoring_iff_hom : ProperColoring G c ↔ GraphHom G (completeGraph C) c`. `ProperColoring.map_path` then says: a proper colouring of `G` sends a walk of `G` to a walk of `completeGraph C`, i.e. a colour sequence with **no two consecutive equal colours**. The "SFT" is `G` itself read one-dimensionally as a transition graph.

> "'Colouring = factor map = SFT morphism' is structural."

**QUALIFIED.** True for 1-D words over a graph. The tilings in the library's aperiodic order sections (Penrose, hat, Jeandel-Rao witnesses) are 2-D, and no Lean statement turns a 2-D tile colouring into an SFT configuration or a factor of one; `SoficShift.lean`'s own header cites the coloring memo §4 and Goodman-Strauss/Vereshchagin as prose. The strongest Lean fact on this line, `fib_deep_sofic`, is 1-D (the Fibonacci word). In the equation "colouring = factor map", the "factor map" is a *graph homomorphism* (edges to edges), whereas the "factor map" of `SoficImage` is any letter map `pi : A → B` with no adjacency requirement. These are different morphism classes, welded only through the shared word `factor`.

> "`TileAdjacencyChromatic.lean`: orthogonal adjacency is exactly 2-chromatic, triangular 3, king adjacency exactly 4 — the realized tile patches are FOUR-colourable (`corpus_planar_tile_patches_four_colorable`), with FOUR the `Reading` type itself."

**WRONG as stated (overstated); the theorems are about complete graphs.**

- `orthogonalAdjacency : Graph OrthogonalPhase := completeGraph OrthogonalPhase`; `triangularAdjacency := completeGraph TriangularPhase`; `kingAdjacency : Graph Reading := completeGraph Reading`. The vertex types are the two, three and four **phases**. These are K2, K3, K4, "read at the finite obstruction profile" (the file's own phrase). No grid, no planar patch, no tile appears.
- "Exactly n-chromatic" is `Colorable G (n-palette) ∧ ¬Colorable G (smaller palette)` (`orthogonal_chromaticNumber_bounded_attained`, `triangular_...`, `king_...`), which for a complete graph is the pigeonhole `not_colorable_completeGraph`.
- `corpus_planar_tile_patches_four_colorable (r : CorpusTileAdjacencyConvention) : Colorable (graph r) Reading` ranges over a 3-constructor inductive. The docstring says it outright: "it ranges over the three realized convention carriers above, not over arbitrary planar graphs." The `orthogonal` and `triangular` cases are `Colorable.mono` along injective embeddings into `Reading`; the `king` case is the identity colouring, because the vertex type *is* `Reading`. So "FOUR-colourable with FOUR the `Reading` type itself" is tautological for king, not an observation about tiles.
- The note's "realized" is the file's word for "the three conventions we chose to model", not a statement about the corpus of realised tilings.

> "A language (admissible words of local rules) tiles a geometry; a colouring is a factor map from that geometry's local rule to a palette; when the palette is FOUR, the colouring is a valuation."

**UNSUPPORTED, and the last clause conflicts with the definitions.** `fourColouring G := Colorable G Reading` (GraphColoring.lean) says only that a proper colouring with palette `Reading` exists; the docstring says "The Four-Colour-Theorem palette and the four readings are one alphabet", an identification of **alphabets**. A `Valuation` is `abbrev Valuation := PredicationCell -> Reading` (Positing/Valuation.lean line 18), an arbitrary assignment; a proper colouring must give adjacent vertices different readings. Nothing relates the two, and the constraint set is the opposite: a valuation may read `t` at every claim; a proper colouring may not. `K4_requires_FOUR` / `proper_completeGraph_injective` force every proper 4-colouring of K4 to use all four readings, which is a counting fact about K4. The survey note `lean-spine` already records "No theorem identifies a tile colour with a concept/type."; that remains true.

> "Each human or constructed language fiber ... is, on this reading, a factor map (a sofic cover) from the logic's types to that language's tokens; the multiplexer is the family of such factors."

**UNSUPPORTED** (see §2.1(d)) **and expressively mismatched**: the words of a sofic shift form a regular language (finite-state); a "sofic cover" in the Goodman-Strauss sense is an SFT decoration whose forgetful image is a substitution subshift (`fib_deep_sofic`). Sentence syntax of natural languages is not regular, and the note's own Lambek route is context-free. The only sofic data attached to language fibers in code is `manifest.sofic`, e.g. `relation-language-corpus/data/manifest.json` line 808: alphabet `["C","V","L"]`, a 3x3 Boolean graph, factor `[0,1,0]`, sample `[0,1,0,1,...]`, and `grammar-reference.md` §1 calls it a sketch for "CV(L) phonotactics". It is a phonotactic toy, hand-written, not derived from the lexicon.

> `ColorPredictor`, `SubstitutionPrimitivity`, `ColoringEntropy`, `ChromaticNumber` (assigned reading, not cited by the note in §3.4).

- `ColorPredictor.lean` is **not** about graph colouring. It imports `StepN.SalemRegime` and `MetallizationDichotomy` only and bundles Salem trace sign change, Pisot contraction, the Salem/Pisot to aperiodic/strict split, and the metallic expansion `zpow (metallicZ n) k = (coef n k).1 * metallicZ n + (coef n k).2`, plus `chromatic_step_not_idempotent` and `exponential_settles_at_omega`. "Color" here is the spectral predictor of the colouring memo; the same word is used for three different things (proper graph colouring; `ChromaticLorentzian`'s mark propagation; this predictor). The cascade note's §3.5 sentence "tile colouring and light cones in one carrier" is thus WRONG for `ChromaticLorentzian`: its carrier is `Nat → Bool` marks on a causal chain with `step f` propagating each mark one tick; it has no graph, no palette and no `Colorable`.
- `SubstitutionPrimitivity.lean`: `fibonacciMatrix_primitive` (`k = 2`) and `padovanMatrix_primitive` (`k = 5`) decided by `decide`; the Perron-Frobenius eigenvalue is explicitly out ("Reals are not in this dependency-free core"). There is no theorem relating `Path goldenStep` word counts to `fibonacciMatrix` (no growth-rate or entropy theorem for an SFT). The note does not use this file; for language it would be the missing link between word-growth and creativity budgets that the survey notes propose (`sftEntropy`).
- `ColoringEntropy.lean`: `properEdgeColourings_count = 2`, `edge_colouring_entropy` (`log2 2 = 1`), `properTriangleColourings_count = 6`, `properK4Colourings_count = 24`, all `decide`d on K2, K3, K4. "Colouring = information" is demonstrated for three complete graphs.

### 2.5 §4 item 3

> "Language model (SignGraph, transfinite). The language of a logic: its admissible words under local rules (SFT/sofic), its sentences as Lambek derivations; each natural or constructed language a factor map from the logic's types (the house language fibers); translation as Chu morphisms whose adjointness is fidelity; generation as choosing a derivation and projecting it; parsing as lifting words to derivations through the syntactic concept lattice."

Clause by clause:

1. **"(SignGraph, transfinite)"**: UNSUPPORTED (§2.1(a), (f)).
2. **"The language of a logic: its admissible words under local rules (SFT/sofic)"**: UNSUPPORTED. Lean has no map from a rule system to a word set. `ClosureRule.antecedent : Valuation -> Bool` is an arbitrary `<=k`-monotone test on the whole valuation (`antMono` is its only constraint, RuleSystem.lean line 117), which is **non-local**; a sequence of rule firings is an orbit of `Tstep`, not a walk in a finite graph. To get an SFT one must restrict antecedents to a bounded window of an ordered carrier, which `RuleSystem` does not do.
3. **"its sentences as Lambek derivations"**: UNSUPPORTED (§2.1(c)).
4. **"each natural or constructed language a factor map from the logic's types"**: UNSUPPORTED (§2.1(d), §2.4).
5. **"translation as Chu morphisms whose adjointness is fidelity"**: UNSUPPORTED as translation (§2.2(c)); `ChuMap.adj` is CONFIRMED as the adjointness equation. A fidelity theorem would be: for `f : ChuMap (measuredChu k t1) (measuredChu k' t2)`, tokens identified by role in the source map to tokens identified by role in the target (`ChuMap.collapse` gives exactly this *descent*: `fwd` respects row-equality by adjointness). So a precise Lean target exists in `Identification.lean`, not in `LinearLogicChu.lean` alone.
6. **"generation as choosing a derivation and projecting it"**: UNSUPPORTED (no derivations). What exists: `signcraft/src/inference/generate.mjs` draws a continuation for an FCA object Gibbs-style from the enabled cone with energies and a record of excluded mass (CLI `generate-continuation.mjs`); `speak.mjs` "speaking is Gibbs-saturating holes from their witnessed read fibers, generalizing through FCA concept closure when a fiber is sparse". That is a statistical sampler over fibers, with temperature `T`.
7. **"parsing as lifting words to derivations through the syntactic concept lattice"**: UNSUPPORTED for the lattice (scratch prototype only); but the **parse-to-proof lift already exists in a different form**: `communicating/.../parsing/lambek.mjs` `lambekProofOfForest(forest)` turns each parse-forest reading into a sequent with lexical categories, residual-application steps and obstruction steps (§3.2). The cascade note's lift goes language to logic through FCA; the code's goes parse to logic through dependency arcs. They are different mechanisms.

### 2.6 §5 language bullet

> "**Language.** No admissible-word generation from local rules, no Lambek derivations, no syntactic concept lattice outside the scratch prototype; the language fibers live in a separate engine (`@lenticule-science/communicating`) that does not import SignStuff's logic."

**(a) "does not import SignStuff's logic": WRONG.** `communicating/package.json` declares `@red-cup-engineering/signcell`, `signchain`, `signgraph`, `signcraft`, `metrologic`, `relating`. Source imports (`grep` in `src`): `signchain/bilattice` (`knowledgeJoin`, `witnessedReading`, `noEvidence`), `signchain/rules` (`rule`), `signchain/contracts/contract-operation`, `signcell/cell` and `signcell/utterance` (in at least eleven modules), `signgraph/site`, `signgraph/valuation`, `signgraph/cohomology`, `signgraph/cell-graph`, `signcraft/settle` (`settleValuation`, `causalOrder`, `firingEvent`, `orderingFraction`), `signcraft/membrane`, `signcraft/primitives`. The parser itself rests on them: `parsing/descending.mjs` "settle a sentence's tellings (SignCraft)": each parse entry becomes a SignCell triple with a witnessed reading, specialization edges become SignChain rules (told-for implies told-for, told-against implies told-against), and `settleValuation(site(told), told, rules)` computes the least fixed point. Discourse cohesion (`communicate/cohesion.mjs`) reads the membrane's relation graph through `relationGraphOfCells` and a Laplacian, `parsing/cohomology.mjs` and `discourseCoverManifestReceipt` compute cover cohomology. The direction is language engine **importing** the four libraries (as `AGENTS.md`'s layering requires: systems compose networking, code, data). What is true is that the SignStuff libraries do not import the language engine, and that the language engine does not use SignChain's typed theory or CHL calculus.

**(b) "no Lambek derivations": WRONG as a flat statement; correct in substance.** `lambek.mjs` produces `communicating.lambek.reading-proof` objects (JSON-schema-validated: `sequent`, `hypotheses`, `steps` with rules `lexical | left-residual-application | right-residual-application | sentence-introduction | obstruction`, `proven`). It is **not a derivation checker**:

- categories are assigned from the parse (`lexicalCategory(word, arcs)`: a verb that has a `dobj` arc is typed `(NP\S)/NP`; one with only `nsubj` is `NP\S`; otherwise `S`), so the type assignment is read off the structure it is meant to justify;
- each step's conclusion is hard-coded per dependency relation (e.g. `det`, `amod`, `advmod`, `prep`, `obl`, `case`, `ccomp`, `mark`, `discourse` all yield `right-residual-application` with conclusion `"NP"`, or `"NP\\S"` for `advmod`; an adjective modifying a noun concluding `NP` rather than `N` is not a valid Lambek step);
- `proven = reading.glued && reading.complete && hasSentence`, where `hasSentence` means some `nsubj` arc exists; the sequent's antecedent list is never reduced by the rules;
- `laws: laws(booleanCommutativeLambekAlgebra)` attaches a finite law-check of the **commutative Boolean** algebra (a faithful executable shadow of Lean's `LambekAlgebra`/`TwoLambek`, `metrologic/.../analysis/lambek-calculus.mjs`, which does support non-commutative tables) that has no relation to the sequent;
- an imported `step` from `chromatic-lorentzian` is unused.

The test (`test/lambek-proof.test.mjs`) checks that `alice saw dog.` is `proven`, `alice saw dog with telescope.` is an unproved `stable` reading because of a PP-attachment conflict obstruction, and that the holographic projection exposes the summary. So there *is* a Lambek-flavoured proof carrier, with ambiguity kept as the FOUR value `stable` (held under contradiction), which is a design point worth keeping. It is a carrier to be re-founded on a checked derivation, not a derivation.

**(c) "no syntactic concept lattice outside the scratch prototype": NEEDS QUALIFICATION.** `signgraph/src/mesh.mjs` `generatedConcepts({subjects, predicates, minimumClaims, minimumSupport})` builds a formal context (objects: subjects; attributes: the claims `(predicate, object)` made of them, "Frege's unsaturated function") with `metrologic`'s `makeContext/extent/intent`, groups subjects by extent into `aliases` (subjects generating one concept) and `broader` (extent containment). `compareReadings` classifies pairs as `copies`, `same-concept`, `related`, `unconnected` with Jaccard thresholds (0.5 text overlap; 0.6 claim overlap with at least three claims). That is distributional FCA over **claims**, not over strings against contexts; so it is not the syntactic concept lattice, but it is a shipped FCA-concept organ in the networking library which the note did not consider. Its thresholds are heuristic constants, not the Lean `Synonymy := CohEquiv`.

**(d) "no admissible-word generation from local rules": ESSENTIALLY CONFIRMED, with two things the note omits.** `metrologic/src/articulation/predicating/positing/settling/analysis/sofic.mjs` exports `path`, `soficImage` (membership checks), `fibSubstitute`, `fibSubstituteGolden`, `decoratedFibSubstitute`, `fibDeepSofic`, `goldenForbidsBB`, `graphHom`, `composeFactorMaps`, `mapPathByGraphHom`, `finiteLocalRuleReceipt`: a JS shadow of SoficShift.lean for the Fibonacci case, with word generation by *substitution* (not by random walks of a transition graph). `models/dynamics/substitution/sofic.mjs` adds `substitutionCoverSFT` (follower SFT from a deep iterate), `sftEntropy` and `forbiddenPairs`. And `signcraft/src/inference/{generate,speak}.mjs` generate by Gibbs sampling over fibers. None generates words from an arbitrary user-declared local rule.

**(e) What §5 should have said about the language engine's evidence base.** Two RelConLang parsers exist: `communicating` (manifest-compiled, `parseCommunication`) and `signcraft/src/inference/relconlang.mjs` ("RelConLang surface text intake, moved into the kernel from the deleted witnessed-field-machine-service organism", a hand-coded parser with hard-wired particle tables); and `scripts/inference/evaluate-relconlang.mjs` points at a hard-coded absolute corpus path (`.../communication-science-services-section/services/linguistics-services-section/lib/legacy/2026-07-02-communicating-in-relation-conlang/corpus`) that **does not exist** (`ls` fails), so the script prints "no RelConLang corpus records found" and evaluates nothing; the live corpus is `apps/relation-language-corpus/corpus/` (35 + 3 + 4 JSONL lines).

### 2.7 §6 target 2

> "The FCA–Lambek closing edge for finite contexts: the syntactic concept lattice of a finite sample is residuated and Lambek-sound; then over FOUR (two-lane incidence)."

**Assessment: partly feasible, mis-specified, and mis-staged.**

- *Residuated*: feasible. `FCA.Concept` and `conceptCompleteLattice` (FormalConceptAnalysis.lean ~line 357) are generic over `G M : Type` and `I : G → M → Prop`; take `G := List Sigma` (strings), `M := List Sigma × List Sigma` (contexts), `I u (l, r) := l ++ u ++ r ∈ L`; define `dot` as the closure of concatenated extents; `LambekAlgebra` (non-commutative, no integrality) is the target structure. Needed and absent: the product's associativity, unit, and the two residuals as Lean definitions with the adjunctions proved; conversion from `Order.CompleteLattice` to the `Order.Lattice` that `LambekAlgebra extends`. For a *finite sample language* the concept lattice is finite (strings that are not factors of the sample all have the empty intent), so decidable instances are available.
- *Lambek-sound*: **not statable today**. "Sound" needs a sequent calculus (a type of sequents `Gamma ⊢ A`, lambek rules `/L`, `\L`, `/R`, `\R`, a valuation of formulas in the algebra) and a soundness theorem for it. None of this exists in `Calculus/Logic/`. The target must therefore be split: (2a) define the sequent calculus and prove soundness with respect to *every* `LambekAlgebra`; (2b) build the syntactic-concept `LambekAlgebra` of a finite sample; (2c) the completeness direction (Wurm) is a separate, larger task and is not needed for the engineering.
- *Over FOUR (two-lane incidence)*: unneeded for Wurm; and the library has no many-valued FCA (header-level prose in `FormalConceptAnalysis.lean` line 37 and `FCALambekCircle.lean` only; `grep Belohlavek` shows prose only). `ResiduatedLattice` over FOUR exists (`FOUR`/`TwistProduct`, `four_star_autonomous`), but it is commutative and integral. A two-lane (for/against) syntactic lattice would use the *bilattice* structure, for which no Lambek calculus is stated. The prototype's two lanes are two separate Boolean contexts joined by hand.
- Dependency: the closing edge is a **logic-to-language-adjacent task**, not the realization of SignGraph; its natural home is SignChain/metrologic (`fca-lambek-circle.mjs` already is the JS side of the circle).

### 2.8 §6 target 5

> "Cascade passages as theorems: a closure-rule system's derivations form an SFT/sofic language under a declared projection; a sofic language's admissible patches form a settlement (`Settlement`) on a site."

**5a (rule-system derivations form an SFT/sofic language): UNSUPPORTED, and underspecified in ways that decide whether it can be true.**

- `RuleSystem.lean` has no derivation object (`grep -n "Derivation\|derivation"` returns nothing in the definitions). A "derivation" must first be defined (a proof tree of `Tstep` firings with the premises used).
- A derivation of a multi-premise rule is a tree. Trees are not words of a 1-step transition graph; the right comparison class is regular tree languages, not sofic shifts. The words come out only after choosing a linearisation, and a "declared projection" would have to be proved to preserve admissibility (the shape of `GraphHom.map_path`), which requires the rule antecedents to be bounded-window tests on a linear carrier (§2.5.2).
- The regime evidence points the other way: a finitary derivation set is Scott/strict (§2.1(a)), while sofic/regular languages would be the *strict* rung's natural words. There is therefore no support for the "passage" being from Scott to transfinite-bounded; if any passage exists in Lean's terms it is a restriction (logic to a regular fragment), i.e. a passage within the strict/Scott regimes.

**5b (a sofic language's admissible patches form a settlement on a site): PARTIALLY ALREADY IN LEAN, for SFT words, and the note missed it.** `Obsmetrologia/Settlement.lean` defines `structure Settlement (Content) (Admits) (base)` with fields `content` and `admits`, and its header lists "`AperiodicOrder.Crystal.Tiles` — a `localRule : Graph Carrier` ... paired with a `word : List Carrier` proven `admissible`". The instance is in the physical-science package: `ObsmetrologiaPhysicalScience/Settlements.lean`, `ofTiles (T : AperiodicOrder.Crystal.Tiles) : Settlement (Base := Σ C : Type, Discrete.Graph C) (fun b => List b.1) (fun b w => AperiodicOrder.Tiling.Path b.2 w) ⟨T.Carrier, T.localRule⟩` with `content := T.word`, `admits := T.admissible`, and the four-fold `tiles_beads_hole_cech1_are_settlements`. The docstring: "`Tiles` unfolds to exactly this shape — no data is added or dropped". So the SFT half is a definitional repackaging, not a theorem with content. What remains of 5b is (i) the sofic (factor-image) case, i.e. `SoficImage step pi w` as a `Settlement` whose admission law is an existential, (ii) the word "site": `Settlement`'s base is the rule graph `Σ C, Graph C`, not a `Site` in the sense of `Site/*` or `Cohomology.Cech1`, and the only Čech instance is `ofCech1`. No theorem relates the Tiles settlement to a Čech cover or to `H¹`. So the passage language to geometry is, at present, two parallel instances of one record shape, not a functor.

## 3. What the note missed in this regime

### 3.1 "Language" is three different things, and the Lean one is the whole spine

`Obsmetrologia/Language/` is the directory of the entire predication spine (`Spine.lean`: articulate, predicate, measure, settle; `Positing/`, `Predicating/`, `Settling/`, `Identification.lean`). Its theorems are about **marks, claims, readings and traces**, not sentences. The cascade's "language" regime row, SPOTCOMP's "SHP the language" and the founder's "language-systems multiplexer" are different objects. The note's table reuses the word without saying that the stage that Lean calls `Predicating` (transfinite-bounded) contains the typed lambda calculus, hyperdoctrine and Fregean-FOUR Chu, i.e. what the note calls logic. Rosetta (`2026-04-06-note-on-pws-core-systems-design.md` line 54) has four columns "Computation (Algebra) | Logic (Language) | Topology (Geometry) | Physics (Dynamics)": its *language* is a parenthetical for **logic** (rows: proposition introduction, proof checking, proof construction, cut elimination), there is no separate language column, and the fourth is physics, not a further geometry. The cascade note's claim that this table "supports the same order" is supported for algebra < logic < geometry only; it cannot support a separate language rung between logic and geometry.

### 3.2 Non-commutativity is the whole point of a language logic, and Lean has none

The commutative collapse (`commutative_collapses_to_single_implication`), the integral-commutative `lambekOfResiduated`, FOUR's commutative fusion (`four_star_autonomous`: "commutative because ⊙ is commutative") and the structural STLC of `CurryHowardLambek` are all **order-blind**. Everything the library proves about FOUR and linear logic is on the side of the cascade where sequence does not matter. The first genuinely language-shaped Lean object is a non-commutative `LambekAlgebra`, and the only one is the one-element `Trivial`. Until a non-commutative instance with a nontrivial residual exists, language in this library means: words as paths (`Path`), tokens against tests (`measuredChu`), and synonymy by cohomology (`Synonymy`).

### 3.3 `Language/Identification.lean`

Cited in §2.2(d). The biextensional collapse of the measured Chu space is the Lean statement of identity by role, with `ChuMap.collapse` showing Chu transforms descend to the collapses. If the multiplexer is to be a Chu construction at all, `measuredChu` per language and `ChuMap.collapse` are its lawful ingredients; they are measured from a trace (`measure k trace`), which agrees with the founder's "readings are measured, not supplied".

### 3.4 `AperiodicOrder/Tiling/SynonymyAntonymy.lean`

Not mentioned in any of the 2026-10-08 notes (I searched `synonym`/`antonym`; the only hits are the word "synonym" in unrelated prose). It states, with full proofs: `Synonymy v v' := CohEquiv v v'` is an equivalence relation (`synonymy_refl`, `synonymy_symm`, `synonymy_trans`); negation is invisible to it (`synonymy_equiv_and_negation_invisible`, using `gauge_fixes_inconsistency`); `FiringType = truthOnly | falsityOnly | both` with `flipFiring` the action of `Reading.negate` (`flipFiring_is_negate`); `StrongMLD s s' := CohEquiv s.base s'.base ∧ s.tau = s'.tau`; `Antonymy s s' := StrongMLD s (negTwist s')`, **symmetric** (`antonymy_symmetric`) and not synonymy (witness `⟨aperiodicWitness, truthOnly⟩`). The module's prose says antonymy is "generically non-reflexive and anti-transitive": those two are **not** proved. Caveats: the carrier is `Settling` (tiling settlings with a `cl-inv` invariant, instantiated at `aperiodicWitness`), not words; the identification of `CohEquiv` with structural MLD is the open classification. Nonetheless this is the only place the library has *lexical-semantic relations as theorems*, it is aligned with the `mesh.mjs` verdicts (`copies`, `same-concept`), and it uses the same FOUR `negate` that the RelConLang `nes` verb and `sha`/`mu` particles use. Realizing "language" should check `compareReadings`'s `same-concept` verdict against `Synonymy`, not against a Jaccard threshold.

### 3.5 The sofic-versus-context-free gap, and the phonotactic use

Sofic = regular; Lambek = context-free (Pentus); natural-language syntax needs at least context-free. The note puts both under one row as if they were consecutive refinements; they are different levels of the Chomsky hierarchy, and only the first has Lean (as `Path`/`SoficImage`). The shipped code uses sofic exactly where regular is right: phonotactics (`manifest.sofic`, "CV(L)"). A language-regime realization needs three levels kept apart: phonotactic (sofic, exists in toy form), syntactic (Lambek/CF, carrier exists, checker does not), discursive (cover cohomology and `descend`/`settleValuation`, exists in code).

### 3.6 Declared `H¹ ≠ 0` at the language rung is the multiplexer's actual content

`cohomologyVanishes ClosureRegime.transfiniteBounded = false` (a table; no `H¹` computed there). If the multiplexer is a rung where translations must glue, the obstruction is `H¹` of the cover of fibers; `communicating` already computes finite discourse-cover cohomology (`discourseCoverManifestReceipt`, `coordinationFree`, `forestEquality`) and `signgraph/cellular-sheaf.mjs` computes exact `H¹` over Q. The note's §2 multiplexer row has no cohomology at all, and §3.7 attaches `H¹` only to the geometry regime. Reading under the library's own table: strict and Scott fibers are coordination-free (CALM); the moment a translation requires a `forall`-over-layers rule, coordination is needed. That is a better-founded "autonomic multiplexer" statement than "factor maps of one logic", but it is conjecture until an `H¹` is built (the library itself says its regime table "computes no cohomology").

### 3.7 Dependency order for the language realization

`AGENTS.md`: networking uses code and data; systems compose networking, code, data. Every working language asset is at systems level (`computer-language-systems-engineering-services-section`, `communicating`). To make "SignGraph to the language" real, language primitives (Path/sofic, Lambek algebra, concept product) must move *down* into SignGraph from `metrologic` and `communicating`, not be imported upward, and `communicating` must be re-founded on them. Equally, SignGraph's `pam.mjs` header says it "is data: content-addressed relation observations ... with no cell, valuation or FOUR": the networking library has both a FOUR-free layer (`pam`) and a FOUR-full layer (`cell-graph`, `fiber`, `valuation`); the language layer would sit in the latter.

### 3.8 Stale or mismatched identifiers that will break conformance checking

- `signgraph/src/chu-term.mjs` docstrings cite `RelMath.Chu.dual_involution`, `RelMath.ChuSpace.dual_involution`, `RelMath.Positing.negate_negate`; `communicating/.../translation.mjs` cites `RelMath.Aperiodic.SoficShift.SoficImage.factor`. The Lean namespace is `Obsmetrologia` (`Obsmetrologia.Chu.dual_involution`, `Obsmetrologia.AperiodicOrder.Tiling.SoficImage.factor`). Any golden-vector conformance run keyed by those names will find nothing.
- The JS reading vocabulary `absurd | potential | active | stable` (and `unknown | held | denied | contested` in the extremal family) versus Lean `kBot | tTop | tBot | kTop` (`Reading`): `chu-term.mjs` documents `negate(potential) = active` ⟨0,1⟩ to ⟨1,0⟩; that is the Belnap negation of `Reading.negate`, but the two vocabularies need an explicit bijection test (the note's EVM conformance plan assumes one).
- `signgraph/package.json` description says "SignCell and SignChain sites, transport, relations and graph projections" and its dependency list includes `xml-document-rendering-service`, `eavt` and `cbor-services-section`; none is related to the language row. `signgraph` imports `relating` and `a2a-services-section` undeclared per the note's §7.5; not re-verified here.

## 4. Summary table

| # | Note location | Claim (short) | Verdict | Decisive evidence |
|---|---|---|---|---|
| 1 | §1.2 | language = transfinite-bounded | UNSUPPORTED (contrary evidence) | `Stage.regime` pairs predicating with it; no regime theorem for words; `golden_is_strict`; finite base classifies strict; finitary rule `lfp` at `kappa <= omega`; rung is NSC firing / `forall`-antecedent (`NSCFiring`) |
| 2 | §1.2 | admissible words of local rules | CONFIRMED (limited) | `Path`, `SoficImage`, `sft_is_sofic`; `Type`-generic, 1-step, finite words, no entropy |
| 3 | §1.2 | sentences as derivations | UNSUPPORTED | `LambekAlgebra` only; instances `Trivial`, commutative `TwoLambek`; no sequent calculus |
| 4 | §1.2/§2 | languages as factor maps of one logic | UNSUPPORTED | `SoficImage.factor` is letter-for-letter relabelling; right tool is `substMap_preserves_path`; no logic alphabet |
| 5 | §1.2 | `Language/Predicating/Syntax` as language anchor | WRONG | typed lambda terms over `pred`; theorems are `rfl`; same stage as CHL/hyperdoctrine |
| 6 | §1.2 | SignGraph (networking) = language = SHP | UNSUPPORTED/WRONG | no language code in `signgraph/src`; SPOTCOMP: MAS = the network, SHP = HTML packet format |
| 7 | §1.2 | Rosetta supports the same order | QUALIFIED | Rosetta: "Logic (Language)" is one column; no separate language rung; physics is the fourth |
| 8 | §2 | fibers list, over `@lenticule-science/communicating` | MOSTLY CONFIRMED | five algebra packages + RelConLang exist; PTGAE not a package; package name now `@red-cup-engineering/communicating`; Arabic omitted |
| 9 | §2 | translation by Chu morphisms | UNSUPPORTED | `ChuMap.adj` is a definition; no Chu tensor/hom; code translation factor is identity; working translator is an LLM call with FOUR evidence |
| 10 | §3.2 | LinearLogicChu has tensor/hom residuation for Chu spaces | WRONG | tensor/hom is on the alphabet FOUR (`four_star_autonomous`); Chu has dual, `ChuMap`, `dualMap` only |
| 11 | §3.3 | edge (3): residuated lattice is Lambek algebra | CONFIRMED | `lambekOfResiduated`, `residuated_lattice_is_commutative_lambek`; hypotheses commutative + integral |
| 12 | §3.3 | closing edge not formalized (Wurm, Pentus) | CONFIRMED | `CircleData` has three fields; headers say prose |
| 13 | §3.3 | Lambek generates language; sentences are derivations | UNSUPPORTED | no derivation type; commutative instance cannot order words; Pentus caps at CF |
| 14 | §3.3 | prototype finding on context radius | CONFIRMED (reproduced), qualified | RADIUS 1/2/99 run; lattice only partial, against lane is exact match |
| 15 | §3.4 | `SoficShift`, `FiniteLocalRule` statements | CONFIRMED | `sft_is_sofic`, `SoficImage.factor`, `GraphHom.map_path`, `Colorable.pullback`, `properColoring_iff_hom` |
| 16 | §3.4 | "colouring = factor map = SFT morphism" structural | QUALIFIED | 1-D walks of a graph; hom (edge-preserving) versus 1-block factor (any letter map) |
| 17 | §3.4 | realized tile patches FOUR-colourable | WRONG (overstated) | theorems are about K2, K3, K4 relabelled; king case is identity on `Reading` |
| 18 | §3.4 | with palette FOUR the colouring is a valuation | UNSUPPORTED | `fourColouring := Colorable G Reading`; `Valuation` unconstrained; opposite constraints |
| 19 | §3.4 | each language fiber is a sofic cover of logic's types | UNSUPPORTED | sofic = regular; only language use is CV phonotactics with hand-written 3-letter graph |
| 20 | §3.5 | tile colouring and light cones in one carrier | WRONG | `ChromaticLorentzian` carrier is `Nat → Bool` marks on a chain; no graph, palette or `Colorable` |
| 21 | §4.3 | language model clauses | UNSUPPORTED (7 clauses) | see §2.5 |
| 22 | §5 | engine does not import SignStuff | WRONG | `package.json` and ~25 source imports of signcell/signchain/signgraph/signcraft |
| 23 | §5 | no Lambek derivations | WRONG (as flat statement) | `lambek.mjs` proof carrier exists; it annotates arcs, does not check derivations |
| 24 | §5 | no concept lattice outside prototype | QUALIFIED | `mesh.mjs` `generatedConcepts` is FCA over claims |
| 25 | §5 | no admissible-word generation from local rules | CONFIRMED (substance) | substitution generation and Gibbs sampling exist; none from an arbitrary rule graph |
| 26 | §6.2 | closing edge for finite contexts | PARTLY FEASIBLE, MIS-SPECIFIED | residuated part feasible; soundness needs missing sequent calculus; FOUR/Belohlavek not on Wurm's path; not an extension of `lambekOfResiduated` |
| 27 | §6.5a | rule-system derivations form SFT/sofic language | UNSUPPORTED | no derivation type; antecedents non-local; trees not words |
| 28 | §6.5b | sofic language's patches form a settlement on a site | PARTLY ALREADY TRUE | `ofTiles` (SFT words, definitional); sofic case and "site" not done |

## 5. Corrections to carry forward

1. Remove "transfinite-bounded" from the language row, or state the extra hypothesis (infinitary, `forall`-antecedent discourse closure) under which a language object is in that rung, and add the theorem to be proved: *a finitary grammar's derivable-sentence closure is Scott-continuous* (a one-line consequence of `RuleSystem`'s finite-antecedent rules once derivations are defined).
2. Split "language" into the three levels of §3.5 and the three meanings of §3.1; re-anchor: phonotactic (sofic: `SoficShift`, `FiniteLocalRule`), syntactic (Lambek: needs a non-commutative `LambekAlgebra` and a sequent calculus), lexical-semantic (`SynonymyAntonymy`, `mesh.mjs`), tokens-and-roles (`Identification`), discourse (cover `H¹`).
3. Replace §5's language bullet with: communicating imports all four libraries; `lambek.mjs` is an arc-annotating proof carrier with a commutative-Boolean law receipt; `translation.mjs` uses the identity as its factor map; `signcraft` holds a second RelConLang parser and a Gibbs-sampling `speak`; the signcraft RelConLang evaluation script's corpus path is dead.
4. Fix §3.4: tile colouring theorems are about K2, K3, K4; delete "the colouring is a valuation" or supply the theorem; cite `substMap_preserves_path` for any types-to-tokens statement.
5. Fix §3.2/§3.3: Chu tensor/hom is not in Lean; Lambek ≠ the Lambek of CHL (cartesian closed categories); `lambekOfResiduated` is not on the road to the closing edge.
6. Re-do target 2 as 2a/2b/2c (§2.7) and target 5 as: define derivations; restrict antecedents; prove the passage into a *regular tree* or word language; then `Settlement` instances for sofic words.
7. Fix the SPOTCOMP column: MAS is the network (SignGraph), SHP is the packet format.
