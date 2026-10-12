---
name: observation-cell
kind: cell
member-of: observing
generated-by: observing
status: hacking
---

An **observation-cell is what [observing](../../observing.md) produces**: a triple $(b, p, o)$ — a body $b$, a predicate $p$ (apparent magnitude in a filter, radial velocity at an epoch, transit depth, …), and the [observer-instrument](../observer-instrument/observer-instrument.md) $o$ that produced it — carrying a bilattice value $v(b,p,o) \in \mathbf{L}$.
It is a **recognition of a field-cell** (a local thermalizing of the evidence to a charge), indexed by the instrument that recognized it.
It is exactly the "cosmology cell" [cosmology](../../../cosmology/cosmology.md) is built from.

## The value is a bilattice charge, not a real number ± error

A saturated detection, a non-detection, a confused-source ambiguity, and a clean unambiguous detection are *different bilattice elements* (the four charges ⊥/t/f/⊤), not different points on the real line.
Standard astronomy compresses this into "value ± uncertainty," which is fine for routine work but loses exactly the boundary information — upper limits, blended sources, instrumental artefacts — that the charge keeps.
The observation-cell keeps it because it is a cell of the same two-fold the whole descent is built from.

## Combination

Observation-cells of the same field-cell across instruments combine by the bilattice operations: the **meet** $\wedge_k$ when the instruments are cross-calibrated (joint evidence) and the **join** $\vee_k$ when they are merely accumulated (the union of evidence, at possibly higher uncertainty).
When the meet carries *less* information than it should, the instruments disagree — and that deficit is the $H^1$ obstruction a [calibration-link](../calibration-link/calibration-link.md) exists to diagnose.
(Staged: `_archive/cosmology/predicated-astronomy/concepts/observation-cell.md`.)
