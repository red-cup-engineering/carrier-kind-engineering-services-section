# Changelog

All notable changes to `@lenticule-science/metrologic/number` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] — unreleased

### Added

- `natural` — ℕ as a settled membership extension (von Neumann), on `@lenticule-science/metrologic/{bilattice,chu}`: `zero` (REACHED, not seeded), `successor` / `predecessor`, `add` / `multiply` / `monus`, `divmod` / `gcd`, the orders (`leq`, `less`, `compare`, `isMember`), the Chu extension reads (`asExtension`, `extensionOf`), and the counting boundary (`toCount`, `fromCount`).
- `integer` — ℤ as the charge's two-sided evidence read as a difference, on `./natural`: `integer` / `fromNatural`, `negate` (the additive inverse = swap the two sides), `add` / `subtract` / `multiply`, `divmod` / `quotient` / `divides`, `sign` / `magnitude` / `compare`, the evidence-balance relation (`equivalent`), and the boundary (`toInt`, `fromInt`).
- `rational` — ℚ as ratios, the multiplicative two-sidedness and the residual ⊸, on `./integer` and `./natural`: `rational` / `fromInteger`, `reciprocal` (the multiplicative inverse = swap), `divide` (the residual a ⊸ b), `add` / `subtract` / `multiply` / `negate`, `sign` / `compare`, and the boundary (`fromInt`, `fromRatio`, `toNumber`).
- `matrix` — the exact integer-matrix layer over ℤ, on `./integer`: `determinant`, `charPoly` (det(λI − M)), `smithNormalForm`, `rank`, plus `transpose`, `matmul`, `matEqual`, and `fromInts`.
- Law test suites (`natural`, `integer`, `rational`, `matrix`).

This is a migration OUT of the playground (`math/playground/src/number/`): the number tower, settled and moved here verbatim.
The playground keeps thin re-export shims onto this package so its modules continue to import the tower unchanged (and share a single interned-carrier instance).
