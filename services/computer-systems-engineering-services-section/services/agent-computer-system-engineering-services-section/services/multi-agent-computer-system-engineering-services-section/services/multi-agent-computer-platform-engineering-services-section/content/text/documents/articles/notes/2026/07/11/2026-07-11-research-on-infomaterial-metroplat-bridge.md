---
title: "Obsmetrologia (“Infomaterial”) metroplat bridge"
description: "The proved Lean↔TS bridge: which infomaterial theorems govern which metroplat engineering — study result 2026-07-11, verified in both trees"
date-created: 2026-07-11
kind: research-note
keywords:
  - infomaterial
  - metroplat
  - bridge
status: settled
declared-by: researcher
aliases:
  - Obsmetrologia (“Infomaterial” at time of writing) metroplat bridge
in-service-of: lib/emsenn
---
# Infomaterial metroplat bridge


Infomaterial (dependency-free) is not adjacent
math — it certifies metroplat's engineering:

- `Cohomology/CoordinationCohomology.lean` **certifies by filename** metroplat's
  `monotonicity-certificate.mts` + `cohomology.mts`: coordination cost =
  Ȟ¹ = cycle rank |E|−|V|+|C| of the source–stance nerve.
- `Cohomology/CRDTCohomologicalCALM.lean`: H¹=0 ⟺ order-independent merge ⟺
  confluence ⟺ unique fixed point. Engineering: agents/fleet may work
  coordination-free exactly where the (naming/claim) sheaf's H¹ vanishes;
  ratification is required exactly at the obstruction classes.
- `Cohomology/LandauerEntropy.lean`: Ȟ¹ IS Landauer entropy — one erased bit
  per independent nerve cycle. Codebase incoherence is measurable in bits.
- `Site/Topic.lean` + `Site/Intension.lean`: topics = FCA concepts as site
  objects; term readings = sheaf sections over topic covers, with primary/
  secondary intensions. This IS the spec for the `name-fit` instrument
  (rank all prior names for a thing; polysemy = failed section extension;
  a name must split where no global section exists). TS operators already in
  `lib/math/topology/fca-lambek-circle.mts` + `lib/search/standing.mts`
  (status vocabulary includes computed `polysemous`).
- `Closure/Regime.lean` + `ClosureOrdinal`: four regimes at ω/ω₁; strict-finite
  theorem: inflationary endomaps on Charge settle by step ≤3 (generated tests
  may assert this); Scott regime ⟺ finite-antecedent rules (syntactic check).
- `Language/Positing/Four.lean`: `Charge := Articulating.Corner` DEFINITIONALLY
  — absurd/potential/active/stable and unknown/held/denied/contested are one
  four-object at two depths (the D-8 bug was this identity colliding in prose);
  K₄ = ⟨~,−⟩ exchanges the truth/knowledge orders.
- `Language/Predicating/Hyperdoctrine.lean`: ∃⊣f*⊣∀ + Frobenius + Beck-Chevalley
  proved for the converse generator; projection generators need fiber
  completeness (open). `Computing/HoareProgram.lean` = Lean home for
  metroplat's operation contracts.
- All cohomological content in H⁰/H¹ (vanishes above degree 1, proved);
  general Abramsky–Mansfield–Barbosa relative cohomology open (parity/ℤ₂ case
  discharged in `QuantumContextuality/CohomologicalContextuality.lean`).

**How to apply:** name-fit implements Site/Intension over Site/Topic; the
lexicon ratchet = the certified monotonicity certificate; fleet dispatch =
Ȟ¹ of the naming nerve; regime-aware generated tests per Closure/Regime.
See [[2026-07-11-research-on-metroplat-architecture-model]], [[2026-07-11-research-on-infomaterial-top-h1-exchange-thread]],
`metroplat-sad-baseline`.

**Conflict/Coordination/Reconciliation grounding (2026-07-12, SAD §5.13a/b/c):**
the operator asked for these three as separate building blocks in this
dependency order, and the Lean tree already has them at exactly that
granularity, one file each:
- Conflict (§5.13a) = `AperiodicOrder/Tiling/CondensateMatter.lean`'s
  `condensate_inconsistency_iff` — a point is in conflict (reads `contested`)
  iff it has ≥2 independent contributing sources; threshold on source count,
  not on whether the sources agreed.
- Coordination (§5.13b) = `Cohomology/CoordinationCohomology.lean`'s
  `CoverNerve.H1rank := (cells + components) − entities`, proved zero iff the
  cover is a spanning forest (`h1_vanishes_iff_forest`), and monotone in cell
  count alone (never cheaper by adding more regions).
- Reconciliation (§5.13c) = `merge` (`combine`/§5.9, total, order-independent
  where H1rank=0 — proved via `Cohomology.h1_vanishes`'s coboundary-gluing,
  restated as CRDT convergence in `Cohomology/CRDTCohomologicalCALM.lean`)
  plus `requestConsensus` (only invoked where H1rank>0).
- **Important overclaim guard**: `CRDTCohomologicalCALM.lean` itself states
  its four-fact bundle (H¹=0 / order-independent merge / confluence / unique
  fixed point) as a **conjunction** true unconditionally in the modal-lattice
  model, NOT yet a proved biconditional distinguishing a genuinely
  non-monotone case with nonzero H¹ — the CALM *equivalence* is still the
  open frontier (`thm:calm-convergence-equivalence`).

Infomaterial (349 Lean files, ~4,267 theorems, dependency-free) is not adjacent
math — it certifies metroplat's engineering, verified in both trees 2026-07-11:

**Whole-document formula sweep (2026-07-12, §5.2 through §8.5, via the
`ground-sad-in-theory` skill + 15 parallel research agents).** Operator's
framing, confirmed repeatedly correct: where the SAD looked under-grounded,
the fix was usually a RICHER Infomaterial structure sitting one file away,
not an absent one — prior grounding passes aimed too low. Concrete
richer-structure upgrades applied:
- §5.10 Settlement: the bare two-field `Settlement` shape (content/admits,
  no closure laws) was wrongly credited with inflationarity/monotonicity/
  fixed-point properties it doesn't have. The real closure dynamics is
  `Closure/Coalgebra.lean`'s `SettlingCoalgebra` — a settling-equipped
  predication hyperdoctrine with a coalgebra map, proved orbit-monotone,
  proved algebra/coalgebra-dual (quiescent fixed points are isos). Also:
  predication's four generators (`converse`/`subjProj`/`objProj`/
  `specialize`) are four independently-lawed reindexings, NOT morphisms of
  one proved category — no composition/associativity ties them together;
  "the predication category" names a shared carrier, not a checked category.
- §5.14 projector kernel: "Yoneda-style embedding" is a literal, general,
  proved Yoneda lemma (`Language/Predicating/YonedaArrowsFirst.lean`'s
  `object_is_its_morphisms`/`yoneda_fully_faithful`, plus a `Charge`
  instance `kp_object_is_its_arrows`), not an allusion.
- §5.17 Faces: "structure preservation across faces" is
  `Language/Predicating/Fibration.lean`'s `reindex_is_bilattice_homomorphism`
  (A3) — every reindexing preserves all bilattice/residual ops pointwise —
  plus functoriality (`reindex_id`/`reindex_comp`).
- §5.21/§8.5 self-revision: `liarClosure` is idempotent BY CONSTRUCTION
  (one step), not merely within the general 3-step bound — the doc
  previously led with the weaker citation. `Language/Settling.lean` also has
  an uncited "reflexive tower" (`liarThread`/`assertedLiarThread`/
  `liar_threads_diagonal`) proving the same two outcomes hold at EVERY depth
  of nested self-quotation, not just once. Diagonal argument itself now
  cited exactly (`PointSurjective`/`lawvere_fixed_point`/`bool_not_ne`/
  `no_boolean_self_quotation`).
- §5.29 relational instrument: `Computing/HoareProgram.lean`'s
  `HoareProgram`/`preserves` (`pre(input) ⟹ post(move(input))`) is the exact
  general shape of "gate-before-obligation," previously uncited.
- §8.1: the "four clopen up-sets" correctness check is a proved bijection
  (`Cohomology/PairwiseStoneClopen.lean`'s `four_priestley_dual`), with
  negation proved to be the transported ℤ/2 gauge generator
  (`swap_is_z2_negation`), not a separate analogy.
- §8.2: `Calculus/Order/FormalConceptAnalysis.lean` proves the FULL
  fundamental theorem of FCA (concepts form a `CompleteLattice`,
  `conceptCompleteLattice`) and the attribute-implication characterization
  (`implies_iff_closeM`) — §8.2 previously stopped at "A'' is a closure
  operator," missing both.
- §8.3: the "countable cofinal witness" claim now cites
  `exists_countable_cofinal_witness`/`regimeOfOrdHonest_ne_aperiodic` by
  name; added the concrete one-instance-per-regime witness (`regime_tower`).
- Confirmed genuinely absent (added as new §11 risk entries, not forced):
  §5.7 frontier/antichain canonicity (no Infomaterial counterpart at all —
  causal-set material only proves properties of a FIXED cone, never a
  computed antichain); §5.9's `presheafOf`/`posit` construction direction
  (only combination/reading is proved, not construction-from-one-claim);
  §5.28's occupation axis (bare/inhabited × dead/live — no pairing like
  this exists anywhere in Infomaterial).
- Confirmed already correctly and maximally grounded, no changes needed:
  §5.2, §5.4, §5.8, §5.9 (combine/agreesOn), §5.11, §5.12, §5.15, §5.16
  (translator has no richer structure — genuinely SAD-only), §5.20, §5.23,
  §5.24, §5.25, §5.26, §5.30, §5.31, §5.32, §5.33, remainder of §8.4/§8.5.
