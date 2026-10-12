---
name: flow
kind: morphism
description: "The directed dynamic of recognition across redshift: a Kock–Zöberlein comonad on cosmology cells. Flow propagates a recognition E(z) to its evolved form E(z+Δz) (comultiplication δ, propagation) and resolves it back to the present (counit ε, resolution), with KZ-laxity preventing over-propagation. Flow-stable fixed points (Close∘Flow(x)=x) are the dynamically self-consistent recognitions. This is the temporal/closure-axis (H¹_t) reading of disequilibrium, dual to the static fibration-axis (H¹_top) reading carried by hubble-tension."
domain: cosmology
codomain: cosmology
kind-of: kz-comonad
member-of: cosmology
status: hacking
---

> **Reframe (merge):** cosmic-scott = **classical-spacetime** (golden φ); "cosmos" = the field.
> Flow propagates *within* the classical band; the H¹_t derivation below holds unchanged.

**Flow** lifts the predecessor *dynamic-sufficiency* paper's `Flow` operator onto the live spine.
It is the directed dynamic of recognition across redshift — a **Kock–Zöberlein comonad** on [cosmology](../../cosmology.md) cells.

## The comonad

Flow is an endofunctor on cosmology with

- **counit** $\varepsilon_x : \mathrm{Flow}(x) \to x$ — *resolution*, collapsing a propagated recognition back to the present epoch;
- **comultiplication** $\delta_x : \mathrm{Flow}(x) \to \mathrm{Flow}(\mathrm{Flow}(x))$ — *propagation*, carrying the inference forward to the next epoch;

subject to the KZ coherence laws (right unit $\varepsilon_{\mathrm{Flow}(x)} \circ \delta_x = \mathrm{id}$, lax idempotence $\mathrm{Flow}(\varepsilon_x) \circ \delta_x \geq \mathrm{id}$, coassociativity).
The laxity is what makes stabilization *asymptotic* rather than abrupt: no over-propagation.

On the spine this is the **dualized closure 2-comonad** restricted to cosmology — the formal dual of the closure/nucleus (KZ-)monad that the [nuclei triad](../../../../../../../../../../transferring/transferring.md) builds.
Closure thermalizes; Flow is its comonadic dual that propagates and then resolves.

## Why Flow is the temporal-axis reading of the tension

The [hubble-tension](../hubble-tension/hubble-tension.md) cell measures the disagreement between two thermalizings of *one* cosmos-cell — a static $H^1$ on the **fibration axis** ($H^1_{\text{top}}$, GENEALOGY §1).
Flow measures something orthogonal: how a single recognition propagated across redshift fails to glue with the recognition actually obtained at the later epoch.
That is the **closure / temporal axis** ($H^1_t$).
The predecessor's dynamic gap

$$
g(z, \Delta z) = 1 - \frac{V\big(\mathrm{Together}(\mathrm{Flow}(E(z)),\, E(z+\Delta z))\big)}
                          {V\big(\mathrm{Either}(\mathrm{Flow}(E(z)),\, E(z+\Delta z))\big)}
$$

is the value of the $H^1_t$ class. **Flow-stability** — $\mathrm{Close}(\mathrm{Flow}(x)) = x$, equivalently $g(z,\Delta z) \to 0$ — is the orbit closing on the temporal axis: an inference system that is dynamically self-consistent across redshift (an attractor).

The two readings are the two strictly-commuting axes of the bigraded diamond (GENEALOGY §5): static residuation failure between pipelines ($H^1_{\text{top}}$) and dynamic propagation drift across redshift ($H^1_t$).
The Hubble tension is visible on both.

## Role in the stage-offset

Flow carries the **early-time** (CMB) state forward from the past to the present — propagation *within* cosmos's **cosmic-scott** band (κ=ω, golden φ), from stage τ_CMB to stage τ_now.
Both the early- and late-time readings are cosmic-scott (golden φ), so Flow relates two *stages* of the one golden spiral.
See [[cosmic-scott-posit]] and the [hubble-tension](../hubble-tension/hubble-tension.md) **stage-offset**.
