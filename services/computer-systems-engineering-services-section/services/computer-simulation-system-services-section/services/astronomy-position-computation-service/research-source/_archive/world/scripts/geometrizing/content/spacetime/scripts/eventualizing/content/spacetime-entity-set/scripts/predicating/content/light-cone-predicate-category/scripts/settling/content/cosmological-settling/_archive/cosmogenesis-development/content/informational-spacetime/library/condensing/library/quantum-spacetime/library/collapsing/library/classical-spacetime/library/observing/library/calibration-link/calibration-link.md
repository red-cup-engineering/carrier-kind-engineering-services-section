---
name: calibration-link
kind: morphism
domain: observer-instrument
codomain: observer-instrument
status: hacking
---

A **calibration-link is the morphism between two [observer-instruments](../observer-instrument/observer-instrument.md)** $o_1, o_2$ on a shared predicate $p$: a **residuated** relation $\kappa_{12}$ in the value bilattice that transports the evidence $o_1$ produces into $o_2$'s frame — $\kappa_{12}(v_1)$ is the value $o_2$ would record on the same body, in $o_2$'s admissible sub-bilattice.
It is the predicated form of the standard calibration chain: photometric zeropoints, wavelength tie-ins, parallax zero-point corrections — each link a relation between two instruments, each chain a composition of links.

## It composes, and its residuation propagates uncertainty

- **Composition.** Calibration-links compose functorially: $\kappa_{13} = \kappa_{23}\circ\kappa_{12}$.
  A network that is internally consistent is a functor; a closed loop with $\kappa_{ii}\neq\mathrm{id}$ via different paths is a *calibration error* exposed by the structure — the object of cross-survey audit.
- **Residuation.** Each link carries a right adjoint $\kappa^{*}$: when the link is not invertible (one instrument coarser than the other), an observation transports back not to a single value but to the *set* of consistent values.
  That residual spread is how uncertainty propagates — the same residuation the descent's nuclei already provide, not a hand-rolled one.

## Relation to the Hubble tension

The [hubble-tension](../../../cosmology/library/hubble-tension/hubble-tension.md) reads as a residuation failure: two inference closures whose meet carries less information than it should.
That is *structurally* the same shape as a calibration-link failure across the distance ladder — two evidence-producers that ought to reconcile by a residuated relation, whose joint evidence falls short.
Whether the two are literally **one construction** lifted from the instrument scale to the cosmological scale, or only a family resemblance, turns on exhibiting an explicit functor between them; until that functor is built it stays an open structural question, not an identity to assume (staged: `_archive/cosmology/predicated-astronomy/questions/calibration-link-as-residuation-bridge.md`).
