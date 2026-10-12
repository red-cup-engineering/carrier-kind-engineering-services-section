---
type: definition
class: settling
realizes: [cosmic-time-as-settling-bound, causal-evidence]
symbol: "(v_t)_{t \\geq 0}"
status: draft
depends-on: [predication-settling, spacetime-entity-set, light-cone-predicate-category, cosmic-time]
---

# Cosmological settling

Fix the [spacetime entity set](spacetime-entity-set.md) $E_{\mathrm{cos}}$, the [light-cone predicate category](light-cone-predicate-category.md) $\mathcal{C}_{\mathrm{cone}}$, a value bilattice $\mathbf{L}$ (the four-bilattice $\mathbf{FOUR}$ in the simplest setting; a [residuated lattice](../../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/residuated-lattice.md) more generally), and [cosmic time](../../theories/evolution/terms/cosmic-time.md) $t \in \mathbb{R}_{\geq 0}$ as [settling bound](../../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/settling-bound.md). The **cosmological settling** is the [predication settling](../../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/predication-settling.md)

$$v_{\mathrm{cos}} = (v_t)_{t \geq 0}$$

over $(\mathbf{L}, \mathcal{C}_{\mathrm{cone}}, E_{\mathrm{cos}}, \mathbb{R}_{\geq 0})$ in which:

- Each $v_t : \mathcal{C}_{\mathrm{cone}} \to \prod_p A_p$ is a [predication valuation](../../../../../../../../../../../../../../../../../../../../../../../../../../../../science-services-section/services/information-science-services-section/services/math-services-section/content/text/glossary/terms/predication-valuation.md) assigning to each physical-observable predicate $p$ a bilattice element $v_t(p)(e, e')$ for each pair $(e, e') \in E_{\mathrm{cos}} \times E_{\mathrm{cos}}$.
- The family is [settling-monotone](../../../../../humanities/theories/math/theories/categories/theories/predication-categories/concepts/settling-monotonicity.md): $s \leq t \implies v_s(p)(e, e') \leq_k v_t(p)(e, e')$ pointwise in the [knowledge order](../../../../../humanities/theories/math/theories/categories/theories/predication-categories/concepts/knowledge-order.md).
- The closure-rule system that drives successor steps is the laws of physics restricted to light-cone-respecting reindexings: a rule firing at cosmic time $t$ at event $e$ can consume only values whose causal support lies in the past light cone of $e$, and produces values at $e$ or in $e$'s future light cone (cf. [light-cone-predicate-category](light-cone-predicate-category.md)).

## What this object is claiming

The claim is that the universe's evolving physical state is a predication settling, in the technical sense — not merely *like* one. The four equational requirements:

1. **State is a predication valuation.** At each cosmic time, the universe's state is fully captured by an assignment of bilattice values to (event, predicate, event) cells. Standard cosmological observables (CMB temperature, scale factor, density) are projections of this assignment onto specific predicates.
2. **Time is a settling bound.** Cosmic time orders states monotonically in $\leq_k$.
3. **Causality is the closure-rule locality.** Light-cone restriction is the only admissible reindexing of values from one event to another.
4. **The cosmological principle is a settling symmetry.** When it holds, the settling is invariant under the spatial isometry group at each comoving slice. See [cosmological-principle-as-symmetric-settling](../theorems/cosmological-principle-as-symmetric-settling.md).

## What is not yet specified

Three pieces of structure are deliberately left open at the founding level:

- The **specific value bilattice** $\mathbf{L}$. $\mathbf{FOUR}$ suffices for "told / told-not / told-both / told-nothing" cosmology. Continuous-amplitude observables will require a [continuous-valued settling](../../../../../../../../../../../../../../../../../../../../../../../../../../../../science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/lib/obsmetrologia/docs/verso/mark/content/utterance/articulating/content/articulation-cell/content/potential-articulation-cell/predicating/content/predication-cell/content/potential-predication-cell/positing/content/valuation/content/knowledge-least-valuation/settling/content/continuous-valued-settling/continuous-valued-settling.md) refinement.
- The **explicit closure-rule system**. Writing the Einstein equations and the Standard Model as a closure-rule system in $\mathcal{C}_{\mathrm{cone}}$ is open work. The framing claims it is possible; the construction is unfinished.
- The **boundary condition at $t = 0$**. The Big Bang as a settling-initial state with all cells at $\bot$ except for a small set of "primordial" cells (the inflationary perturbation spectrum, the initial matter content) is a candidate framing; alternatives where the universe begins in a quiescent past sub-settling are also open.

## Status

Draft. The settling object is well-typed and the dependencies discharge, but no closure-rule system has been written down explicitly, and the bridge to specific Lambda-CDM observables is sketch-level only. The first concrete check — that the [cosmological-principle-as-symmetric-settling](../theorems/cosmological-principle-as-symmetric-settling.md) theorem reduces, after symmetry reduction, to the [Friedmann equations](../../theories/evolution/terms/friedmann-equations.md) on the scale factor — is open.
