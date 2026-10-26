---
title: "Logical inference model survey: signchain-code"
description: "What this area of the tree actually computes, its abstractions with their theoretical readings, capabilities a logical inference model can build on, gaps and slop, and attachment points."
date-created: 2026-10-08
kind: engineering-survey-note
keywords:
  - logical-inference-model
  - signstuff
  - survey
  - signchain-code
status: survey-read-only-not-adversarially-verified
produced-by: info-0d logical-inference-model survey workflow (Claude agents; Sonnet readers for code, Fable readers for house theory), read-only over the tree at 773ea6d6df4
---

# Logical inference model survey: signchain-code: SignChain typed-theory, rules, bilattice, log, contracts

## Summary

Base path (call it SC): services/engineering-services-section/services/computer-engineering-services-section/lib/signstuff/signchain. SC/src is about 600 lines of real core (bilattice 123, log 101, rules 77, typed-theory 279) plus about 3,900 lines in src/contracts/. These are two unrelated things sharing a package.

(1) The evidence core. bilattice.mjs, rules.mjs and log.mjs are small, coherent and load-bearing.
- bilattice.mjs lifts Belnap/Ginsberg FOUR operations (knowledge join/meet, truth join/meet, negate, conflate, presumeFree) from the data layer onto SignCell cells. Every operation unions both witness sets and applies the FOUR operation to the value only. Order tests are set inclusion on witnesses (knowledgeLeq, truthLeq). settleJudgments takes the knowledge join of named judgment values.
- rules.mjs is Fitting's (1991) logic-programs-over-bilattices. A rule has threshold antecedents ("cell reads at least reading r in the knowledge order") and one consequent. fire/step compute T(v) = v join fire(v), which is monotone and inflationary. The witness of a derived telling is {rule: name, from: [premise addresses]}, so provenance is content-addressed. No negation in the rule language: negative information enters only as an against-side threshold or consequent. There is no fixpoint iterator in this file (the least fixed point is claimed in a comment, and the iteration lives in SignCraft's settle.mjs).
- log.mjs is an append-only EAVT-like TellingLog of (s,p,o,side,witness) rows, indexed per role. It gives pattern queries, latest, cells, and readingAt. Order is kept in the log and forgotten by the cell set.
- Consumers inside signstuff: signcraft imports rules (infer.mjs, settle.mjs, primitives.mjs, knowledge-base.mjs), bilattice, log and contracts/phase (settlement-signature.mjs, settle.mjs). signgraph imports bilattice, rules and log. signstuff-evm uses it for golden vectors. This is the live path.

(2) typed-theory.mjs: the claimed Curry-Howard-Lambek piece. It is a small, correct reachability engine over a category-shaped graph, and it is not a CHL realization.
- Objects are base objects (a cell triple or a term). Rules are edges from four fixed generators: specialization, converse (s,p,o) -> (o,p,s), subject projection, object projection.
- Rules are derived from SignCell predication data (inferenceRules, theoryOfData, theoryOfBase). Composition is concatenation of traces on codomain/domain match (composeRule). derivationClosure is the transitive closure by repeated one-round composition to a fixed point. derive is BFS with a seen-list. typing runs derive and returns a witness or an obstruction. derivationValidity re-checks steps against the rules. predicateWordArrow/composePredicateWords build a free path category on predicate words.
- Missing for real CHL (details in gapsAndSlop): no types-as-propositions structure, no terms or lambda, no product or exponential or internal hom (no cartesian-closed or monoidal-closed structure), no cut-elimination or normalization, no proof equality beyond trace equality, no bridge from derivations to the bilattice or Rules. Honest reading: the theory is the free category on a 4-generator graph, with BFS as hom-existence. "Typing judgment" means reachability.
- Production use is almost nil. No signstuff consumer imports signchain/typed-theory; the only external hit is a legacy provenance test in the agent-organization-engine. The only test file is test/typed-theory.test.mjs, a handful of smoke tests (cellOf, morphism identity, three rules per cell witness); the other test is bilattice-wire.test.mjs.

(3) src/contracts/ (about 3,900 lines across 13 files; only phase.mjs is imported by sibling signstuff packages, plus a few external app imports from computer-system-engine, metroplat, feltos and the lean-system workspace). It is a metroplat "instrument" contract calculus: Gamma |= {P} m {Q} under phase Phi, lens Lambda, evidence policy Omega and energetic obligations. Its types are plain frozen records; most of the code is static well-formedness checking that returns `missing` string lists wrapped in a semanticJudgment (polarity witness / obstruction / boundary-only).
- phase.mjs is the one genuinely theory-bearing file. A phase is closure data {scottContinuous, finiteBase, countableCofinality}. It is classified through metrologic's classifyRegime into one of four regimes: strict, scott, transfinite-bounded, aperiodic. Finality, cost (0..3), coordinationCost (via cohomologyVanishesInRegime) and energy (decreasing/accumulating/costed) are looked up in constant tables. phaseEvidence/phaseEvidenceRegime accept observed stage ordinals or a certificate (checked by metrologic settling/certificate) and only witness the lower two rungs by observation. The upper rungs need a Lean-proved certificate. The comment argues that iteration cannot cross the gap. The four regime names (including "aperiodic") are a settling-complexity ladder, not tilings.
- judgment.mjs maps polarity to a FOUR value: witness -> for only, obstruction -> against only, partial -> both, boundary-only -> neither. readingOfSemanticJudgmentFiber folds aspects by truth-meet, so an all-aspects check is a bilattice meet. This is the only place the contract layer actually uses the bilattice. It is a good idea executed thinly.
- contract.mjs: relationalContract, relationalMove, relationalPredicate and materialContext are record builders. contractsCompose checks left.move.codomain === right.move.domain (string equality), predicate compatibility (id equality or a one-step `entails` id overlap, which is not transitive), and equal phase, lens and evidencePolicy ids. composeRelationalContracts builds the Hoare composite by merging lens and policy fields, and contractFingerprint is a sorted canonical JSON string. This is the code-layer composition of typed claims, but the types are strings and the Hoare triple is never discharged: P and Q are opaque ids, so no pre/post is ever evaluated.
- energetics.mjs maps phase.energy to a law name string (well-founded-descent, monotone-accumulation, coordination-cost). No measure is ever computed or compared.
- contract-report.mjs (1345 lines) and verification.mjs (1070 lines) are the bulk. Every report is `missing` strings plus semanticJudgment aspects, checking things like energetics-vs-phase compatibility, policy completeness and finality-accounted. verification.mjs builds an instrumentVerificationPlan of checks and generates test-module descriptors and certificates. contractOutcome builds observation records (exposure, lens, predicate, energetic and phase observations) from caller-supplied material states, with no execution of the move.
- instrument.mjs (539 lines) holds the diagonal-agent faculty covers (communicating/knowing/playing, "glued holographically") and the off-diagonal-collective cover (socializing/computing/gaming, "glued by Mayer-Vietoris"). These are labels. No gluing is computed. It also holds protocolInstrument, instrumentContract, derived-obligation generation and instrumentsCompose.
- contract-operation.mjs (executableProgramPacket, schemaOperationsCompose = codomain id equality, audit) is plain bookkeeping. evidence-policy.mjs (5 lines) and observation-lens.mjs (9 lines) are frozen-record constructors. admissibility-presentation.mjs is a record builder. site-directory-grammar.mjs is a pure path-position parser for the dev/content/notes tokens; it is unrelated to evidence or logic and misplaced in this package.
- Load-bearing: phase.mjs (via signcraft settlement) and the judgment.mjs polarity-to-FOUR bridge. Mostly ornamental and self-referential: the report/verification/instrument/energetics machinery. It is a metroplat repo-governance DSL, validated by string checks.

Overall: SignChain is "code = composition of typed claims" in aspiration. In practice the evidence core (bilattice, rules, log) is a sound Fitting-style bilattice logic-program engine, and typed-theory.mjs is a thin free-category reachability layer that is disconnected from it. The contracts subsystem is a large string-keyed bookkeeping calculus whose only deep content is the Lean-derived regime ladder.

## Abstractions

### knowledgeJoin / knowledgeMeet / truthJoin / truthMeet (combined)

- **File:** `signchain/src/bilattice.mjs`
- **Computes:** Two cells (same triple) -> cell whose value is the FOUR op (joinK/meetK/joinT/meetT) of the values and whose for/against witness arrays are the unions. O(|witnesses|). Throws on different triples.
- **Theory:** Belnap/Ginsberg bilattice FOUR on cells, mirroring Obsmetrologia Valued (Evidence.lean). Real and faithful: lossless evidence (union on both sides), lattice on values only. The value can sit above or below what the witnesses show (meetK breaks Measured), which is a deliberate and documented design.

### negate / conflate / presumeFree

- **File:** `signchain/src/bilattice.mjs`
- **Computes:** negate swaps for/against sides and the value's poles. conflate flips the value only (knowledge negation). presumeFree raises untold sides to told with no witness (value-only raise, a deliberate breach of Measured).
- **Theory:** Bilattice negation and conflation; negate is also the linear negation. presumeFree is a closed-world / default-reasoning stub (Reiter-style) with an explicit, flagged unsoundness. A useful hook for 'hypothesis' cells.

### knowledgeLeq / truthLeq / witnessedReading / settleJudgments

- **File:** `signchain/src/bilattice.mjs`
- **Computes:** Order tests by witness-set inclusion (using semanticBytes hex keys). settleJudgments gives the knowledge join of named judgments plus the list of those that are both-told (stable contradictions).
- **Theory:** Information order is set inclusion of evidence; truth order is 'more for, less against'. Faithful. settleJudgments is the bridge from contract judgments to the bilattice.

### rule / always / antecedentHolds

- **File:** `signchain/src/rules.mjs`
- **Computes:** Build a frozen rule {name, antecedent:[{cell, atLeast reading}], consequent:{cell, reading}}. An antecedent holds when atLeast <=_k the cell's knowledge reading in the valuation.
- **Theory:** Fitting 1991 bilattice logic program clause with monotone threshold bodies. Positive-only language (no negation as failure), which is precisely what keeps T monotone; negative information is expressed by against-side thresholds.

### fire / fireRuleIn / step / derivation / firedRuleNames

- **File:** `signchain/src/rules.mjs`
- **Computes:** fire(rules, valuation) -> cellSet of consequents on the sides their reading tells, each witnessed by {rule, from:[premise addresses]}. step = mergeCellSets(valuation, fire(...)). O(rules x antecedents) with an address index.
- **Theory:** Fitting's immediate-consequence operator T(v) = v join fire(v): monotone, inflationary, so iteration reaches the least fixed point over finite rules (the iteration itself lives in signcraft/settle.mjs). Provenance is a content-addressed derivation DAG (each witness names rule and premise addresses), which is a proof object in the Curry-Howard sense and is the real proof term in the package. No type-level rule composition exists here.

### TellingLog / telling / cellsOfRows / tellSides

- **File:** `signchain/src/log.mjs`
- **Computes:** Append-only list of (s,p,o,side,witness) rows with per-role hash indices. where/against/latest/cells/readingAt query by pattern.
- **Theory:** An EAVT-style datom log. A cell set is the quotient forgetting order; the log keeps order. This is the only time-ordered structure in SignChain, and the natural seed for causal order / light cones, but no causal order is computed.

### inferenceRules / theoryOfData / theoryOfBase

- **File:** `signchain/src/typed-theory.mjs`
- **Computes:** From predication data (specialization morphisms or (s,p,o) cells) generate edge-rules: specialization, converse, subject-projection, object-projection. theoryOfData -> {objects, rules}.
- **Theory:** Presents a graph (a 1-skeleton) over base objects. The four generators are hardcoded; there are no user-declared connectives. Calling it a 'logic' overstates it: it is a rewrite/reachability presentation.

### composeInferenceRules / derivationClosure

- **File:** `signchain/src/typed-theory.mjs`
- **Computes:** One-round pairwise composition of rules by codomain/domain match (traces concatenated); closure iterates to a fixed point. Dedup key ignores the trace (sameGeneratedRule compares only domain and codomain), so multiple distinct derivations collapse to one. Roughly O(n^3) per round with linear-scan dedup.
- **Theory:** Transitive closure of the free category generated by the edges, with hom-sets truncated to existence (a preorder / reachability relation), not proof-relevant hom-sets. Composition is associative only up to trace-list concatenation, and identity morphisms are not materialized. Under CHL this is a 'category of propositions with at most one proof' (thin), losing proof relevance.

### derive / deriveInBase / typing

- **File:** `signchain/src/typed-theory.mjs`
- **Computes:** BFS from premise to conclusion; the seen-list blocks revisits, so the first (shortest) path is returned. Output: witness with derivation {steps, length}, or an obstruction listing explored objects and their count. typing wraps it as a judgment premise |- conclusion.
- **Theory:** Proof search = graph reachability. The 'typing judgment' is just 'conclusion reachable from premise', not Gamma |- t : A. There are no terms, contexts, substitution, or binding. It is a decision procedure for a thin category, and seen-list pruning makes it blind to alternative proofs.

### derivationValidity / derivationIdentity / inferenceRuleIdentity / inferenceMorphismIdentity

- **File:** `signchain/src/typed-theory.mjs`
- **Computes:** Re-check each step of a derivation against the theory's rules. Compare derivations/rules by endpoints plus trace kinds. Return witness/obstruction records.
- **Theory:** A proof checker and a proof-equality notion (syntactic trace equality). No equational theory (e.g. converse∘converse = id is not recognized), so there is no beta/eta and no normalization.

### typedTheoryProofCarrier

- **File:** `signchain/src/typed-theory.mjs`
- **Computes:** Closure plus a typing judgment for every generated rule; collects obstructions and ranks them (exact count).
- **Theory:** Self-certifying: asks derive for edges derive already found, so obstructions are structurally always empty. It is a tautological consistency check.

### predicateWord*: predicateWordArrow / composePredicateWords / composePredicateWordPotential / atomicPredicateWords / predicateWordResidue

- **File:** `signchain/src/typed-theory.mjs`
- **Computes:** Arrows (subject, [predicate...], object) composed one round only (ordered pairs i≠j, term coincidence at the join), then split into atomic (length-1) and composite words. 'Close under composition' is single-pass, so triples of arrows are not closed.
- **Theory:** The free (path) category on a predication multigraph: words in predicates are morphisms. This is the one place a monoid/word-like structure appears (relevant to sofic shifts / path languages). The closure is not actually a fixed point, an inconsistency with derivationClosure.

### phaseSignature / phaseEvidence / phaseEvidenceRegime / phaseEvidenced + 4 canned phases

- **File:** `signchain/src/contracts/phase.mjs`
- **Computes:** closure {scottContinuous, finiteBase, countableCofinality} (constraint-checked by metrologic closureRegimeData: finite forces the other two) -> regime in {strict, scott, transfinite-bounded, aperiodic} -> finality/cost/coordinationCost/energy via constant tables. Evidence is either observed stages (witnesses strict or scott only) or a certificate (declaration name, checked by metrologic settling/certificate).
- **Theory:** The real theory bridge. Regime ladder = settling complexity of a closure operator (Obsmetrologia Closure.Regime, ordinal closure, cohomology vanishing). Truth-conditional and honest about observability gaps: iteration cannot witness the upper rungs (gap_iff_upper), so certificates are required. 'aperiodic' here denotes the uncountable-cofinality rung, not a tiling; the link to Wang tilings / sofic shifts is nominal. It is the one place SignChain touches transfinite and limit stages.

### semanticJudgment / evidenceOfSemanticJudgment / readingOfSemanticJudgmentFiber

- **File:** `signchain/src/contracts/judgment.mjs`
- **Computes:** {subject, reasons, polarity ∈ witness|obstruction|boundary-only} <-> evidence (for-only, against-only, both, neither) and a truth-meet fold of aspects starting at truthTop.
- **Theory:** Clean encoding of check outcomes into FOUR / paraconsistent judgments; the fiber fold is a truth-order meet (replacing boolean &&). The 'partial' polarity can only be created by hand, as the constructor only ever emits witness/obstruction/boundary-only. It is the genuinely bilattice-aware part of the contract layer, and it is thin.

### relationalContract / contractsCompose / composeRelationalContracts / contractFingerprint

- **File:** `signchain/src/contracts/contract.mjs`
- **Computes:** A contract record: material, precondition P, move, postcondition Q, phase, lens, evidence policy, energetics, refinements. Composition is checked by string-id equality plus a one-step `entails` id overlap; the composite merges lens and policy fields. The fingerprint is sorted canonical JSON.
- **Theory:** Hoare-triple / Kleisli-style composition of typed morphisms, where the type is a boundary id (a string) and P,Q are opaque ids. The shape of composition-as-code is right, but no predicate is evaluated and `entails` is non-transitive. It is a registry-consistency checker, not a program logic.

### energeticObligation / energeticLawForPhase / phaseEnergeticObligation / contractEnergeticsReport

- **File:** `signchain/src/contracts/energetics.mjs, contract-report.mjs:177`
- **Computes:** phase.energy -> a law label; reports check that obligation behaviors match the phase and that the finality is accounted for. The optional `measure` field is never evaluated.
- **Theory:** The intent is a Lyapunov/ranking-function discipline: well-founded descent for strict phases, monotone accumulation for Scott phases, and a coordination cost for H1 != 0 phases. Only the labels exist; no ranking function is evaluated, so 'energetics' is metaphorical.

### instrument: relationalInstrument / protocolInstrument / instrumentContract / instrumentsCompose / instrumentDerivedObligations / diagonalAgentCover / offDiagonalCollectiveCover

- **File:** `signchain/src/contracts/instrument.mjs`
- **Computes:** Gamma |= {P} m {Q} records (a 'primary metroplat object') built from protocols or specs. They project to a contract and to derived test and example obligations, with faculty covers as constant records.
- **Theory:** Metroplat's configuration object (material, presentations, move, phase, lens, witness, energetics, projections). Holographic gluing and Mayer-Vietoris are only names on constant covers (no cocycle or sheaf condition is computed). 539 lines of schema-ish builder code.

### contract-report / contractOutcome / contract*Observation(Report)

- **File:** `signchain/src/contracts/contract-report.mjs`
- **Computes:** For a contract plus caller-supplied material states and boundary: exposure, lens, predicate, energetic and phase observations, each a record of checked string facts, rolled up into a contract-outcome with a fingerprint.
- **Theory:** Decidable accountability reports. The move is never executed; observations are asserted by the caller and string-matched against the policy. About 1,345 lines of near-duplicate report builders (each = missing[] + semanticJudgment aspects).

### verification: instrumentVerificationPlan / instrumentVerificationCertificate / implementationRefinement(Realization)Reports / generatedInstrumentTestModule

- **File:** `signchain/src/contracts/verification.mjs`
- **Computes:** Compose all reports into a list of named checks (material-admission, move-admissibility, contract-validity, ...) with verifies/evidence/missing/judgment, then a certificate, plus test-module descriptors and realization reports for implementation artifacts.
- **Theory:** A governance/CI construct: plans and certificates over repository artifacts. It is a repeated pattern (same instrumentVerificationCheck shape about 15 times). It is not a proof system; 'certificate' means 'all string checks passed'.

### executableProgramPacket / schemaOperationsCompose / auditSchemaOperation / operationConformanceVector

- **File:** `signchain/src/contracts/contract-operation.mjs`
- **Computes:** A program packet record (id, version, codecs, body, purity, totality, digest, testVectors) and domain/codomain id-equality composability plus a portable-body audit.
- **Theory:** Typed-arrow composition by schema-id equality (composition of codec-typed operations). The category laws are untested, and the digest is trusted rather than computed.

### admissibilityPresentation / admissibilityProjectionBundle / evidencePolicy / observationalLens

- **File:** `signchain/src/contracts/admissibility-presentation.mjs, evidence-policy.mjs, observation-lens.mjs`
- **Computes:** Frozen record constructors for presentation, policy and lens; the lens declares preserves/hides lists.
- **Theory:** The lens preserves/hides vocabulary resembles an observational equivalence or abstraction, but is declarative string lists. The lens is not a functor or a Chu-style observation map; no equivalence is computed.

### siteDirectoryGrammarOf / isSiteDirectoryGrammarPosition

- **File:** `signchain/src/contracts/site-directory-grammar.mjs`
- **Computes:** Pure lexical parse of a path into a dev/content/notes token chain relative to its site.
- **Theory:** Unrelated to SignChain's theory (filesystem naming convention). Misplaced; it should live with filepath tools.

## Capabilities a logical inference model can build on

- Fitting immediate-consequence engine with content-addressed derivation witnesses (rules.mjs fire/step): a ready monotone forward-chaining kernel over paraconsistent cells, with a provenance DAG (rule name + premise addresses) that can be read as a proof term and exported as a lineage for training or explanation.
- Bilattice evidence algebra with lossless witness union (bilattice.mjs): a principled uncertainty/contradiction substrate. For and against are tracked separately, the value can be 'told both', and presumeFree gives a flagged hypothesis operator. A next-gen model can use cells as its token or belief state instead of probabilities.
- Append-only TellingLog with indexed pattern queries (log.mjs): a ready causal history. Row order is a total order that can be refined to a partial causal order for light cones, and past and future cones can be queried by pattern.
- Phase/regime classifier with observability gap discipline (phase.mjs): a principled way to tell the AI which settlement claims are decidable by iteration (strict, scott) and which need certificates (transfinite, aperiodic). Gate expensive reasoning by regime and cost rank.
- Judgment-to-FOUR bridge (judgment.mjs) and settleJudgments: composite verification outcomes can be folded by truth-meet and knowledge-join instead of boolean AND, so partial or contradictory verification states persist.
- typed-theory's BFS derive plus validity checker and the free predicate-word category: a small substrate for path-language (sofic-like) reasoning over predication graphs; a minimal checked proof object ({premise, steps, conclusion}) already exists.
- Contract composition check (contractsCompose / composeRelationalContracts / contractFingerprint): a ready registry-level typed-composition guard, and a canonical fingerprint to content-address contracts.

## Gaps and slop

- typed-theory is not Curry-Howard-Lambek. There are no types or propositions, no terms or lambda, no contexts, no product/coproduct/exponential (internal hom), no cartesian- or monoidal-closed structure, no normalization or cut-elimination, and no identity morphisms or associativity/identity laws as checked equations. CHL would need a category with finite products and exponentials (STLC) or a monoidal-closed category (linear logic) plus a term calculus. What is present is a thin free category on 4 hardcoded generators with BFS reachability.
- 'Typing judgment' (typing) means reachability only. 'proof carrier' (typedTheoryProofCarrier) asks derive about rules derive already contains, so obstructions are always empty: a tautology.
- Composition closure forgets proofs: sameGeneratedRule compares domain and codomain only, so distinct derivations of the same rule collapse (thin category, proof-irrelevant). BFS also uses a seen-list, so it returns just one shortest path. No proof enumeration, no proof equivalence, no homotopy.
- Closure code is sloppy: composeInferenceRules is O(n^2) per round with linear-scan dedup (roughly cubic per round overall); composePredicateWords is a single round that claims closure ('Close a predicate word carrier under composition') and is inconsistent with derivationClosure's fixed-point loop.
- The README mentions @lenticule-science/metrologic and @red-cup-engineering/sign-cell, but package.json uses @red-cup-engineering/signcell and metrologic 0.3.0, so docs and deps disagree. The README's 'most boring reading, and it is the brand name it uses' is self-aware branding over a small library.
- typed-theory.mjs is a compiled-JS look-alike (with /predicating/ and metroplat/calculus schema $ids) of a TypeScript source. The four inference-morphism JSON schemas at the end of the file are trivially redundant ({kind: const}). They are the only schemas for the whole module.
- typed-theory is unconnected to rules.mjs and bilattice.mjs: theories do not produce rules over cells, derivations carry no evidence or witness values, and nothing feeds derive's output into the cell valuation. Two parallel inference notions (graph reachability vs. Fitting T-operator) are never unified. No signstuff consumer imports signchain/typed-theory; the only external reference is a legacy provenance test.
- Test coverage of typed-theory is smoke-level (cellOf, identity of morphism kinds, three-rules-per-cell count); closure, derive, validity and predicate words are effectively untested here. The only other test is bilattice-wire.
- Contracts is about 3,900 lines (65 percent of the package) of string-keyed bookkeeping: contractsCompose uses id equality; `entails` is a one-step non-transitive id overlap; P/Q are opaque ids that are never evaluated; moves are never executed; energetic `measure` is never computed; lens preserves/hides are free-text lists; faculty covers 'glued holographically' / 'Mayer-Vietoris' are constant records with no gluing check; 'certificate' means all string checks passed. contract-report.mjs and verification.mjs repeat the same {missing[], aspects[], judgment} pattern dozens of times (large duplication; could be one data-driven checker).
- contracts exports 'metroplat.*' kinds and sites-directory grammar inside a package that is declared pure and about evidence, which is a layering smell: contracts are repo-governance/metroplat DSL living in the code layer. site-directory-grammar.mjs is entirely off-topic.
- phase 'aperiodic' regime is a settling-complexity label (not countably cofinal), with no connection to Wang tiles, substitution, or sofic shifts; the tile-coloring theory is not realized anywhere in SignChain. No light-cone or causal order, no FCA (formal contexts, concept lattices, Galois connections, implication bases), and no weaving or bead structure appear in this package. TellingLog order is the only nascent causal structure.
- No negation in the rule language (by design, to preserve monotonicity), and no function symbols, variables or unification. Rules are fully ground cells, which gives propositional Datalog power only (no first-order generalization); signcraft/inference/infer.mjs derives rules from facts outside this package.

## Attachment points

- CHL upgrade: replace typed-theory's graph with a typed term calculus whose judgments are cell-valued. Make rules proof-relevant by letting the derivation witness {rule, from} in rules.mjs be the term. Define hom-sets as sets of derivation terms (not reachability), add identity, composition, product and internal hom (exponential) as rules over predicate words, and add a normalizer/equational theory (converse∘converse = id, projection laws) so proof equality is decidable. Then derivationClosure becomes a proof-relevant hom enumeration, and a model's 'forward pass' is the normalization of a term.
- Bilattice-valued typing: make typing return a cell (a FOUR reading with for/against witnesses being derivations) instead of witness/obstruction. Search finds derivations for p and against p (refutations), giving paraconsistent type checking where 'told both' is a legitimate typing result.
- FCA hook: formal contexts are (objects, attributes, incidence). Attach them as the cell store, with the object = subject, attribute = (predicate,object) and the incidence = knowledge reading >= told-for. Concept lattice = closed sets under the Galois connection (⋃ over premise cones); implications (attribute-exploration) become derived Fitting rules with threshold antecedents. A bilattice-valued context (for/against incidence) gives twin concept lattices (a Belnap formal context).
- Light cones from TellingLog: define a causal partial order from the rule-provenance DAG (witness.from addresses). Past cone of a cell = transitive closure of derivation premises, future cone = cells whose derivations use it. This gives premises and consequences as cones, and stage-by-stage T-iterates as the causal layers. Add explicit cone queries to log.mjs (pastCone, futureCone, spacelike pairs = no shared derivation).
- Tiling/substitution hook: use predicate-word composition (composePredicateWords) as a path language of a sofic shift. Colored tiles = rule instances; Wang matching = codomain/domain coincidence (exactly composeRule's guard). Make composition a proper closure and add substitution rules (rewriting a word into a longer word) to get aperiodic hierarchical derivations; tie the phase 'aperiodic' regime to non-terminating substitutions.
- Foam/organic dynamics: treat T-iteration as a local relaxation. Each rule is a cell wall tension, knowledge-join accumulates, contradictions ('told both') are interfaces, and presumeFree is symmetry-breaking by default. Phase.energy (decreasing/accumulating/costed) plus measure gives a Lyapunov function; implement the missing `measure` evaluation so energetics is real descent.
- Phase-gated compute: use phaseSignature regimes as a scheduler (strict: exhaust BFS; scott: stream approximants; transfinite/aperiodic: demand certificate), plus cost 0..3 as budget. This gives the AI a principled 'knows when it can't decide by iteration' meta-level.
- Judgment fiber as loss/feedback: readingOfSemanticJudgmentFiber produces a FOUR-valued score from many checks. Use this as an interpretable reward and training signal, since contradictions are retained and not averaged away.
- Contracts as typed tool-use guardrails: contractsCompose plus contractFingerprint already give composition-with-content-address for agent actions. Make P and Q evaluable predicates over cells (evaluate against the TellingLog), execute the move, and check Q, turning the Hoare shell into a real runtime verifier.

