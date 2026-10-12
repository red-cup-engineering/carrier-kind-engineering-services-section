# DAG

Orbit graph of the bypass DAG over a Carrier of Events. Each spec file
in the source corpus *is* a position; the order is subset inclusion.

## Toys

- [`engine.py`](engine.py) — Relational geometry from spec/ frontmatter.
  Defines Carrier = frozenset[Event], Empty, Extend, Order; grows the
  orbit graph from the source spec/ tree.
- [`measure.py`](measure.py) — Grows the orbit graph from spec/ and
  prints geometric measurements.
- [`bypass.py`](bypass.py) — Interval zeta from tiling carrier
  positions through the bypass orbit. EventCommutation(a,b) holds when
  a.key == b.key; bypass step swaps an event for any commuting one;
  the bypass orbit is the closure under such swaps.
- [`relational_order.py`](relational_order.py) — Implementation of
  `Foundation.lean`, `Reach.lean`, `Zone.lean`, `Level2.lean`. Strings
  are opaque datums; the code only ever asks `a.key == b.key`
  (EventCommutation) and `a.value == b.key` (DependsOn).
- [`strata.py`](strata.py) — Full measurement catalog across DependsOn
  strata. Shadow types: H* (image, both nuclei fix), Kind-1
  (saturation-shadow, σ fixes Δ doesn't), Kind-2 (transfer-shadow, Δ
  fixes σ doesn't).
- [`truth-energy-probe.py`](truth-energy-probe.py) — RITM "energy law
  of truth" simulator with a Kalman decoder, adjoint-canceling control,
  mutual-information floor, and a 5% noise window. Self-contained
  (numpy/pandas/matplotlib); outputs measurement series and animated
  plots.
