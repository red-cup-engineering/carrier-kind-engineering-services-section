---
title: "Logical inference model survey: benchmarks and the empirical program"
description: "Complete findings of the benchmarks reader: benchmarks and the empirical program."
date-created: 2026-10-08
kind: engineering-survey-note
keywords:
  - logical-inference-model
  - survey
  - benchmarks
status: survey-read-only-not-adversarially-verified
produced-by: info-0d logical-inference-model survey workflow (Claude agents; Sonnet readers for code, Fable readers for house theory), read-only over the tree at 773ea6d6df4
---

# Round 2 / benchmarks: the empirical program for a predication-algebra AI

Engine under test: FOUR-valued FCA + Lambek residuation + Chu morphisms + settlement closure, exact learning, no gradients (see predication-chu-spine.md). Learning = (1) harvest cells (point, state, charge in FOUR) from training data, (2) close under derivation (settlement), (3) read types/rules off the residuals of the learned concept lattice (B\A = {w : B.w subset A}, A/B dual), (4) answer by derivation/parse = proof term.

## 0. Provenance and honesty of this document

Web search in this session was low-yield (search tool returned papers' titles/abstract-level snippets, a PDF fetch came back binary). What was CONFIRMED from search results this session:
- CFQ: 239,357 pairs; MCD1 split 95,743 train / 11,968 dev / 11,968 test; 49,320 question patterns, 34,921 SPARQL patterns; license CC-BY(-4.0) per GitHub README + HF card (TFDS says "no known license"). Grounded Graph Decoding (Gai et al. 2021, arXiv 2111.03642) ~98.6 MCD1, 67.9 MCD2, 77.4 MCD3, mean 81.3 (third-party aggregator figures).
- ProofWriter/RuleTaker: ~480k train / 76k dev / 150k test (secondary source). PRover (arXiv 2010.02830): proofs 87% overall, 65% at depth 5. ProofWriter (arXiv 2012.13048) T5-11B: trained to depth 3, tested depth 5: ~72.9% CWA / ~93.7% OWA answer accuracy; fully trained ~99%. FaiRR (arXiv 2203.10261): +7.5% proof accuracy over ProofWriter "All", -3% vs ProofWriter "Iter" in D3->D5. Data zip hosted at aristo-data-public (S3). License NOT confirmed by search (HF mirrors say MIT or CC-BY-4.0); believe AI2 release is CC BY 4.0, VERIFY.
- SCAN/COGS: search confirmed only that vanilla Transformers get ~0% on SCAN length split (COGS paper: LSTM ~14%) and ~0% on COGS structural generalization splits (arXiv 2010.05465); Csordas et al. 2021 (arXiv 2108.12284) "simple tricks" improve; neuro-symbolic/meta-learning approaches reach (near-)perfect on SCAN/COGS/CFQ (cxgsnlp 2025 workshop paper); a blog claim of 98.7% SCAN length for "RewriteNets" is UNVERIFIED.
- Omphalos: Clark 2007, Machine Learning 66:93-110, winning entry = positive-data-only learner (substitutability + information-theoretic constituent likelihood + frequency), NTS grammar class. Tenjinno (ICGI 2006; Starkie, van Zaanen, Estival) = learning finite-state transducers / MT on artificial data. PAutomaC (2012; Verwer, Eyraud, de la Higuera; MLJ 96:129-154), SPiCe (2016, spice.lis-lab.fr; 15 problems, top-5 next-symbol ranking; 82 registered, 26 active; winner team 'shib'; spectral methods strong).
- CLUTRR: arXiv 1908.06177 (Sinha et al. 2019, EMNLP). Epistemic GNN follow-up arXiv 2407.17396. Exact baseline tables NOT retrieved.

Everything else (license strings marked VERIFY, numbers marked [mem]) is from the author's memory of the literature and must be re-checked against the primary paper before it goes in any slide. Numbers marked [mem] are directional, not citable. Rule: before publishing a result, re-fetch the baseline from the primary paper's table.

Codebase honesty: nothing here has been run. The engine is early-alpha code; "exact residuation learning" is a PROGRAM, not an existing module. Only algebra.mjs `compose`/converse and the Lean statements (FCALambekCircle, LinearLogicChu, LightCone, FregeanFourChu) exist; the Wurm/Clark closing edge is still "documented-boundary". Benchmarks below are ordered so the first ones need the least new machinery.

## 1. What a fair claim looks like (read first)

Three kinds of win, in descending credibility:
1. Embarrass: transformers trained from scratch on the benchmark's train split fail by a wide margin (SCAN length/jump, COGS structural, Chomsky-hierarchy length generalization, CLUTRR long chains, ProofWriter unseen depth) and our engine gets ~100% with orders of magnitude fewer examples and a proof object per answer.
2. Match with explanation: matches strong neuro-symbolic baselines (SCAN is solved by symbolic methods since ~2020: Chen et al. 2020 NSSM, Nye et al. 2020 [mem]) while LEARNING the grammar from the benchmark's own training pairs with no hand-coded rules, and emitting a checkable derivation.
3. New capability: FOUR-valued behaviour (contradiction-tolerant QA, monotone continual learning, settlement ledger) where no standard benchmark exists; we must build the benchmark (derived from ProofWriter/SCAN/CLUTRR with injected conflicts) and say so plainly.

Do NOT claim: beating GPT-class LLMs with prompting/CoT on these (they reach 90%+ on many with scale), beating symbolic SOTA on SCAN, or anything on open-domain NLU. The claim is "exact, tiny, explainable, monotone", not "bigger".

Leak guards (mandatory): induction reads only the benchmark's train file; content-address (hash) every test input and assert zero intersection with train cells; no hand-authored lexicon/grammar in the engine for these runs (the "Lambek lexicon" is the OUTPUT); fix seeds for any data sampling; report a hand-coded-grammar ablation separately.

## 2. Cross-cutting metric protocol

For every benchmark report:
- Task metric (exact match / accuracy / NDCG@5 / perplexity) per split, mean and per-seed spread for subsampled training.
- Data-efficiency curve: accuracy vs number of training examples (log-spaced 10, 30, 100, 300, 1k, 3k, 10k, all).
- Proof validity: fraction of answers whose derivation (Lambek proof term / Chu morphism chain) re-checks independently (verifier is a separate tiny checker; this is the "database-proof executing" claim).
- Cognitive EROEI k (definition below), per answer and per benchmark.
- Baselines: (a) vanilla small Transformer trained from scratch on the same train split, run locally with fixed budget (the apples-to-apples one; ~10-50M params, CPU/1 GPU feasible); (b) published numbers (table below); (c) trivial/majority/lookup baseline.

### 2.1 Cognitive EROEI, operationalized (the spine says k = (obstructions discharged + future inferences enabled) / (settlement work + erasure bits))

Counters the engine must expose (all integer counts, deterministic):
- W_settle = number of closure steps: each application of a derivation operator (A -> A') or relation compose/converse/meet in algebra.mjs counts 1; each cell-read counts 1. Report both; headline uses compose+derive count.
- B_erase = Landauer bits: every identification (merge of two concepts / clarification collapse / reduction to a biextensional quotient / accepting a substitutability assumption) logs ceil(log2(#candidate merges considered)) bits; every retraction or against-lane override logs bits equal to the cells it demotes. Floor energy = B_erase * k_B T ln2 (report only as a number, no claim of measured joules).
- D_disch = obstructions discharged = test queries answered correctly with a re-checked proof + contested cells (value TOP) resolved by a settlement.
- F_enab = future inferences enabled = |closure after step| - |closure before step| counted in newly derivable (point,state) incidences, capped to avoid blow-up (count only incidences in the finite test universe, so it is measurable).
- k = (D_disch + F_enab) / (W_settle + B_erase). k > 1 = self-funding. Rumination detector: a settlement loop with nonzero H1 cycle and k < 1 over a window.
Per-answer view: "settlement work per correct answer" = W_settle / correct_answers (the lead's phrasing). The headline comparison: transformer baseline's multiply-accumulate count per correct answer (inference) and total training MACs per point of accuracy. Be explicit that the units differ (symbolic ops vs FLOPs); report both raw and per-benchmark ratios, never a single "X times more efficient" without the unit note.

### 2.2 FOUR as an ablation axis

Every benchmark run in two modes: (i) Chu over 2 (plain FCA, positive evidence only, like Clark's DLG), (ii) Chu over FOUR (against-lane used when the data supplies negative signal: corrections, unsatisfiable proofs, ungrammatical items). The honest finding may be "FOUR gives nothing on clean benchmarks"; it earns its keep on sections 4.3, 4.9 and continual learning.

## 3. Ranking by expected demo impact

Impact = (how loudly transformers fail) x (how exactly we can win) x (how little new machinery) x (how recognisable the benchmark is).

| rank | benchmark | why | new machinery needed |
|---|---|---|---|
| 1 | SCAN (length, addprim_jump, around-right) + COGS structural splits | Iconic failure of transformers; tiny; exact tasks; the lexicon/grammar is a Lambek lexicon the engine induces | induction of Lambek lexicon + semantic term composition |
| 2 | CLUTRR (kinship relation composition) | Directly algebra.mjs compose; learn a relation-algebra composition table from short chains, generalize to long by associativity; transformers/GNNs degrade with chain length | relation-composition learning; no NLU parser needed if using the structured (graph) variant first |
| 3 | ProofWriter/RuleTaker with proofs (+ our injected-contradiction variant "ProofWriter-BOTH") | Deduction with proofs is the engine's native product; OWA gives True/False/Unknown, FOUR adds Both: unique capability | rule/fact parsing from the templated NL; forward-chaining settlement; contradiction injection harness |
| 4 | Chomsky-hierarchy length-generalization suite (Deletang et al. 2022) | Generated offline, 15 tasks; transformers ~chance beyond training length on regular/CF tasks (parity, modular arithmetic, Dyck, reverse, duplicate...); exact automata/PDA learners get 100% | learn finite automata/pushdown from positive+negative strings via residuals (Myhill-Nerode = FCA of strings x contexts) |
| 5 | Grammar induction from positive data: Omphalos, Tenjinno, PAutomaC, SPiCe | The literal syntactic concept lattice program (Clark); direct tie to spine; real historical SOTA | DLG-style learner; probabilistic variant (counts as weights, not a FOUR charge) needed for PAutomaC/SPiCe |
| 6 | BLiMP / BabyLM (strict-small 10M words) | Data-efficiency headline; zero-shot minimal-pair grammaticality; stretch goal | full natural-language grammar induction; likely loses to LMs on coverage |
| 7 | CFQ (MCD splits) | Well-known; but 240k SPARQL, big, Freebase semantics, heavy engineering; T5 gets ~40% mean, symbolic/LLM-prompting 80-95% | question -> SPARQL grammar induction; ontology |
| 8 | Continual learning (streamed versions of 1-4; text-classification CL as a foil) | Monotone append-only cells => zero forgetting by construction; must be demonstrated, not asserted | stream harness, backward/forward transfer measurement |
| 9 | bAbI 20 tasks | Solved by 2016-2020 models (>99% w/ 10k); only useful as 1k-example data-efficiency and as a sanity table | minimal |

Suggested first demo (week-scale): SCAN all splits + Chomsky-suite regular tasks + CLUTRR-structured. Second: COGS + ProofWriter-BOTH. Third: Omphalos/SPiCe.

## 4. Per-benchmark specifications

### 4.1 SCAN (Lake & Baroni 2018, ICML)
- URL: https://github.com/brendenlake/SCAN ; paper arXiv 1711.00350. License: BSD-3-Clause [mem, VERIFY]. Plain text files.
- Size: ~20,910 command/action pairs in the "simple" random split; command vocabulary ~13 words (walk, look, run, jump, turn, left, right, around, opposite, twice, thrice, and, after), 6 action tokens (I_WALK, I_LOOK, I_RUN, I_JUMP, I_TURN_LEFT, I_TURN_RIGHT). Splits: simple, length (train: output length <=22; test: longer, up to 48), add_prim (jump: only 'jump' alone in train, test uses it in compositions; turn_left), template splits (around-right, opposite-right, right). Files like tasks_train_length.txt, tasks_test_length.txt.
- Format per line: `IN: jump opposite left after walk twice OUT: I_TURN_LEFT I_TURN_LEFT I_JUMP I_WALK I_WALK`.
- Metric: sequence exact match accuracy per split.
- Published baselines [mem]: Lake & Baroni 2018 seq2seq best-overall: simple ~99.8%, length ~13.8%, add_prim jump ~1.2%, turn_left ~90%. Vanilla Transformers on length ~0-20% (Csordas 2021 improved tricks reduce failure but length remains hard) [mem]. Symbolic/neuro-symbolic (NSSM Chen et al. 2020; Nye et al. 2020; Liu et al. 2020; Gordon et al. 2020 equivariant; Lake 2019 meta-seq2seq) ~100% on all splits [mem]. Unverified 98.7% length (RewriteNets blog).
- Our representation: points = word strings, states = contexts. For the input side build the syntactic concept lattice over command substrings; for the output side the concept lattice over action strings; a Chu morphism (f forward on commands -> action strings, g backward on contexts) is the semantic interpretation: learned as a functor from Lambek types of the command grammar to types of action sequences. 'twice' : (S\S) with interpretation w -> w w; 'after': swap-and-concatenate; 'opposite left' = turn-left x2 then verb; 'around' = 4x(turn, verb). Each training pair is a SignCell (cell = charged incidence command x action-context). Residual B\A of the lattice gives the type of modifiers; the interpretation of a modifier is learned as the unique morphism consistent with all cells (exact residuation: solve f(w.m) = m_sem(f(w)) by intersection over training instances; no search needed if consistent). add_prim split: jump appears alone -> type of verb class inferred by substitutability with walk (same contexts in 'walk twice' etc.) which is exactly the distributional equivalence = FCA concept sharing intent. This is the key demo: one-shot primitive generalization by concept membership, not by weights.
- Key measurable: accuracy 100% on all splits; number of training lines needed (e.g., minimal covering set maybe < 100); proof = derivation tree.
- EROEI: W_settle = compose/derive ops to parse + interpret one command (O(n^3) chart cells, n<=9 words); B_erase = merges of verbs into the verb concept (one per primitive, ~4 bits each) + modifier typings; D_disch = correct outputs; F_enab = every newly-typed word enables its whole product of contexts (exponential in unseen combos: a single learned verb unlocks all commands containing it). Expect k >> 1 on add_prim: one merge bit enables hundreds of test commands. Transformer comparator: MACs per correct output.
- Pitfall: SCAN is a toy synthetic grammar; reviewers know symbolic solves it. Differentiate by induction-from-pairs + proofs + sample efficiency + zero hand-coding.

### 4.2 COGS (Kim & Linzen 2020, EMNLP)
- URL: https://github.com/najoungkim/COGS ; arXiv 2010.05465. License MIT [mem, VERIFY]. TSV files: data/train.tsv (24,155), train_100.tsv (train + 100 exposures per primitive), dev.tsv (3,000), test.tsv (3,000), gen.tsv (21,000 generalization examples across 21 types, lexical and structural).
- Format: `sentence \t logical form \t generalization-type`, e.g. `A cat smiled . \t cat ( x _ 1 ) AND smile . agent ( x _ 2 , x _ 1 )`. (Reification in the neo-Davidsonian style; this is already a predication algebra.)
- Metric: exact-match accuracy overall and per generalization type (lexical: novel subject->object role, novel verb frames; structural: PP recursion depth, CP recursion depth, object PP -> subject PP).
- Baselines [mem, directional]: Kim & Linzen 2020: Transformer ~35% overall on gen, LSTM ~16-32%; structural PP/CP recursion ~0%; lexical ~80%+. Csordas et al. 2021 tricks: ~81% overall; AM-parser (Weissenhorn et al. 2022) and other structure-aware symbolic models: high 90s overall; LLM prompting works for lexical but struggles structurally unless decomposed. Confirmed by search: structural splits ~0% for vanilla Transformers.
- Our representation: the logical form IS a predication cell set. Input sentence = point; output = set of SignCells (subject/predicate/object with variable indices). Learn a Lambek lexicon whose semantic side maps to cells; recursion (PP/CP depth) is handled because the chart is a typed bead weave with no depth limit: type np\s etc., and the semantic composition is a Curry-Howard lambda term (CHL). Lexical generalization (a word seen only as subject, tested as object) = concept membership + type, free in a lattice (the word's intent is its context set; contexts with the object slot transfer through the shared type).
- EROEI: W_settle per sentence = chart ops; B_erase = type merges; F_enab per learned lexical type = all novel positions. The structural splits are where k becomes visibly >1 for us and the transformer's analogue is undefined.
- Pitfall: variable-naming conventions and ordering of conjuncts in COGS LFs require a canonicalizer; compare as sets of cells modulo variable renaming (graph isomorphism), and also report strict string match to compare with literature.

### 4.3 ProofWriter / RuleTaker (deduction with proofs) and ProofWriter-BOTH (paraconsistent extension)
- URL: https://allenai.org/data/proofwriter (zip: proofwriter-dataset-V2020.12.3.zip at aristo-data-public S3) ; RuleTaker arXiv 2002.05867 (Clark, Tafjord, Richardson 2020, IJCAI); ProofWriter arXiv 2012.13048. License CC BY 4.0 [mem, VERIFY]. JSONL files per depth.
- Size: ~500k questions (480k train / 76k dev / 150k test) over depth 0,1,2,3,3ext,5 splits; closed-world (CWA, answers True/False via negation-as-failure) and open-world (OWA, True/False/Unknown) variants; also ParaRules (paraphrased) and hand-authored Birds-Electricity test sets. Each record: theory (facts + rules, templated English with 'not'), question statements, answers, proofs (including intermediate inference sets).
- Format: `triples`/`rules` plus NL `theory`; `question`, `answer`, `proofs` strings like `[(triple1 triple2) -> rule3]`.
- Metric: answer accuracy per depth; proof accuracy (exact full-proof match, as in PRover/ProofWriter); depth generalization (train <=3, test 5); robustness on ParaRules; for our extension, 4-way accuracy.
- Baselines: RoBERTa-large RuleTaker ~98-99% answer on depth<=5 trained on all [mem]; T5-11B ProofWriter ~99% fully trained; D3->D5 OWA ~93.7% / CWA ~72.9% (search); PRover proofs 87% overall, 65% depth 5 (search); FaiRR close to ProofWriter-Iter on D5 (search). Open LLMs prompting: lower, decreasing with depth [mem].
- Our representation: facts are cells (subject, predicate, object) with charge t (asserted) or f (negated fact); rules (if A and B then C) are Chu/Lambek implications = residuals A.B -> C; settlement = forward chaining closure; proof = derivation trace = the SignChain. Negation: CWA = unknown collapses to f at the closure; OWA keeps unknown = bottom. We get 100% on answer + 100% proof validity if the templated English parse is learned (the grammar is tiny and templated). Parsing is itself a grammar-induction mini-task (use 4.5 machinery) - report parse-learned vs hand-coded separately.
- ProofWriter-BOTH (we BUILD this): take OWA dev/test theories, inject a fact contradicting a derived conclusion at known depth d (or duplicate a rule with opposite head), and relabel the gold answer under Belnap semantics (value BOTH for atoms whose support and refutation both derive; True/False elsewhere unchanged; atoms not downstream of the conflict must remain correct = the paraconsistency test: explosion must NOT occur). Metrics: (a) 4-way accuracy, (b) non-explosion rate = fraction of unrelated queries still answered correctly (classical logic and naive LLM chains give everything-true), (c) conflict localization (cells flagged TOP vs gold minimal conflict set), (d) minimal-repair proposals priced by Landauer bits. Baselines: transformers trained on 3-way data cannot output BOTH; compare against a T5 fine-tuned on our 4-way data and an LLM zero-shot. This is our one benchmark where FOUR is the point.
- EROEI: W_settle = forward-chaining steps per query (counts compose ops); B_erase = 0 on consistent theories, > 0 when conflict resolved by retraction; D_disch = answered queries; F_enab = derived facts available for later queries (shared closure across the questions that share a theory - ProofWriter has multiple questions per theory, so amortization is real and measurable). k should rise with questions-per-theory.
- Pitfall: a transformer's accuracy is already ~99%; win is proofs, depth generalization, and BOTH. Don't oversell.

### 4.4 CLUTRR (Sinha et al. 2019, EMNLP)
- URL: https://github.com/facebookresearch/clutrr ; arXiv 1908.06177. License CC-BY-NC 4.0 [mem, VERIFY non-commercial status vs house use]; generator code + pre-generated datasets (e.g., data_089907f8 and variants; v1 downloads through the repo). Download as plain CSV.
- Format: story (several sentences about family members, templated or crowd-sourced paraphrases), query pair (X, Y), target relation among ~20 kinship relations (mother, father, son, daughter, brother, sister, grandmother, aunt, uncle, nephew, niece, husband, wife, ... in-law). Structured form includes the story graph edges, and the clause length k (number of hops).
- Splits: train on k = 2,3; test systematic generalization k = 4..10; plus noise-fact variants (irrelevant, supporting, disconnected facts).
- Metric: accuracy per k, mean over k=4..10; robustness under each noise type.
- Baselines [mem, directional only]: BERT/LSTM/MAC text models degrade sharply with k (tens of percent by k>=6); GAT/GCN with graph input generalize better but still decay; later neuro-symbolic (CTP Minervini et al. 2020; EpiGNN arXiv 2407.17396; NS-Reasoners) reach ~90%+ on long chains; LLMs with chain-of-thought moderate-to-good, degrade with k and noise. RE-FETCH tables from 1908.06177 and 2407.17396 before citing.
- Our representation: kinship relations are points of a relation algebra: the relations form a finite semigroup under composition (mother-of o father-of = grandmother-of, with gender and in-law structure). Each story edge is a cell (x, y, rel). Training chains of length 2 and 3 provide enough instances to fill the composition table (rows x cols -> rel) exactly; the Chu space is rel x rel -> rel under compose, a tiny residuated structure; length-k answers follow by associativity of compose, i.e., settlement closure, with no new learning. Learning the table is residuation: R\S = largest T with R.T subset S. Gender and "sibling vs half-sibling" ambiguities legitimately give ambiguous (multi-valued) answers; FOUR keeps TOP when two valid chains give different relations (a data noise detector).
- Two entry points: (A) structured graph variant: 100% expected, trivial; (B) text variant: needs the templated-sentence parser (induced as in 4.5). Report both; (A) is the algebra demo, (B) the language demo.
- EROEI: W_settle = (k-1) compose ops per query plus table-fill ops; B_erase = bits for confirming each composition-table cell (finite, ~hundreds); then amortized: after table learned, the marginal k grows with chain length (F_enab = all longer chains enabled). Compare to GNN message-passing MACs growing with k.
- Pitfall: crowd-sourced paraphrase text variants have label noise; ensure noise flagged as TOP, not silently resolved.

### 4.5 Grammar induction from positive data: Omphalos, Tenjinno, PAutomaC, SPiCe, "Clark toy languages"
- Omphalos (2004-2005, Starkie, Coste, van Zaanen): ten problems of learning (deterministic) CFGs from positive (+ sometimes negative) samples; sample sizes of hundreds to thousands of strings; test: classify unseen strings as in/out of the target language (balanced test sets). Clark's winning entry (ML 66:93-110, 2007) targeted problem(s) with positive data only. Site http://www.irisa.fr/Omphalos/ [mem; may be offline: use Web Archive / the ICGI 2004/2006 pages; VERIFY] ; plain text files (one string per line, alphabet of 5-30 symbols). Metric: classification accuracy of test strings (Omphalos required 'correct' = >=?; treat as accuracy and F). Baseline: Clark's learner passed several problems exactly; Coste/Nicolas winners on others [mem]. Beat/Match: this is the cleanest historical match for the syntactic concept lattice.
- Tenjinno (ICGI 2006; Starkie, van Zaanen, Estival): learn finite-state transducers (translation) from aligned sentence pairs; 12 problems; metric: translation accuracy/word error rate. Data was hosted at the ICGI 2006 competition site [VERIFY availability]. Representation: a transducer is a Chu morphism between two syntactic concept lattices (exactly the SCAN setup, so SCAN code reuse is direct).
- PAutomaC (2012): 48 problems, strings sampled from PFAs/HMMs/DPFAs; metric: perplexity of test set probability estimates relative to the true target distribution. Data at https://automata.cs.ru.nl/PAutomaC [mem; VERIFY]. Our engine needs weights: put counts on cells (the sum over incidences) - a probabilistic Chu space (weights in [0,1]) not FOUR; flag as an extension.
- SPiCe (2016): https://spice.lis-lab.fr/ ; 15 problems, each given train strings; metric: ranking of 5 most likely next symbols given a prefix, scored by normalized discounted cumulative gain at 5 (average over problems). Winner 'shib' [search]; spectral and LSTM methods competitive [mem: the winning entry used an LSTM]. Data are plain text (first line: #examples, alphabet size). Honest expectation: probabilistic accuracy on real data (NLP, biology) favors statistical LMs; our engine should be evaluated on the synthetic problems and as a symbolic prefilter.
- Clark toy languages / formal language suites: Dyck-k, a^n b^n, a^n b^n c^n, palindromes with marker, copy language, parity, modular counting. Compare with Deletang suite (4.6).
- Representation: points = strings seen (and their substrings), states = contexts (l, r) with incidence in-L; for positive-only data the against-lane stays empty except where substitution produces strings a membership query/teacher refutes. The lattice of context-closed sets, with residuals X\Y, gives non-terminals; learn via Clark's algorithm: restrict to a finite set of strings and contexts large enough, build lattice, read grammar = concepts as nonterminals, rules from products (concept concatenation). Metrics: Omphalos classification accuracy; grammar size (nonterminals, rules) against the target grammar; equivalence by exhaustive test to length n.
- EROEI: W_settle = lattice build ops (O(|P||S|)) + chart ops per test string; B_erase = merges (equivalence classes created) - the entropy of the partition; F_enab = strings accepted beyond the sample (generalization). In Omphalos a successful run has high F_enab/B_erase: few merges unlock the infinite language. Report k as generalization per merge-bit.

### 4.6 Chomsky-hierarchy length generalization (Deletang et al. 2022, DeepMind, ICLR 2023)
- URL: https://github.com/google-deepmind/neural_networks_chomsky_hierarchy ; arXiv 2207.02098. License: Apache-2.0 [mem, VERIFY]. Data generated on the fly (Python/JAX); no download.
- 15 tasks across the Chomsky hierarchy. Regular: even pairs, modular arithmetic w/o brackets, parity check, cycle navigation. Deterministic context-free: stack manipulation, reverse string, modular arithmetic with brackets, solve equation. Context-sensitive: duplicate string, missing duplicate, odds first, binary addition, binary multiplication, compute sqrt, bucket sort. Train lengths 1-40; test lengths 41-500; metric: accuracy at out-of-distribution lengths.
- Baselines [mem, directional]: Transformers (several positional encodings) fail length generalization even on regular tasks (parity ~ chance 50%); RNN solves regular tasks; stack-RNN solves DCF; tape-RNN does some CS tasks; none solve the hardest CS tasks (multiplication) at all lengths.
- Our representation: each task is a function string -> symbol or string; learn a minimal DFA/Mealy machine = the biextensional quotient of the strings x contexts Chu space (Myhill-Nerode = FCA clarification/reduction). Regular tasks: exact 100% at any length with a few dozen strings (states = intents). DCF tasks: need a pushdown extension: the Lambek types with ordering (non-commutative) capture Dyck. CS tasks: out of scope for plain Lambek; report honestly as the boundary (this is the same Chomsky-level limit as Clark's lattices: context-sensitive only for some).
- This is a high-impact figure: accuracy vs test length with transformers dropping to chance and our curve flat at 100% for regular + a subset of DCF tasks, and our curve admitted failing on CS tasks.
- EROEI: W_settle = automaton build ops (|P||S|) once, then O(L) per query; per-correct-answer cost decreases with test length amortization; transformer cost grows as O(L^2) attention. Good clean plot.

### 4.7 CFQ (Keysers et al. 2020, ICLR)
- URL: https://github.com/google-research/google-research/tree/master/cfq ; data: https://storage.googleapis.com/cfq_dataset/cfq1.1.tar.gz [mem; VERIFY]; HF: google-research-datasets/cfq; paper arXiv 1912.09713. License CC-BY 4.0. Size: 239,357 NL question -> SPARQL pairs over Freebase; splits MCD1, MCD2, MCD3 (maximum compound divergence; train 95,743 / dev 11,968 / test 11,968), random split, plus query-complexity / HPD variants. Format: JSON/CSV `questionWithBrackets`, `sparql`.
- Metric: exact-match accuracy of SPARQL (after normalization), mean over MCD1-3.
- Baselines: [mem] LSTM+attention 14% MCD mean; Transformer ~17.5%; T5-11B-mod 42.1% (Furrer et al. 2020); HPD (Guo et al. 2020) 67.3; intermediate representations on T5 (Herzig et al. 2021) ~86; Grounded Graph Decoding 81.3 mean (search aggregator: 98.6/67.9/77.4); Least-to-most prompting with Codex ~95% (Zhou et al. 2022) [mem]. SOTA ~95%+, so only the "symbolic induction from scratch" story is novel.
- Our representation: question = point; SPARQL = set of triples (cells) with variables; grammar induction as in COGS, with entity-class lexicon; the Chu morphism from the question lattice to the SPARQL lattice.
- EROEI: as in COGS. Honest expectation: engineering-heavy (entity linking, ~500k lines of conjunct normalization); recommended AFTER 4.1-4.6, or as a "template-skeleton" version (entities masked), which is a legit CFQ-compatible analysis.

### 4.8 bAbI (Weston et al. 2015/2016)
- URL: https://research.facebook.com/downloads/babi/ (tasks_1-20_v1-2.tar.gz, ~19MB) ; arXiv 1502.05698. License CC BY 3.0 [mem, VERIFY]. 20 tasks, 1k and 10k train per task, 1k test per task, plus multilingual (Hindi, shuffled) variants. Format: numbered lines, story lines then `question<TAB>answer<TAB>supporting fact ids`.
- Metric: per-task accuracy; mean error; number of failed tasks (>5% error). Baselines: End-to-end MemNN 10k: ~ mean error 7%; GN/Entnet (Henaff 2017) solves all 20 [mem]; Transformer/T5 ~ >99% on most [mem].
- Our representation: each story line is a predication cell with time index (light-cone ordering); question = query on the settled closure; supporting facts = proof. Tasks 8, 9 (lists, negation), 10 (indefinite knowledge: "maybe") are native FOUR/Belnap use (task 10 requires 'maybe' = unknown/both; a good illustration of the extra truth value). Task 16 (basic induction) is a rule-learning task, task 17-19 positional/path-finding need geometry.
- Use: sanity table + 1k-example data-efficiency curve + supporting-fact accuracy. Low demo impact because modern baselines are saturated.

### 4.9 Paraconsistent / contradiction-robust QA
No canonical dataset; the cleanest options:
(a) ProofWriter-BOTH (built by us, 4.3).
(b) Inconsistency-tolerant ontology query answering: LUBM / OWL benchmark with injected ABox inconsistencies (AR, IAR, brave semantics; Bienvenu, Rosati; CQAPri) [mem, VERIFY]: queries over inconsistent KBs; metric = precision/recall vs the repair-based semantics' certain answers. Closest to formal baselines (ASP/DL reasoners).
(c) Conflicting-evidence NLP: FEVER (185k claims, Supports/Refutes/NEI, CC BY-SA 3.0 [mem]), VitaminC (contrastive evidence pairs, 450k [mem]), FaithEval (inconsistent/counterfactual context, 2024, Salesforce [mem]), ConflictBank (2024 [mem]), ClashEval [mem]. None gives a BOTH label natively; our protocol: construct 4-way claim sets by pairing supporting and refuting evidence about the same claim; gold = BOTH.
(d) SCAN-with-noise: flip a fraction p of training outputs (corrections); measure accuracy vs p and detection rate of the flipped cells as TOP (an attack-robustness/noise-robustness test of exact learners; exact learners are usually brittle - this is the test that makes FOUR earn its keep).
Metrics: 4-way accuracy; non-explosion rate; conflict-localization precision/recall; repair cost in Landauer bits; degradation curve under noise rate p.
EROEI: contested cells are the obstructions: D_disch counts resolved TOP cells; rumination detector (4.1 of Sec. 2.1) = loops spinning on unresolved TOP with k<1.

### 4.10 Continual learning without catastrophic forgetting
- Foil benchmarks (small, offline): sequential text classification of Zhang et al. 2015 (AG News 4 classes, Yelp 5, Amazon 5, DBpedia 14, Yahoo 10; five tasks, 115k to 1.4M examples each; links via the d'Autume et al. 2019 MbPA/episodic memory setup; Zhang's data on Google Drive/HF) with accuracy average across tasks; SOTA ~ 75-78% avg (multitask upper bound ~79) [mem]. Our engine is weak at topical classification; use only as a forgetting probe with identical-engine retrieval baselines, or skip.
- Better: stream benchmarks built from 4.1-4.4 (task order: SCAN simple -> SCAN jump -> COGS lexical -> COGS structural -> CLUTRR k=2,3 -> ProofWriter D0..D5). Metrics: average accuracy at end; backward transfer BWT = mean over tasks (acc_final - acc_just_learned) (target 0 for ours; transformers fine-tuned sequentially drop heavily); forward transfer (accuracy on task T before seeing its training data, relative to random-init; e.g., ProofWriter depth 5 after 0-3); plasticity (time to learn a correction).
- Representation: cells are append-only, content-addressed; learning only adds cells or against-lane evidence; the knowledge order of FOUR is monotone so earlier answers cannot change unless the new evidence is genuinely contradicting (becoming TOP, not silently overwritten). Forgetting = 0 by construction; the real research content is correction (against-lane) and re-settlement. Report "stability-plasticity" curves: accuracy on old tasks vs on corrected tasks.
- EROEI: W_settle per task increments as incremental closure (only new cells re-derive); show that incremental cost << from-scratch retrain; k stays > 1 as tasks accumulate (transfer: later tasks need fewer merges).

### 4.11 Data efficiency / few-shot (cuts across 4.1-4.6)
- Protocol: learning curves; "primitive exposure" (COGS train_100 vs train; SCAN add_prim_jump with k exposures to the primitive in compositions: add_prim_jump with 1, 2, 4, 8, 16, 32 compositional examples as in Lake & Baroni 2018, where 0 -> ~1%, 8-ish -> a few %, 32 -> ~ 40% for seq2seq [mem]); minimal number of training pairs to reach 100% (our curve vs the transformer baseline trained locally on the same subsample).
- BLiMP (Warstadt et al. 2020, https://github.com/alexwarstadt/blimp, CC BY 4.0 [mem]): 67 sets x 1,000 minimal pairs = 67k pairs, 12 phenomena; zero-shot: pick the acceptable sentence. Human ~88.6%; GPT-2/large LMs ~80-82%; BabyLM 2023/2024 (https://babylm.github.io, 10M or 100M words strict tracks) models trained on 10M words reach ~70-80% [mem]. For us: induce a grammar from the 10M-word child-directed-like corpus; score minimal pairs by derivation existence/cost. STRETCH; likely partial coverage (morphosyntax phenomena like anaphor agreement, island effects, NPI licensing); report per-phenomenon, and where FOUR against-lane from minimal-pair feedback helps (as in training with BLiMP-like counterexamples).

## 5. Implementation plan (offline, plain files)

1. Directory suggestion (outside this task's edit scope; do NOT create): a benchmarks/ package at the signcraft layer (systems), with loaders (pure data), a metrics module, and runners. Datasets fetched by a pinned manifest (URL + sha256), stored content-addressed; the runner prints per-split JSON.
2. Common adapter `Example -> {points, states, charge}`; unify SCAN/COGS/CFQ as `Translation(src, tgt)`, CLUTRR/ProofWriter as `Theory + Query`, formal languages as `Positive(+Negative) strings`.
3. Reference baselines (local, same budgets): a small Transformer (fairseq-style or a ~5M-param torch model) trained on identical train files; majority; lookup memorization; and (optionally) a published symbolic baseline for SCAN for honesty.
4. Verifier: independent proof checker used by all runners; counts as "proof validity".
5. EROEI counters in the engine (Sec. 2.1) emitted as a JSON ledger per run; the ledger is itself a SignCell stream (dogfooding: the registry-published run results are cells).
6. Registry hook (ties the skeleton): each learned artifact (Lambek lexicon for SCAN, composition table for CLUTRR, DFAs for the Chomsky suite) is serialized as content-addressed JSON and published as an immutable package version on registry.561.group (e.g. dev channel); a benchmark result can then be reproduced by installing the exact lexicon: "heredity". Registry-level selection = comparing EROEI ledgers across published versions. (Packages not yet published; do not assume.)

## 6. Expected outcomes and failure modes (state in advance)

- SCAN, Chomsky regular tasks, CLUTRR-structured: 100% likely if induction is implemented correctly; if not 100%, the engine has a bug, not a "statistical" shortfall.
- COGS: structural ~100% plausible; lexical generalization depends on type inference; canonicalizer errors will cost points.
- ProofWriter: 100% answers/proofs after template grammar learned; BOTH extension: unknown, requires design of gold semantics (Belnap-style FDE); risk of disagreement on gold definitions.
- Omphalos/SPiCe: partial; Clark's learner historically passes the NTS-class problems and fails the others; SPiCe real data is a loss versus LSTM/spectral.
- CFQ and BabyLM/BLiMP: engineering-bound; report partial coverage with the coverage fraction (percentage of test examples the induced grammar can parse at all) alongside accuracy-on-parsed.
- Context-sensitive Chomsky tasks: expected failure; publish it, because it's the honest boundary and matches Lean's "documented-boundary".
- The EROEI metric is NEW and self-defined; a skeptic will note that the comparison with FLOPs is apples to oranges; protect the claim by always showing raw counts and the definition.

## 7. Source URLs

- SCAN: https://github.com/brendenlake/SCAN ; https://arxiv.org/abs/1711.00350
- COGS: https://github.com/najoungkim/COGS ; https://arxiv.org/pdf/2010.05465
- Csordas et al.: https://arxiv.org/pdf/2108.12284
- CFQ: https://arxiv.org/pdf/1912.09713 ; https://github.com/google-research/google-research/tree/master/cfq ; https://huggingface.co/datasets/google-research-datasets/cfq ; https://www.tensorflow.org/datasets/catalog/cfq
- Furrer et al. (T5 on CFQ): https://arxiv.org/pdf/2007.08970 ; Grounded Graph Decoding https://ar5iv.arxiv.org/html/2111.03642
- Compositional semantic parsing with pretrained transformers: https://arxiv.org/pdf/2109.15101 ; survey https://arxiv.org/pdf/2404.13074
- CLUTRR: https://arxiv.org/abs/1908.06177 ; https://github.com/facebookresearch/clutrr ; EpiGNN https://arxiv.org/pdf/2407.17396
- ProofWriter: https://arxiv.org/pdf/2012.13048 ; PRover https://arxiv.org/pdf/2010.02830 ; FaiRR https://arxiv.org/pdf/2203.10261 ; https://github.com/ink-usc/fairr ; RuleTaker https://arxiv.org/abs/2002.05867 ; HF mirror https://huggingface.co/datasets/tasksource/ruletaker
- Omphalos: https://mlanthology.org/mlj/2007/clark2007mlj-learning
- DLG: Clark 2010-2013 lattice papers (aclanthology W10-2904 at https://preview.aclanthology.org/fix_video/W10-2904.pdf)
- PAutomaC: https://proceedings.mlr.press/v21/verwer12a.html ; https://link.springer.com/doi/10.1007/s10994-013-5409-9
- SPiCe: https://spice.lis-lab.fr/ ; results https://spice.lis-lab.fr/results-SPiCe.pdf
- Chomsky hierarchy suite: https://arxiv.org/abs/2207.02098 ; https://github.com/google-deepmind/neural_networks_chomsky_hierarchy
- bAbI: https://arxiv.org/abs/1502.05698 ; https://research.facebook.com/downloads/babi/
- BLiMP: https://github.com/alexwarstadt/blimp ; BabyLM https://babylm.github.io
- Yuv blog (UNVERIFIED claim): https://yuv.ai/blog/98-7-accuracy-on-length-generalization-what-rewritenets-reveals-about-transformers
