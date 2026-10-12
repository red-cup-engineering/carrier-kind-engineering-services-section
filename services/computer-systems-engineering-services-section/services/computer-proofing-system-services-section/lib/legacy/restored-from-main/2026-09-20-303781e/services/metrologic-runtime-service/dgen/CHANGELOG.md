# Changelog

All notable changes to `@lenticule-science/metrologic/dgen` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] — unreleased

### Added

- `generator` — the d-frame `H¹`-generator `D_μ` at each non-Scott-continuous firing (proved corpus theorem `d-frame-h1-generator-at-nsc-firing.md`): `dframeGenerator` (a firing value's `(L₊, L₋, con, tot)`), `h1Dframe` (the direct sum `⊕_μ D_μ`), `shadow` (the abelian projection), `negateGenerator` (the value-category swap), `linearlyIndependent` (distinct stages ⇒ independent), and `fromSettling` (zip an `@lenticule-science/metrologic/obstruction` settling's limit firings with their values).
- Law/property test suites on `@lenticule-science/metrologic/obstruction` settlings.

This is a migration OUT of the playground (`math/playground/src/dgen/`): the per-firing d-frame generator settled and moved here, built on the now-stable `@lenticule-science/metrologic/{dframe,verdier,obstruction}`.
It generalizes `dframe`'s truth/falsity split from substitution settlings (per-letter) to any settling (per-firing).
