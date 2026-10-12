# Changelog

All notable changes to `@lenticule-science/metrologic/equality` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — unreleased

### Added

- `diagonalMorphism` — the Lawvere diagonal `g : E → E×E, e ↦ (e, e)` over a finite entity list, as a real `@lenticule-science/metrologic/hyperdoctrine` `IndexMorphism`.
- `pairKey`/`pairKeys` — the `E×E` index-key encoding (`JSON.stringify([s, o])`) the diagonal's target index set and every derived-equality fiber are addressed by.
- `equalityAlongDiagonal(entities, order)` — `∃_g(1^order)`: `existsAlong` applied to `diagonalMorphism` and the diagonal terminal (the fiber constant at `order`'s designated/top charge), the one construction both public equalities instantiate.
- `classicalEquality` — `=_E := ∃^t_g(1^t)` (truth order): `t` where `s = o`, `f` otherwise.
- `paraconsistentEquality` — `Δ^k_E := ∃^k_g(1^k)` (knowledge order): `⊤` where `s = o`, `⊥` otherwise.
- `equalityAt` — reads a derived-equality fiber at `(s, o)`.
- Test suite proving both equalities' two-valued verdicts, that they are computed through `existsAlong` on the diagonal (not a `s === o` shortcut at the call site — reconstructed and compared cell-for-cell against an independent `existsAlong` call), and that they agree on where they hold while landing in different orders.

Ported from `Obsmetrologia/Language/Predicating/Equality.lean` (obsmetrologia, Lean 4). No new quantifier machinery: this package's whole contribution is the diagonal morphism and its two order instantiations, built entirely on `@lenticule-science/metrologic/hyperdoctrine/adjoints`'s `existsAlong`. Opt-in of an opt-in: nothing in `bilattice` or `hyperdoctrine` depends on this package.
