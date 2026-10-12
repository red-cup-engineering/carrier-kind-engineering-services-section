# language-parsing-tokipona

`@561-group/language-parsing-tokipona` is the Toki Pona language bundle for `@561-group/language-parsing`.

It records SVO order, isolating morphology, no copula, person-only pronoun features, and the structural particles `li`, `e`, `pi`, `la`, and `o` using the closest available bundle slots.

The bundle is intentionally small: the point is to keep the whole language description as data rather than a separate parser.

The package is authored as `.mts` TypeScript and consumed from emitted
`dist/*.mjs` files with declarations. Use the package root for the compiled
bundle and `@561-group/language-parsing-tokipona/bundle` for the raw bundle data.
