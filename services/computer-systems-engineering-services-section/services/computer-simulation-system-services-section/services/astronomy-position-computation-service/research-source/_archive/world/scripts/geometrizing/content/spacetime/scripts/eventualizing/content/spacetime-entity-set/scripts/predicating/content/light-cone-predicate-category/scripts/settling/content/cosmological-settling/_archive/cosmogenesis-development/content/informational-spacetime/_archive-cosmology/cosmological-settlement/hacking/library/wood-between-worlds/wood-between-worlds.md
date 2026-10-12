---
type: definition
class: mediator
symbol: "\\mathrm{Wd}"
status: draft
depends-on: [world-as-nucleus, hole, portal, isotropy, mediating-nucleus]
realizes: [hyperverse]
see-also: [wood-uniqueness-up-to-isotropy, wood-as-initial-mediator]
---

# The Wood Between the Worlds

Fix a family of [worlds](world-as-nucleus.md) $\{W_i\}$ in the ambient relational category $\mathsf{R}$.
The **Wood Between the Worlds** for $\{W_i\}$ is a triple

$$(\mathrm{Wd},\ \{P_i\},\ \{\phi_i\})$$

where:

- $\mathrm{Wd} \in \mathsf{R}$ is a nucleus,
- each $P_i \hookrightarrow \mathrm{Wd}$ is a [hole](teaching/explanations/hole.md), called a **pool**,
- each $\phi_i : P_i \to W_i$ is a [portal](teaching/explanations/portal.md) morphism into the corresponding world,

satisfying the four Wood axioms below.

## The Wood axioms

- **(W-Iso) [Isotropy](teaching/explanations/isotropy.md).** $\mathrm{Aut}(\mathrm{Wd})$ acts transitively on $|\mathrm{Wd}| \setminus \bigcup_i P_i$.
- **(W-PoolDeg) Pool degeneration.** Each $P_i \hookrightarrow \mathrm{Wd}$ is a hole: $\mathrm{QC}(P_i)$ is degenerate relative to $\mathrm{QC}(\mathrm{Wd})|_{P_i}$, and all maps out of $P_i$ factor through $\partial P_i$.
- **(W-BdyPort) Boundary-determined portals.** If $p, q \in P_i$ have identical germs at $\partial P_i$, then $\phi_i(p) = \phi_i(q)$.
- **(W-Univ) [Universal mediating property](../theorems/wood-as-initial-mediator.md).** For any other [mediating nucleus](teaching/explanations/mediating-nucleus.md) $(M, \{Q_i\}, \{\psi_i\})$ for $\{W_i\}$, there exists a unique-up-to-isotropy morphism $u : M \to \mathrm{Wd}$ together with factorizations $u_i : Q_i \to P_i$ such that $\phi_i \circ u_i = \psi_i$.

## What this object is claiming

Three structural claims, each independently substantive:

1. **Existence.** Such an object exists for any family of worlds in any ambient $\mathsf{R}$ satisfying the preliminaries.
  This is *postulated* at this stage of the theory; the original source notes it as a postulate (§3.2 of the source draft) rather than a constructive theorem.
2. **Canonicality.** Any liminal, isotropic, hole-stratified mediator for $\{W_i\}$ is equivalent up to isotropy to $\mathrm{Wd}$ (Corollary 3.9 of the source).
  The Wood is *the* canonical inter-world fabric, not just *a* candidate.
3. **Compositional discipline.** Every other mediator factors uniquely through the Wood.
  Whatever connecting structure exists between worlds, it must factor through the Wood.

## Mereological reading

Let $C = \mathrm{Wd} \cup \bigcup_i W_i$ with intersections only along pool boundaries.
Then:

- worlds = regions of full $\mathrm{QC}$-structure;
- the Wood = region of isotropy and structural thinning;
- pools = boundary-holes mediating between bulk structures.

In this reading, $C$ is the [hyperverse](../../multiverse/terms/hyperverse.md) — the totality of worlds together with the Wood that mediates among them.

## What is left open

The categorical machinery is in place; the cosmological *content* is not.
Which features of an actual multiverse — eternal-inflation bubbles, Everettian branches, landscape vacua — are the worlds, what plays the role of the Wood, and whether the Wood is empirically constrained at all by single-universe cosmology, are open questions.
See [is-voidmath-the-substrate-of-worlds](questions/is-voidmath-the-substrate-of-worlds.md) and [do-quantum-many-worlds-correspond-to-wood-portals](questions/do-quantum-many-worlds-correspond-to-wood-portals.md).

## Provenance

Translated from §3 ("The Wood Between the Worlds") of [`wood-between-worlds.md`](../../../../../../work/triage/engineering-archive/library/humanities/theories/philosophy/theories/relating/triage/provenance/math-from-relationality-bucket/wood-between-worlds.md).
The ambient setting is the relational quasicrystalline hypertensor topos of [`quasicrystalline-hypertensor-topos-specification.md`](../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../science-services-section/services/philosophy-services-section/services/relationality-services-section/services/quasicrystalline-hypertensor-topos-services-section/content/text/documents/articles/notes/quasicrystalline-hypertensor-topos-specification.md); this subtheory uses only the Wood-axiom layer rather than the full HTT-SPEC.
