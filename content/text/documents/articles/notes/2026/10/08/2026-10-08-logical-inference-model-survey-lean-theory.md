---
title: "Logical inference model survey: lean-theory (Obsmetrologia Lean 4 library; root = services/science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/lib/obsmetrologia, all module paths below relative to its Obsmetrologia/ subdir)"
description: "What this area of the tree actually computes, its abstractions with their theoretical readings, capabilities a logical inference model can build on, gaps and slop, and attachment points."
date-created: 2026-10-08
kind: engineering-survey-note
keywords:
  - logical-inference-model
  - signstuff
  - survey
  - lean-theory
status: survey-read-only-not-adversarially-verified
produced-by: info-0d logical-inference-model survey workflow (Claude agents; Sonnet readers for code, Fable readers for house theory), read-only over the tree at 773ea6d6df4
---

# Logical inference model survey: lean-theory (Obsmetrologia Lean 4 library; root = services/science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/lib/obsmetrologia, all module paths below relative to its Obsmetrologia/ subdir)

## Summary

Obsmetrologia is a dependency-free (no Mathlib, Lean core only) Lean 4 package of about 271 .lean files and roughly 78k lines. A repo-wide grep for sorry/axiom finds no real uses: every hit is a comment or the word "axiom" in prose (for example, the K/T/S4/S5 "axiom hierarchy" in ModalKripkeFourValued). The one open frontier, Jeandel-Rao persistence, is handled by a named hypothesis `hpreserve`, not by sorry. The library's own header says it introduces no axiom, opaque or constant past Mark and Articulating. So what is proven is proven, and the kernel's `decide`/`cases <;> rfl` carries most of it. That is a strength, but also the main caveat for what follows.

WHAT IT ACTUALLY IS. The load-bearing core is a small, finite, fully decidable structure: the 4-element bilattice FOUR, here called `Reading`. A reading is a pair of evidence bits (pos, neg), and `Reading := Articulating.Corner` definitionally. It has two orders, knowledge `KLE` and truth `TLE`, and negation `negate` and conflation `conflate` act as commuting involutions forming Klein-4 (Language/Positing/Four.lean). The same file proves FOUR is the initial interlaced bilattice (`boundsMap_unique`, `four_initial`, `four_rigid`). `Valuation = PredicationCell → Reading` is pointwise FOUR. `PredicationCell` is an (s, p, o) triple of string tokens. Language/Predicating/Orbital.lean proves that a Sym(E)-equivariant self-map of E×E is one of only 4 maps (id, converse, two projections), which is the real content of the "predication forces FOUR" claim. A `Reading.Closure` is a closure operator on FOUR (inflationary, monotone, idempotent), lifted pointwise to valuations. `Settling` is the Knaster-Tarski least fixed point of that closure. `ClosureRule.RuleSystem` (Closure/RuleSystem.lean) is a Datalog/Fitting-style immediate-consequence operator on `Valuation`, with rules of the form "antecedent monotone in ≤ₖ implies cell ≥ₖ V". The theory around this core is as follows.

(1) Order and logic. The truth-order fiber is a Heyting algebra with two commuting nuclei sigma and delta (Language/Positing/FiberAlgebra.lean). An abstract version lives in Language/Positing/NucleusAndCommutingNuclei.lean, with Order.HeytingAlgebra, Order.Nucleus, Fix(j) as a sub-Heyting algebra, and the composite of commuting nuclei as a nucleus (the "nuclear quartet"). Also present are twist-product residuation (Calculus/Logic/TwistProductResiduation.lean), Chu(FOUR) as a *-autonomous category (Calculus/Logic/LinearLogicChu.lean), and the Lambek calculus as a residuated lattice with bi-residuation (Calculus/Logic/LambekCalculus.lean).

(2) FCA. FCA is proved generically over `I : G → M → Prop` in Calculus/Order/FormalConceptAnalysis.lean: prime operators, Galois connection, closeA as a closure operator, and the concept lattice as a complete lattice. Calculus/Logic/FCALambekCircle.lean shows that the FCA closure has the same abstract laws as the settling closure, and that every integral commutative residuated lattice is a commutative Lambek algebra. The decisive step is NOT proven: the Wurm 2012 completeness of concept lattices for Lambek, and Pentus's result that Lambek grammars generate exactly the context-free languages, are "stated only in prose".

(3) Curry-Howard-Lambek. Language/Predicating/CurryHowardLambek.lean (948 lines) is a real STLC (base, arrow, prod, unit; de Bruijn terms) with a full Tait-Martin-Lof/Takahashi confluence proof (`par_triangle`, `par_diamond`, `par_confluent`, `church_rosser`, plus substitution lemmas). `propOfTy` interprets a type as a Prop whose base case is `pos (v φ) = true` for a valuation `v`. That is a genuine proofs-as-programs link to the FOUR valuation, but only for simply-typed lambda calculus. It is not dependent type theory, and not a typed-claim composition calculus. Language/Predicating/Syntax.lean is a small intrinsically-typed operator grammar. Hyperdoctrine and HyperdoctrineDual give quantifier adjoints ∃⊣f*⊣∀ (and a truth-order dual); the Σ/Π/Id reading is asserted in prose.

(4) Light cone. Language/Positing/LightCone.lean is a real and neat theorem set, but it is entirely about the 4-element FOUR. The 1+1 null coordinates are (u, v) = (pos, neg), time = u+v, and space = u−v. The theorems are `kle_iff_null`, `kle_iff_lightcone` (|Δx| ≤ Δt), `tTop_tBot_spacelike`, and negation = parity P and conflation = time-reversal T (`act_centered`, `signs_injective`). Language/Settling/Cones.lean defines `settle` (unit cone), `brim` (counit cone after presuming free sides), and `Void` (the gap between them), with `settle_le_brim`. There is NO causal order on a graph or poset of events, and no past/future cones in the sense of premises/consequences over cells. Cone in the file is the unit/counit pair for the closure, not a causal cone.

(5) Dynamics. Dynamics/Flow/FreeEnergyLyapunov.lean (1213 lines) is the "H-theorem". The potential is deficit = Σ over a finite cell list of (kHeight w − kHeight v), with kHeight ∈ {0,1,1,2}. It proves the orbit is ≤ₖ-monotone, the deficit is antitone, each firing strictly decreases it, and convergence takes ≤ Φ₀ firing steps. There is also a flux ledger: flux = commits + mints + 2·jumps, and truth loss = record gain. Negation is a symmetry of the ledger (`ledger_negate`) and conflation reverses it (`ledger_mirror`, `ledger_noether`). This is a termination measure (a Nat rank function) for a monotone chain on a height-2 lattice. The "free energy F = E − T·S" label is branding: there is no entropy, no temperature, and the file itself says T→0 only. Dynamics/Flow also has Lawvere Laplacian, closure flow, blowup, firing spiral and chromatic-tile spectral-gap files. Lawvere Laplacian here is `M.closureOp`, so harmonic = fixed point (`isHarmonic_iff_quiescent`). The spectral-gap files are genuine arithmetic (path-graph tile Laplacians, eigenvalue 2−√2, rational Rayleigh quotients, over internal ℚ/ℝ), but small-case.

(6) Closure regimes. Closure/Regime.lean defines `ClosureRegimeData` as THREE Boolean flags (scott, finite-base, countable-cofinality) and `classify` onto {strict, Scott, transfinite-bounded, aperiodic}. It proves exhaustiveness and the two implications by flag logic, `spine_settles_by_three` (every ≤ₖ-inflationary endomap on FOUR settles in ≤3 steps), and cohomologyVanishes ↔ regime. The ordinal κ itself lives in Closure/OrdinalCore.lean and Closure/Ordinal/*, but the regime theorem does not compute κ for any non-finite system. Closure/Scott.lean proves `finite_scott_continuous`. Closure/Monad/KZ.lean proves the closure 2-monad is Kock-Zoberlein/lax-idempotent and that `kz_iff_strict` holds, with no periodic orbits.

(7) Cohomology and sheaves. Cohomology/SettlingCohomologyH1.lean defines Cech1/Cocycle/Coboundary/glue and proves `glue_coboundary` and `glue_unique` (every agreeing family glues, so H¹=0 for the strict case). Cohomology/CRDTCohomologicalCALM.lean proves merge-order independence (`crdt_merge_order_independent`, `calm_monotone_coordination_free`). Cohomology/BigradedTruthKnowledgeLES.lean (1245 lines) builds a truth/knowledge long exact sequence and a "quench" (degree-0 only, with the connecting map constructed). Site/* (Basic, Enriched, DFrame, Section, Intension, Sheaf) is a bitopological settling site with Q-enriched sheaves. This is real finite machinery, and its coordination-freeness theorem is directly relevant to the "coordination-free planning" claim. Language/Positing/Record.lean is the counting carrier (ℕ×ℕ twist product, the tally of "told true / told false") and is the natural evidence substrate.

(8) Aperiodic order and tiles. AperiodicOrder/Tiling/ (about 40 files plus StepN and Witness): SoficShift.lean (SFT is sofic, sofic is closed under 1-block factors, golden-mean shift forbids "bb"); SubstitutionPrimitivity.lean (Fibonacci and Padovan matrices are primitive, decided on small powers); PortGraph/PortGrowth (textile growth levelwise, including "bead courses"); Witness/JeandelRao*.lean (marker-domino complex, nonzero H¹ class φ, persistence conditional on hypothesis); ClassificationIncompleteness.lean (explicit witness pairs showing local-derivability structures are incomplete); ChromaticLorentzian.lean (a non-idempotent transfinite carrier, bisim ↔ settle-equal); Closure/Odometer.lean (the Vershik adic successor). The Diffraction, ColorPredictor, ArithmeticZetaStar and Collatz*TwoAdic files are huge (some 2,000+ lines) and mostly number-theoretic case work. The coloring files (Calculus/Order/GraphColoring, ChromaticNumber, ColoringEntropy, TileAdjacencyChromatic) belong to the tile-coloring thread. There is no general Wang-tile / tileset-to-SFT correspondence or substitution-to-sofic theorem proved generally: only concrete instances plus the abstract `sofic_of_decorated`.

SCOPE. This is a well-checked algebraic and logical substrate over a 4-element (and ℕ² record) value domain. It is not an inference engine or a learning theory. No theorem relates anything to probability-weighted inference, gradient learning or representation geometry, apart from the Calculus/Probability/Measure and Stochastic files, which are standalone calculus and not connected to the settling dynamics. Beads, weaving, "two hands" and the glass-bead game exist only as prose (Settlement.lean, PortGrowth.lean, a `Beads`/`Lenticule` abstraction mentioned in a docstring). Settlement.lean itself says the tiling/bead/causal-boundary instances live elsewhere. For a predication-AI, the Lean theory gives (a) the value algebra and its laws, (b) closure = forward-chaining with a termination/ledger proof, (c) coordination-free merge, (d) a typed-lambda confluence core, (e) FCA/Galois closure and Lambek residuation as algebra. It leaves the two bridges unproven: concept lattice to Lambek-valid sequents (Wurm), and a general causal poset with cones.

## Abstractions

### Reading / FOUR bilattice + Klein-4 + initiality

- **File:** `Language/Positing/Four.lean (+ Reading.lean, TruthOrder.lean, Language/Settling.lean)`
- **Computes:** Reading = (pos,neg : Bool) = Articulating.Corner. Proves kle/tle partial orders, joinK/meetK as lub/glb (Settling.lean: kle_refl, kle_trans, kle_antisymm, joinK_le, le_meetK, kBot_le, le_kTop). Four.lean: negate/conflate/negConf commuting involutions (negate_conflate_comm), negate_preserves_kle, negate_reverses_tle, conflate_reverses_kle, conflate_preserves_tle, klein_four. Abstract InterlacedBilattice with joinK_idem, joinK_kBot_right, meetK_kBot, joinK_tTop_tBot = kTop, joinT_kTop_kBot = tTop, etc. Initiality: boundsMap_unique, four_initial, four_rigid, boundsMap_injective/surjective, readingInterlaced instance.
- **Theory:** FOUR as the free/initial interlaced bilattice (Ginsberg/Fitting/Belnap), Klein-4 = <negation, conflation> acting on the two orders. Genuinely realized, everything decide/cases-checked. Weakness: only the 4-element case; larger value sets are not obtained functorially from FOUR (the twist-product file TwistProductResiduation.lean is the generalization: leK/leT over any ResiduatedLattice R, neg_leK, neg_leT, meetK_leK_left).

### Valuation and PredicationCell + generator exhaustiveness

- **File:** `Language/Predicating/Cell.lean, Language/Positing/Valuation.lean, Language/Predicating/Orbital.lean, Four.lean (Generator)`
- **Computes:** PredicationCell = (subject,predicate,object) of Token (string). Valuation = PredicationCell -> Reading, pointwise orders (Valuation.leK, joinK). Orbital.lean: structure Perm, Equivariant f for f : E×E → E×E, proves such maps are exactly id/converse/subjProj/objProj (needs enough distinct elements; file corrects its own too-weak hypothesis). Generator.card_eq_four is rfl on a 4-constructor inductive.
- **Theory:** The substance of 'predication forces FOUR' is Orbital's equivariance classification (a real theorem, small). Four.lean's four_fold (Corner.all.length = 4 ∧ Generator.all.length = 4) is rfl on two 4-constructor lists and proves only that two types have 4 constructors; 'one object met at depth' is naming.

### Settling = closure to least fixed point; Reading.Closure

- **File:** `Language/Settling.lean, Closure/Operator.lean, Closure/SettlingMonotonicityQuiescence.lean, Closure/Ordinal/Finite.lean`
- **Computes:** Closure c : op,infl,mono,idem on Reading; settle c seed = c.op seed; lifted pointwise (liftOp, ClosureOperatorFiber.settleLift/iterV). Knaster-Tarski lfp on the finite lattice; spine_settles_by_three: every KLE-inflationary endomap on Reading reaches its fixed point in <= 3 steps.
- **Theory:** Closure/modal nucleus-like operator; the settling is the closure-ordinal-1 (idempotent) case. The 'order is generated by settling' prose is not a theorem; what is proved is ordinary lattice theory on 4 elements.

### RuleSystem: immediate-consequence operator (Datalog/Fitting)

- **File:** `Closure/RuleSystem.lean, Closure/RuleDynamics.lean`
- **Computes:** ClosureRule: antecedent monotone in KLE on Valuation, consequent 'cell c >= V' (bump). Tstep S v is inflationary (Tstep_infl); vle_refl/trans/antisymm, vjoinK_le, bump_le_of_cell; the generated closure and its lfp (ruleOrbit in FreeEnergyLyapunov.lean with rule_ledger).
- **Theory:** Paraconsistent Datalog / Fitting's four-valued immediate-consequence operator on a finite valuation. This is the closest thing in the library to an actual inference procedure. It is propositional (ground cells), no variables/unification, no weights.

### FreeEnergyLyapunov: deficit potential, H-theorem, flux ledger

- **File:** `Dynamics/Flow/FreeEnergyLyapunov.lean (1213 lines)`
- **Computes:** kHeight (kBot 0, t/f 1, kTop 2), deficit cells v w = Σ(kHeight w - kHeight v) in Nat. kHeight_mono, deficit_antitone, deficit_strict_of_fires, deficit_eq_zero_iff, equilibrium_of_deficit_zero, fenOrbit_monotone/_fixed/_le_settle, freeEnergy_antitone, freeEnergy_strict_of_fires, converges_in_bounded_steps, firing_steps_bounded, kappa_bounded_by_initial_free_energy, energy_gives_unique_equilibrium (strict regime), free_energy_is_lyapunov. Ledger: ledger_step, ledger_total, ledger_closes, stepFlux_decomposition (flux = commits + mints + 2*jumps), truth_loss_is_record_gain, stage_ledger, rule_ledger; symmetry: ledger_negate, ledger_mirror, ledger_noether, conflate_not_height_preserving; mint/jump partition: topSupport_eq_mints_add_jumps; chain/collision cascade receipts (chainSystem, collisionSystem).
- **Theory:** A Nat-valued ranking function for a monotone chain on a finite product of height-2 lattices; the 'H-theorem' is monotone termination with step bound. Conservation ledger = telescoping sum. There is no entropy S, temperature, or Boltzmann structure; the file itself states only the T->0 hard-closure limit. Real and fully checked, but named 'free energy/Noether/H-theorem' well above what it computes.

### Light cone of FOUR (null coordinates)

- **File:** `Language/Positing/LightCone.lean`
- **Computes:** time a = pos+neg, space a = pos-neg (Int). kle_iff_null, tle_iff_null, kle_iff_lightcone (|Δspace| <= Δtime), kle_time_mono, kBot_past_tip, kTop_future_tip, null_rays, tTop_tBot_spacelike; time_negate/space_negate (negation = parity P), time_conflate/space_conflate (conflation = time reversal T); act_centered, act_space, signs_injective, timeSign_mul, spaceSign_mul, signs_table; chu_dual_time/chu_dual_space (Chu dual = transpose∘parity).
- **Theory:** FOUR (a 2-bit diamond) is the 1+1 Minkowski causal diamond in null coordinates; K4 = {1,P,T,PT}. Correct and cute, but it is the causal structure of a 4-point poset only. Gives a vocabulary (past cone = evidence below, future cone = consequences above) for the value fiber, not for a causal network of cells.

### Unit/counit cones and the Void

- **File:** `Language/Settling/Cones.lean (+ Positing/Evidence.lean, Valued)`
- **Computes:** For CValuation (value+evidence): settle c v (close what is measured), brim c v (presume free sides then close). settle_le_brim, Void c v φ := cells where they differ; void_iff, not_void_of_full, oneSided_void, cancelled_not_void.
- **Theory:** A least/greatest-consistent-extension pair (open-world vs closed-world reading) per cell. 'Void is space, apex is time' is interpretation. Possible hook for epistemic uncertainty: Void = unresolved presumptions.

### Nuclei, commuting nuclei, FiberAlgebra, nuclear quartet

- **File:** `Language/Positing/NucleusAndCommutingNuclei.lean (abstract), Language/Positing/FiberAlgebra.lean (concrete), Positing/Bigraded.lean, Calculus/Order/CompleteNucleus.lean, CompleteNuclearQuartet.lean`
- **Computes:** Abstract: HeytingAlgebra (himp_le_iff, modus_ponens), Nucleus (infl, idem, meet-preserving), Fix(j) closed under meet/join/himp, reflection, absorb_join, composite of commuting nuclei is a nucleus with Fix = Fix j1 ∩ Fix j2. Concrete: impT, heyting_adj, fHeyting_adj, fiberHeyting, nucleusToward s v, sigma (toward tTop), delta (toward kTop), nucleusToward_infl/_idem/_meet, joinT_clo_comm (commute), cross_order_not_knowledge_nucleus (a truth-closure is not a knowledge-inflationary one).
- **Theory:** Truth-order fiber Valuation is a Heyting algebra; sigma, delta commuting nuclei give a 2x2 square of sub-Heyting-algebras (A, Fix sigma, Fix delta, A*). Genuinely done, finite. The nuclei are just 'join toward a fixed pole' (a*->s∨a), so the 'saturating/transferring' semantics are labels. The abstract file explicitly notes Bigraded.lean carries a duplicate private Heyting/Nucleus.

### FCA derivation Galois connection and concept lattice

- **File:** `Calculus/Order/FormalConceptAnalysis.lean (393 lines)`
- **Computes:** For any I : G → M → Prop: primeA/primeB (derivation), primeA_antitone, subA_closeA (extensive), prime_adjunction (A ⊆ primeB B ↔ B ⊆ primeA A), primeA_closeA (A'=A'''), closeA_mono, closeA_idem, GaloisConnectionData / derivation_galois_connection, Concept structure (extent/intent closed), Concept.ext_eq, conceptOfExtent, concept lattice complete (conceptLatticeData). Many-valued (Belohlavek) version only gestured at.
- **Theory:** Standard FCA basics (Ganter-Wille) proven with Prop-valued predicates (no Fintype, no algorithm). Does not include attribute exploration, implication bases (Duquenne-Guigues), stems, or a computable concept-lattice builder; no fuzzy context over a residuated lattice is built.

### FCA-Lambek circle

- **File:** `Calculus/Logic/FCALambekCircle.lean; Calculus/Logic/LambekCalculus.lean`
- **Computes:** fcaClosureOp/fca_closure_laws (FCA closure bundled as settling-shape ClosureOp), concept_lattice_is_complete, lambekOfResiduated: every integral commutative ResiduatedLattice is a commutative LambekAlgebra (lambekOfResiduated_comm, residuated_lattice_is_commutative_lambek), TwoLambek. LambekCalculus.lean: LambekAlgebra (lattice+dot+e+lres+rres), dot_lres_le_iff, dot_rres_le_iff, modus_ponens_left/right, dot_mono_*, lres/rres antitone/monotone, one_le_lres, lres_one, rres_one, lambek_biresiduation, commutative_collapses_to_single_implication, Trivial algebra.
- **Theory:** Residuated-lattice algebra for Lambek (GJKO 2007 direction: algebraic semantics) PLUS FCA closure facts. The loop's closing edge (Wurm: concept lattices complete for Lambek; Pentus: CF languages) is explicitly 'documented not formalized' (docstring). There is NO Lambek sequent calculus (no sequents, no cut-elimination, no parser), no pregroup, no syntactic concept lattice of a corpus. Only the commutative case is bridged; a genuinely non-commutative Lambek algebra example beyond Trivial is not constructed there.

### Chu(FOUR) and linear logic

- **File:** `Calculus/Logic/LinearLogicChu.lean, LinearLogicMix.lean, Language/Predicating/FregeanFourChu.lean`
- **Computes:** ChuSpace pts sts r : pts→sts→Reading; dual (transpose+negate), dual_involution, ChuMap with adjointness as equality in FOUR, id/comp. Residuated-lattice fragment: FOUR's fusion is commutative, imp, *-autonomous alphabet.
- **Theory:** Chu(FOUR) as a *-autonomous category of FOUR-valued matrices, the semantic home of context/concept duality (a Chu space over FOUR is a many-valued formal context). Only the dual and morphisms are verified; tensor/par/exponentials as full category structure are partial (check LinearLogicMix). Natural substrate to unify FCA contexts with FOUR evidence.

### Curry-Howard-Lambek: STLC with confluence

- **File:** `Language/Predicating/CurryHowardLambek.lean (948 lines), Language/Predicating/Syntax.lean`
- **Computes:** Ty (base, arrow, prod, unit), Tm (de Bruijn: var, lam, app, pair, fst, snd, star), HasTy, step, Red; rename/subst algebra (rename_rename, subst_subst, par_subst, par_inst); parallel reduction Par, Takahashi complete development dev, par_triangle, par_diamond, par_confluent, red_confluent/church_rosser; propOfTy v φ : Ty → Prop with arrow=→, prod=∧, unit=True, base = pos (v φ)=true. Syntax.lean: PredicationSyntax Ty/Var/Term/RawOp with predPower lemmas (small).
- **Theory:** A complete Church-Rosser proof for STLC+products+unit, welded to the FOUR valuation by a Prop-interpretation. That is the Curry-Howard half; the Lambek (cartesian-closed category) half is represented by the hyperdoctrine modules (adjoints ∃⊣f*⊣∀) but a CCC/ category-of-contexts model of Tm is not constructed, and no strong normalization or subject reduction at scale appears in the grep sample. 'No dedicated CHL node in corpus' per its own header: this was a received-math specialization, not derived from the corpus.

### Predication hyperdoctrine and quantifier adjoints

- **File:** `Language/Predicating/Hyperdoctrine.lean, HyperdoctrineDual.lean, Quantifying.lean, Equality.lean, Fibration.lean, YonedaArrowsFirst.lean`
- **Computes:** Fiber quantifier adjoints ∃_f ⊣ f* ⊣ ∀_f over finite fibrations, Frobenius, Beck-Chevalley, a second truth-order adjoint system ∃^t ⊣ f* ⊣ ∀^t, classical and paraconsistent equality derived (Equality.lean), Yoneda arrows-first (501 lines).
- **Theory:** Lawvere's hyperdoctrine for predication, over finite valuation fibers; the categorical-logic layer a predication AI's query/quantifier semantics would sit on.

### Closure regimes (strict / Scott / transfinite-bounded / aperiodic)

- **File:** `Closure/Regime.lean, RegimeComposition.lean, RegimeCofinality.lean, RegimeCycle.lean, RegimeGate.lean, Scott.lean, OrdinalCore.lean, Ordinal/*`
- **Computes:** ClosureRegimeData {scott, finiteBase, countableCofinality : Bool}; classify, classify_strict/scott/transfiniteBounded/aperiodic, classify_exhaustive, four_regime_flag_cases, regimeStageBij (Bij ClosureRegime Stage), cohomologyVanishes_iff, spine_is_strict, spine_settles_by_three, regime_tower, unattained_settling_gate. Scott.lean: DirectedFamily, sup, sup_map_le, sup_sub_le, finite_scott_continuous.
- **Theory:** The four-regime theorem is, in Lean, a decidable case-split on 3 Booleans with 2 hypothesised implications; it does not derive regime from an actual closure operator. The substantive instance proved is the strict (finite, kappa<=3) regime. Ordinal arithmetic for kappa exists in OrdinalCore/Ordinal but the link from a concrete infinite system to kappa >= omega1 is only via examples (Chromatic-Lorentzian carrier, Collatz files).

### KZ / lax-idempotent closure monad

- **File:** `Closure/Monad/KZ.lean, Closure/Monad/LaxSlack.lean, Closure/LaxSlackDiagnosis.lean`
- **Computes:** closureOp_kz_le, closureOp_triangle_ClEta/etaCl, closure_kz_lax_idempotent(_modal), closureOp_kz_iff_strict, strict_regime_mu_identity, mu_identity_of_cohomologyVanishes, ClAlgebraStructure / IsClAlgebra with isClAlgebra_of_structure/structure_of_isClAlgebra, structMap_forced_identity, closure_algebra_property_like.
- **Theory:** Settling as a Kock-Zoberlein monad on the valuation poset: algebra structure is a property (not extra data), reduces to strict idempotence exactly when no periodic orbits. Standard order-enriched category theory instantiated on FOUR; useful for composing closure steps (settlement as lax idempotent monad).

### Settling cohomology H0/H1 (Cech) and CRDT/CALM

- **File:** `Cohomology/SettlingCohomologyH1.lean, SettlingLocalConstancy.lean, CRDTCohomologicalCALM.lean, Site/Sheaf.lean, Site/Basic.lean`
- **Computes:** H0 v cells (count of designated cells; h0_is_designated_count); Cech1/Cocycle/Coboundary/glue; glue_coboundary (every cocycle is a coboundary), glue_unique; Confluent, confluent_joinK, crdt_merge_order_independent (list of readings merges order-independently), calm_convergence_facts, calm_monotone_coordination_free, calm_fiber_merge_order_independent, mayer_vietoris_overlap_glues.
- **Theory:** H¹ = 0 for the strict case: the join semilattice of FOUR makes any compatible local data glue; this is CRDT/join-semilattice convergence dressed in cohomology. It is real (and exactly the coordination-free-planning statement for monotone merges) but the H¹ vanishing is a consequence of lattice-join idempotence, not a deep vanishing theorem. Non-trivial H¹ occurs only in the aperiodic regime where Witness/Jeandel-Rao classes live.

### Bigraded truth-knowledge LES and inconsistency sheaf

- **File:** `Cohomology/BigradedTruthKnowledgeLES.lean (1245 lines), BigradedSettlingCohomology.lean, InconsistencySheaf.lean, NegativeParaconsistentSheaf.lean, AntiLandauerEntropy.lean, LandauerEntropy.lean, TransfiniteCellComplex.lean`
- **Computes:** Degree-0 decomposition of designated sections, connecting homomorphism, 'quench' (truth loss recorded as knowledge gain); the designated short exact sequence is split with vertical differential d_v = 0; Landauer-type entropy bookkeeping files over Nat/records.
- **Theory:** Paraconsistent sheaf cohomology of the Record carrier: where FOUR-valued 'contradiction' is stored as a knowledge-order class. Heavy but degree-0/finite; the long exact sequence is built for the degree-0 case with deeper grades named in prose.

### Record carrier (counting evidence)

- **File:** `Language/Positing/Record.lean (1060 lines), Closure/Ordinal/SignedTally.lean, Positing/Evidence.lean`
- **Computes:** Record = (pos tally, neg tally) in Nat, twist product of (Nat,min,max); KLE (both up) and TLE (pos up, neg down) orders; leK_iff/leT_iff boolean-reflect; kle_refl/trans/antisymm, ext. Reading is the 'is-tally-positive' shadow.
- **Theory:** The unbounded-evidence version of FOUR: a Dempster-Shafer-free counting carrier for 'told true n times, told false m times' — the natural bridge from FOUR to graded/learnable evidence. Reading ↔ Record only a shadow map; no convergence-of-statistics theorem.

### Aperiodic tilings: sofic shifts, substitution, primitivity

- **File:** `AperiodicOrder/Tiling/SoficShift.lean, SubstitutionPrimitivity.lean, StepN/SubstitutionMatrix.lean, StepN/MetallicMean.lean, InverseHull.lean, AndersonPutnam.lean, Moduli.lean, Universality.lean`
- **Computes:** Path (graph walks of a 1-step SFT), SoficImage, sft_is_sofic, sofic_of_decorated, SoficImage.factor, goldenStep (golden-mean shift) golden_forbids_bb; fibonacciMatrix/padovanMatrix, Cayley-Hamilton minimal polynomials, Primitive := ∃k, PositiveMatrix(M^k) with fibonacciMatrix_primitive (k=2) and padovan (k=5); metallic_root (real root of x²-nx-1) over constructive reals.
- **Theory:** Finite-type symbolic dynamics + integer Perron-Frobenius preconditions on concrete matrices. No general theorem (every FLC substitution subshift is sofic) is proven; only the abstract direction SFT⊂sofic and closure under factors. No Wang-tile -> SFT encoding, no Berger/Robinson aperiodic tileset, no general Perron-Frobenius (needs reals, only precondition proven).

### Tile coloring and chromatic-Lorentzian spectral facts

- **File:** `Calculus/Order/GraphColoring.lean, ChromaticNumber.lean, ColoringEntropy.lean, TileAdjacencyChromatic.lean, AperiodicOrder/Tiling/ChromaticLorentzian.lean, ColorPredictor.lean, Dynamics/Flow/ChromaticTileRayleigh.lean, ChromaticTileGap.lean, ChromaticTileCubicGap.lean, ChromaticK4Analytic.lean`
- **Computes:** ProperColoring.comp (colorings pull back along factor maps), chromatic numbers of small graphs, coloring entropy; chain tile Laplacian L=δᵀδ, Dirichlet energy over ℚ (normSq_nonneg), harmonic_iff_constant, tile4_gap_char_root (gap 2-√2 root of x²-4x+2), tile5/tile6 gap roots; ChromaticLorentzian: bisim_iff_settleEq, geoMld_iff_settleEq on a non-idempotent transfinite frame; color_predictor_evidence (PredictorLevelColorEvidence bundles Salem-trace, Pisot contraction, regime split).
- **Theory:** Colorings as factor maps to finite objects (same functoriality as sofic cover), plus spectral gaps of path-graph tiles. The 'color predictor' is a bundle of previously-proven small facts (a Prop structure), not a predictor of color from data.

### Jeandel-Rao witness and persistence (the aperiodic frontier)

- **File:** `AperiodicOrder/Tiling/Witness/JeandelRao.lean, JeandelRaoPersistence.lean, ClassificationIncompleteness.lean, Classification.lean, ClassificationReduction.lean, GeometricMldComplete.lean`
- **Computes:** jrComplex marker-domino cochain complex; phi (cocycle), phi_closed, phi_nonzero (nonzero H¹ class), sigmaEdge (substitution self-map), sigmaEdge_phi, sigmaEdge_iter_phi; jeandel_rao_persistence (sigma) (hpreserve : ∀ψ, NonzeroH1Class ψ → NonzeroH1Class (sigma ψ)) : ∀n, NonzeroH1Class (iterate sigma n phi); not_complete_of_separating, eqLocalDerivability_not_complete, regimeLocalDerivability_not_complete (witness pairs: tbUnit vs aperiodicUnit settling; b3 vs q0Loop).
- **Theory:** A concrete nonzero H¹ class for the Jeandel-Rao (Wang) aperiodic tile complex, with persistence under substitution conditional on a hypothesis that is itself the open frontier. A rare honest 'named hypothesis' pattern; the classification-completeness (MLD) theorem is reduced and partially proved with explicit incompleteness witnesses.

### Settlement abstraction (bare base + law-admitted content)

- **File:** `Settlement.lean, AperiodicOrder/Tiling/AperiodicSettleFrame.lean`
- **Computes:** A recurring shape instantiated at Cech gluing (ofCech1); docstring says ofTiles, ofBeadsThread, ofHole and a four-fold theorem live in other modules (not here).
- **Theory:** Meant to unify tilings/beadwork/causal-boundary 'settlement'. In this file only the abstraction and the pure Cech instance are present; the bead and causal-boundary instances are not.

### Site / Chu-sheaf transport layer

- **File:** `Site/Basic.lean, Enriched.lean, DFrame.lean, Section.lean, Intension.lean (881 lines), Claim.lean, Topic.lean, FilterFiberSector.lean`
- **Computes:** Bitopological settling site, Q-enriched sheaves, D-frames (pointfree bitopology), sections and intensions (modal frame/closureOp), PredicationCell.SitePoint (stratum + clopen support).
- **Theory:** The site-and-sheaf layer SignGraph would implement: cells over a site with covers/descent. All finite; no network semantics (no morphism-of-sites/transport theorem with latency or failure).

### Lawvere Laplacian and harmonic kernel

- **File:** `Dynamics/Flow/LawvereLaplacianSpectralGap.lean, LawvereKernelH0.lean, Laplacianizability.lean, ClosureFlowDynamics.lean, CurvatureRegime.lean`
- **Computes:** lawvereLaplacian M v := M.closureOp v; laplacian_infl/_mono/_idem/_is_closure; IsHarmonic v ↔ lawvereLaplacian v = v ↔ quiescent; kernel = H⁰ (designated settled sections).
- **Theory:** The 'Laplacian' is the closure itself, so harmonic ≡ fixed point. It is a relabelling that makes diffusion language available. The genuine numeric spectral work is in ChromaticTile*.lean, not connected to this closure Laplacian by a quantitative theorem.

## Capabilities a logical inference model can build on

- A fully verified, decidable 4-valued paraconsistent value algebra (FOUR) with both orders, Klein-4 symmetry, and initiality (four_initial/four_rigid): a ready-made output type for logical-inference models whose 'logits' are evidence pairs.
- Pointwise Valuation = PredicationCell -> Reading with joinK/meetK lattices: a proven state space for a monotone belief store; merge = joinK is proved order-independent and coordination-free (crdt_merge_order_independent, calm_monotone_coordination_free).
- ClosureRule.RuleSystem with Tstep inflationary and lfp semantics, plus rule_ledger/stage_ledger giving a proven termination bound (kappa_bounded_by_initial_free_energy) and per-step flux accounting: a forward-chaining reasoning step with an invariant the AI can log and check.
- Twist-product residuation (TwistProductResiduation.lean) lifts any residuated lattice R to a bilattice over R×R^op: the route from Boolean/FOUR to graded or fuzzy evidence while keeping both orders and negation theorems.
- Record (Nat tallies, KLE/TLE) as an evidence substrate that counts instead of thresholding: a place where gradient-free 'learning' = accumulating told-true/told-false counts, with Reading as its shadow.
- FCA Galois connection and concept lattice for arbitrary I : G -> M -> Prop (+ closure operator form) and the FCA closure = settling-shape closure identification: concept formation can be treated as a settling step; Chu(FOUR) is the many-valued context category (ChuSpace dual_involution, ChuMap).
- Lambek algebra with proven bi-residuation and modus ponens, and the commutative bridge from ResiduatedLattice: algebraic semantics for grammar-like typed composition; with Chu/FCA gives a path to syntactic-concept-lattice semantics once Wurm completeness is formalized.
- Complete Church-Rosser for STLC+products+unit and propOfTy into FOUR's pos-bit: a verified core for proof-term/program equivalence of claim composition (SignChain), with confluence as the determinism guarantee.
- Hyperdoctrine quantifier adjoints (∃⊣f*⊣∀ and truth-order dual) over finite fibrations: verified semantics for queries/quantification over cell fibers.
- Heyting/nucleus theory with commuting-nuclei square (Fix j1 ∩ Fix j2 is the sub-Heyting algebra): a proven framework for 'modal' modifiers (saturating sigma, transferring delta) as sublogics.
- KZ lax-idempotent closure monad (closure_kz_lax_idempotent, kz_iff_strict): composition law for settlement steps; algebra structure is a property.
- Cech H1-gluing (glue_coboundary, glue_unique) and Mayer-Vietoris overlap gluing for local-to-global assembly (SignGraph sheaf gluing).
- Light-cone coordinates on FOUR (kle_iff_lightcone, spacelike separation of t and f, P/T symmetry) and unit/counit cones (settle <= brim, Void): a vocabulary and invariants for past/future cone semantics at the value level and a measurable 'uncertainty gap' (Void).
- Sofic/SFT machinery (Path, SoficImage, sofic_of_decorated, SoficImage.factor), primitive substitution matrices, port-graph/Vershik-odometer successor, and a concrete nonzero-H1 Jeandel-Rao class: a verified base for aperiodic-order tiles, substitution-inflated language models and aperiodic ordering of 'beadwork' sequences.
- No sorry / axiom anywhere (comments only): every theorem listed can be treated as machine-checked; the only conditional is jeandel_rao_persistence (named hypothesis hpreserve).

## Gaps and slop

- Wurm completeness (every Lambek-valid sequent holds in some concept lattice) and Pentus (Lambek = CF languages) are NOT formalized; FCALambekCircle.lean says so in its own docstring ('stated only in prose'). The 'closed circle' of FCA-Lambek-residuated-settling is therefore three proved algebra edges plus one prose edge. There is no Lambek sequent calculus (no sequents, no cut elimination, no proof search), no pregroups/categorial-grammar parser, no syntactic concept lattice of a text.
- No general causal-order / light-cone theory: LightCone.lean is the cone structure of the 4-point diamond only. No causal poset of cells, no past/future cone sets as premises/consequences over a cell network, no Alexandrov-interval/causal-set theory (AlexandrovHusainov.lean is cohomology-side; the FreeEnergyLyapunov docstring references a CausalSets Cone axiom bundle from outside this package). The AI's 'cones as premises/consequences' idea has no Lean theorem to lean on yet.
- Beads/weaving are prose-only: 'bead' appears in Settlement.lean (naming ofBeadsThread/Beads/Lenticule instances that are NOT present here) and in PortGrowth.lean's opening line. No two-hands structure, no glass-bead-game formalization; 'lenticle identification' (LenticleIdentification.lean, 2761 lines) is aperiodic-tiling number-theory scaffolding.
- Tile-coloring thread is finite case work: concrete small graphs and path tiles. No Wang tile -> SFT encoding, no Robinson/Berger/Jeandel-Rao aperiodicity proof (JR is only the cohomological witness class), no theorem that substitution subshifts are sofic (only the abstract sofic_of_decorated / factor-closure), no general Perron-Frobenius (needs reals; only primitivity of two matrices decided).
- Jeandel-Rao persistence is open: jeandel_rao_persistence takes hpreserve as a hypothesis; the unconditional claim is the research frontier named thm:jeandel-rao-persistence.
- 'Four regimes' is a Boolean decision table (ClosureRegimeData flags + classify), not a computation of the closure ordinal from a closure. Only the strict (finite, kappa<=3) regime is realized with an actual system; the transfinite/aperiodic regimes are exercised by hand-made carriers (ChromaticLorentzian, Collatz, units like tbUnitSettling/aperiodicUnitSettling).
- 'Free energy / H-theorem / Noether / Lawvere Laplacian / spectral gap' are grandiose names over trivial computation: deficit is a Nat sum of knowledge-height gaps (heights 0/1/1/2), 'Noether' (ledger_noether) is a symmetry of that Nat ledger under negate/conflate, 'Laplacian' is the closure itself (isHarmonic_iff_quiescent: fixed point). The file states there is no entropy S and only T->0 is covered. 'spectral-gap convergence rate' means a step-count bound, not a spectral estimate.
- CHL is STLC only: no dependent types, no Sigma/Pi/Id types, no strong normalization/subject-reduction statement seen, no explicit cartesian-closed category built from Tm; the link to the hyperdoctrine (Sigma/Pi/Id = quantifier adjoints) is prose. The module header concedes 'There is no dedicated Curry-Howard node in the corpus' - it is a received-math projection, not derived.
- Language of the 'predication' sentence structure is tiny: PredicationCell is (s,p,o) string-token triple; PredicationSyntax is a small typed operator grammar with trivial lemmas; no quantifiers over entities beyond the hyperdoctrine adjoints, no variable binding for rules (RuleSystem is propositional), no weights/probabilities integrated with settling.
- Probabilistic and real-analysis machinery (Calculus/Probability/Measure.lean, Stochastic.lean, Real/*, Optimization) is standalone: not connected by any theorem to settling, FOUR or the Record carrier (no stochastic closure, no softmax/entropy over Readings, no learning-rate or convergence-in-distribution result). 'Anti-Landauer/Landauer entropy' modules are Nat bookkeeping, not thermodynamics.
- Duplication: Positing/Bigraded.lean has its own private HeytingAlgebra/Nucleus/NuclearSquare alongside Order.HeytingAlgebra/Nucleus (NucleusAndCommutingNuclei.lean, which says Bigraded should be read as instantiating it); FiberAlgebra.lean builds a third concrete fiber Heyting algebra; Reading and Record each re-prove kle_refl/trans/antisymm; Bij is defined independently in Four.lean and NucleusAndCommutingNuclei.lean; Real.Internal.Rat vs ℚ usage in ChromaticTile files; many files are 'Collatz*' (Closure/Collatz/*, AperiodicOrder/Tiling/CollatzTwoAdicLock.lean 2639 lines) not relevant to inference.
- Scope balloon: 78k lines include huge general-math files (SetNumberGraphTheory 3162 lines, Real/Internal 1751, LinearAlgebra/Basic 1521, RingTactic 800, Ramsey, NumberTheoryCombinatorics) reimplementing Mathlib basics because of the no-Mathlib rule; these are infrastructure, not predication theory.
- The 'four is one object' identification (Corner = Reading definitionally; Corner ≃ Bool×Bool; |Generator|=4) is partly naming: rfl on cardinality of two 4-constructor types (four_fold) proves nothing structural about Generator vs Corner; the only structural bridge is Orbital's equivariance theorem and the Corner↔Reading identification by definition.

## Attachment points

- Valuation-as-model-state: let the new AI's belief state be Valuation (or Record-valued ValuationR) with joinK merging; inference step = Tstep S (RuleSystem); termination/ledger certificate from rule_ledger and kappa_bounded_by_initial_free_energy. Implement each SignCell as a PredicationCell+Reading/Record, SignChain as a RuleSystem + STLC proof term, and export the ledger (commits/mints/jumps) as the auditable 'energy' trace.
- Generalize FOUR to graded evidence by instantiating TwistProductResiduation over a residuated lattice R (e.g. [0,1] with Lukasiewicz or product t-norm, or Nat tallies): same two orders and negation theorems carry over, giving a paraconsistent fuzzy/probabilistic logic whose Lambek residuals are implications; connect Record to this as the integer-valued case.
- Concept formation as learning: take a many-valued context I : G -> M -> Reading (a Chu(FOUR) space), derive its FCA closure (closeA) and treat 'learn a new concept' as adding a settling step whose Fix is the concept lattice; Chu duality (dual_involution) gives conceptual dual (objects <-> attributes). Missing theorem to add: Belohlavek many-valued concept lattice over FOUR/twist product is a complete lattice with Lambek structure (the Wurm-style semantic edge) - prove at least soundness.
- Language-model-as-Lambek-parser: formalize the Lambek sequent calculus (cut-free) with soundness into LambekAlgebra, then define a syntactic concept lattice from a token corpus (FCA of 'word x context') and show its residuals interpret \ and /. Output of a language model = a typed derivation (STLC term via propOfTy) with FOUR-valued evidence; CHL confluence guarantees normal forms are canonical.
- Light cones for real: promote LightCone.lean's null coordinates from FOUR to a causal poset of cells (events with a partial order); define past cone = KLE-down-set of premises, future cone = consequences under Tstep; the Void (settle vs brim) as the spacelike gap; prove causal-order monotonicity of settlement. The existing P/T Klein-4 action gives the symmetry group to quotient by, and chu_dual_time/space ties Chu duality to the cone geometry.
- Foam/free-energy physics: replace the Nat 'deficit' with a true variational functional. Hooks available: Record tallies give counts for an entropy S = -Σ p log p (Real/Logarithm.lean, GoldenLog, Probability/Measure), the closure rule firings provide E, and FreeEnergyLyapunov's ledger_step/ledger_total give the discrete-time bookkeeping to extend with a temperature T>0 (stochastic closure in Calculus/Probability/Stochastic.lean). A theorem F decreases under Gibbs-like settling would make the 'H-theorem' non-trivial and give the foam analogy (interface minimization) content.
- Sheaf gluing as multi-agent consensus: Cech1 glue_coboundary/glue_unique + crdt_merge_order_independent + mayer_vietoris_overlap_glues give SignGraph its theorem: any family of locally consistent Valuations over a cover glues uniquely, and merging is coordination-free. Extend Site/Enriched.lean to model network transport (morphisms of sites with failure) and prove H¹ obstruction = unresolved disagreement in the aperiodic regime.
- Aperiodic order as the long-range structure of a model's output: use Path/SoficImage and primitive substitution matrices (Fibonacci/Padovan) to define substitution-generated token or bead sequences with provable sofic structure and tile frequencies (needs the real eigenvalue: add Perron-Frobenius for Primitive matrices via Real/Internal). Bridge to the closure ordinal: kappa ≥ ω regimes correspond to non-Scott closures; hook ChromaticLorentzian's non-idempotent carrier to the Record counting substrate.
- Tile coloring as inference: TileAdjacencyChromatic/ProperColoring.comp say a coloring is a factor map to a finite object; treat constraint satisfaction over a tiling as colorability and the Rayleigh/spectral-gap results (ChromaticTileRayleigh, harmonic_iff_constant) as a convergence-rate certificate for diffusion of colors over a path tile; the Wang-tile -> SFT -> sofic encoding is the missing theorem to add so tile inference = SFT admissibility.
- Nuclear quartet as modalities: sigma (toward t) and delta (toward kTop) are commuting nuclei on the truth Heyting fiber; model 'attention' or 'focus' as a nucleus (meet-preserving closure) and prove composition of focus operators is commutative when the nuclei commute (composite nucleus theorem) - gives algebraically well-behaved multi-head composition.
- KZ lax-idempotent monad as a composition law for settlement/effects (SignCraft): effectful steps compose by the monad multiplication with algebra-structure-is-property, so effect handlers are unique; extend with a graded/ordinal-indexed version for the transfinite regimes (OrdinalCore) to model long-running settlement.

