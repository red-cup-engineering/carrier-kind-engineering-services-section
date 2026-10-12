---
name: observer-instrument
kind: cell
member-of: observing
status: hacking
---

An **observer-instrument is the fiber [observing](../../observing.md) reads through** — the concrete evidence-producer: a (telescope, focal-plane instrument, observing program, calibration pipeline) that, at a given epoch, evaluates a definite set of predicates on bodies and emits bilattice values for the resulting [observation-cells](../observation-cell/observation-cell.md).
It is the [observer-stage](../../../cosmology/library/observer-stage/observer-stage.md) made concrete: not an abstract evidence-accumulator somewhere in the field, but a piece of operating hardware with a definite signature — a filter set, a wavelength range, an angular resolution, a sensitivity floor, a saturation ceiling, a duty cycle.

## Selection effects are the instrument's admissible sub-bilattice

Each instrument can land values only in its **admissible-value sub-bilattice** — the part of the charge lattice it can actually witness.
Every selection effect is exactly this restriction: a property of the instrument's reach, never of the underlying population.
Two instruments looking at the same body produce evidence in *different* sub-bilattices of the one charge structure, which is why reconciling them — a Hubble image with a JWST spectrum, a TESS lightcurve with an ESPRESSO radial-velocity series — requires an explicit [calibration-link](../calibration-link/calibration-link.md) and is not automatic.
(Staged: `_archive/cosmology/predicated-astronomy/concepts/observer-instrument.md`.)
