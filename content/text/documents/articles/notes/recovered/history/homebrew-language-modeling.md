# Homebrew language modeling — a ground-up, charge-valued path through (and past) the LLM

> Status: study note, design only. Convention (per repo CLAUDE.md and the notes house style):
> **file-fact** lines state what a repo file says, in its own words, with a path. **web-fact**
> lines state what a cited web source says, with a URL. **[INFERENCE]** lines are this note's own
> synthesis — reading across the parts and drawing a conclusion the sources do not state verbatim,
> kept visibly apart from the facts. This note adds **no source code** and does no git.

This note answers one question: what does *language modeling* look like if we build it from the
ground up on **this** computer — paraconsistent, append-only, charge-valued, settling — instead of
on the boolean/Shannon statistical machine the whole LLM lineage rides? It first reads what we have
already built (the substrate, and especially `apps/language/`), then reads the history and frontier
of LLMs off the web, then synthesizes our own next-gen homebrew path and a build order.

---

## 1. What we already have (read the repo first)

### 1.1 The substrate — a charge, not a boolean

**file-fact** (`computer/docs/dev/notes/computer-architecture.md` §0): the journal states the
machine in one sentence — *"this is a paraconsistent, non-boolean, non-Turing computer, and the
ordinary boolean Turing/von-Neumann machine is its degenerate shadow — what you get by projecting it
down its axes."* The recurring move is **degeneracy / projection**: the boolean is the shadow of the
charge, the RDF triple is the degeneracy of the datom.

**file-fact** (`math/bilattice/README.md`): a **charge** is
`{ value: [a₊, a₋], evidence: [pos-witnesses, neg-witnesses] }` — the bilattice pair
`⟨a₊,a₋⟩ ∈ FOUR` with `[F,F]` absurd, `[T,F]` potential, `[F,T]` active, `[T,T]` stable ("told
both", ⊤). Two σ-dual orders run on the pair: **knowledge** ("how determined") and **truth** ("which
way"). *"Nothing is seeded: every cell's state is measured from what was given. `⊥` (absurd) is only
ever reached … never stamped; the evidence carrier only ever grows (knowledge never falls)."*

**file-fact** (`computer/docs/dev/notes/computer-architecture.md` §1, the architectural laws):
(1) the substrate is a charge — *"compute in knowledge; decide in truth; never confuse the two"*;
(2) **evidence is linear** — witnesses *"are never discarded and never freely duplicated; they are
unioned on the fold. No weakening, no contraction"*; (3) **the world is its append-only folded
trace** — state is an append-only trace of `{e,a,v,t}` and the current value is the *fold* of the
trace.

**file-fact** (`computer/typed-term-memory-system/README.md`): a fact is a predication cell
`(subject, predicate, object)` stored as one EAVT datom `{e,a,v,t}` — `t` the
transaction/witness/provenance. *"A write only ever affirms a cell: monotone, append-only, never a
retract."* A term's value is folded per cell by the knowledge-join; *"a memory is a predication
graph."*

**file-fact** (`computer/docs/dev/notes/computer-architecture.md` §3, the data tower):
`datom {e,a,v,tx,op} → eavt {e,a,v,t} → triple {s,p,o} → pair → unary`, each a forgetful projection
of the one above. The folded section *is* a Chu/Dialectica object `Entity × ⟨Predicate,Object⟩ →
charge` over FOUR; `negate`/`conflate` are the Klein-four gauge.

### 1.2 Horsetail — eval is settle, the program is a trace

**file-fact** (`computer/horsetail/README.md`): Horsetail is the computer's native language, a
**paraconsistent settling Lisp**. *"A normal Lisp is homoiconic over cons cells and `eval` is a
function call. Horsetail is homoiconic over predication cells, and `eval` is `settle`. Evaluating a
form appends predications to an append-only `{e,a,v,t}` trace and settles it to a Knaster–Tarski
fixed point; the 'value' is the projected settled charge … The program is a trace; running it is
folding it. There is no clock — settling is aperiodic, not stepping."* Truthiness is four-valued;
`⊤` is *"a bindable value, never an error."* `(define name expr)` is an **append-only** binding —
*"re-define adds counter-evidence, never overwrites."* `(federate …)` tensor-merges two traces;
disagreement → ⊤.

### 1.3 apps/language/ — we are already doing homebrew, charge-valued language modeling

**file-fact** (`apps/language/syntaxis/README.md`): syntaxis is a *"zero-statistics formal-
linguistics engine."* Grammar is *"a sheaf of paraconsistent fiber-algebras over `Φ = E × Π × E`,
not a dependency tree."* Instead of forcing one answer it reports each decision's honest epistemic
status: **decided**, **⊤** (ambiguous — two valid readings), or **⊥** (void — no evidence). *"A
language is a data bundle, not a trained model … no trained weights anywhere — every table is curated
and inspectable."* Its one differentiator is not accuracy, it is **honesty**.

**file-fact** (`apps/language/syntaxis/README.md`, "languages are data"): a language is a fiber-
algebra **bundle** — a data file declaring lexicon, morphology, reference features, word order,
attachment directions. *"Adding a language is writing a data file — no treebank, no training — which
is why this fits low-resource and endangered languages better than a trained pipeline."* Bundles
ship for English, Spanish, German, Latin, Toki Pona, Lakota.

**file-fact** (`apps/language/syntaxis/docs/design/architecture.md` §2, §3): the pipeline is
`articulating` (the delimiter ladder: text → offset-true spans) → `construing` (the parser: tag,
feature, relate, charge — *"ambiguity kept as several tags, not guessed"*; arcs are *"overlapping,
non-committal"*) → `descending` (the kernel bridge: build the cell category, `posit`, overlay
charges, `settle` to the knowledge-LFP, propagate up the `cohere`-closed implication graph) →
`parse()` (the epistemic reading). The recurring trick (§3.1): to record a genuine ambiguity, emit
two opposite-polarity leaf cells that both specialize into one parent seeded `⊥`; descend's
propagation joins them; `t` join `f` is `⊤`. *"The conflict is manufactured by the kernel's join,
never stamped by a rule."* Roles **derive** from arcs via converse + projection, not asserted (§3.2).
The parse is the limit of a **fold-tower** — iterating the predication monad until the analysis
stabilizes (`construing/scripts/parse.mjs` lines 59–70).

**file-fact** (`apps/language/syntaxis/cohomology/scripts/cohomology.mjs`): a parse has a
**cohomology** — *"measure whether a sentence's local grammatical readings GLUE into one global
analysis, or carry an irreducible obstruction."* `h0` is the global section (exists iff no question
came back ⊤); `h1` is the obstruction classes — every ⊤ cell (over-determined) *plus* every void ⊥
cell (under-determined), the two distinct ways a parse fails to give one answer. *"A dependency-tree
parser … ALWAYS forces one global tree — it glues by fiat, discarding the fact that gluing failed.
syntaxis does not."*

**file-fact** (`apps/language/koine/README.md`): koine is the **measurement** half over syntaxis's
structuration — a prose linter where *"the text is a category and the verdict is a bilattice
charge."* Rule-implication is the kernel's `cohere` transitive closure; **rule-conflict is `⊤`**
(two rules disagree on one cell → route to a human, not last-writer-wins); **"unsure" is `⊥`**, which
drives the **fold** — re-articulate that span one delimiter-tier finer and try again.

**[INFERENCE]** Reading 1.1–1.3 together: *we have already built the front third of a non-statistical
language model.* syntaxis is a charge-valued analyzer whose "model" is a curated data bundle, whose
output is a settled section over FOUR, and whose ambiguity and ignorance are first-class values
rather than discarded alternatives. What it does **not** yet have is the generative / predictive half
(what an LLM's `P(next | context)` gives) and any **learning** loop (the bundles are hand-written).
The homebrew next-gen path is: keep the charge-valued analytic core, and grow the two missing halves
*on the substrate's own terms* — append-only evidence and settling — rather than by importing
gradient descent over a weight blob.

---

## 2. What the field built (read the web second)

A compressed lineage of statistical language modeling, with sources.

- **web-fact** — **n-grams (classical era).** The first LMs were n-gram models with smoothing for
  unseen n-grams; a model is `P(wₙ | wₙ₋ₖ … wₙ₋₁)` estimated by counting. ([ruder.io review of
  NLP history](https://www.ruder.io/a-review-of-the-recent-history-of-nlp/);
  [Medium: N-grams to Transformers](https://medium.com/@akankshasinha247/from-n-grams-to-transformers-tracing-the-evolution-of-language-models-101f10e86eba))
- **web-fact** — **neural LM (2001).** Bengio et al. proposed the first feed-forward neural language
  model. ([ruder.io](https://www.ruder.io/a-review-of-the-recent-history-of-nlp/))
- **web-fact** — **word vectors (2013).** word2vec (Mikolov) shifted to learned word embeddings —
  meaning as a dense vector, similarity as cosine distance.
  ([Medium: word2vec vs BERT](https://medium.com/@ankiit/word2vec-vs-bert-d04ab3ade4c9))
- **web-fact** — **RNN / LSTM.** Recurrent nets modeled the whole sequence but were *"slow and hard
  to parallelize"* and struggled with long-range dependencies.
  ([Medium: LM history](https://medium.com/@kirudang/language-model-history-before-and-after-transformer-the-ai-revolution-bedc7948a130))
- **web-fact** — **attention / transformers (2017).** *"Attention Is All You Need"* (Google, NeurIPS
  2017) replaced recurrence with self-attention — each token attends to every other.
  ([en.wikipedia.org/wiki/Large_language_model](https://en.wikipedia.org/wiki/Large_language_model))
- **web-fact** — **GPT and BERT (2018).** OpenAI's GPT (decoder, generative pre-training) and
  Google's BERT (encoder, masked LM) both 2018; *"the biggest advances since are model-size scaling
  and instruction fine-tuning including RLHF."*
  ([dev.to: history of LLMs](https://dev.to/sgaglione/the-history-of-large-language-models-llm-82f))
- **web-fact** — **RAG (2020).** Retrieval-Augmented Generation (Meta/FAIR) attaches an external
  retriever to a generator so facts live in a corpus, not only in weights.
  ([en.wikipedia.org/wiki/Large_language_model](https://en.wikipedia.org/wiki/Large_language_model))

**The 2025–2026 frontier and the "after LLM" question:**

- **web-fact** — **Mixture-of-Experts (MoE) is now the default.** Over 60% of frontier models
  released in 2025 use MoE; DeepSeek-V3 has 671B total parameters but activates only 37B per token.
  *"MoE doesn't replace the transformer, it changes the economics."*
  ([askaibrain](https://www.askaibrain.com/en/posts/end-of-transformers-hybrids-attention-state-space-2025/);
  [IntuitionLabs MoE](https://intuitionlabs.ai/articles/mixture-of-experts-moe-models))
- **web-fact** — **State-space / hybrid models.** Production hybrids (Jamba, Qwen3-Next, NVIDIA
  Nemotron-H — 92% of attention layers replaced with Mamba2) reach ~3× throughput. *"Transformers
  aren't being replaced, but integrated into hybrid systems."*
  ([askaibrain](https://www.askaibrain.com/en/posts/end-of-transformers-hybrids-attention-state-space-2025/);
  [philippdubach.com](https://philippdubach.com/posts/the-last-architecture-designed-by-hand/))
- **web-fact** — **Reasoning models (2025).** RLVR + GRPO defined the year; DeepSeek R1 (Jan 2025)
  showed *"reasoning-like behavior can be developed with reinforcement learning."* Reasoning is
  *learned inference-time scaling*, not a new substrate.
  ([Raschka, State of LLMs 2025](https://magazine.sebastianraschka.com/p/state-of-llms-2025))
- **web-fact** — **Named limitations.** Benchmark inflation (*"if the test set is public, it isn't a
  real test set"*); RLVR works mainly for math/code; **catastrophic forgetting** — *"continual
  learning without retraining from scratch encounters knowledge loss."* Raschka predicts continual
  learning becomes the *primary* development focus by 2027.
  ([Raschka](https://magazine.sebastianraschka.com/p/state-of-llms-2025))
- **web-fact** — **Why LLMs forget.** *"Knowledge is distributed across billions of weight
  parameters in a highly entangled way — there is no clean module that can be updated in isolation,
  and every fine-tuning run reshapes the entire parameter landscape."* Neuro-symbolic approaches
  (a symbolic inference engine giving interpretable reasoning) are an explored mitigation.
  ([arxiv 2509.01213](https://arxiv.org/html/2509.01213v1);
  [arxiv 2503.12635 "Hybrid Learners Do Not Forget"](https://arxiv.org/pdf/2503.12635))

**[INFERENCE]** The entire lineage shares one commitment we do not: **a model is a function from
context to a probability distribution, realized as a weight blob, and meaning is a point (or
direction) in a real vector space.** Every property the field now fights — opacity, catastrophic
forgetting, hallucination, "averaging away" of conflicting evidence, the need to retrain to learn —
is downstream of that single design choice. The frontier (MoE, SSM, reasoning, RAG) optimizes *cost*
and *inference compute* but keeps the weight-blob-probability core. The two things the field names as
its hardest open problems — **continual learning without forgetting** and **interpretable / auditable
knowledge** — are *exactly* what append-only evidence and held contradiction give for free here.

---

## 3. The homebrew next-gen path — language modeling on a settling computer

**[INFERENCE]** Restate the four LLM primitives in our substrate's terms. This is the synthesis the
note exists to make; every clause is inference, grounded in the §1 file-facts.

| LLM primitive | what it is there | the homebrew analogue here | grounded in |
|---|---|---|---|
| the *model* | a frozen weight blob `θ`, a function `P(·\|context;θ)` | a **settled trace** — an append-only EAVT section over FOUR; "the model" is data you can read, fold, and federate | `computer-architecture.md` §1.3; `horsetail/README.md` ("the program is a trace") |
| *meaning* of a token | a point/direction in ℝⁿ (a word vector) | a **charged predication cell** over `Φ = E × Π × E` — meaning is *which predications settle, at what charge* | `syntaxis` README + architecture §2 |
| *uncertainty* | low probability mass / high entropy | **⊥** — a question posed but no evidence reached it (a *named* void, distinct from "evidence for the negative") | `syntaxis` `parse()` (decided/⊤/⊥); cohomology `h1` |
| *conflict* | averaged into one distribution, the minority reading vanishes | **⊤** — *held*, with both witnesses and full provenance; routed, not resolved | `koine` README (rule-conflict = ⊤ → human); `horsetail` (⊤ bindable, never error) |
| *learning* | gradient descent reshaping all of `θ` (destructive) | **monotone evidence accumulation** — append a witnessed datom; knowledge never falls; `define` adds counter-evidence, never overwrites | TTMS README; `horsetail` append-only `define`; law (2) evidence is linear |
| *generation* | sample `argmax P(next)` | **settle-then-project**: pose the next-token question as cells, settle, read the truth-axis verdict at the edge — with ⊥/⊤ reported, not hidden | `horsetail` (`eval`=`settle`, collapse to scalar only at the edge); `koine` `adjudicate` |

### 3.1 What we can do that the boolean/Shannon LLM structurally cannot

**[INFERENCE]**, each tied to a file-fact:

1. **Hold a contradiction instead of averaging it away.** Two corpora that disagree on a fact settle
   to **⊤** at that cell — *both* witnesses retained — rather than the majority reading drowning the
   minority in the loss. (`koine` rule-conflict = ⊤; `horsetail` ⊤ bindable; bilattice "told both".)
   An LLM trained on contradictory data produces a *blended* distribution with no record that a
   conflict existed; we carry the conflict as a first-class, queryable value.
2. **Carry the why (provenance / audit).** Every charge carries its lossless evidence carrier
   `[pos-witnesses, neg-witnesses]`; the `t` of each datom is the witness. *Why* a token was predicted
   is the set of datoms that settled it — readable, not a saliency-map guess.
   (law (2) evidence is linear; TTMS `t` = witness.)
3. **Learn online without catastrophic forgetting — because append-only.** New evidence is a new
   datom; the fold re-settles; nothing is overwritten, so prior knowledge cannot be destroyed by a
   later update (knowledge never falls). This is *exactly* the property the field names as its 2027
   priority and cannot get from a weight blob *"reshaping the entire parameter landscape."*
   (law (3) append-only trace; TTMS monotone; vs. [arxiv 2509.01213](https://arxiv.org/html/2509.01213v1).)
4. **Distinguish "I don't know" (⊥) from "I know it's false" (f).** A four-valued model has two
   distinct failure names where a probability has one low number; a calibrated LLM cannot tell a
   *gap* from *negative evidence*. (`syntaxis` `parse()` ⊥ vs decided-`f`; cohomology's two voids.)
5. **Federate models by tensor-merge, not retraining.** Two settled traces merge by folding
   (`federate`), and disagreement surfaces as ⊤ — coordination-free, CALM. Two LLMs "merge" only by
   averaging weights or re-training. (`horsetail` `federate`; `computer-architecture.md` substrate
   fold-as-Dialectica-tensor.)
6. **Self-improve from use.** Because a Horsetail program *is* a trace and running it *appends*, a
   program that records the charges of its own runs accumulates evidence about itself; later settles
   read that evidence. **[INFERENCE]** a homebrew model that logs each prediction's outcome as a
   witnessed datom is *learning from use* with no separate training phase. (`horsetail` program-is-a-
   trace + append-only `define`.)

### 3.2 Be honest: what statistical LLMs do better, and where we'd start

**[INFERENCE]** Stated plainly, against the file-facts in §1.3:

- **Coverage and robustness on messy real text.** `syntaxis` README is explicit: *"the tagger is the
  bottleneck"* — irregular verbs with no telltale suffix tag as noun; *"coverage is proof-of-concept";*
  it has *"never been measured against a standard corpus … reports no F1."* A trained LLM *"just
  knows."* This is the field's clearest win and we should not pretend otherwise.
- **Fluent generation.** We have the *analytic* half (syntaxis/koine) and **no generative half** at
  all. `argmax P(next)` over a trillion-token corpus produces fluent text; a settled-trace generator
  does not exist here yet.
- **Statistical world-knowledge at scale.** The bundles are hand-written data; there is no mechanism
  yet that *ingests* a large corpus into charged cells at scale.

**Where the boolean LLM is actually the right tool:** when you want one fluent best-guess string fast
and you don't need the why, the audit, or honest abstention — the statistical machine is better, and
our value is precisely the cases where you *do* need those.

### 3.3 The homebrew speedrun — build order (what to build first)

**[INFERENCE]**, a minimal path from "charge-valued analyzer" to "charge-valued language *model*",
each step on the substrate's own terms (append-only, settling), no weight blob:

1. **Corpus ingest → charged cells.** A loader that turns a text corpus into witnessed EAVT datoms
   over `Φ` — co-occurrence and succession as predications `(token, precedes, token)` with provenance
   `t`. This is the n-gram, *re-derived as evidence*: a count becomes a stack of witnessed datoms;
   the "probability" becomes the settled charge plus its evidence cardinality. Sits directly on TTMS.
2. **A settle-based next-token *question*.** Given a context, pose `(context, predicts, ?)` as cells,
   settle, and read the truth-axis verdict — returning not one token but a *charged distribution*:
   the `t` candidates, the `⊤` ties (genuinely equiprobable / contested), the `⊥` (unseen context).
   Reuse the §3.1.4 ⊥/⊤ distinction syntaxis already implements.
3. **Online learning loop.** Append each observed continuation as a new witnessed datom; re-settle.
   No retraining; knowledge monotone. This is the self-improvement of §3.1.6, minimal form.
4. **Hook syntaxis's structure as a strong prior.** Let the settled grammatical section (roles, the
   relation category, agreement) *constrain* the next-token cells, so generation is grammar-aware by
   construction, not by learned correlation. The structure already exists (§1.3); this just lets it
   feed prediction.
5. **Retrieval is native, not bolted on.** "RAG" here is just `recall`/`query` over the same trace —
   there is no separate vector store; the corpus *is* the model. (`horsetail` `recall`/`query`.)

### 3.4 Where the unbuilt MATH package is the lever

**[INFERENCE]**, flagged explicitly as the task asks. From the task framing and `math/`'s contents
(`bilattice`, `chu`, `type-theory`, plus the README note that the rest *"rides the simplest kernel
functions"*):

- **The settle / descent kernel is the inference engine.** Today everything in `apps/language` runs
  through one descent over the cell category with the *simplest* propagation. A richer `math/`
  (sharper modal generators `must`/`should`/`may`, the transfinite `estrange`, the aperiodic monad
  `saturate`/`twistor`) is *directly* what a more capable language model would settle through —
  better inference for free, with no change to the data bundles. The headroom is in the kernel, not
  the app.
- **The Dialectica/Chu structure is the licence for federation and for "meaning as relation".** The
  data tower's identification of the folded section with a Chu object over FOUR
  (`computer-architecture.md` §3) is what makes federated, multi-corpus language models a *tensor*,
  not an ad-hoc union — and it is barely exercised. A built-out `math/chu` is the lever for
  many-source models that hold their disagreements as ⊤.
- **Quantitative evidence weighting is the open math.** The current carrier counts witnesses
  (cardinality). A graded/probabilistic bilattice — charges valued in something richer than the
  4-element FOUR, *while keeping the paraconsistent order* — is the math we have **not** built and is
  the bridge between our honest-but-sparse analyzer and the field's fluent-but-opaque distributions.
  That is the single highest-leverage unbuilt piece: it would let a settled trace produce a *graded*
  next-token charge without surrendering the why, the ⊥/⊤ distinction, or append-only learning.

---

## 4. The one-paragraph thesis

**[INFERENCE]** On a paraconsistent, append-only, charge-valued, settling computer, a *language
model is a settled trace, not a weight blob*: meaning is which charged predication cells settle (and
at what charge) over `Φ = E × Π × E`; uncertainty is a named `⊥` and contradiction is a held `⊤`
carrying both its witnesses and its provenance, rather than a probability mass averaging the minority
reading away; learning is monotone evidence accumulation, so the model learns online and *cannot*
catastrophically forget (knowledge never falls); and a Horsetail program that logs its own runs
self-improves from use with no training phase. We have already built the analytic front third
(`apps/language/syntaxis` + `koine`); the homebrew speedrun is to grow the generative half — corpus
→ witnessed cells, a settle-based next-token *question*, an append-only online loop — on the
substrate's own terms; and the highest-leverage unbuilt piece is in `math/`: a *graded* paraconsistent
charge that gives the field's fluent distributions without surrendering the why, the honest
abstention, or the held contradiction.

---

## Sources

Repo (file-facts):
`computer/docs/dev/notes/computer-architecture.md` · `math/bilattice/README.md` ·
`computer/typed-term-memory-system/README.md` · `computer/horsetail/README.md` ·
`apps/language/syntaxis/README.md` · `apps/language/syntaxis/docs/design/architecture.md` ·
`apps/language/syntaxis/cohomology/scripts/cohomology.mjs` ·
`apps/language/syntaxis/construing/scripts/parse.mjs` · `apps/language/koine/README.md`.

Web (web-facts):
[ruder.io NLP history](https://www.ruder.io/a-review-of-the-recent-history-of-nlp/) ·
[Medium: N-grams to Transformers](https://medium.com/@akankshasinha247/from-n-grams-to-transformers-tracing-the-evolution-of-language-models-101f10e86eba) ·
[Medium: LM history before/after Transformer](https://medium.com/@kirudang/language-model-history-before-and-after-transformer-the-ai-revolution-bedc7948a130) ·
[Medium: word2vec vs BERT](https://medium.com/@ankiit/word2vec-vs-bert-d04ab3ade4c9) ·
[Wikipedia: Large language model](https://en.wikipedia.org/wiki/Large_language_model) ·
[dev.to: history of LLMs](https://dev.to/sgaglione/the-history-of-large-language-models-llm-82f) ·
[askaibrain: attention + state-space hybrids 2025](https://www.askaibrain.com/en/posts/end-of-transformers-hybrids-attention-state-space-2025/) ·
[IntuitionLabs: Mixture of Experts](https://intuitionlabs.ai/articles/mixture-of-experts-moe-models) ·
[philippdubach: the last architecture designed by hand](https://philippdubach.com/posts/the-last-architecture-designed-by-hand/) ·
[Raschka: State of LLMs 2025](https://magazine.sebastianraschka.com/p/state-of-llms-2025) ·
[arxiv 2509.01213: catastrophic forgetting / model growth](https://arxiv.org/html/2509.01213v1) ·
[arxiv 2503.12635: Hybrid Learners Do Not Forget](https://arxiv.org/pdf/2503.12635).
