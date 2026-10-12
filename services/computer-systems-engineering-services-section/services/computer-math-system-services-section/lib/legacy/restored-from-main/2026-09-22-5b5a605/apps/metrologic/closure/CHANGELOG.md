# Changelog

All notable changes to `@lenticule-science/metrologic/closure` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] — unreleased

### Added

- `ordinal` — constructive ordinal notations (zero / succ / limit-with-fundamental-sequence): `zero`, `succ`, `limit`, `isZero`/`isSucc`/`isLimit`, `fin`, `plusFin`, `OMEGA`, `omegaTimes`, `OMEGA_SQ`, `toFinite`, `show`.
- `iterate` — transfinite iteration of a monotone operator: `approx` (the approximant F(α) as a fold over the notation), `orbit` (the runnable ω-part), `stabilizingSup`.
- `closure` — `closureOrdinal` (the least fixed point and its regime), `leastFixedPoint`, `regimeOfOrdinal` (the four-regime classification by the shape of κ).
- `lattices` — regime witnesses `reachability` (finite), `omegaPlusOne` (κ=ω+1), `tower` (aperiodic), and `fromBilattice` — the bridge that recovers the floor's `settle` as the finite-regime (κ<ω) restriction.
- The law test suite.

Migrated out of the playground (`math/playground/src/closure/`), built on `@lenticule-science/metrologic/bilattice`.
