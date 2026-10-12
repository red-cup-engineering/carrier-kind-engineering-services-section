# language-parsing

`@561-group/language-parsing` is the language-neutral parser in the paraconsistent language stack.

It treats grammar as charged predication over spans. Text is articulated into document, block, sentence, clause, and word spans; a language bundle tags and features those spans; attachment rules propose arcs; descent settles the resulting cells in the memetic bilattice. Ambiguity and absence are first-class results: `t`, `f`, `top`, and `bottom` are preserved rather than collapsed into one parse.

## Public Surface

- `articulate(text, bundle)` builds offset-stable spans and containment/sequence edges.
- `parse(sentenceSpan, base, bundle)` returns settled words, arcs, answers, conflicts, voids, and fold data.
- `roles`, `polarity`, `scope`, `temporal`, `presuppositions`, and `logicalForm` read semantic layers from a parse.
- `linkEntity`, `lookup`, and `DEFAULT_KB` provide zero-statistics entity linking with linked, ambiguous, and nil states.
- `refer` / `resolveReferences` reports resolved, ambiguous, and void pronouns.
- `similarity`, `hypernyms`, and `commonAncestor` provide inspectable ontology similarity without embeddings.
- `cohomology(parse)` reads parse conflicts and voids as obstruction classes.
- `grammaticality(parse)` reports hard grammatical violations separately from parse ambiguity.
- `load(rawBundle)` compiles a language bundle into the parser-facing lookup functions.
- `descend(entries, specialization)` settles charged predicate cells through specialization closure.

## Archive Parity

This live package meets or beats the archived 2026-06-07 language-parsing engine by keeping the old zero-statistics design while moving it into typed modules, external language bundles, stable word IDs, bundle-driven attachment direction, Latin role-by-case handling, rendering, folding, semantic analysis, entity linking, reference resolution, ontology similarity, parse cohomology, and grammaticality.

German, Spanish, and SOV toy data from the archive remain useful examples, but the live architecture keeps language data in `language-parsing-*` packages rather than inside the engine package.

The package is authored as `.mts` TypeScript and consumed from emitted
`dist/*.mjs` files with declaration files. Downstream bundles should import the
package root or documented subpaths such as `@561-group/language-parsing/bundle`
and `@561-group/language-parsing/types`, not `src` files.
