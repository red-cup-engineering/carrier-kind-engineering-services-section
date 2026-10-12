---
name: cosmological-settlement
kind: settlement
description: "A settlement whose entity-set is the spacetime-entity-set (events, regions, world-lines), whose predicates are cosmological observables (matter density, expansion rate, CMB temperature, curvature), whose closure-rules are general-relativistic field equations plus observational constraints from sub-settlements, with the astronomical-settlement appearing as a sub-settlement supplying galaxy-survey, supernova-survey, and distance-ladder data."
of: settlement-category
sub-settlements: [astronomical-settlement]
---

The **cosmological settlement** $\mathcal{C}$ is a settlement whose entity-set is the spacetime-entity-set (events, regions, world-lines), whose predicates are cosmological observables (matter density, expansion rate $H$, CMB temperature, curvature, dark-energy density), whose value bilattice records evidence accumulated from sub-settlements, and whose closure-rules are the Einstein field equations plus the standard cosmological-principle assumptions (homogeneity, isotropy at large scales) plus observational constraints.

## Sub-settlement relation to astronomical-settlement

The [astronomical-settlement](../astronomical-settlement/astronomical-settlement.md) is a sub-settlement of $\mathcal{C}$: galaxy surveys, supernova surveys, and distance-ladder anchors constrain $\mathcal{C}$'s predicates.
The cosmological settlement consumes the astronomical settlement's output.

Specifically, an observation-cell $(b, p, o)$ in $\mathcal{A}$ projects to a constraint on $\mathcal{C}$'s predicates via the cosmological model linking $b$'s position and redshift to the model parameters at that epoch.

## Internal regime structure

The cosmological settlement carries a temporal structure: the cosmic-time-as-settling-bound morphism slices $\mathcal{C}$ by cosmic-time, producing a sequence of epoch-sub-settlements.
The closure-rules at each epoch are the time-evolved Einstein equations.

The mediating-nucleus structure provides the substrate-realization of the relationship between distinct epochs: σ saturates against past sub-histories (the accumulated past of the universe); Δ transfers against possible extensions (the committed future).
The fixed-fiber $\mathrm{Fix}(\sigma) \cap \mathrm{Fix}(\Delta)$ is the standard cosmological-principle invariant: the universe at large scales.

## Open questions

The substrate has accumulated questions about $\mathcal{C}$: see `docs/dev/questions/`.
Notable threads include the relationship between baryogenesis and truth-symmetry-breaking, the inflationary epoch as rapid closure, the multiverse extension, the relationship between cosmological-settlement structure and world-structure (the wood-between-worlds metaphor).
