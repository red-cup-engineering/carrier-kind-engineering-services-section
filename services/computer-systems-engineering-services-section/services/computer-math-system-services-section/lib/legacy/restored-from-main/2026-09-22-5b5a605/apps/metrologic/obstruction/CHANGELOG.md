# Changelog

All notable changes to `@lenticule-science/metrologic/obstruction` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] — unreleased

### Added

- `settling` — the temporal firing cohomology over settlings-as-data (zero imports): `settling` (build and validate a monotone settling), `increments` (Δ⁺_τ), `firings` / `nscFirings` (the firing and non-Scott-continuous firing ordinals), `h1` (H¹ = the count of cells first designated at a limit stage), `clInv` / `mldEquivalent` (the classifying invariant up to mutual local derivability), and `classify` / `depth` (the four-regime classification and closure ordinal κ).
- `floor` — the bridge to the bilattice floor and the void-dual read, on `@lenticule-science/metrologic/bilattice`: `designatedCells`, `settlingOf` (read a floor category's closure trace as a finite settling), `voidCone` (the floor's `vanish`), `gradedVoid`, and `apexVoidMatch` (rank H¹ = rank gr(Void)).
- Law test suites (`settling`, `floor`).

This is the first migration OUT of the playground (`math/playground/src/obstruction/`): the temporal core (`settling.mjs`, `floor.mjs`) settled and moved here.

- `cochain` — the cellular cohomology of the settled relation, read combinatorially over the floor (`@lenticule-science/metrologic/bilattice`): `cohomologyOfRelation` (builds the cellular complex from the witnessed cells; H⁰ = #connected components, H¹ = first Betti number, via union–find — no linear-algebra core), `settledRelation`, and `cohomologyOf`.
  It joined the package once its rebuild made it host-free.
