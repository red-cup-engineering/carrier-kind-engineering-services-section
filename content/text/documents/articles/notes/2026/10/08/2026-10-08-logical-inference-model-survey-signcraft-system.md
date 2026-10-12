---
title: "Logical inference model survey: signcraft-system"
description: "What this area of the tree actually computes, its abstractions with their theoretical readings, capabilities a logical inference model can build on, gaps and slop, and attachment points."
date-created: 2026-10-08
kind: engineering-survey-note
keywords:
  - logical-inference-model
  - signstuff
  - survey
  - signcraft-system
status: survey-read-only-not-adversarially-verified
produced-by: info-0d logical-inference-model survey workflow (Claude agents; Sonnet readers for code, Fable readers for house theory), read-only over the tree at 773ea6d6df4
---

# Logical inference model survey: signcraft-system: SignCraft core (settle, history, membrane, knowledge-base, primitives, page, settlement-signature, history stores) + src/inference

## Summary

Root: lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/lib/signstuff/signcraft/src (SC below). Quoted paths are relative to SC.

SignCraft is two things in one package. (1) A real, fairly tight monotone-closure engine plus a causal observation log. settle.mjs runs a Kleene/Tarski least-fixed-point loop (closureOrbit) over a valuation of SignCell cells (cell = subject/predicate/object with for-witness and against-witness lists, i.e. Belnap FOUR via evidence carriers). Rules come from SignChain; the site and transport rules come from SignGraph. The orbit is a list of valuations. Each stage records the designated cells (those told for). settlementAdmits replays the orbit from stage 0 and compares content addresses, so a settlement is a checkable certificate of S-closed and least-above-seed. Everything after that in settle.mjs is a reading of the orbit: filtration (stage, ordinal, shape, designated), increments/firings, non-Scott firings (limit stages only; for a finite orbit these are always empty, so the first cohomology rank is always 0), classify, and a per-cell causal order over "firing events". The causal order is stage-increasing term adjacency: event A precedes B iff A's stage < B's stage and they share a subject or object term, closed transitively. That order yields causalCone (past/future), timelike versus spacelike separation, and an ordering fraction. history.mjs is a Git-like content-addressed DAG of atomic observations. Each revision is {id = SCA address of {parents, source, cells}, parents, source, cells}. A new observation takes all current heads as parents. Functional predicates are single-valued: a later causal observation supersedes earlier ones, while concurrent ones are both kept and show up as counterevidence. mergeHistories is a set union of revisions topologically re-ordered with ID-sorted ties, so it is order-independent (a CRDT-ish union). Checkpoints, archives, derivation caching with a frame rule (historyDerivation/carries), and storage ports (content-history-store with a Merkle radix index and compare-and-publish frontier; file and SQL adapters; legacy SQL import) are substantial engineering and probably the most solid code here. membrane.mjs is a small parser that turns utterances [token, claim] into told cells (negation markers by parity give against versus for, a packed {subject, object} token gives a relation, otherwise reflexive). tellMembrane joins tellings, so "p" and "not p" read told-both on one cell, and settleMembrane = settleCells(tellMembrane). knowledge-base.mjs is a stateful OO wrapper (TellingLog + rules + specializations; settle/section/compare/cones/vanish); it is the "K of MAPE-K" and is trivial glue. primitives.mjs is a table of JSON-in/JSON-out wrappers exposing Sign* functions to SEN (an expression notation). page.mjs builds a Chu space (points = cells, states = vantages) and renders hypertext, so it is a view layer. settlement-signature.mjs maps a codomain schema witness to classify then phase then transport (normal-form maps to request-response; approximation/stage to event-stream; unattained to websocket). That is an ordinal-theory-derived transport table, but the witness is a hand-authored flag, so the classification is nearly tautological.

(2) src/inference/ (not in the requested file list, but it is where the "new AI" content actually lives: about 1900 lines, and the README never mentions it). It is a FCA-based inference/learning/generation machine. nuclei.mjs: sigma (close each object's held attributes under the Duquenne-Guigues implication basis, with witnesses) and delta (Galois-closure transfer of held evidence along an object's profile). settle() iterates delta then sigma to a fixed point. It keeps a free-energy ledger (kHeight gain per step = commits + mints + 2*jumps) and asserts an H-theorem: any step with firings must have flux >= 1, and any flux must have firings. It also checks ledger closure (initialDeficit == totalFlux). complex.mjs: a conductance complex (weighted graph over attributes), the weighted Laplacian L, disagreement energy x^T L x, the smallest nonzero eigenvalue lambda_1 (Jacobi), and refusalNumber = sqrt(E/lambda_1), which is the quantitative "refuse a non-gluing family with a number". generate.mjs: Gibbs sampling over enabled moves, scored by alpha*opened - beta*closed + T*DeltaE (continuation energy). adapt.mjs: Physarum-style conductance adaptation from settlement flux. learn.mjs: induces the DG basis and weighted implications from incidence, with a learning curve. speak.mjs/relconlang.mjs: a toy "semiotic language model" (parse a small stance-particle language into (s,P,o) cells, Gibbs-saturate holes using FCA concept generalization, log excluded mass). algebra.mjs/network.mjs: Boolean relation algebra (compose, residuals, nucleus, attend) and a two-layer relational network trainer. infer.mjs: rule inference via closeAttrs plus SignCraft settleValuation. kernel.mjs: a pure machine-state/action API (runMachineAction).

Disagreement energy and "glue uniquely or refuse with a quantity" live only in inference/complex.mjs (and obstructionsOf in nuclei.mjs), NOT in settle.mjs. The src/README's phrase "merge principle (compute disagreement energy; glue uniquely or refuse with a quantity)" is therefore realized only on the toy inference side. settle.mjs's own merge is the lattice join of cell evidence (merge(prior, telling)), which never refuses.

Net: a sound, small monotone closure with a replayable certificate and a causal-history DAG, topped by a real but toy FCA/Gibbs/Physarum machine. The light-cone and tile/bead theory is present only as the causal order of firing events (term-adjacency light cones). There are no tilings, no beads, and no Curry-Howard-Lambek in this area beyond the naming.

## Abstractions

### closureOrbit

- **File:** `settle.mjs`
- **Computes:** (rules, seedValuation) -> frozen array of valuations (stage 0 = cellSet(seed), each later stage the sorted valuation after one round). Worklist semiotic Kleene iteration: a dependents map (premise cell address -> rule indices) re-queues only rules whose premises changed. Each pending rule is fired via SignChain fireRuleIn(rule, valuation). Tellings are merged into the valuation (merge(prior, telling)); a key counts as changed only if its for/against list lengths grew. Terminates when no key changed; throws RangeError past rules.length+1 stages. The `fired` set means each rule fires at most once (its first non-empty production).
- **Theory:** Least fixed point of T_S v = v join fire_S v above the seed (Tarski/Kleene), knowledge order; monotone because evidence only grows. Realization caveat: the once-per-rule `fired` guard means that if a rule's premises later gain evidence, it never re-fires, so the result equals the lfp only if each rule's single derivation is complete at first fire (the comment 'each rule has one derivation' asserts this). That is plausible for ground rules but not a general guarantee.

### settle / settleValuation / settleCells / settleSite

- **File:** `settle.mjs`
- **Computes:** settle(presheaf, rules) -> {kind:'signcraft.settlement', site, rules, stages:[{stage, valuation, designated}], settled (last valuation), settledAt, regime}. settleValuation(site, valuation, rules) = settle(posit(site, valuation), rules). settleCells(told, rules) builds site(told) and adds transportRules(site) (specialization transport). settleSite tells each site cell for by itself.
- **Theory:** Settlement = content over a base admitted by the base's law (Obsmetrologia Settlement.lean / Closure/RuleSystem.lean cited in comments). The regime is regimeOfOrdinal(ofNat(settledAt)), always the finite/strict regime since ordinals are always finite. So the 'regime' field is constant for every real settlement.

### settlementAdmits / settlementEvidence

- **File:** `settle.mjs`
- **Computes:** Replays closureOrbit from stage 0 of a claimed settlement and compares each stage's valuation and designated cells by semanticId; checks numbering, settledAt, and that settled equals the last replayed stage. Returns {admitted, reason}. settlementEvidence turns an admitted settlement into phaseEvidence {id, phase, stages (ids of designated), settledAt}, and throws otherwise.
- **Theory:** Proof-carrying settlement: a certificate checkable by recomputation (the replay is as expensive as the settle, not a cheap verifier). This is the closest thing here to Curry-Howard: a settlement is a verified computation. There is no typed term or proof object, only an orbit.

### designated / cones / vanish / partition / compare

- **File:** `settle.mjs`
- **Computes:** designatedCells = cells with a for-side told. cones(settlement) gives per site cell the four readings: settle (least knowledge, the actual), brim (greatest knowledge, always ⊤), adjudicate (truth reading of settled), and presume (for-side presumed told, against kept as is). vanish = cells where settle != brim. partition buckets a section by knowledge reading (⊥/+/-/⊤). compare splits consistent from paraconsistent (told both).
- **Theory:** Paraconsistent Belnap FOUR with two sigma-dual orders (knowledge, truth). 'cones' here are least/greatest valuations (lower/upper readings), a lattice interval, NOT light cones. 'vanish' is nearly 'cells not fully determined'; brim is a constant, so this reduces to 'cell not told both ways', which is trivial.

### relate

- **File:** `settle.mjs`
- **Computes:** mergeCellSets(left.settled, right.settled) over the joined site (both specializations), settle under both rule lists (deduped by name) plus the new site's transport.
- **Theory:** The cell-level merge/gluing of two settlements: a join of evidence then re-closure. It never refuses and computes no disagreement energy. It is a lattice join (evidence union), so glue-or-refuse is not implemented here despite the README.

### filtration / increments / firings / nonScottFirings / firstCohomology / gradedGap / closureInvariant / classify

- **File:** `settle.mjs (delegates to metrologic obstruction/settling)`
- **Computes:** filtrationOf(settlement) gives stages with ordinals, shapes (initial|successor|limit) and designated cell triples. increments = newly designated cells per stage; firings = stages with additions; nonScottFirings = additions at limit stages; firstCohomology rank = number of non-Scott additions; gradedGap lost cells (same rank); classify gives closure data and regime. All delegation, thin wrappers adding 'kind' tags.
- **Theory:** Settlement-filtration cohomology: obstruction to Scott-continuity of the closure. For every real settlement (finite orbit) there are no limit stages, so the rank is 0 and the whole apparatus is vacuous in practice; it only becomes nontrivial for hand-presented transfinite filtrations (as in settlement-signature.mjs and the primitives). Grandiose over the computed case.

### firingEvents / causalOrder / causalCone / causalSeparation / orderingFraction

- **File:** `settle.mjs`
- **Computes:** firingEvents: each designated cell with the stage index of its first firing. causalOrder(events): reach[i][j] iff stage_i < stage_j and the cells share a subject/object term, then Floyd-Warshall-style transitive closure (O(n^3)). causalCone(order, apex) -> {past, future}; causalSeparation -> timelike or spacelike or an obstruction naming a cell that never fired; orderingFraction = comparable pairs / all pairs, as a reduced fraction.
- **Theory:** A discrete causal set (poset) from derivation depth and term adjacency, giving light-cone past/future and a causal-set 'ordering fraction' (a Myrheim-Meyer-like dimension proxy). Real and reusable as the lightcone hook. Caveat: causality is stage-adjacency heuristic (shared term), not actual rule-derivation dependency; the witnesses in cell evidence would give a more faithful dependency order.

### settlementDiagram / documentOf

- **File:** `settle.mjs`
- **Computes:** settlementDiagram: state machine whose states are stages and transitions are firings (via signgraph presentedCategoryDiagram). documentOf: settled cells sorted by address, adjacent order edges, references where one cell's object coincides with another's subject, valuation site per cell.
- **Theory:** Presentation layers. 'Document' = address-sorted listing, so the order is arbitrary (hash order) and the 'order' edges carry no meaning.

### membrane (denialOf, cellOfUtterance, tellingOf, tellMembrane, settleMembrane)

- **File:** `membrane.mjs`
- **Computes:** Utterance [token, claim] -> cell. Strips leading !, ¬, -, 'not ', 'no ', 'never ' markers by parity (odd = against; claim===false = against 'false'). token {subject, object} -> (subject, claim, object), else reflexive (token, claim, token). tellMembrane = cellSet of tellings, so 'p' and 'not p' join to a single told-both cell. settleMembrane = settleCells(tellMembrane).
- **Theory:** The faculty boundary: surface language to paraconsistent cells. Regex-based negation parsing is shallow natural-language handling (e.g. '-5' or 'no' prefixes are misread as negation). The 'faculties differ only in order of reading' claim is not enforced here. The only real content is that negation is an involution and contradiction is held, not exploded.

### KnowledgeBase

- **File:** `knowledge-base.mjs`
- **Computes:** Class wrapping a TellingLog, rules and specializations. articulate/deny/tell/tellAgainst add evidence; settle() = settleValuation(site(log.cells), cells, rules + transport); section/compare/cones/vanish/readingAt/claimsFor/subjectsFor are all re-settles (no caching, so each read re-runs the fixed point).
- **Theory:** The 'K' of MAPE-K: an append-only evidence log plus on-demand closure. Mutable class contradicting the value-oriented style elsewhere; a thin facade with no new math. Re-settling per query is O(settle) each time.

### primitives (SEN primitive environment)

- **File:** `primitives.mjs`
- **Computes:** Frozen table name -> JSON function: signchain.{conflate,negate,knowledge-join,truth-join}, signcell.articulate, relating.{tell,settle}-membrane, signgraph.{site,posit}, signcraft.{settle,relate,increments,firings,limit-stages,non-scott-firings,first-cohomology,graded-gap,gap-cohomology-identity,closure-invariant,classify}; evaluateRunTerm(runTerm, input) runs a SEN term with these.
- **Theory:** The code layer's verbs expressed as a closed primitive set for a notation (SEN). It is a binding table, not a computation. Note: signcraft.settle uses only transportRules, so no user rules can be passed from SEN (rules are not JSON-expressible here).

### createHistory / observeHistory (revision DAG)

- **File:** `history.mjs`
- **Computes:** A history is {kind:'signcraft.history', functionalPredicates (sorted set), revisions:[{id, parents, source, cells}], optional checkpoint}. observeHistory(h, cells, {source}) appends one atomic revision whose parents are ALL current heads; id = SCA address {subject:'signcraft.history', predicate:'revision', object:{parents, source, cells}}. Empty cells are a no-op. A disposable index (bySubject, byPredicate, byReference, ancestors, readings; WeakMap-cached and copy-on-write per touched subject) is built lazily by indexOf.
- **Theory:** A content-addressed Merkle DAG (git/event-sourcing shape). Revisions 'observe their parents' (causal consistency; concurrent observations are never ordered by arrival). Each revision is an element of a causal poset, i.e. a light-cone-ish structure at the revision level. Heads = antichain frontier.

### functional predicate semantics & sectionOf / historySection / queryHistory

- **File:** `history.mjs`
- **Computes:** For predicates declared functional, a new observation on (subject, predicate) supersedes only observations that are its causal ancestors; concurrent (non-ancestor) values survive. sectionOf collapses per (subject,predicate) with cellSet and, for functional predicates, adds every other-object alternative's for-evidence as AGAINST-evidence on each value, so concurrent writes yield a paraconsistent told-both reading rather than last-writer-wins. historySection and queryHistory answer subject, predicate, or pattern queries via indexes, and every query records a read pattern.
- **Theory:** Multi-value register / CRDT with causal-maximal selection and evidence-level conflict (a Belnap told-both result). It is the history-side analogue of 'glue or refuse': conflict is held as data, never collapsed. Because merge is a set union and sectionOf is a pure function of the cell set, readings are order-independent.

### mergeHistories

- **File:** `history.mjs`
- **Computes:** Union of revisions by id across histories (identical content = identical id, so dedup is free), union of functional predicates, then Kahn topological ordering where each level's ready ids are lexicographically sorted. Fast paths: all identical, or the largest history already contains every other's revisions. Different checkpoints force materializeHistory first. Throws on a missing parent or cycle.
- **Theory:** Merge is the join in a semilattice of revision sets (commutative, associative, idempotent). Because the ordering is a deterministic function of the DAG (level-sorted, not arrival order), the resulting history is canonical. Order-independence holds up to the array representation; the semantic reading is independent of order since index construction depends only on the poset (ancestry), as the concurrency-aware supersession in indexOf shows. Note: indexOf's supersession uses the `extendsAll` shortcut and the ancestry check, and the merged array order can differ between merge orders only for ties that are, by construction, concurrent.

### checkpointHistory / materializeHistory / bindHistoryArchive / restoreHistory / continueHistory / replayHistory

- **File:** `history.mjs`
- **Computes:** checkpointHistory cuts the current raw (witness-preserving) cells and heads into a content-addressed checkpoint {heads, cells, size, functionalPredicates, id}, with no revisions left; it reads identically, and the previous ancestry must be archived by the caller. materializeHistory recovers full ancestry from an archive reader and authenticates that the archive really substantiates the checkpoint. restoreHistory re-addresses and verifies every revision and the checkpoint. replayHistory/continueHistory batch-append without per-step indexes.
- **Theory:** Snapshot-plus-log with verifiable pruning (like a Merkle checkpoint). Raw conflicting witnesses are retained in the checkpoint; projected counterevidence is never written back as an observation. Engineering, not new theory.

### historyDerivation / carries / captureHistoryReads / historyChanges

- **File:** `history.mjs`
- **Computes:** historyDerivation(derive) memoizes a pure function of (history, key). On a later history it checks `carries`: reuse the old result iff no changed cell (from historyChanges: the observations plus superseded cells since the prior history, or a per-subject diff) meets any pattern the derivation queried, and every inner derivation it used still gives the same result. captureHistoryReads records the actual queries (including absent facts) of a proposal as its conflict footprint.
- **Theory:** Incremental computation with a frame rule and read-set conflict detection (optimistic concurrency / separation-logic flavor). Dependency tracking is via global mutable `reading`/`depending` variables, so derivations must be synchronous and pure. This is a genuine, reusable mechanism for incremental settlement.

### createContentHistoryStore

- **File:** `content-history-store.mjs`
- **Computes:** Over a 4-function data port {read(id), putAbsent(id,text), root(), publish(expected,next)}, retains values by SCA semanticId and splits large arrays/objects into structured content backed by a prefix-radix (Merkle trie) index (LEAF/BRANCH nodes). commit(history, control) writes changed subjects' cells plus a frontier record and then publishes via compare-and-swap on the root (throws if the frontier moved). load() reconstructs a history with a bound archive and verifies addresses.
- **Theory:** Immutable content-addressed custody with atomic compare-and-publish: the database-proof / evidence-substrate idea realized as a persistent Merkle trie. Storage is a pure port, so identical semantics over files and SQL. Solid engineering, not AI theory. Only one writer at a time is expressed (CAS failure = caller must merge via mergeHistories and retry; the retry loop is not in this file).

### createFileHistoryStore / createSqlHistoryStore / importSqlHistory / readSqlHistory

- **File:** `file-history-store.mjs, sql-history-store.mjs, import-sql-history.mjs`
- **Computes:** Adapters binding the content port to flat files (immutable-content-custody-service file store plus a reference with a transitions log) or SQL (signcraft_content chunked rows, signcraft_frontier singleton row, 180k-char chunks, atomic transactionSync). admitSqlFile / importSqlHistory migrate legacy SQLite histories at startup and rename the legacy file.
- **Theory:** Persistence adapters; legacy-migration code makes up a large fraction of the file volume (compat debt).

### pageOfCells / stackPages / contexts (PUBLIC, AUDIT, publicVantage)

- **File:** `page.mjs`
- **Computes:** Builds a metrologic Chu space whose points are cell keys, whose states are vantage names, and whose entry is knowledgeReading(cell) if the vantage sees the cell, else knowledgeBottom. Calm versus audit stance selects what is rendered; the article/contested/audit renderings use escape/slug helpers into HTML. stackPages merges pages that share vantages.
- **Theory:** Chu space = (points, states, FOUR-valued pairing); a vantage is a state, so redaction = visibility = a Chu-morphism-ish view. A legitimate small use of Chu semantics for access control / views. Mostly a renderer.

### settlementSignature / classificationOfWitness

- **File:** `settlement-signature.mjs`
- **Computes:** From a codomain schema's `x-settlement-filtration` witness {limitStage, nonScottLimitFiring, cofinality}, builds a 1-or-2-stage filtration (initial, optional limit at ω designating a witness cell), runs classify, takes phaseSignature, and maps finality (normal-form|approximation|stage|unattained) to a transport (request-response, event-stream with Last-Event-ID, websocket-session) and coordinationCost.
- **Theory:** Maps closure ordinal / Scott-(dis)continuity to a coordination-cost and transport (a CALM-style monotonicity -> coordination-free dispatch idea). However the witness is an authored flag, not derived from the action's actual closure, so it is a lookup table dressed as an ordinal-theoretic derivation. The default for any schema not marked is 'finite, no limit' = request-response.

### inference/nuclei: sigma, delta, settle (FCA closure with free-energy ledger)

- **File:** `inference/nuclei.mjs`
- **Computes:** Valuation = Map 'g m' -> FOUR reading. sigma: for each object, close its held signed attributes under the Duquenne-Guigues basis (lawfulBasis from metrologic closure/formal-context) with witnesses. delta: transfer evidence along the Galois closure (extent/closeAttrs) of the object's profile, only when the profile is realized (extent nonempty), so a contradiction stays local. settle(): iterate delta then sigma until valuation equality, tracking stepLedger {flux, commits, mints, jumps} and throwing on H-theorem violations. Returns {v, trace, steps, ledger:{initialDeficit,totalFlux,closes}, obstructions}.
- **Theory:** FCA implication-closure + concept-lattice transfer as two knowledge-order nuclei with a Lyapunov/free-energy ledger (Obsmetrologia Dynamics/Flow/FreeEnergyLyapunov). The closure is genuine and the ledger is an executable runtime assertion of the Lean statement. This is a second, independent settle engine (attribute-matrix based) next to settle.mjs's rule-based one; the two are bridged only in infer.mjs (inferSettled) and the 'legacy attribute API' comment admits the duplication.

### inference/complex: disagreement energy, spectral gap, refusalNumber

- **File:** `inference/complex.mjs`
- **Computes:** makeComplex(attributes) -> symmetric conductance matrix D (Float64Array, immutable updates via withConductance); laplacian L; disagreementEnergy = x^T L x for a ±1/0 assignment; eigenvalues by Jacobi; spectralGap lambda_1 (smallest eigenvalue above 1e-9); refusalNumber = sqrt(E/lambda_1) (0 if E≈0, Infinity if lambda_1 = 0).
- **Theory:** Graph-Laplacian Dirichlet energy as a sheaf-coboundary norm; a refused merge returns a distance-to-coherence bound (cited 'closure-cones Theorem 10.14'). With a learnable metric (the weights), this is the only gradient-ish / continuous part. It is a graph Laplacian over a constant graph, not a sheaf Laplacian over a cellular sheaf with restriction maps; the 'sheaf' language is a stretch. Complexity O(n^3) Jacobi per call; the Laplacian is recomputed on each call with no caching.

### inference/generate + speak: Gibbs saturation language generation

- **File:** `inference/generate.mjs, inference/speak.mjs`
- **Computes:** enabledMoves(ctx,basis,v,g): attributes the closure permits adding for object g. continuationEnergy = alpha*opened - beta*closed + T*DeltaE (change in disagreement energy). generate samples moves with a Gibbs distribution at temperature T (seeded mulberry32 RNG, a wit-log of excluded mass). speak() fills typed holes from witnessed (s,P,o) fibers, generalizing via FCA concept intent/extent when a fiber is sparse; comprehend() parses RelConLang text into cells and settles.
- **Theory:** The nascent 'new AI': generation as energy-based sampling over the lawfully enabled cone of a closure, where the energy has a logical term (opened/closed implications) plus a disagreement term. It is the single most AI-shaped thing in the area, but corpora and evaluation are toy-scale (small RelConLang units), and everything is a symbolic Gibbs sampler over a given context, with no learned representation beyond conductances and mined implications.

### inference/learn + adapt: implication induction and Physarum conductance adaptation

- **File:** `inference/learn.mjs, inference/adapt.mjs`
- **Computes:** induceBasis(objects, attributes, pairs) -> DG basis from witnessed incidence; induceWeightedImplications(pairs,{minSupport,minConfidence,maxRules}) -> association-rule-like weighted implications; learningCurve reveals incidence in rounds, re-induces, adapts conductances via fluxFromTrace/adapt from settlement flux, scores held-out prediction per round. scoreWeighted ranks candidate attributes.
- **Theory:** FCA attribute exploration / rule mining as 'training' and a Physarum-like flow-reinforcement rule as the metric learner. Learning here = mining implications + updating a few edge weights; it is not parametric gradient learning and has no demonstrated scaling beyond toy datasets.

### inference/algebra + network: relational (Heyting-residual) algebra layers

- **File:** `inference/algebra.mjs, inference/network.mjs`
- **Computes:** makeRel with pos/neg FOUR-valued relation matrices; compose; residualLeft/Right (the adjoints of composition); meetRel; trainLayer(examples) which computes the weakest consistent relation via a residual; nucleus(A, step) as an iterated closure; attend(Q,K) as a relational attention analogue; forward(X, layers); trainTwoLayer for a two-layer relational 'network'.
- **Theory:** A quantale/allegory style 'neural net' over Boolean/Belnap relations, with exact residual training (one-shot, no gradient). The Curry-Howard-Lambek hook: compose and residual are the closed-structure adjunction, so a layer is a morphism. The relation to the settle/FCA pipeline is not wired; it sits as a parallel experiment.

## Capabilities a logical inference model can build on

- settle.mjs closureOrbit/settle: a deterministic, replayable monotone least-fixed-point engine over four-valued evidence cells, with per-stage designated cells. It can serve as the inference substrate: rules are SignChain rules whose firing produces witnessed cells, and the orbit is the full derivation trace by stage.
- settlementAdmits: recompute-based proof-carrying certificate for any settlement (an analyzer or planner can ship a settlement and an auditor can verify it by replaying).
- causalOrder/causalCone/causalSeparation/orderingFraction: a discrete causal set with past/future cones, timelike/spacelike separation, and an ordering fraction (dimension-like statistic). The light-cone API already exists and takes any stamped event sequence (firingEvent(cell, stage)), so a membrane with stamped utterances is already a valid input.
- history.mjs: a content-addressed causal DAG with semilattice merge (mergeHistories), concurrency-aware functional predicates (multi-value register yielding told-both counterevidence), checkpoints with authenticated archives, and an incremental derivation cache with a frame rule and read-set capture. Directly usable as the evidence substrate and as the optimistic-concurrency layer for multi-node (Rendanheyi) writes.
- createContentHistoryStore: a persistent Merkle-radix trie with atomic compare-and-publish frontier over any 4-function port: the database-proof executing store.
- partition/compare/cones/vanish and tellMembrane: paraconsistent readings that hold contradiction as data (told-both) instead of exploding; membrane denialOf handles surface negation parity.
- inference/nuclei: FCA closures (DG-basis sigma plus Galois-transfer delta) with an executable free-energy (knowledge-height) ledger and H-theorem assertions: a ready energy-style Lyapunov function for any closure-driven model.
- inference/complex: disagreement energy x^T L x, spectral gap lambda_1, and refusalNumber sqrt(E/lambda_1) with an immutable, learnable conductance matrix: a quantitative refuse-to-merge measure and a place to hang learnable parameters.
- inference/generate+speak+learn+adapt: end-to-end loop of mining implications from witnessed incidence, Gibbs generation over the lawfully enabled cone with an energy that includes logical and disagreement terms, Physarum conductance adaptation, and a held-out learning curve: a working (toy) prototype of the target AI class.
- page.mjs Chu-space vantages: a view/redaction mechanism (points x contexts to FOUR) usable for per-node/per-audience projections of a settled section.
- settlementSignature: a map from closure ordinal/finality to coordination cost and transport, usable as a scheduler hint once the witness is derived rather than authored.

## Gaps and slop

- README claim 'merge principle (compute disagreement energy; glue uniquely or refuse with a quantity)' is not implemented in settle.mjs/history.mjs; disagreement energy and refusalNumber exist only in inference/complex.mjs and are only invoked from nuclei.obstructionsOf (when a cx is passed). relate() in settle.mjs is a plain evidence join that never refuses.
- src/README.md does not mention src/inference at all, though it holds most of the AI-relevant code. The README also lists modules (descent, cone, void, internal, fiber, topology, valuation-closure, etc.) that do not exist in src/ and are really elsewhere or aspirational.
- Two parallel closure engines: settle.mjs (rule-based cell closure) and inference/nuclei.mjs (FCA attribute nuclei with its own FOUR valuation map keyed by 'g m' strings). Bridged only in infer.mjs; settle's ledger has no free-energy accounting and nuclei has no site/transport. Duplication and an unresolved architecture seam.
- closureOrbit fires each rule at most once (the `fired` set). If a rule's antecedent evidence grows after it first fired, it does not re-fire, so for rules whose conclusion depends on the premise's evidence list (witness chains) the result may not be the true least fixed point; the claim of lfp relies on 'each rule has one derivation'. The hard bound 'one stage per rule' is a consequence of that guard, not a theorem about general closure.
- The settlement filtration cohomology (firstCohomology, gradedGap, nonScottFirings, closureInvariant) is vacuous (rank 0) for every settle() output because the orbit is always finite with no limit stages; it only does anything on hand-built transfinite filtrations. regime is always the finite/strict regime. Grandiose naming over trivial computation.
- cones() 'brim' is a constant (always ⊤) and 'vanish' = cells not told both ways; 'four cones' are lattice least/greatest readings, not light cones. The actual light cone is causalOrder, whose causality is stage-plus-shared-term adjacency, not true derivation dependency (witnesses would give the real one). causalOrder is O(n^3) with arrays and `includes` scans.
- settlementSignature reads a hand-authored `x-settlement-filtration` flag; the regime/transport is a lookup table, not derived from the action's actual closure.
- membrane denialOf is regex negation: a '-' prefix, 'no ', etc. would mis-negate legitimate claims such as '-5'; no scoping, quantification, or true NL semantics. Despite saying 'every faculty reads its membrane through this one telling', nothing enforces this.
- KnowledgeBase re-settles on every read (section(), cones(), readingAt() each call settle()), with no memoization, and is a mutable class in an otherwise value-oriented codebase.
- primitives.mjs signcraft.settle ignores user rules (only transportRules), so rule-driven settlement is not reachable from SEN.
- history.mjs is 623 lines of dense, global-mutable-state caching (module-level `reading`/`depending`, several WeakMaps) with no tests assessed here; subtle: order independence of mergeHistories is by deterministic Kahn-level sorting (array order is canonical per DAG) and semantic readings depend on ancestry, but the `extendsAll` shortcut and checkpoint-frontier logic in indexOf are intricate and unproven. The file's order-independence claim has no formal statement.
- Heavy legacy compat: import-sql-history.mjs, admitSqlFile, 'identifyWholeCheckpoint' (legacy checkpoint naming), 'LEGACY_FRONTIER' in content-history-store: migration debt interleaved with core logic.
- Compact no-whitespace code style in the store files (content-history-store, file-history-store, sql-history-store) differs from the rest, suggesting separate authorship passes; unit boundaries and typing are unclear.
- Theory claims without code: no tilings (Wang/aperiodic/sofic), no bead weaving, no substitution systems, no real Curry-Howard-Lambek term/proof objects, no sheaf restriction maps (the 'Laplacian' is over a plain weighted graph), no foam physics or multicellular dynamics. Generation is Gibbs sampling over a toy symbolic corpus; there is no scale demonstration, no learned representation beyond mined implications and a handful of conductances.
- disagreementEnergy recomputes the full Laplacian and uses a dense O(n^2) double loop on every call; spectralGap recomputes a Jacobi eigendecomposition every time (no caching), a scaling problem if used inside the Gibbs loop for large attribute sets.

## Attachment points

- Bind history to settle: make a revision's cells the seed valuation, and make a settlement an observation (settled cells + orbit id as a revision whose parents are the history heads). Since mergeHistories is a semilattice join and settle is monotone, 'settle(merge(a,b)) is invariant under merge order' is a testable theorem and gives coordination-free distributed settlement. Add a retry-on-CAS-failure loop (mergeHistories then re-publish) to content-history-store.
- Replace the stage+shared-term causal order with the true derivation-dependency order from rule witnesses (premise cells to derived cell), so past cone = the premises of a conclusion, future cone = its consequences. Light-cone semantics then coincide with proof dependency (Curry-Howard-style: derivation = program, cone = its dependency closure). The causalCone API stays the same.
- Make settlementAdmits a cheap verifier: store, per derived cell, the rule and premise addresses (a proof term / derivation DAG), and verify each step locally instead of replaying the whole orbit. This makes settlements into typed proof objects (CHL).
- Fuse the two engines: run inference/nuclei (sigma/delta, FCA, free-energy ledger) as a rule family inside closureOrbit (rules whose antecedent is an object's held attribute set and whose consequent is the DG/Galois closure), so the ledger and H-theorem check cover SignCell/SignGraph sites. Then 'cells G x M' = cells over the site.
- Promote the disagreement energy to a true sheaf Laplacian: use SignGraph's site restrictions as the coboundary (E = ||delta s||^2 over restriction maps), compute refusalNumber on a cover of overlapping fibers, and make 'glue uniquely or refuse with a quantity' the actual merge operation for relate() and mergeHistories (concurrent functional-predicate values produce a refusal number rather than a bare counterevidence list).
- Learn conductances (and per-edge rule weights) by gradient or Physarum updates from a settlement's flux; use continuationEnergy as the training objective and the learningCurve harness (held-out prediction) as the evaluation, to get a measurable 'logic-native language model'. Use this to compare against a baseline n-gram/transformer on RelConLang.
- Tile/bead layer: model an aperiodic tiling or bead pattern as a cell set over a grid site where adjacency rules are SignChain rules and Wang-tile matching is the glue condition (refusalNumber > 0 = a mismatched edge); settle = tile-completion to the least fixed point; the orbit stages and causalOrder provide the growth lightcone. A bead row is a finite stamped event sequence (firingEvent), and the two hands = for-side and against-side evidence. Sofic/substitution systems = a rule list whose settlement is the substitution closure.
- Use page.mjs Chu spaces for per-node projections (vantages = nodes/audiences) and for FCA: the Chu space of cells x vantages is a formal context; apply metrologic formal-context concept extraction to it to derive the concept lattice of what each vantage can see, and use it as the multiplexer view layer.
- Use settlementSignature as the scheduler hint: derive the witness (limitStage, nonScottLimitFiring) from the action's actual rules (cyclic/infinite closure analysis) rather than from the schema flag, so that the transport/coordination cost is computed.
- KnowledgeBase becomes a node's MAPE-K store: Monitor = observeHistory, Analyze = settle on the head, Plan = derive consequences (cones), Execute = emit effects with a revision recording the plan; replace the mutable TellingLog with a history value and memoize settles through historyDerivation (the frame rule gives incremental re-settle when only unrelated subjects changed).

