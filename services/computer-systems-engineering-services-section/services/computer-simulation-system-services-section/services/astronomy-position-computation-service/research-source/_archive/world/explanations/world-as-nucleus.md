---
type: definition
class: nucleus
symbol: "W"
status: draft
depends-on: []
realizes: [world]
see-also: [wood-between-worlds]
---

# World as nucleus

Fix an ambient relational category $\mathsf{R}$ with finite limits, exponentials, and a subobject classifier. Objects of $\mathsf{R}$ are called **nuclei**; each nucleus $X$ carries:

- a **quasicrystalline structure** $\mathrm{QC}(X)$ (finite local complexity, aperiodicity);
- an **internal flow category** $\mathrm{Flow}(X)$ describing the allowable relational transitions within $X$.

A morphism $f : X \to Y$ in $\mathsf{R}$ *preserves structure* when $\mathrm{QC}(Y)$ pulled back along $f$ is compatible with $\mathrm{QC}(X)$ and $\mathrm{Flow}(X)$ maps functorially to $\mathrm{Flow}(Y)$.

## World conditions

A nucleus $W$ is a **world** when:

- **(W1) Internal connectedness.** $W$ is internally connected under $\mathrm{Flow}(W)$.
- **(W2) Time-like endomorphism.** $W$ has a designated $T_W : W \to W$ that acts dynamically on its states.
- **(W3) Non-degeneracy.** $\mathrm{QC}(W)$ has no global degenerations.

Writing **Worlds** $\subseteq \mathsf{R}$ for the full subcategory of all worlds.

## Cosmological reading

A world in this categorical sense is the formal counterpart of [world](../../multiverse/terms/world.md) in the multiverse subdomain — a self-contained universe-like region with internal time and non-degenerate structure. (W1) is *worlds are not disconnected pluralities*. (W2) is *worlds have a notion of when*. (W3) is *worlds are not pools or holes themselves; their structure is non-degenerate everywhere*. The conditions are weak — they pick out *what could plausibly be called a world* without committing to any specific cosmological content (no metric, no Einstein equations, no specific $\mathrm{QC}$-pattern).

## Status

Draft. The structure is well-typed; the bridge to a working cosmology — choosing $\mathsf{R}$, $\mathrm{QC}$, and $\mathrm{Flow}$ so that, e.g., the [predicated-cosmology](../../predicated-cosmology/_index.md) [cosmological settling](../../predicated-cosmology/objects/cosmological-settling.md) instantiates as a single world in this sense — is open. Specifically: which features of the cosmological settling are $\mathrm{QC}$ data and which are $\mathrm{Flow}$ data is not yet pinned down.

## Provenance

Translated from §2.1–§2.3 of [`wood-between-worlds.md`](../../../../../../work/triage/engineering-archive/library/humanities/theories/philosophy/theories/relationality/triage/provenance/math-from-relationality-bucket/wood-between-worlds.md).
