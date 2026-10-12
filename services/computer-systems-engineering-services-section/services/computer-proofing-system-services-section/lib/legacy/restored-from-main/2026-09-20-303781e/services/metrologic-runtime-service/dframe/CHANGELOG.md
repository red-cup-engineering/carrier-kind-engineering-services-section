# Changelog

All notable changes to `@lenticule-science/metrologic/dframe` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] — unreleased

### Added

- `cohomology` — the d-frame-valued (bigraded) cohomology of a substitution settling: `SIDE_CONTRIBUTION` (each bilattice value's `(L₊, L₋)` contribution, read off the floor's charge via `@lenticule-science/metrologic/chu/four`), `classifyFiring`, `perFiringDframe`, and `dframeCohomology` (the per-firing structure, firing-type counts, the `Ab`-valued rank over our ℤ, and the bigraded `(truth side, falsity side)` shadow).
- `orbits` — the composed-duality (strong-MLD) orbit classification: `classifyOrbitType` (self-dual / truth-only / falsity-only / exchange-mixed / mixed) and `verifyComposedSelfDuality` (composed self-duality ⟺ every firing `⊤`/`⊥` ⟺ firing-pattern self-duality under negation, reusing the `@lenticule-science/metrologic/verdier` gauge).
- Law/property test suites over named structural substitution fixtures.

This is a migration OUT of the playground (`math/playground/src/dframe/`): the bigraded d-frame cohomology and the strong-MLD orbit classification settled and moved here, built on the now-stable `@lenticule-science/metrologic/number` and `@lenticule-science/metrologic/verdier`.
