# Changelog

All notable changes to `@lenticule-science/metrologic/verdier` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] — unreleased

### Added

- `substitution` — a substitution as the monoid endomorphism `σ*: A* → A*`: `substitute`, `iterate`, `orbit`, `fixedPointClosure` (the `(lattice, phi)` pair the closure module measures), and `abelianize` (the substitution matrix DERIVED as the morphism's commutative shadow on `ℤ^A`, over our integers).
- `spectral` — the spectral tests the regime turns on: `charPoly`, `isPrimitive` (strict-positivity of matrix powers over our ℤ), `isPisot` (delegating to `@lenticule-science/metrologic/spectral/location`), `perronPoly`, and `perronConvergent` (exact rational convergents over `@lenticule-science/metrologic/number/rational`).
- `verdier` — the Anderson–Putnam direct-limit homology: `colimStructure` (the colimit `colim(ℤⁿ, M)`'s rank, determinant, Smith form, active determinant, and structure label), `verdierDual` (`H¹ ≅ H₁` checked over our ℤ), `verdierHolds`, `stepNInvariant`.
- `gauge` — the d-frame value-category Klein-four gauge on `FOUR`: `GAUGE` (read off the floor's involutions `negate`/`conflate`), `fixedSet`, `firingPatternSelfDual`, `inducedPermutation`, `substitutionRuleSelfDual`.
- Re-exported integer linear algebra from `@lenticule-science/metrologic/number/matrix`.
- Law/property test suites over named structural substitution fixtures.

This is a migration OUT of the playground (`math/playground/src/verdier/`): the substitution morphism, the spectral tests, the Anderson–Putnam Verdier duality, and the Klein-four gauge settled and moved here, built on the now-stable `@lenticule-science/metrologic/number` and `@lenticule-science/metrologic/spectral`.
The categorical derived equivalence of sheaves and cosheaves remains out of scope (the corpus's one real open gap).
