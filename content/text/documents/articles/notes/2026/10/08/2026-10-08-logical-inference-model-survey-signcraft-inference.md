---
title: "Logical inference model survey: signcraft-inference"
description: "What this area of the tree actually computes, its abstractions with their theoretical readings, capabilities a logical inference model can build on, gaps and slop, and attachment points."
date-created: 2026-10-08
kind: engineering-survey-note
keywords:
  - logical-inference-model
  - signstuff
  - survey
  - signcraft-inference
status: survey-read-only-not-adversarially-verified
produced-by: info-0d logical-inference-model survey workflow (Claude agents; Sonnet readers for code, Fable readers for house theory), read-only over the tree at 773ea6d6df4
---

# Logical inference model survey: signcraft-inference

## Summary

All paths are relative to the SignCraft root S = lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/lib/signstuff/signcraft. The "inference class" is about 2,200 lines of src/inference/*.mjs plus 9 thin JSON CLIs (scripts/inference/*.mjs, each built on json-command.mjs) and about 20 test files. It is not one model. It is five loosely coupled mechanisms that share only the Belnap FOUR reading type (computer-data-engineering `four`) and metrologic's formal-context module.

(1) Exact FCA/rule kernel (kernel, nuclei, complex, adapt, generate, evaluate, learn). It builds a formal context G x M, with an optional denial lane that doubles the attribute alphabet to M + negated M. It induces the Duquenne-Guigues basis by Ganter Next Closure (metrologic formal-context.mjs: dgBasis, then lawfulBasis, which keeps only implications whose premise has a non-empty extent, as a guard against ex falso). The valuation is a Map "g m" -> FOUR reading. Two knowledge-order closures are iterated to a fixed point: sigma (close the signed held set under the basis) and delta (Galois transfer along a realized profile). settle() keeps a free-energy ledger: flux = commits + mints + 2*jumps, F(seed) = sum of flux, and it throws on an H-theorem violation (a firing with zero flux, or flux with no firing). Contested cells are kept, not collapsed, and carry a refusal number sqrt(E/lambda_1) from a conductance-weighted graph Laplacian over attributes (complex.mjs, Jacobi eigendecomposition). Generation (generate.mjs) draws a move Gibbs-style from the enabled cone, with ΔF = alpha*opened - beta*closed + T*ΔE and a "witnessed-sample" record of the excluded mass. adapt.mjs updates edge conductance by Physarum dD = |Q|^mu - gamma*D, where Q is attribute-pair co-firing in the settle trace. runMachineAction in kernel.mjs is a pure reducer with actions tell, settle, questions and generate, and it takes an injected random number rather than an rng.

(2) Residuated network over FOUR (algebra, network). Matrices are {rows, cols, pos:Set("r c"), neg:Set("r c")}, which are two independent boolean lanes. compose is per-lane relational composition. residualLeft (A\B) and residualRight (B/W) are the exact adjoints, and training a layer is a meet of residuals (trainLayer). trainTwoLayer alternates the two adjoints, with supportCols/restrictRows making unwitnessed rows unknown instead of vacuous top. This is genuine relation-equation solving. It is not a neural network, and there are no learned embeddings.

(3) Rule inference (infer.mjs). It routes rules through SignCell/SignChain/SignGraph via ../settle.mjs (settleValuation) and returns a verdict in FOUR, a witness chain, a counter-witness chain, and a refusal number when both lanes hold. inferSettled is a second path through the kernel.

(4) Weighted rules (learn.mjs). induceWeightedImplications mines premises that are singletons or pairs, with support and confidence, and scores by noisy-OR. learningCurve and evaluateInduced hold out data and compare against a frequency baseline.

(5) Language surface (relconlang, speak, trace). relconlang is a hand-written recursive parser for the constructed language RelConLang, with hardcoded particle, verb-root and noun-root tables. It produces EAVT rows and then (s,P,o) cells. speak.mjs witnesses a model from those cells (predicate -> subject fiber, object fiber, count), forms FCA hole-concepts, and speaks "S ga P do O." by three independent Gibbs picks (predicate, subject, object) with concept-mate backoff at weight 0.5. comprehend() returns a cell or typed unsaturation questions. evaluateSaturation tests masked-object prediction over a 5-candidate pool. trace.mjs builds a context from EAVT rows through the eavt package.

What I ran, read-only: scripts/inference/*.mjs commands run via command.run on the fixtures. The induce fixture gave a 3-implication exact basis and 9 weighted rules. The train fixture (a grandparent relation over 4 rows) produced W1 and W2. The evaluate fixture has 11 pairs over 5 objects; with masking of 2 pairs per seed, 5 seeds gave kernel accuracy equal to the frequency baseline (0.5 / 1 / 0.5 / 1 ...). `node --test test/inference/` as a directory failed with a bare "test failed" in 34 ms (a runner invocation problem), so I did not confirm that the tests pass.

Net achievement: exact, inspectable FCA/relational inference with receipts, demonstrated on toy fixtures of 5 to 18 incidences and on the tiny RelConLang corpus. It has not been shown to beat a frequency baseline anywhere I could see. The theory prose (H-theorem, Lyapunov, sheaf defect, Lean cross-references) is far larger than the computation. The real content is closure operators, residuation, a Gibbs softmax over small enumerated candidate sets, and co-occurrence conductances.

Scaling limits:
- Relations are JS Sets of "r c" strings, and every split(" ") breaks on identifiers containing a space. The NUL-keyed incidence set in formal-context is safe, but the valuation Map keys on a space, which is fragile.
- dgBasis walks all closed sets in lectic order. The guard is 1 << min(|A|,20), so it is worst-case exponential in the attribute count, with each step an O(|G||A|) extent scan. This is the dominant limit. lawfulBasis then recomputes extent for every implication.
- settle() recomputes delta over all objects (an extent scan per object per step) and a knowledgeHeight over the full G x M every step. That is O(steps * |G|^2 * |M|). The enabled-moves/continuationEnergy loop calls closed(), which re-runs enabledMoves, and predictTop loops over every unheld attribute. This is a per-prediction cost of roughly |M| * basis-scan * |G|.
- The conductance Laplacian is dense n x n, and Jacobi runs 100 sweeps (O(n^3) each). Conductance is n^2/2 pairs. disagreementEnergy rebuilds the Laplacian on every call.
- adapt() iterates all attribute pairs, so it is O(|M|^2) per settle. It also copies the matrix once per updated edge in withConductance (D.map(...Float64Array.from)), which makes an update O(n^3).
- Memory: a valuation is a Map copied on every withReading (O(|V|) per tell, so O(n^2) to load a corpus by tell).
- Flat attributes only: no types, no embeddings, no sequence order. The language side models only SVO triples, with three independent picks and no cross-hole conditioning beyond the predicate.

## Abstractions

### Rel (FOUR relation matrix) + compose

- **File:** `signcraft/src/inference/algebra.mjs`
- **Computes:** makeRel(rows,cols,posPairs,negPairs) -> {rows,cols,pos:Set,neg:Set} with entries stored as the string "r c"; compose(A,B) is per-lane relational composition (hash-join on the middle index), i.e. (A⊗B)[r,c] = join_j meet(A[r,j],B[j,c]) in two independent boolean lanes. relLeq, meetRel and relEq are the knowledge order and meet. Cost is O(nnz_A + nnz_B + output).
- **Theory:** The matrix algebra of a quantale of relations, with FOUR realized as the lane product 2x2. This is faithful: composition is a genuine relational product. But the neg lane is an independent copy of the same boolean algebra, not Belnap interlaced conflation or negation, so the FOUR-ness is just a pair of Boolean matrices. There is no 'transfinite' value, and no cross-lane interaction.

### Residuation (residualLeft / residualRight / supportCols / restrictRows)

- **File:** `signcraft/src/inference/algebra.mjs`
- **Computes:** residualLeft(A,B)[j,c] holds iff for every row r with A[r,j], B[r,c] holds (the greatest W with A⊗W ≤ B). residualRight(B,W)[r,j] holds iff for every column c with W[j,c], B[r,c] holds (the greatest A with A⊗W ≤ B). Vacuous top when the support is empty; restrictRows zeroes rows outside supportCols(X) to ⊥.
- **Theory:** The two adjoints of composition in a residuated lattice (Galois connection for A⊗-). The code implements them correctly, per lane. The 'unwitnessed means unknown' repair is a heuristic that is not a theorem. SLOP: supportCols takes the union of pos and neg, but residualLeft's neg lane is vacuously true on every witnessed column when the input has no negative evidence (the train fixture shows W2.neg containing almost everything), so the neg lane carries 'counterexample everywhere' noise unless negative data is supplied.

### trainLayer / trainTwoLayer (training by alternating residuation)

- **File:** `signcraft/src/inference/network.mjs, algebra.mjs`
- **Computes:** trainLayer: W = meet over examples of residualLeft(Xi,Yi). trainTwoLayer(X,Y): W2=res(X,Y); W1=res(X,Y/W2); then iterate H=X⊗W1, W2=res(H,Y), Htarget=Y/W2, W1=res(X,Htarget) until both stop changing or maxIters (16). Returns {W1,W2,iters,converged}. forward() runs a stack with optional nucleus activations.
- **Theory:** Relational equation solving by the Galois connection; the greatest solution is guaranteed for one layer, and for two layers it is a monotone fixed-point iteration. It is exact (sound, A⊗W ≤ B), but the hidden layer is not identifiable and nothing is learned beyond the given X,Y. There is no generalization or smoothness. It is memorization-as-closure that is only as general as the input rows, and an unseen input column yields ⊥. It is limited to depth 2; no deeper trainer exists, although forward() is generic.

### nucleus() and attend()

- **File:** `signcraft/src/inference/algebra.mjs`
- **Computes:** nucleus(A,step,maxIters=64) closes a Rel under a user-supplied add-only step to a fixpoint (throws if not closed in 64 iterations). attend(Q,K) scores K's columns by pos/neg joint support on the Q-pos middle indices, flags contested columns, and sorts by pos-neg.
- **Theory:** The nucleus is extensive/monotone/idempotent by construction only if the step is add-only and monotone, which is not checked. 'Chu-style attention' is a co-occurrence count over a shared index, with no softmax, no learned projections, no Chu-space morphism structure. The name is grander than the computation.

### Formal context, Galois operators and Duquenne-Guigues basis

- **File:** `metrologic .../lib/metrologic/src/closure/formal-context.mjs (used by signcraft/src/inference/*)`
- **Computes:** makeContext(G,M,I,denials) with an optional doubled alphabet A = M + NEG*M; intent/extent are O(|G||A|) scans; closeAttrs is B''; impClosure runs a firePass to fixpoint via metrologic settlement; dgBasis is Ganter Next Closure over the lectic order (exponential in |A|, guard 1<<min(|A|,20)); lawfulBasis filters to implications with a non-empty premise extent.
- **Theory:** Correct FCA machinery, and the DG basis is the minimum canonical implication cover. Enumerates all closed sets in the worst case, which is exponential, so it does not scale to realistic vocabularies. The denial lane is standard attribute dichotomization; negated premises can appear in laws (penguin -> ¬flies). Intents are brute-force set scans with no bitsets and no incremental or concept-lattice maintenance.

### Valuation, sigma and delta nuclei, settle()

- **File:** `signcraft/src/inference/nuclei.mjs`
- **Computes:** A valuation is a Map "g m" -> FOUR reading. withReading(v,g,m,q) copies the Map and joins q (O(|v|) per tell). sigma: close each object's signed held set under the basis (witnesses record {cell,by,law,lane}). delta: Galois transfer along each object's profile when it is realized (non-empty extent). settle(ctx,v,opts) iterates delta then sigma to a fixed point (maxSteps 64), computes the ledger via stepLedger (commits, mints, jumps=⊥→⊤ worth 2), throws on an H-theorem violation or unwitnessed flux, and returns {v,basis,trace,steps,ledger:{initialDeficit,totalFlux,closes},obstructions}. obstructionsOf lists contested cells and a refusal number per contested object.
- **Theory:** Two knowledge-order closure operators (the comments say they are NOT the truth-order quartet of the Lean FiberAlgebra). The ledger identity F(seed) = sum of flux is trivially true for any monotone climb in a bounded height function, so the 'Lyapunov / H-theorem' check is a bookkeeping assertion, not a deep property. settlingDefect is an honest partial: the comment states that naturality (obligation L0) is open. Commutation σΔ = ΔσΔ is only tested numerically. obstructionsOf has dead code (`if (byObject.has(g) || true)`).

### Conductance complex and refusal number

- **File:** `signcraft/src/inference/complex.mjs`
- **Computes:** makeComplex(attributes) gives a dense symmetric n x n Float64 matrix D (initially 0). withConductance copies the matrix (O(n^2)) and sets D[i][j]. laplacian, disagreementEnergy (xᵀLx on a {-1,0,1} assignment), eigenvalues (cyclic Jacobi, up to 100 sweeps), spectralGap (smallest eigenvalue above 1e-9), refusalNumber = sqrt(E/λ₁) (∞ if λ₁=0, 0 if E<1e-12).
- **Theory:** A weighted-graph Laplacian quadratic form used as a 'sheaf disagreement energy', citing closure-cones Theorem 10.14. Mathematically it is a graph Dirichlet energy on a trivial (scalar) sheaf, and real sheaf cohomology is not computed. D starts at all zeros, so λ₁ = 0 and every refusal is Infinity until adaptation populates edges. It is O(n^3) per refusal call, so only usable for small vocabularies.

### Physarum conductance adaptation

- **File:** `signcraft/src/inference/adapt.mjs`
- **Computes:** fluxFromTrace(ctx,trace): for each step, group witnesses by object and count co-firing attribute pairs (key "a b" sorted). adapt(cx,flux,{mu=0.8,gamma=0.1}): for every attribute pair, D' = max(0, D + |Q|^mu - gamma*D); returns the updated complex, the list of changed edges, and unknownEdges. The result is stored in state.cx at 'settle' in runMachineAction.
- **Theory:** The Tero-Kobayashi-Nakagaki Physarum law dD/dt = |Q|^mu - gamma*D, discretized as one Euler step with unit dt. In this code Q is not a flow solved from a pressure field. It is a raw co-firing count, so there is no conservation law (Kirchhoff) and no network flow. It is an exponentially-decayed co-occurrence counter wearing a Physarum name. Cost is O(|M|^2) per call plus a matrix copy per updated edge (O(n^3) worst case).

### Enabled cone and Gibbs generation with continuation energy ΔF

- **File:** `signcraft/src/inference/generate.mjs`
- **Computes:** enabledMoves(ctx,basis,v,g): (1) unmet conclusions of basis implications whose premises g holds, and (2) 'realized continuations': attributes not held that some object bearing the whole held (+denied) profile also bears, annotated with a witness count. continuationEnergy = α*opened − β*closed + T*ΔE (defaults 1,1,0.5). opened = sum over cells changed by locally closing the row (σ then Δ on one object) of the deficit (2−kHeight, contested = 2). closed = max(0, |enabledMoves before| − |after|). ΔE = Σ_j D[m,j](1−2x_j). generate(): softmax weights exp(−ΔF/T) with injected rng, returning {move,dF,wit:{chosen,temperature,excludedMass,excluded},candidates}.
- **Theory:** A Boltzmann sampler over a combinatorially enumerated candidate set, with energy built from the machine's own closure operators. The 'sampling is priced' claim (excluded mass logged) is real and neat: every draw is auditable. But it is one-step, one-object, non-autoregressive: generation emits a single attribute to add. There is no sequence, no multi-token rollout, and no learned distribution. The ΔE term is zero until conductances are adapted. Cost per generate is O(|moves| * (basis-scan + 2*enabledMoves)), which is expensive.

### learn: DG induction, learning curve, weighted implications

- **File:** `signcraft/src/inference/learn.mjs`
- **Computes:** induceBasis(objects,attrs,pairs) -> {ctx,basis=lawfulBasis}. learningCurve: seeded Fisher-Yates split into test/pool/stream, then per round re-induces the basis from the known pairs, evaluates held-out accuracy (closure reachability first, then weighted-rule noisy-OR top, falling back to min-ΔF), and adapts conductances from the trace flux. induceWeightedImplications(pairs,{minSupport 2, minConfidence .55, maxRules 4000}) mines singleton and pair premises (all attribute pairs, O(|M|^2 * |G|)), and scoreWeighted combines the rules that fire by noisy-OR. learnedImplications lists the basis with its support. mulberry32 and shuffle are also the project's RNG.
- **Theory:** The 'raw learning' claim (no rules are given) is real: rule induction is association-rule mining plus FCA. The weighted layer is classical Apriori-style rule mining with noisy-OR, and it is essentially a Naive-Bayes-ish scorer. The exact DG basis is brittle (one counterexample deletes a rule), which is why the weighted layer exists; the two are never unified into a single probabilistic-FCA object. The 'learning curve' trains by re-induction from scratch each round, not by incremental update.

### evaluate: maskedIncidenceEval

- **File:** `signcraft/src/inference/evaluate.mjs`
- **Computes:** Mask a fraction (default 0.2) of incidences with an injected rng, rebuild ctx/basis from the rest, settle, then rank candidates by settle-reachability (reached -> counts as a hit for m automatically) else by ΔF versus a global attribute-frequency baseline. Returns hit counts and accuracies.
- **Theory:** A masked link-prediction benchmark. Flaw: 'reached' short-circuits kernelTop to m, so the metric counts any settle-derived m as a hit while the baseline gets a single guess; apples-to-oranges. On the 11-pair fixture, the kernel equals the baseline in all 5 seeds (n=2 masked each), so nothing statistically meaningful has been shown.

### infer.mjs (exact rule verdicts through SignCell/Chain/Graph)

- **File:** `signcraft/src/inference/infer.mjs`
- **Computes:** makeInference({attributes,rules}); infer(engine,{facts,denials,query,conductances}) builds a SignGraph site of cells (triple(subject 'signcraft.inference', predicate attribute)), translates rules into SignChain rules for the for-lane and the against-lane separately, runs ../settle.mjs settleValuation, and extracts derivation trees. Returns {verdict (FOUR), witness chain, counterWitness chain, refusal if both hold, questions 'would-settle' if neither}. inferSettled is a second route through the kernel's sigma/settle for a single object.
- **Theory:** This is the one place where SignCell (cell/triple/address), SignChain (rule) and SignGraph (site) are actually used by the inference class. It is forward-chaining Horn inference with provenance and a dual lane; the against-lane propagates rules identically to the for-lane (negation as a copy, not contraposition). Two engines (settleInference vs the kernel's settle) do the same job: duplication.

### runMachineAction (pure actor kernel)

- **File:** `signcraft/src/inference/kernel.mjs`
- **Computes:** makeMachineState({objects,attributes,incidencePairs,denialPairs}) builds {ctx,basis,cx,v,journal}, with incidence told 'potential' and denial told 'active'. runMachineAction(state,action) is a pure transition for tell, settle (settle, then adapt the complex from the flux, then append a receipt to the journal), questions, and generate (the caller injects random in [0,1)). It returns {state,effects:[],result}, with refusals as values.
- **Theory:** A deterministic event-sourced reducer with an append-only journal, an actor interface in effect. It is a clean seam for an agentic node loop: the state is replayable and frozen. effects is always empty, so there is no real effect system yet. The basis is built once at makeMachineState and is never re-induced when tell adds new incidences.

### RelConLang parser

- **File:** `signcraft/src/inference/relconlang.mjs`
- **Computes:** tokenize; parseLine parses leading reading particles (ta/na = for only, sha = both, mu = none) and force particles (ku/du/se/ha), then a hand-coded clause grammar: subject nominal (with info/role marks), verb root from a closed set of 12 roots with aspect suffix (-ai/-en/-um/-o), a dobj/ccomp, and a trailing lo/ke oblique chain. Output is EAVT rows (e,a,v,t,reading). cellsFromRows reduces each event to (s,P,o,reading,aspect). parseCorpus/cellCorpus/collectExpectFeatures run over corpus JSONL records.
- **Theory:** A closed-vocabulary toy grammar (14 noun roots, 4 pronouns, 12 verb roots hard-coded in Sets). It is a parser for a conlang the author controls, not a learned language model. It carries the conlang's stance-system (potential = told for) into FOUR readings, so utterance -> FOUR cell is the real Fregean-predication/Belnap idea. The upgrade path is to generate open-class vocabulary and compose clauses compositionally.

### speak / comprehend / hole concepts (semiotic language model)

- **File:** `signcraft/src/inference/speak.mjs`
- **Computes:** witnessCorpus(lines) -> a model {predicates: Map V -> {subjFiber, objFiber, count}, cells, vocabulary}. holeConcepts builds an FCA context whose objects are words and whose attributes are 'V subj' / 'V obj' / feature:tag, and gives each word's concept-mates (words sharing any attribute). speak(model,{T,rng,concepts}) does three gibbsPick draws: predicate with weight log(1+count), subject, then object, each from its fiber (weight +2 for-only, -2 against-only, +0.5 for concept-mates when the fiber has fewer than 3 entries), and emits 'S ga P do O.' with a per-choice receipt of probability and excluded mass. comprehend parses a text to a cell and returns typed 'unsaturated' questions on failure. evaluateSaturation(records,{maskFrac,seed,distractors}) compares per-predicate frequency, the witnessed fiber and the closure-backoff fiber on a 5-candidate pool.
- **Theory:** A bigram-style factorized generator: P and its two role fibers are drawn independently given P, which is a categorical SVO slot-filler (a hole-filling PCFG with fibers). 'Frege unsaturation = typed question' and 'concept-closure backoff' are good seeds. It is not conditional on context, has no discourse state, and fiber weights are only for/against stance, not learned scores. The 5-way pool evaluation is a weak benchmark; the baseline-vs-fiber gap is not shown here, and the comment records that 45% of the corpus is exact-duplicate facts.

### trace.mjs: EAVT rows to a formal context

- **File:** `signcraft/src/inference/trace.mjs`
- **Computes:** contextFromTrace(rows) takes entities, runs stratifyEavtEvidence per entity (saturate = Fix σ, transfer = Fix Δ, per the eavt package), makes attributes 'predicate=object', takes incidence from cell.value.pos and denial from cell.value.neg, and keeps the witnessed evidence. Returns {ctx,v,strata,witnesses}. The tests do not check it directly (trace.test.mjs is 40 lines).
- **Theory:** The bridge from the EAVT history/trace world into FCA. It keeps retraction and converse handling in eavt, not here, and attributes become the cross product predicate=object. It is the natural data ingress for everything above, and it is the only link between the SignCraft history layer and the FCA kernel.

### JSON CLI wrappers

- **File:** `signcraft/scripts/inference/*.mjs (derive-verdict, evaluate-corpus, evaluate-relconlang, generate-continuation, induce-implications, serve-derivation-offer, settle-valuation, train-residuated-network, json-command)`
- **Computes:** Each script is `jsonCommand({help,errorCode,execute})`: read one JSON request (file or stdin), validate, call exactly one src/inference function, answer {ok:true,result} or {ok:false,refusal:{code,message}}. They have --help and run through node. Fixtures in test/inference/fixtures/{evaluate,generate,induce,package-graph,settle,train,verdict}.json.
- **Theory:** Thin, stateless command declarations (no logic of their own, consistent with the layering rule). serve-derivation-offer is the only one touching the networking/systems layer (it offers a derivation as a service) and I did not read it in depth. These are the existing agent-callable tool surface of the inference class.

### Test suite for the class

- **File:** `signcraft/test/inference/*.test.mjs`
- **Computes:** About 20 files, roughly 1,700 lines: kernel (231 lines), network (179), inference (115), algebra (112), speak (120), relconlang (129), energy (94), commutation (61), denial (69), learn (69) and others. Many assert numerics such as σΔ commutation and the ledger closes. The relconlang tests read the corpus from an absolute path under computer-language-systems-engineering-services-section/apps/relation-language-corpus/corpus. run-command.mjs is a test helper.
- **Theory:** The tests are the specification of the claimed laws (ledger closes, H-theorem, adjunction A⊗W ≤ B, denial isolation). Per the repo's instructions, green is not success. Nearly all use hand-built toy contexts of fewer than 20 incidences. I could not confirm that the suite passes: invoking the directory with `node --test test/inference/` returned one opaque failure in 34 ms, which is an invocation problem, not a verdict.

## Capabilities a logical inference model can build on

- Lawful, auditable closure engine: sigma/delta settlement with a per-step flux ledger and witnesses (nuclei.mjs settle). Every derived cell has a witness {cell,by,law,lane}. This is a ready-made provenance and verification layer for any generative model's output.
- Exact relational backward pass: residualLeft and residualRight are closed-form adjoints, so a layer can be fit in one pass, deep targets can be pulled back through a known layer, and training is a monotone meet (no epochs). Usable as the 'attention/FFN' of a logical model, or as a constraint-satisfaction head.
- Paraconsistent FOUR reading with explicit contested cells and a quantified refusal number; conflict is data, not an exception. Gives a native uncertainty and contradiction signal that a transformer lacks.
- Duquenne-Guigues basis induction from incidence (induceBasis) plus a weighted soft rule miner (induceWeightedImplications) provides interpretable knowledge extraction with quotable rules, 'compiled knowledge' for retrieval and reasoning.
- Gibbs generation with a priced ledger (the wit record: chosen, temperature, excludedMass, excluded list); an auditable sampler at temperature T, and a template for a verifiable decoding step that always logs what it did not say.
- Energy-based move scoring ΔF (opened - closed + T*ΔE) is a reusable objective for planning and for next-fact selection inside the enabled cone, with a hook for learned conductance.
- Pure actor reducer runMachineAction (tell/settle/questions/generate) with a replayable journal, a seam for MAPE-K loops, agent nodes and effect handlers.
- RelConLang parser and speak/comprehend: a closed, regular conlang whose utterances compile to FOUR-valued (s,P,o) cells, i.e. a controlled sandbox to prototype a language-model objective with exact ground truth.
- JSON CLI commands (induce, train, evaluate, generate, derive, settle) already form a tool-callable API a larger agent can use.

## Gaps and slop

- SCALING: Relations and valuations are Sets and Maps of "r c" strings (algebra.mjs), split on a single space on every read. Any identifier with a space silently corrupts. No interning, no integer ids, no bitsets, no sparse-matrix formats, no streaming. A matrix with 10^6 nonzeros is 10^6 string objects.
- SCALING (worst): dgBasis (metrologic formal-context.mjs) enumerates the closed sets in lectic order; it is exponential in |A| (guard 1<<min(|A|,20), and at most 2^20 outer iterations), each iteration doing O(|G||A|) extent scans. Vocabularies beyond roughly 20 attributes cannot be induced exactly. Doubling the alphabet for denials squares the problem. lawfulBasis then recomputes extent per implication.
- settle() recomputes delta (extent over all G for every object) and knowledgeHeight over all G x M on every step; settle is O(steps * |G|^2 * |M|). There is no incremental or semi-naive evaluation and no worklist.
- withReading copies the whole Map per tell (O(|v|)), so loading n incidences is O(n^2). The 'value, not mutation' discipline is paid for with quadratic cost; persistent maps are needed.
- complex.mjs is a dense n x n Laplacian with Jacobi eigendecomposition (O(n^3) per call, up to 100 sweeps); withConductance copies the matrix per edge update, and adapt() can call it O(n^2) times (O(n^4) total). D starts at zero, so refusalNumber returns Infinity (spectral gap 0) before any adaptation and ΔE contributes nothing.
- Training depth is 2. trainTwoLayer is the only trainer; forward() supports arbitrary depth, but there is no multi-layer residual back-propagation. The hidden layer is whatever the right-adjoint gives, and the nucleus activation is never used in training. The neg lane of residuals is vacuous-top whenever the input has no negative evidence, so output 'against' readings are noise unless negative data is given. restrictRows only solves the unwitnessed-row problem on the input side.
- No generalization mechanism in the exact path: unseen columns give ⊥, the DG basis is brittle (one counterexample kills a rule), and the soft path is Apriori plus noisy-OR over singleton/pair premises (not a trained model). There is no embedding, no similarity metric, no distributed representation, no differentiable or soft relaxation of the residuated layer, and no probabilistic semantics tying FOUR to weights.
- Evidence of capability is thin. The fixtures hold at most 18 incidences; the evaluate fixture masks 2 pairs per seed and ties the frequency baseline in the 5 seeds I ran; the metric short-circuits 'reached' to a hit. The README-level claims (language model, new class of AI) are not backed by any benchmark at scale. The RelConLang corpus is closed-vocabulary and 45% duplicated, per the code comment in speak.mjs.
- Generation is single-step attribute continuation within one object's cone (generate.mjs) or a three-slot independent SVO draw (speak.mjs). There is no autoregressive sequence, no context beyond the object's row, and no multi-sentence discourse; the 'Gibbs' draw is an independent categorical softmax, not Gibbs sampling across coupled variables.
- Grandiose naming over trivial computation: 'Physarum' (co-occurrence counter with exponential decay, no flow solve, no Kirchhoff); 'Chu-style attention' (attend() = overlap counts); 'sheaf / refusal number' (graph Dirichlet energy on a scalar sheaf, without any restriction maps); 'free-energy / Lyapunov / H-theorem' (a bookkeeping identity of a monotone height function, asserted as a runtime throw); 'nucleus as activation' (unchecked add-only step).
- Duplication: two inference engines (infer.mjs via ../settle.mjs and the kernel nuclei.mjs settle with inferSettled); two shufflers (learn.mjs shuffle and speak.mjs shuffledFY); two weight systems for hole-filling (stanceWeight vs ΔF); two evaluation harnesses (evaluate.mjs vs learn.mjs evaluateInduced vs speak.mjs evaluateSaturation) with incomparable metrics; relation 'mu' (zero reading) and the empty reading are not identified.
- Integration gap with the SignStuff stack: only infer.mjs touches SignCell (cell, triple, address), SignChain (rule) and SignGraph (site). The kernel, algebra, network, learn, generate, speak and relconlang all run on raw strings and plain Maps, not on content-addressed SignCells or SignChain proofs. Nothing in the inference class is a CHL object (no proof terms, no typing); 'witness' is a record, not a term. The tile-coloring, light-cone and bead notions have no representation here.
- No light-cone / causal structure: the order of derivation is a fixpoint iteration; the only temporal notion is the EAVT row index 't'. No past/future cones as premises/consequences beyond the Galois extent/intent.
- Dead or loose code: obstructionsOf has `if (byObject.has(g) || true)`; kernel.mjs imports unused symbols (closeAttrs in infer, impClosure in learn); runMachineAction never re-induces the basis after `tell`, so the compiled knowledge is frozen at construction; mulberry32 is imported from learn.mjs by generate/evaluate callers, which is a dependency inversion.
- Hard-coded absolute paths in tests (the relconlang test reads the corpus from a /home/emsenn/... path) and run-command.mjs; the test directory could not be run as a unit via `node --test test/inference/` in my one invocation (an opaque failure, not a verdict); per-file results were not checked.

## Attachment points

- LANGUAGE MODEL PATH A (cheapest, weeks): replace speak.mjs's three independent categorical draws with an autoregressive loop on top of the enabled cone. Treat a token sequence as an object, and 'next token' as the enabled move; make hole concepts a context over (n-gram window, next token); use the DG basis plus weighted rules as the 'grammar' and ΔF as the logit; keep the wit ledger for every token. This turns the existing SignCraft generate/speak pair into a verifiable n-gram-plus-FCA decoder.
- LANGUAGE MODEL PATH B (the real prize): make the residuated layer the model. Represent token/context features as sparse FOUR relations (rows = positions or contexts, cols = attributes), stack layers with nucleus activations, train each layer by one residuation against the data (exact), and add a soft relaxation (fuzzy/min-plus or probabilistic lane weights: pos/neg as two [0,1] lanes with residuated t-norm implication) so that gradient-free residuation and gradient fine-tuning coexist. The FOUR lanes give you paraconsistent 'both' states for free. Output logits = pos-lane minus neg-lane with refusal as an uncertainty head.
- Replace string-key Sets with integer-interned CSR/bitset relations (BigInt or Uint32Array bitsets on columns) so compose/residual become bitwise AND/OR; this is the single change that moves the class from toy to millions of nonzeros. Same for valuation (typed arrays of 2-bit FOUR cells; kHeight is popcount).
- Replace exponential dgBasis with incremental/bounded induction: AddIntent / in-close concept lattices on a sparse context, or stem-base on a sampled context with a confidence floor (the weighted miner already does a soft version). Learn bases per fiber (sheaf stalk) rather than for the whole context to keep premises local.
- Wire the CHL layer: make each fired implication a SignChain rule/proof term and each derived cell a SignCell with an address, so the chain of settle() witnesses becomes a normalizable proof object. Then 'generation = proof search in the enabled cone' and 'training = residuation on proof terms'; nucleus sigma = cut-elimination/saturation, delta = Galois transfer = functorial reindexing between contexts.
- Light cones: define the enabled cone formally as the causal future of a profile in the concept lattice (concepts below a given intent), and the premise cone as its past; use extent/intent on a context whose objects are token positions (with temporal order as a partial order on G) so that the conditioning window is a past cone and the candidate set a future cone. Bound the ΔF scan to the cone, which is also the locality the spec asks for.
- Tile coloring / sofic shifts: encode the RelConLang grammar (and later generated vocabularies) as a Wang tile set or sofic shift whose edge colors are the particles/roles; speak() then becomes constraint-respecting tiling (the enabled cone = tiles whose edge colors match the existing boundary). Aperiodic substitution rules give a generator with long-range structure that the independent SVO draw lacks. The DG basis is the set of forbidden-pattern constraints.
- Beads / foam physics: the residual-weight matrix and conductance matrix D can be unified. Treat D as a bead-adjacency/conductance field on the attribute graph and run an actual Physarum flow solve (pressure from the Laplacian, Q = D*(pi - pj)) instead of co-occurrence counts, then use ΔE as a foam surface-tension term; cells (objects) as bubbles whose attribute membranes are the edges, and T as a thermal bath. This turns adapt.mjs and the Gibbs generator into the actual 'abiotic organic' dynamics the README asks for.
- Evaluation harness: build one benchmark (held-out next-fact/next-token on RelConLang plus a real text corpus) with a common candidate set, report calibration (excludedMass vs hit rate), and compare against n-gram and a small transformer. Replace the 'reached counts as hit' short-circuit; use ≥ 5 seeds and report per-seed values, as speak.mjs's evaluateSaturationAcrossSeeds already does.
- Agent loop: runMachineAction is a ready MAPE-K node (Monitor = tell, Analyze = settle, Plan = questions/generate, Execute = effects, which are still empty). Fill `effects` with typed SignCraft effect descriptors and persist `journal` in SignCraft history, so a node's learned basis, conductances and wit ledger become content-addressed state that other nodes can pull (SignGraph transport).
- Training signal for the whole stack: the settle ledger deficit F (initialDeficit) is a natural per-example loss ('how much evidence the closure had to add'); the contested-cell count / refusal is a per-example uncertainty. Train by minimizing expected F on held-out masked incidence, using ΔF-sampled negatives.

