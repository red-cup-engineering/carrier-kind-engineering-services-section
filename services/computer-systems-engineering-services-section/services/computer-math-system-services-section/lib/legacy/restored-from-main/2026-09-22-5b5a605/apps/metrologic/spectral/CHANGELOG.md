# Changelog

All notable changes to `@lenticule-science/metrologic/spectral` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] — unreleased

### Added

- `inversion` — the spectral inversion duality z ↦ 1/z over our integers (`@lenticule-science/metrologic/number`): `reciprocal` (p ↦ p* = reversed coefficients, an involution — the spectral face of M ↦ M⁻¹ and the Anderson–Putnam colimit's ×M-invertibility), `isSelfReciprocal`, `resultant` (the Sylvester determinant, pure ℤ), `sharesRoot`, and `inversionSymmetric` (res(p, p*) = 0 — the self-dual / on-circle locus is non-empty; the spectral analog of the Klein gauge's fixed set {⊤, ⊥}).
- `location` — root-location relative to the unit circle: `mobius` (the Cayley map z = (1+w)/(1−w) to the half-plane), `rightHalfPlaneRoots` (the Routh array re-derived as the even/odd Sturm sequence — its first-column sign changes are the Cauchy index, over our ℚ), `rootLocation` (expanding/contracting/ neutral counts, exact in the non-degenerate case), and `isPisot` (one expanding root, none neutral).
- Law test suites (`inversion`, `location`).

This is a migration OUT of the playground (`math/playground/src/spectral/`): the inversion duality and root-location settled and moved here, built on the now-stable `@lenticule-science/metrologic/number`.
The full root count for the degenerate (on-circle) case — Salem / cyclotomic exact splits — and Perron/Mahler readings remain to be derived.
