# Changelog

All notable changes to `@lenticule-science/metrologic/bilattice` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `charge` no longer implements the Charge/FOUR bilattice. Every join, meet, involution and order is now `@lenticule-science/articulating/predicating/positing/bilattice-charge`'s — the one implementation, which enumerates and self-verifies its own bilattice laws (`chargeBilatticeLawReceipt`) and ties its Klein-four gauge to the Lean theorem `RelMath.KleinFour.K4.isGroup`. `charge.mjs` is now a representation binding only: side bit ⇄ `ChargeSide`, bare witness ⇄ mark payload. The public surface (`present`, `isTop`, `negate`, `conflate`, the four joins/meets, `leqKnowledge`, `compareKnowledge`, `aggregate`) and the `{ value, evidence }` shape are unchanged; 6041 differential comparisons against the superseded implementation, across every value pair and a battery of evidence carriers, agree exactly.
- Evidence accumulation follows the owner's `mergeEvidence`, which merges by structural content coincidence rather than by `JSON.stringify`. Two readings change, both corrections: a carrier already holding a literal duplicate witness now collapses it (unreachable through this package's own API, which never produced such a carrier), and two objects differing only in key order now count as one witness (`coincides` is key-order insensitive, so coincidence survives a transport round trip).
- `compareKnowledge`'s refusal is now the owner's `TypeError`, with the owner's message.

### Removed

- `internal.mjs`'s `union` — the local evidence-accumulation rule, superseded by the owner's `mergeEvidence`. `stringify` remains for structural keying in `descent`/`cone`/`void`.
- The "zero dependencies" claim. The package now depends on `@lenticule-science/articulating`; the browser faces that vendor these sources must carry it too (see the section record `data/records/2026-09-10-metrologic-bilattice-charge-delegation.json`).

## [0.0.2] — unreleased

### Added

- `test/` — the kernel's 41 property tests (`laws.mjs`, `descent.mjs`, `structure.mjs`), ported from `@561/development.active.math-kernel` and retargeted at this package's named exports, reshaped into discrete `node:test` cases. Previously the recreation was validated once via the byte-for-byte parity check below but shipped no runnable suite of its own; `node --test` now runs the algebraic laws, the descent integration properties, and the structural morphism properties directly against `../src/*.mjs` on every run.

## [0.0.1] — unreleased

### Added

- `charge` — the carrier and its value-algebra: `present`, `isTop`, the two involutions (`negate`, `conflate`), the knowledge and truth joins/meets, `leqKnowledge`, `compareKnowledge`, `aggregate`.
- `descent` — the four-regime descent (`articulate`, `predicate`, `cohere`, `posit`, `commutate`), the modal generators (`possibilize`/`necessitate` on both orders, with their `raise`/`lower` steps), `settle`, and `compare` (the consistent / paraconsistent split).
- `cone` — the cone duals: `brim`, `adjudicate`, `presume`.
- `void` — the void reads (`gap`, `vanish`), the transfinite complement (`estrange`), and the aperiodic monad (`saturate`, `transfer`, `twistor`, `precipitate`).
- Property/law test suites (charge algebra, descent end-to-end, cones, void).
- The kernel's `docs/learning/` (tutorials / how-to / reference / explanation), rewritten for this package's named-export layout.

This is a from-scratch, best-practices recreation of `@561/development.active.math-kernel`, verified byte-for-byte against it (145 deep-strict-equal parity checks across the charge algebra, the descent, both cone pairs, the void reads, and the aperiodic monad).
It is a recreation, not a move: the old kernel remains in place so consumers migrate at their own pace.
