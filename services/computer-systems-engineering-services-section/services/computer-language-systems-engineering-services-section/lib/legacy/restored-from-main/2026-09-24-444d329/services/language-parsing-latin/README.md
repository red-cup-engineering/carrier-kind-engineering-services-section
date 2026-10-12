# language-parsing-latin

`@561-group/language-parsing-latin` is the Latin language bundle for `@561-group/language-parsing`.

It records free word order, no articles, Latin closed classes, representative case-bearing noun endings, and verb endings. The `roleBy: "case"` bundle flag tells language-parsing to resolve subject/object roles from case features rather than adjacency.

This package is the main proof that the grammar model is parameterized by language data, not by English word order.

The package is authored as `.mts` TypeScript and consumed from emitted
`dist/*.mjs` files with declarations. Use the package root for the compiled
bundle and `@561-group/language-parsing-latin/bundle` for the raw bundle data.
