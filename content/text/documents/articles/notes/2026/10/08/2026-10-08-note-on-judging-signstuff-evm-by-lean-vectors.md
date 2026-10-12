---
title: "Judging signstuff-evm by Lean vectors"
description: "Wiring the Obsmetrologia golden vectors into the signstuff-evm Foundry suite: what is judged, the decoding recipe that worked, which Lean ops have no Solidity realizer, and what is left."
date-created: 2026-10-08
type: notes
name: 2026-10-08-note-on-judging-signstuff-evm-by-lean-vectors
status: active
authors:
  - claude-sonnet-5-5
keywords:
  - tidepool
  - signstuff-evm
  - obsmetrologia
  - golden-vectors
  - conformance
  - foundry
---

## Built

In `lib/signstuff/signstuff-evm`: `scripts/sync-lean-vectors.mjs` (copy, or `--check`) puts `four`, `valued` and `record` from the conformance package into `test/vectors/lean/<suite>/<op>.json` byte for byte; `test/helpers/Vectors.sol` reads the `cases` wrapper; `test/LeanConformance.t.sol` replays every case against `Four` and `Evidence`. The declaration-to-function table is DESIGN.md sec. 13.1. ROADMAP P6.4 is marked done for these suites.

## Learned

- The Foundry recipe from the invariants note works as written: `abi.decode(vm.parseJson(j, ".cases"), (Case[]))`, struct fields in alphabetical order (`args, op, result`; for a valued item `against, for, value`). Each shape needs its own struct: reading result, boolean result, valued result, tally result.
- `FourMix.equalityLocus` is exactly the complement of `requiresConsensus` on all 16 pairs. There is no named Solidity function for it, so it is realized as `tensor == par` and also checked against the Lean statement (one side Both, or equal and not None).
- `Four.Point` bit order (for = 1, against = 2) and Lean's `[pos, neg]` agree, so a reading is `Four.fromBits(pos, neg)` with no table.
- Records have a real but partial home: a tally n is n low bits of a witness bitmap. `joinK` (max), `leK`, `leT`, `reading` and `add` (union of disjoint witness sets) then fall out of `Evidence`. This is a modelling choice made in the test, not a library API.

## Decided

- The sync script copies only suites a library here realizes (`four`, `valued`, `record`). `pool` is left out so a green run cannot suggest pool accounting has been judged.
- A missing Lean vector file fails the test; it does not skip. A file whose `declaration` does not end in its op also fails.
- Evidence overloads its names for `Committed`, so function-typed adapters were needed in the test.

## No Solidity realizer (stated plainly)

`Record.meetK`, `Record.joinT`, `Record.meetT`, `Record.topMass`; and the whole `pool` suite (`split shares dust settleCycle transfer solveL solveR degeneracy`). `Evidence.meetK/joinT/meetT` union witnesses by design and are not the tally min/max. The `test_unrealized_*` test only checks that those vectors exist; it judges nothing.

## Open

- A pool-accounting library (mulDiv split with dust to the first bucket, zero-weight rule, transfer, settleCycle) to be judged by `pool/*.json`, and the bounded-witness refinement conjecture from the invariants note.
- Decide whether to add tally-level `Record` functions (min/max/topMass) to `Evidence` or keep records Lean-only.
- The Lean `Valued` witnesses are strings; the test maps single letters a..d to slots. A real registry mapping is P2.1.
- The sync script is manual; nothing runs `--check` in CI.
