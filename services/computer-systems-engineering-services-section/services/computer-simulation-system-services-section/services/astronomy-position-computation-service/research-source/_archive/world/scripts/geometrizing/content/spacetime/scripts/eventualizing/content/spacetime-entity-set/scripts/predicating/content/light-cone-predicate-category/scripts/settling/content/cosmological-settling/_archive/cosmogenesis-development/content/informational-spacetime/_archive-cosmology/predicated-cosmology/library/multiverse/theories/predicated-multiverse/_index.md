---
title: "Predicated Multiverse"
description: "A categorical / predication-theoretic cosmology of multiple worlds: worlds as nuclei carrying quasicrystalline structure and internal flow, holes and portals between them, and the Wood Between the Worlds as the universal liminal mediator."
component-of: cosmology
---


A research subtheory of cosmology that treats the inter-world structure of a [multiverse](../multiverse/terms/multiverse.md) categorically.
Worlds are objects (nuclei) in a relational ambient category; each carries quasicrystalline structure and an internal flow defining its allowable relational transitions. *Holes* are subobjects exhibiting structural degeneration with mandatory boundary factorization. *Portals* are morphisms from holes into fully structured worlds.
The central object is the **[Wood Between the Worlds](objects/wood-between-worlds.md)**: the universal mediating nucleus that is initial among all mediators of a given family of worlds.

This is the multiversal counterpart to the sibling [predicated-cosmology](../predicated-cosmology/_index.md) subtheory.
Predicated-cosmology models *one* universe as a settling; predicated-multiverse models *populations* of worlds together with the categorical fabric that connects them.
The two share the underlying [predication-categories](../../../../humanities/theories/math/theories/categories/theories/predication-categories/_index.md) machinery and are *intended* to compose — but whether they actually do is open work, recorded as the bridge questions [does-cosmological-settling-induce-world-structure](questions/does-cosmological-settling-induce-world-structure.md) (multiverse side) and [does-this-cosmology-extend-to-a-multiverse](../predicated-cosmology/questions/does-this-cosmology-extend-to-a-multiverse.md) (cosmology side).
The composition is not assumed.

## Core claim

Any inter-world mediator factors uniquely (up to isotropy) through the Wood.
This makes the Wood a canonical, structurally-determined object whose existence and uniqueness can be argued from three axioms — isotropy, hole-degeneration, and the universal mediating property — without invoking any specific multiverse mechanism.
Whether the cosmologist is thinking [eternal-inflation](../multiverse/terms/eternal-inflation.md)-style bubbles, Everettian branches, or string-landscape vacua, the structural picture of how worlds can be connected is the same.

## What this subtheory is and is not

- **It is** a structural framework: a way to talk precisely about worlds, the inter-world medium, portals, and traveller-states using categorical vocabulary.
  It generates well-typed objects and provable theorems about their relations.
- **It is not** a physical theory of multiverses.
  It does not predict observable consequences.
  It does not pick out which of the [Tegmark levels](../multiverse/terms/tegmark-classification.md) is actually realized.
  It does not derive the existence of any specific other world.
- **It is not** a claim that the multiverse is real.
  The categorical structure is consistent whether zero, one, or many worlds beyond ours exist; the apparatus describes how *if* multiple worlds exist, they would have to relate.

## Convention

Same conventions as [predicated-cosmology](../predicated-cosmology/_index.md) and [predication-categories](../../../../humanities/theories/math/theories/categories/theories/predication-categories/_index.md): one entity per Markdown file, YAML frontmatter, stable lower-kebab-case slugs.

```yaml
---
type: concept | definition | morphism | theorem | conjecture | question | example | narrative | reference
class: nucleus | hole | portal | mediator | traveller | invariant | ...
status: draft | sketch | proved | open | refuted
depends-on: [...]
realizes: [...]
see-also: [...]
---
```

## Layout

- `concepts/` — the cross-cutting vocabulary: [mediating nucleus](concepts/mediating-nucleus.md), [hole](concepts/hole.md), [portal](concepts/portal.md), [isotropy](concepts/isotropy.md).
- `objects/` — the categorical objects: [world as nucleus](objects/world-as-nucleus.md), [Wood Between the Worlds](objects/wood-between-worlds.md), [traveller fibration](objects/traveller-fibration.md).
- `morphisms/` — the moves: [portal morphism](morphisms/portal-morphism.md), [portal jump](morphisms/portal-jump.md).
- `theorems/` — the structural results: [Wood uniqueness up to isotropy](theorems/wood-uniqueness-up-to-isotropy.md), [Wood as initial mediator](theorems/wood-as-initial-mediator.md), [boundary primacy of traveller identity](theorems/boundary-primacy-of-traveller-identity.md).
- `examples/` — concrete reads: [nested cosmology as mediated pair](examples/nested-cosmology-as-mediated-pair.md).
- `questions/` — open structural questions: [is voidmath the substrate of worlds](questions/is-voidmath-the-substrate-of-worlds.md), [do quantum many-worlds correspond to Wood portals](questions/do-quantum-many-worlds-correspond-to-wood-portals.md).

## Imported research

This subtheory translates a body of pre-predication-theory research into the predicated framing:

- **The Wood Between the Worlds** — a categorical formulation of a universal liminal mediator across worlds, originally written in a relational quasicrystalline hypertensor topos.
  Source: [`wood-between-worlds.md`](../../../../../../work/triage/engineering-archive/library/humanities/theories/philosophy/theories/relating/triage/provenance/math-from-relationality-bucket/wood-between-worlds.md).
  Translated into the [Wood Between the Worlds](objects/wood-between-worlds.md), [world as nucleus](objects/world-as-nucleus.md), the [hole](concepts/hole.md) / [portal](concepts/portal.md) / [mediating nucleus](concepts/mediating-nucleus.md) concepts, and the [Wood uniqueness](theorems/wood-uniqueness-up-to-isotropy.md) and [Wood initiality](theorems/wood-as-initial-mediator.md) theorems.

- **The Hypertensor Topos specification (HTT-SPEC v1)** — the ambient categorical setting in which the Wood originally lived, axiomatizing trace sites, Heyting–modal fiber algebras, the hypertensor reindexing functor, and structural closure.
  Source: [`quasicrystalline-hypertensor-topos-specification.md`](../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../science-services-section/services/philosophy-services-section/services/relationality-services-section/services/quasicrystalline-hypertensor-topos-services-section/content/text/documents/articles/notes/quasicrystalline-hypertensor-topos-specification.md).
  Cited as the upstream ambient setting; this subtheory uses the Wood-axiom layer rather than the full HTT-SPEC.

- **Voidmath (infinite + finite)** — a "void mycelium" study of the substrate from which worlds-and-portals structure emerges, deliberately retaining non-confluence, asymmetry, and the absence of equality.
  Sources: [`infinite-voidmath.md`](../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../../science-services-section/services/philosophy-services-section/services/relationality-services-section/content/text/documents/articles/notes/undated/infinite-voidmath.md), [`finite-voidmath.md`](../../../../../../work/triage/engineering-archive/library/humanities/theories/philosophy/theories/relating/triage/provenance/relating-archive/voidmath-hyperverse/finite-voidmath.md).
  Voidmath is **not** translated as cosmology — it is foundational paradox-math, properly upstream of any cosmological reading.
  It is cited in [is voidmath the substrate of worlds](questions/is-voidmath-the-substrate-of-worlds.md) as the candidate substrate for the world-tower the Wood mediates.

## Status

Draft, founding stage.
The categorical apparatus is in place — objects are well-typed, dependencies discharge, and the two central theorems (uniqueness, initiality) are stated with their original arguments.
The cosmological cash-out — what concrete prediction or structural insight this picture buys for working multiverse cosmology — is sketch-level only.
The questions section flags the open work.
