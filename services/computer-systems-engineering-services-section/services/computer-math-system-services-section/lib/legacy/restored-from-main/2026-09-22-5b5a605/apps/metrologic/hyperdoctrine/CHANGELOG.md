# Changelog

All notable changes to `@lenticule-science/metrologic/hyperdoctrine` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — unreleased

### Added

- `order` — the two σ-dual orders as operation bundles: `KNOWLEDGE`, `TRUTH`, `orderOps`, `orderKind`, `designated`, `sameValue`. Delegates to `@lenticule-science/metrologic/bilattice/charge`; the truth order's `≤` is derived from `leqKnowledge` via the σ-conjugation the bilattice laws already prove, not re-derived.
- `morphism` — hand-rolled validation for finite index morphisms and fiber completeness: `assertMorphism`, `assertFiberComplete`. No JSON-schema, no `ajv`.
- `adjoints` — the fibration: `reindex` (pullback `u*`), `existsAlong` (`∃_u`, left adjoint), `forallAlong` (`∀_u`, right adjoint), `meetFiber`/`leqFiber` (the pointwise fiber algebra), `pullbackSquare` (the base-change square Beck–Chevalley is stated over).
- `comprehension` — Lawvere comprehension: `comprehend` (`{i : φ(i) is designated}`), `extend` (its adjoint inverse).
- Property-test suites proving `reindex ⊣ existsAlong` and `forallAlong ⊣ reindex` (`test/adjoints.test.mjs`), Frobenius reciprocity (`test/frobenius.test.mjs`), Beck–Chevalley (`test/beck-chevalley.test.mjs`), and the comprehension adjunction (`test/comprehension.test.mjs`) — all on random finite fibrations at both orders.

This is a from-scratch recreation of the mathematical content of the legacy `voidmath` package's `predication-fibration`/`predication-hyperdoctrine` modules (its quantifier adjoints, Frobenius reciprocity, Beck–Chevalley, and Lawvere comprehension proof witnesses under `tests/prove-predication-*.mjs`), restated over a general finite fibration and the real bilattice charge algebra. voidmath's six-level JSON-schema/`ajv`-validated directory architecture is not ported — only the theorems are, with hand-rolled validation and zero runtime dependencies. Opt-in: nothing in `@lenticule-science/metrologic/bilattice` depends on this package.
