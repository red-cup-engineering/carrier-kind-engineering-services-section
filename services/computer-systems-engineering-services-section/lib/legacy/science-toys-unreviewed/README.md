---
title: "Science-toys: unreviewed after two passes"
date-created: 2026-09-10
tags: []
---

This directory holds real code and prose recovered from two separate `lib/legacy/` snapshots during the 2026-08-31 campaign's legacy sweep, each of which survived at least two rounds of review without reaching a confident absorb/delete verdict — genuine remaining uncertainty, not a first-resort dump.

The items below are from `lib/legacy/2026-06-17-science-toys/`. Each subdirectory's own `.md` explains what it claims to be; what follows is why each is still open.

- **`collatz/events.py`** — an event-driven "local-fibre delta" RITM variant apparently designed to never stabilize, unlike the sibling `sim.py` model (already confirmed superseded by the live `testing-collatz-stabilization-with-ritm.org` and deleted). Possibly a genuinely distinct non-confluence companion object; not confirmed either way.
- **`crystals/seed.py`** — self-described as a "Python mirror of Core/Foundation.lean," but no live Lean file by that name was found, and a same-claiming file in `dag/relational_order.py` differs from it. Real, working code; unplaced.
- **`dag/{bypass,engine,measure,relational_order,strata,truth-energy-probe}.py`** — `strata.py` is a substantial number-theoretic measurement catalog (Galois-even/odd defect, nuclear-magnetization asymptotics, Kronecker-symbol structure) whose theoretical predictions already appear in `content/text/documents/articles/notes/2026/04/06/2026-04-06-note-on-finite-relational-math-catalog.md`, but no live copy of the executable verification itself was found. `truth-energy-probe.py` is a real Kalman-filter/control simulation with no live "truth-energy law" document to check it against. `relational_order.py` makes the same unverified "Python mirror of ...lean" claim as `crystals/seed.py`, differently.
- **`modal-lab/matrix.py`** — a self-contained categorical Inc/Quo/Res/Itr construction, unconnected to the `ritm_core`-based modal engine already absorbed into `content/text/documents/articles/notes/2026/08/20/ritm-core-posetal-simulator.org`. Could not be placed against any existing document.
- **`compression/*`** — a real algorithmic benchmark (varint serialization; RO levels 0-4 including genuine Mazurkiewicz-trace canonicalization; benchmarked against zlib/bz2/lzma/zstd/lz4/brotli). Not cross-checked against any specific live claim.

If revisited: the highest-value next step is probably `dag/strata.py`, since it is the only one with a specific, already-live theoretical prediction to verify against.
