# proposed mapping — writing-lint through the voidmath kernel

**Status: proposal, not established fact.** This is my own sketch of how the
voidmath kernel could drive Grammarly-style prose checking. None of it is derived
or proved yet; it is a starting hypothesis to react to. Facts about the kernel are
in `voidmath-notes.md`; facts about the style rules are in `sources/`.

## The core idea
The kernel turns an utterance `[token, claim]` into a settled charge in the
bilattice FOUR. A lint check is exactly a claim about a span of text. So:

- **token (subject) = a span of text** — a sentence, a clause, a word, or the
  whole document. (The kernel makes subject = object for a single entity, so the
  cell is `(span, rule, span)`.)
- **claim (predicate) = a style rule** — e.g. `sentence-under-25-words`,
  `active-voice`, `avoids-banned-vocab`, `one-idea-per-sentence`, `same-phrase-for-same-thing`.
- **charge = the lint verdict** in FOUR:
  - `t` — rule satisfied (positive evidence: the checker found the rule holds).
  - `f` — rule violated (negative evidence: a counter-example in the span).
  - `⊥` — not yet checked / not applicable to this span.
  - `⊤` — paraconsistent: two sub-checkers disagree, or two rules conflict on the
    same span. **This is the interesting cell** — it's where a human should look.

The witness in a slot isn't just a presence bit — the kernel allows a structured
mark. So a violation can carry its evidence: the offending word, its char offset,
the suggested replacement from the substitution table.

## Where "which fiber algebra applies, based on the closure rules that applied" lands
This is the phrase from the task, and the kernel gives it a literal reading:

- There is **one fiber-algebra per predicate** (per rule). So "the set of rules in
  play" is literally the set of fiber-algebras.
- The **base** carries specialization edges between predicates (rule implications:
  `avoids-corporate-speak` specializes into `avoids "leverage"`, `avoids "remit"`, …;
  `is-plain` subsumes `uses-common-words` and `short-sentences`).
- `cohere` runs the **transitive closure** (Beck–Chevalley) on those edges. So when
  a high-level rule fires, its closure pulls in the sub-rules' fiber-algebras
  automatically — *which rules apply at a given cell is decided by the closure of
  the implication graph, not hand-wired per check.* That is the "fiber algebra
  applies based on the closure rules" behavior, for free, from the kernel.
- `settle` then propagates charges to a fixed point across the composed base: a
  violation of a specialized rule can force the parent rule's cell, and conflicting
  evidence settles to `⊤` rather than silently picking a winner.

## What we'd build on top of the kernel (the non-math part)
The kernel decides charges and closures. The package supplies:
1. **A segmenter** — text → spans (tokens). Sentence/clause/word tiers.
2. **A rule registry** — each rule is `{ predicate-id, detector(span) → charge-slot,
   specializes: [parent-predicate-ids] }`. Detectors come from mining `sources/`:
   the 20-rule SKILL sheet and the 515-line style guide's substitution table are
   the first harvest. Readability detectors come from `terms/readability.md`
   (Flesch/Flesch-Kincaid).
3. **A reporter** — read `sheaf.section`, surface every `f` and `⊤` cell with its
   witness as a lint diagnostic (file, offset, rule, evidence, suggestion).

`[my read]` The package's value proposition vs. a flat rule-runner: the closure
handles rule-implication and the bilattice handles rule-conflict honestly (⊤
instead of last-writer-wins), and the witness pipeline carries real fix suggestions
as proof-terms. Whether the categorical machinery earns its weight over a simple
pass/fail linter is the open question to test on a real document (koios-news posts
are a ready corpus).

## Findings — the two open questions, resolved by the code (2026-06-03)

I read `predicate.mjs`, the fold-tower note, the evidence-carrier note, `seed-truth.mjs`,
and the playground packages (`voidmath-cohomology`, `voidmath-quasicrystallinity`,
`voidmath-constructs`). Both questions dissolve, and a bigger structure appears.

### Q1 — cross-span rules: NOT a limitation, it's what the base is for
`predicate.mjs` builds `base = { objects, specialization, converse, subject-projection,
object-projection }`. For a single utterance those relational fields are empty `[]` and
`Φ = E × Π × E` collapses to one triple `(token, claim, token)` — subject = object —
only because **E has one entity**. The relational machinery is present and waiting.

The fold-tower note states growth "lives on the ENTITY axis — the nested cells the
aperiodic lift reifies" (the transfinite/predicate void is "over PREDICATES (bounded
alphabet), so chaining would collapse to period-1"). `[my read]` So a cross-span rule
like "same phrase for the same thing" — which relates span A to span B — is a genuine
two-entity cell `(spanA, same-phrase, spanB)` with `converse`/`subject-projection`/
`object-projection` wired. We get there by feeding utterances that share tokens so E
accumulates, or by reaching the deeper fold-level where E has already grown. The kernel
already has the slots; we populate them.

### Q2 — knowledge vs truth: use BOTH, off one evidence carrier
The evidence-carrier note is explicit: "evidence is the stuff; truth and knowledge are
two orders on the stuff." The charge `[positive, negative]` is one evidence pair; `settle`
reads the knowledge order (open-world, `⊥` = "unknown until asserted"), `adjudicate` reads
the truth order (closed-world, `seed-truth` = `f` "false until proven"). `[my read]` A
linter wants both: the **knowledge axis** to accumulate detector evidence and report only
spans actually examined (unchecked stays `⊥`, not falsely "clean"); the **truth axis** for
a document-level pass/fail verdict where unexamined = not-yet-passed. One evidence matrix,
two verdicts — no second pass needed.

### The bigger structure — why it's "cooler than I thought"
1. **The linter is a spiral, not a flat pass.** `voidmath-cohomology`'s `fold.mjs` =
   `articulate ∘ aperiodic-lift`: cells that **settle** (clean or violated) are done — LFP,
   initial algebra, terminates. Cells that stay `⊥` (the detector genuinely couldn't decide)
   are the **void**, and the GFP is "forced to re-articulate" them **deeper**. `[my read]`
   That is progressive disclosure of analysis as a math fact: cheap checks settle most spans;
   the ambiguous residue recurses to finer, costlier analysis (sentence → clause → word →
   context), unboundedly, **aperiodically** (proven never to trivially loop). The nested
   posix path **is** the analysis-depth coordinate of that span.
2. **Rules carry symmetry.** `voidmath-quasicrystallinity`'s Klein-four gauge (`negate` ¬,
   `conflate` −) gives every rule its truth-opposite and its knowledge-dual for free.
3. **The Chu root grounds the user's claim literally.** Evidence-carrier note, citing Jakl
   2025: FOUR ≅ Chu(2,0), into which "Top, Pos, Vect, and more embed fully and faithfully."
   `[my read]` So any prose model you can imagine mathematically — a *metric* on readability,
   an *ordering* of registers, a *vector space* of stylistic features — is a subcategory of
   the Chu space the evidence matrix (`tabulate.mjs`) already is. "If you can imagine it
   mathematically, it's somewhere constructible" is not hype here; it's the embedding theorem.

### Still to settle before building
- Token granularity & the segmenter's entity-sharing scheme (so E accumulates correctly).
- Whether to drive deepening via the real fold-tower (downstream in the kernel) or a
  bounded consumer-side loop first.
- Package name and home tier (likely `development/experimental/` to start).
